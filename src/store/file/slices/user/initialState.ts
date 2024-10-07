export interface User {
    userId: string
    role: string
    apiKey: string
    isLogin: boolean
}

export interface ChatUserState {
    user: User
}

export const initialUserState: ChatUserState = {
    user: {
        userId: '',
        role: '',
        apiKey: '',
        isLogin: false,
    },
}
