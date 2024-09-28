/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ChatUserState } from './initialState'
export interface ChatUserAction {
    setUserId: (id: string) => void
    setUserRole: (role: string) => void
    setCredits: (credits: number) => void
    setIsLogin: (isLogin: boolean) => void
}

export const chatUser: StateCreator<ChatUserState, [['zustand/devtools', never]], [], ChatUserAction> = (set) => ({
    setUserId: (id: string) => {
        set({ userId: id })
    },
    setUserRole: (role: string) => {
        set({ role })
    },
    setCredits: (credits: number) => {
        set({ credits })
    },
    setIsLogin: (isLogin: boolean) => {
        set({ isLogin })
    },


})