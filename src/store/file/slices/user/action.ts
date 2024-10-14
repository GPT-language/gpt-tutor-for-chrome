import { StateCreator } from 'zustand'
import { ChatUserState, initialUserState, ChatUser } from './initialState'

export interface ChatUserAction {
    setUser: (user: Partial<ChatUser>) => void
    clearUser: () => void
}

export const chatUser: StateCreator<ChatUserState, [['zustand/devtools', never]], [], ChatUserAction> = (set) => ({
    setUser: (userUpdate: Partial<ChatUser>) =>
        set((state) => ({
            chatUser: { ...state.chatUser, ...userUpdate },
        })),
    clearUser: () =>
        set({
            chatUser: initialUserState.chatUser,
        }),
})
