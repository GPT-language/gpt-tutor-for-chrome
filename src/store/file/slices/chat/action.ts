/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatState } from './initialState'
import { produce } from 'immer'
import { Action } from '@/common/internal-services/db'

export interface ChatAction {
    setConversationId: (id: string) => void
    setAssistantActionSessionId: (id: string) => void
    setAssistantActionText: (text: string) => void
    setMessageId: (id: string) => void
    setActivatedActionName: (name: string) => void
    setActivatedModel: (model: string) => void
    setActivatedProvider: (provider: string) => void
    setAccessToken: (token: string) => void
    setIsShowActionList: (isShow: boolean) => void
    setShowActionManager: (isShow: boolean) => void
    setShowSettings: (isShow: boolean) => void
    toggleMessageCard: () => void
    setActions: (actions: Action[]) => void
    setAction: (action: Action | undefined) => void
    setAssistantAction: (action: Action | undefined) => void
}

export const chat: StateCreator<ChatState, [['zustand/devtools', never]], [], ChatAction> = (set) => ({
    setConversationId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.conversationId !== id) {
                    draft.conversationId = id
                }
            })
        ),
    setAssistantActionSessionId: (id) =>
        set(
            produce((draft: ChatState) => {
                if (draft.assistantActionSessionId !== id) {
                    draft.assistantActionSessionId = id
                }
            })
        ),
    setAssistantActionText: (text) => set({ assistantActionText: text }),
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
    setIsShowActionList: (isShow) => set({ isShowActionList: isShow }),
    setShowActionManager: (isShow) => set({ showActionManager: isShow }),
    setShowSettings: (isShow) => set({ showSettings: isShow }),
    toggleMessageCard: () => set((state) => ({ isShowMessageCard: !state.isShowMessageCard })),
    setActions: (actions: Action[]) => {
        set({ actions })
    },

    setAction: (action) =>set({activateAction: action}),
    setAssistantAction: (action) => set({ assistantAction: action }),
})
