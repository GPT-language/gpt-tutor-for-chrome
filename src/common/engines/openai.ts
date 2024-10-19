/* eslint-disable camelcase */
import { CUSTOM_MODEL_ID } from '../constants'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class OpenAI extends AbstractOpenAI {
    supportCustomModel(): boolean {
        return true
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        if (settings.apiModel === CUSTOM_MODEL_ID) {
            return settings.customModelName ?? ''
        }
        return settings.apiModel
    }

    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        let apiKey = apiKey_
        if (!apiKey) {
            apiKey = await this.getAPIKey()
            if (!apiKey) {
                return []
            }
        }
        const settings = await getSettings()
        const url = 'https://api.openai.com/v1/models'
        const headers = {
            Authorization: `Bearer ${apiKey || settings.apiKey}`,
        }

        try {
            console.log('OpenAI - 开始请求模型列表')
            const response = await new Promise<Response>((resolve, reject) => {
                fetch(url, { headers }).then(resolve).catch(reject)
                console.log('OpenAI - Fetch 请求已发出')
            })
            console.log('OpenAI - 收到响应，状态码:', response.status)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            return data.data.map((model: IModel) => ({
                id: model.id,
                name: model.id,
            }))
        } catch (error) {
            console.error('OpenAI - 获取模型时出错:', error)
            throw error
        }
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        const apiKeys = (settings.apiKeys ?? '').split(',').map((s) => s.trim())
        const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)] ?? ''
        return apiKey
    }

    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        return settings.apiURL
    }

    async getAPIURLPath(): Promise<string> {
        const settings = await getSettings()
        return settings.apiURLPath
    }
}
