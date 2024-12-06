import { Theme } from 'baseui-sd/theme'
import { TranslateMode } from './translate'
import { TTSProvider } from './tts/types'
import { Provider } from './engines'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ISync {
    get(keys: string[]): Promise<Record<string, any>>
    set(items: Record<string, any>): Promise<void>
}

interface IStorage {
    sync: ISync
}

interface IRuntimeOnMessage {
    addListener(callback: (message: any, sender: any, sendResponse: any) => void): void
    removeListener(callback: (message: any, sender: any, sendResponse: any) => void): void
}

interface IRuntime {
    onMessage: IRuntimeOnMessage
    sendMessage(message: any): void
    getURL(path: string): string
}

interface II18n {
    detectLanguage(text: string): Promise<{ languages: { language: string; percentage: number }[] }>
}

export interface IBrowser {
    storage: IStorage
    runtime: IRuntime
    i18n: II18n
}

export type BaseThemeType = 'light' | 'dark'
export type ThemeType = BaseThemeType | 'followTheSystem'

export interface IThemedStyleProps {
    theme: Theme
    themeType: BaseThemeType
    isDesktopApp?: boolean
}

export interface ISettings {
    chatContext: boolean
    defaultYouglishLanguage: string
    isFirstTimeUse: boolean
    chatgptArkoseReqUrl: string
    chatgptArkoseReqForm: string
    inputLanguageLevel: string
    outputLanguageLevel: string
    apiKeys: string
    apiURL: string
    apiURLPath: string
    apiModel: string
    provider: Provider
    chatgptModel: string
    azureAPIKeys: string
    azureAPIURL: string
    azureAPIURLPath: string
    azureAPIModel: string
    azMaxWords: number
    enableMica: boolean
    enableBackgroundBlur: boolean
    miniMaxGroupID: string
    miniMaxAPIKey: string
    miniMaxAPIModel: string
    moonshotAPIKey: string
    moonshotAPIModel: string
    geminiAPIURL: string
    geminiAPIKey: string
    geminiAPIModel: string
    autoTranslate: boolean
    defaultTranslateMode: string
    defaultUserLanguage: string
    defaultLearningLanguage: string[]
    languageLevel: string
    userBackground: string
    alwaysShowIcons: boolean
    hotkey: string
    displayWindowHotkey: string
    ocrHotkey: string
    writingTargetLanguage: string
    writingHotkey: string
    writingNewlineHotkey: string
    themeType: string
    i18n: string
    tts: any
    restorePreviousPosition: boolean
    runAtStartup: boolean
    selectInputElementsText: boolean
    readSelectedWordsFromInputElementsText: boolean
    disableCollectingStatistics: boolean
    allowUsingClipboardWhenSelectedTextNotAvailable: boolean
    pinned: boolean
    autoCollect: boolean
    hideTheIconInTheDock: boolean
    languageDetectionEngine: string
    autoHideWindowWhenOutOfFocus: boolean
    proxy: {
        enabled: boolean
        protocol: string
        server: string
        port: string
        basicAuth: {
            username: string
            password: string
        }
        noProxy: string
    }
    customModelName: string
    ollamaAPIURL: string
    ollamaAPIModel: string
    ollamaCustomModelName: string
    groqAPIURL: string
    groqAPIURLPath: string
    groqAPIModel: string
    groqAPIKey: string
    groqCustomModelName: string
    claudeAPIURL: string
    claudeAPIURLPath: string
    claudeAPIModel: string
    claudeAPIKey: string
    claudeCustomModelName: string
    kimiRefreshToken: string
    kimiAccessToken: string
    chatglmAccessToken: string
    chatglmRefreshToken: string
    deepSeekAPIKey: string
    deepSeekAPIModel: string
    openRouterAPIKey: string
    openRouterAPIModel: string
    OneAPIAPIKey: string
    OneAPIAPIModel: string
    fontSize: number
    uiFontSize: number
    iconSize: number
    automaticCheckForUpdates: boolean
    hideInputTip: boolean
    hideEmptyActionsTip: boolean
    tutorialCompleted: boolean
}

export type RequestInitSubset = {
    method?: string
    body?: BodyInit | null | undefined
    headers?: Record<string, string>
    signal?: AbortSignal
}

export interface ProxyFetchRequestMessage {
    url: string
    options?: RequestInitSubset
}

export interface ProxyFetchResponseMetadata {
    status?: number
    statusText?: string
    headers?: Record<string, string>
}

export interface ProxyFetchResponseMetadataMessage {
    type: 'PROXY_RESPONSE_METADATA'
    metadata: ProxyFetchResponseMetadata
}

export type ProxyFetchResponseBodyChunkMessage = {
    type: 'PROXY_RESPONSE_BODY_CHUNK'
} & ({ done: true } | { done: false; value: string })

export type ResponsePayload = {
    conversation_id: string
    message: {
        id: string
        author: { role: 'assistant' | 'tool' | 'user' }
        content: ResponseContent
        recipient: 'all' | string
    }
    error: null
}

export type ResponseContent =
    | {
          content_type: 'text'
          parts: string[]
      }
    | {
          content_type: 'code'
          text: string
      }
    | {
          content_type: 'tether_browsing_display'
          result: string
      }
    | {
          content_type: 'multimodal_text'
          parts: ({ content_type: 'image_asset_pointer' } & ImageContent)[]
      }

export interface PubSubPayload {
    websocket_request_id?: string // WebSocket请求的唯一标识符
    body: string // 消息的主体，可能是经过Base64编码的
}
