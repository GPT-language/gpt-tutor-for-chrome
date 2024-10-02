/* eslint-disable camelcase */
import { CUSTOM_MODEL_ID } from '../constants'
import { getUniversalFetch } from '../universal-fetch'
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
    }
    const settings = await getSettings()
    const url = 'https://api.openai.com/v1/models'
    console.log('apiKey', apiKey)
    console.log('settings.apiKey', settings.apiKey)
    const headers = {
      Authorization: `Bearer ${apiKey || settings.apiKey}`,
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
        name: model.id,
      }))
    } catch (error) {
      console.error('Error fetching models:', error)
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
