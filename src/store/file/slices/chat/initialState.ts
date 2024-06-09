import { Action } from '@/common/internal-services/db'
export interface ChatState {
    currentText: string
    sessionId: string
    isLoading: boolean
    ttsProvider: string
    conversationId: string
    messageId: string
    activatedActionName: string
    activatedModel: string
    activatedProvider: string
    accessToken: string
    actions: Action[]
    activateAction: Action | undefined
    isShowActionList: boolean
    isShowMessageCard: boolean
    showActionManager: boolean
    showSettings: boolean
}

function getFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    try {
        return item ? JSON.parse(item) : defaultValue
    } catch (error) {
        console.error('Error parsing JSON from localStorage for key:', key, error)
        return defaultValue // 返回默认值或执行其他错误处理
    }
}

function getNumberFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    return item ? Number(item) : defaultValue
}

function getObjectFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
}

export const initialChatState: ChatState = {
    currentText: '',
    sessionId: '',
    isLoading: false,
    actions: [],
    ttsProvider: '',
    conversationId: '',
    messageId: '',
    activateAction: undefined,
    activatedActionName: '',
    activatedModel: '',
    activatedProvider: '',
    accessToken: '',
    isShowActionList: false,
    isShowMessageCard: false,
    showActionManager: false,
    showSettings: false,
}
