import { StateCreator } from 'zustand'
import { ChatUserState, initialUserState, User } from './initialState'

export interface ChatUserAction {
    setUser: (user: Partial<User>) => void
    clearUser: () => void
}

export const chatUser: StateCreator<ChatUserState, [['zustand/devtools', never]], [], ChatUserAction> = (set) => ({
    setUser: (userUpdate: Partial<User>) =>
        set((state) => ({
            user: { ...state.user, ...userUpdate },
        })),
    clearUser: () =>
        set({
            user: initialUserState.user,
        }),
})
