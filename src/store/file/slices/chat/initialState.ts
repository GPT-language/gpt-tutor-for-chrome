import { Action } from '@/common/internal-services/db'
export interface ChatState {
    editableText: string
    isLoading: boolean
    ttsProvider: string
    conversationId: string
    messageId: string
    activatedActionName: string
    activatedModel: string
    activatedProvider: string
    accessToken: string
    actions: Action[]
    assistantAction: Action | undefined
    activateAction: Action | undefined
    actionStr: string
    // 复习周期
    reviewIntervals: number[]
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

export const initialChatState: ChatState = {
    editableText: '',
    isLoading: false,
    actions: [],
    ttsProvider: '',
    conversationId: '',
    messageId: '',
    activateAction: undefined,
    assistantAction: undefined,
    activatedActionName: '',
    activatedModel: '',
    activatedProvider: '',
    accessToken: '',
    actionStr: '',
    reviewIntervals: getFromStorage('reviewIntervals', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
}
