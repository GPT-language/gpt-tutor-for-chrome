import { getUniversalFetch } from '../universal-fetch'
import { fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IModel, IMessageRequest } from './interfaces'

export class OpenRouter extends AbstractEngine {
    supportCustomModel(): boolean {
        return true
    }

    async getModel(): Promise<string> {
        const settings = await getSettings()
        return settings.openRouterAPIModel
    }

    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        const apiKey = apiKey_
        const settings = await getSettings()
        const url = 'https://openrouter.ai/api/v1/models'
        console.log('OpenRouter - API Key:', apiKey ? '设置了' : '未设置')
        console.log('OpenRouter - Settings API Key:', settings.openRouterAPIKey ? '设置了' : '未设置')
        const headers = {
            Authorization: `Bearer ${apiKey || settings.openRouterAPIKey}`,
        }

        try {
            console.log('OpenRouter - 开始请求模型列表')
            const response = await fetch(url, { headers })
            console.log('OpenRouter - 收到响应，状态码:', response.status)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            return data.data.map((model: IModel) => ({
                id: model.id,
                name: model.id,
            }))
        } catch (error) {
            console.error('OpenRouter - 获取模型时出错:', error)
            throw error
        }
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.openRouterAPIKey
        const model = await this.getModel()
        const url = 'https://openrouter.ai/api/v1/chat/completions'
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
                if (msg.trim() === '[DONE]') {
                    finished = true
                    req.onFinished('stop')
                    return
                }
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
                    console.log('OpenRouter - 错误:', e)
                    req.onError(JSON.stringify(e))
                }
            },
            onError: (err) => {
                hasError = true
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                if (typeof err === 'object') {
                    const item = err[0]
                    if (item && item.error && item.error.message) {
                        req.onError(item.error.message)
                        return
                    }
                }
                const { error } = err
                if (error instanceof Error) {
                    req.onError(error.message)
                    return
                }
                if (typeof error === 'object') {
                    const { message } = error
                    if (message) {
                        if (typeof message === 'string') {
                            req.onError(message)
                        } else {
                            req.onError(JSON.stringify(message))
                        }
                        return
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
