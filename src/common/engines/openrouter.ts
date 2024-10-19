import { fetchSSE, getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class OpenRouter extends AbstractOpenAI {
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

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.openRouterAPIModel
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.openRouterAPIKey
    }

    async getAPIURL(): Promise<string> {
        return 'https://openrouter.ai/api/v1'
    }

    async getAPIURLPath(): Promise<string> {
        return '/chat/completions'
    }
}
