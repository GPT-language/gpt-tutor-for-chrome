import { getUniversalFetch } from '../universal-fetch'
import { fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IModel, IMessageRequest } from './interfaces'

export class OneAPI extends AbstractEngine {
    supportCustomModel(): boolean {
        return true
    }

    async getApiKey(): Promise<string> {
        const tokenInfo = await fetch(`http://localhost:3000/api/token`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        const tokenInfoData = await tokenInfo.json()
        console.log('tokenInfo:', JSON.stringify(tokenInfoData.data.key))
        return tokenInfoData.data.key
    }

    async getModel(): Promise<string> {
        const settings = await getSettings()
        return settings.OneAPIAPIModel || 'gpt-3.5-turbo'
    }

    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        const settings = await getSettings()
        // TODO: use correct url
        const url = 'http://localhost:3000/api/models'
        const headers = {
            Authorization: `Bearer ${apiKey || settings.OneAPIAPIKey}`,
        }


        try {
            const response = await fetch(url, { headers })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            return data.message.map((modelName: string) => {
                const [name, id] = modelName.split(':').map((s) => s.trim())
                return {
                    id: id || name, // 如果没有冒号，就用整个字符串作为id
                    name: name,
                }
            })
        } catch (error) {
            console.error('Error fetching OneAPI models:', error)
            return []
        }
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.OneAPIAPIKey
        const model = await this.getModel()
        // TODO: use correct url
        const url = 'https://tutor-chatgpt.zeabur.app/v1/chat/completions'
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
        const body = {
            model,
            messages: [
                { role: 'system', content: req.rolePrompt },
                { role: 'user', content: req.commandPrompt },
            ],
            stream: true,
        }

        let hasError = false
        let finished = false
        await fetchSSE(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
            onMessage: async (msg) => {
                if (finished) return
                try {
                    const resp = JSON.parse(msg)
                    if (resp.choices && resp.choices[0].delta.content) {
                        await req.onMessage({ content: resp.choices[0].delta.content, role: '' })
                    }
                    if (resp.choices && resp.choices[0].finish_reason === 'stop') {
                        finished = true
                        req.onFinished('stop')
                    }
                } catch (e) {
                    hasError = true
                    finished = true
                    req.onError(JSON.stringify(e))
                }
            },
            onError: (err) => {
                hasError = true
                if (err && typeof err === 'object') {
                    console.log('忽略空对象错误')
                    return
                }
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                if (typeof err === 'object') {
                    if (Array.isArray(err) && err.length > 0) {
                        const item = err[0]
                        if (item && item.error && item.error.message) {
                            req.onError(item.error.message)
                            return
                        }
                    }
                    const { error } = err as { error?: unknown }
                    if (error instanceof Error) {
                        req.onError(error.message)
                        return
                    }
                    if (typeof error === 'object' && error !== null) {
                        const { message } = error as { message?: unknown }
                        if (message) {
                            if (typeof message === 'string') {
                                req.onError(message)
                            } else {
                                req.onError(JSON.stringify(message))
                            }
                            return
                        }
                    }
                }
                req.onError('Unknown error')
            },
        })

        if (!finished && !hasError) {
            req.onFinished('stop')
        }
    }
}
