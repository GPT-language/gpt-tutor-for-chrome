export interface ChatUserState {
    userId: string
    role: string
    credits: number
    isLogin: boolean
}

export const initialUserState: ChatUserState = {
    userId: '',
    role: '',
    credits: 0,
    isLogin: false,
}
