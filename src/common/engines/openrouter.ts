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
        return settings.openRouterModel || 'openai/gpt-3.5-turbo'
    }

    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        const settings = await getSettings()
        const url = 'https://openrouter.ai/api/v1/models'
        const headers = {
            Authorization: `Bearer ${apiKey || settings.openRouterAPIKey}`,
        }

        const fetcher = getUniversalFetch()

        try {
            const response = await fetcher(url, { headers })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            return data.data.map((model: IModel) => ({
                id: model.id,
                name: model.name,
            }))
        } catch (error) {
            console.error('Error fetching OpenRouter models:', error)
            return []
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
                if (err instanceof Error) {
                    req.onError(err.message)
                } else if (typeof err === 'string') {
                    req.onError(err)
                } else {
                    req.onError('Unknown error')
                }
            },
        })

        if (!finished && !hasError) {
            req.onFinished('stop')
        }
    }
}
