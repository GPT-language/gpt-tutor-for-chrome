/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatMessage, ChatState } from './initialState'
import { produce } from 'immer'
import { Action} from '@/common/internal-services/db'
import { IEngine } from '@/common/engines/interfaces'
import { ISettings } from '@/common/types'
import { formatDate } from '@/common/utils/format'


export interface TranslateCallbacks {
    onBeforeTranslate?: () => void
    onAfterTranslate?: (reason: string) => void
    onMessage: (message: { content: string; role: string; isFullText?: boolean }) => void
    onFinish: (reason: string) => void
    onError: (error: any) => void
    onStatusCode: (statusCode: number) => void
}

export interface TranslateParams {
    signal: AbortSignal;
    text?: string;
    settings: ISettings;
    engine: IEngine;
    isOpenToAsk: boolean;
    callbacks: TranslateCallbacks;
}

export interface ChatAction {
    setEditableText: (text: string) => void
    setConversationId: (id: string) => void
    setMessageId: (id: string) => void
    setActivatedModel: (model: string) => void
    setActivatedProvider: (provider: string) => void
    setAccessToken: (token: string) => void
    setActions: (actions: Action[]) => void
    setAction: (action: Action | undefined) => void
    setAssistantAction: (action: Action | undefined) => void
    setActionStr: (text: string) => void
    setErrorMessage: (text: string) => void
    setTranslatedText: (text: string) => void
    setQuoteText: (text: string) => void
    setIndependentText: (text: string) => void
    setIsMultipleConversation: (isMultiple: boolean) => void
    setShowConversationMenu: (show: boolean) => void
    setAvailableConversations: (conversations: { key: string; messages: ChatMessage[] }[]) => void
    setCurrentConversationKey: (key: string) => void
    generateNewConversationKey: () => string
}

export const chat: StateCreator<ChatState, [['zustand/devtools', never]], [], ChatAction> = (set, get) => ({
    setEditableText: (text) => set({ editableText: text }),
    setConversationId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.conversationId !== id) {
                    draft.conversationId = id
                }
            })
        ),
    setMessageId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.messageId !== id) {
                    draft.messageId = id
                }
            })
        ),
    setActivatedModel: (model) => set({ activatedModel: model }),
    setActivatedProvider: (provider) => set({ activatedProvider: provider }),
    setAccessToken: (token) => set({ accessToken: token }),
    setActions: (actions: Action[]) => {
        set({ actions })
    },

    setAction: (action?: Action) => {
        set({
          activateAction: action
        })
    },
    setAssistantAction: (action) => set({ assistantAction: action }),
    setActionStr: (text) => set({ actionStr: text }),
    setQuoteText: (text) => set({ quoteText: text }),
    setIndependentText: (text) => set({ independentText: text }),
    setErrorMessage: (text) => set({ errorMessage: text }),
    setTranslatedText: (text) => set({ translatedText: text }),

    setIsMultipleConversation: (isMultiple) => 
        set({ isMultipleConversation: isMultiple }),
    setShowConversationMenu: (show) => set({ showConversationMenu: show }),
    setAvailableConversations: (conversations) => set({ availableConversations: conversations }),
    setCurrentConversationKey: (key) => set({ currentConversationKey: key }),
    // ... existing code ...
generateNewConversationKey: () => {
    // 生成一个包含日期和时间的唯一标识符
    const now = new Date()
    const timestamp = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/[\/\s:]/g, '')  // 移除分隔符
    
    if (get().activateAction?.name) {
        return `${get().activateAction?.name}_${timestamp}`
    }
    
    if (get().editableText) {
        const truncatedText = get().editableText.slice(0, 20).trim()
        return truncatedText ? `${truncatedText}_${timestamp}` : timestamp
    }
    
    return timestamp
}
})
