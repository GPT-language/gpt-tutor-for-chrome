/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatState } from './initialState'
import { produce } from 'immer'
import { Action } from '@/common/internal-services/db'

export interface ChatAction {
    setEditableText: (text: string) => void
    setConversationId: (id: string) => void
    setMessageId: (id: string) => void
    setActivatedActionName: (name: string) => void
    setActivatedModel: (model: string) => void
    setActivatedProvider: (provider: string) => void
    setAccessToken: (token: string) => void
    setActions: (actions: Action[]) => void
    setAction: (action: Action | undefined) => void
    setAssistantAction: (action: Action | undefined) => void
    setActionStr: (text: string) => void
    setQuoteText: (text: string) => void
}

export const chat: StateCreator<ChatState, [['zustand/devtools', never]], [], ChatAction> = (set) => ({
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
    setActivatedActionName: (name) => set({ activatedActionName: name }),
    setActivatedModel: (model) => set({ activatedModel: model }),
    setActivatedProvider: (provider) => set({ activatedProvider: provider }),
    setAccessToken: (token) => set({ accessToken: token }),
    setActions: (actions: Action[]) => {
        set({ actions })
    },

    setAction: (action) =>set({activateAction: action}),
    setAssistantAction: (action) => set({ assistantAction: action }),
    setActionStr: (text) => set({ actionStr: text }),
    setQuoteText: (text) => set({ quoteText: text }),
})
