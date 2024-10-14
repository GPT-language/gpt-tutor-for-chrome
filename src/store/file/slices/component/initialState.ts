import { ISettings } from "@/common/types"

export interface ComponentState {
    showSettings: boolean
    showWordBookManager: boolean
    showCategorySelector: boolean
    showActionManager: boolean
    showReviewManager: boolean
    showYouGlish: boolean
    showTextParser: boolean
    showBuyMeACoffee: boolean
    showSidebar: boolean
    isShowMessageCard: boolean
    isShowActionList: boolean
    refreshTextAreaFlag: number
    showAuthModal: boolean
    settings: ISettings
}

const defaultSettings: ISettings = {
    isFirstTimeUse: true,
    chatgptArkoseReqUrl: '',
    chatgptArkoseReqForm: '',
    apiKeys: '',
    apiURL: 'https://api.openai.com',
    apiURLPath: '/v1/chat/completions',
    apiModel: 'gpt-3.5-turbo',
    provider: 'Subscribe',
    chatgptModel: 'text-davinci-002-render-sha',
    azureAPIKeys: '',
    azureAPIURL: '',
    azureAPIURLPath: '',
    azureAPIModel: '',
    azMaxWords: 1024,
    enableMica: false,
    enableBackgroundBlur: false,
    miniMaxGroupID: '',
    miniMaxAPIKey: '',
    miniMaxAPIModel: 'abab5.5-chat',
    moonshotAPIKey: '',
    moonshotAPIModel: '',
    geminiAPIURL: 'https://generativelanguage.googleapis.com',
    geminiAPIKey: '',
    geminiAPIModel: '',
    autoTranslate: false,
    defaultTranslateMode: 'translate',
    defaultTargetLanguage: 'zh-Hans',
    defaultSourceLanguage: ['en'],
    languageLevel: '',
    userPrompt: '',
    alwaysShowIcons: true,
    hotkey: '',
    displayWindowHotkey: '',
    ocrHotkey: '',
    writingTargetLanguage: '',
    writingHotkey: '',
    writingNewlineHotkey: '',
    themeType: 'followTheSystem',
    i18n: 'en',
    tts: {},
    restorePreviousPosition: false,
    runAtStartup: false,
    selectInputElementsText: true,
    readSelectedWordsFromInputElementsText: false,
    disableCollectingStatistics: false,
    allowUsingClipboardWhenSelectedTextNotAvailable: false,
    pinned: false,
    autoCollect: false,
    hideTheIconInTheDock: false,
    languageDetectionEngine: 'baidu',
    autoHideWindowWhenOutOfFocus: false,
    proxy: {
        enabled: false,
        protocol: 'HTTP',
        server: '127.0.0.1',
        port: '1080',
        basicAuth: {
            username: '',
            password: '',
        },
        noProxy: 'localhost,127.0.0.1',
    },
    customModelName: '',
    ollamaAPIURL: 'http://127.0.0.1:11434',
    ollamaAPIModel: '',
    ollamaCustomModelName: '',
    groqAPIURL: 'https://api.groq.com',
    groqAPIURLPath: '/openai/v1/chat/completions',
    groqAPIModel: '',
    groqAPIKey: '',
    groqCustomModelName: '',
    claudeAPIURL: 'https://api.anthropic.com',
    claudeAPIURLPath: '/v1/messages',
    claudeAPIModel: '',
    claudeAPIKey: '',
    claudeCustomModelName: '',
    kimiRefreshToken: '',
    kimiAccessToken: '',
    chatglmAccessToken: '',
    chatglmRefreshToken: '',
    deepSeekAPIKey: '',
    deepSeekAPIModel: '',
    openRouterAPIKey: '',
    openRouterAPIModel: '',
    subscribeAPIKey: '',
    subscribeAPIModel: 'gpt-4o',
    fontSize: 15,
    uiFontSize: 12,
    iconSize: 15,
    automaticCheckForUpdates: true,
}

export const initialComponentState: ComponentState = {
    showSettings: false,
    showWordBookManager: false,
    showCategorySelector: false,
    showActionManager: false,
    showReviewManager: false,
    showYouGlish: false,
    showTextParser: false,
    showBuyMeACoffee: false,
    isShowMessageCard: false,
    isShowActionList: false,
    showSidebar: false,
    refreshTextAreaFlag: 0,
    settings: defaultSettings,
    showAuthModal: false,
}
