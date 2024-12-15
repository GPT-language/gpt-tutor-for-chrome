/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatMessage, ChatState } from './initialState'
import { produce } from 'immer'
import { Action} from '@/common/internal-services/db'
import { IEngine } from '@/common/engines/interfaces'
import { ISettings } from '@/common/types'


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
    setCurrentConversationTitle: (title: string) => void
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
        const currentAction = get().activateAction;
        set({
          activateAction: action,
          // 当清除 activateAction 时，保存到 lastUsedAction
          lastUsedAction: action === undefined ? currentAction : undefined
        })
    },
    setAssistantAction: (action) => set({ assistantAction: action }),
    setActionStr: (text) => set({ actionStr: text }),
    setQuoteText: (text) => set({ quoteText: text }),
    setIndependentText: (text) => set({ independentText: text }),
    setErrorMessage: (text) => set({ errorMessage: text }),
    setTranslatedText: (text) => set({ translatedText: text }),
    setCurrentConversationTitle: (title) => set({ currentConversationTitle: title }),

    setIsMultipleConversation: (isMultiple) => 
        set({ isMultipleConversation: isMultiple }),
})
