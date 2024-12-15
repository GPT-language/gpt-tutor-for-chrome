import { Action } from '@/common/internal-services/db'

export interface ChatMessage {
    role: string
    content: string
    createdAt: number
    messageId: string
    actionName?: string
    format?: string
}

export interface ChatState {
    editableText: string
    independentText: string
    quoteText: string
    isLoading: boolean
    ttsProvider: string
    conversationId: string
    messageId: string
    activatedModel: string
    activatedProvider: string
    accessToken: string
    actions: Action[]
    assistantAction: Action | undefined
    activateAction: Action | undefined
    lastUsedAction?: Action | undefined
    actionStr: string
    // 复习周期
    reviewIntervals: number[]
    translatedText: string
    errorMessage: string
    isNotLogin: boolean
    currentConversationId: string
    currentConversationTitle: string
    isMultipleConversation: boolean
}

export const initialChatState: ChatState = {
    editableText: '',
    independentText: '',
    quoteText: '',
    isLoading: false,
    actions: [],
    ttsProvider: '',
    conversationId: '',
    messageId: '',
    activateAction: undefined,
    lastUsedAction: undefined,
    assistantAction: undefined,
    activatedModel: '',
    activatedProvider: '',
    accessToken: '',
    actionStr: '',
    reviewIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    translatedText: '',
    errorMessage: '',
    isNotLogin: false,
    currentConversationId: '',
    currentConversationTitle: '',
    isMultipleConversation: false,
}
