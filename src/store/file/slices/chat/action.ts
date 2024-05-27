import { StateCreator } from 'zustand'
import { ChatState } from './initialState'
import { produce } from 'immer'

export interface ChatAction {
    setConversationId: (id: string) => void
    setMessageId: (id: string) => void
    setActivatedActionName: (name: string) => void
    setActivatedModel: (model: string) => void
    setActivatedProvider: (provider: string) => void
    setAccessToken: (token: string) => void
    setIsShowActionList: (isShow: boolean) => void
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
})
