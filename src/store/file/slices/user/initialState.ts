export interface ChatUser {
    userId: string
    role: string
    apiKey: string
    isLogin: boolean
    isFirstTimeUse: boolean
    remainQuota?: number
    expiredTime?: number
}

export interface ChatUserState {
    chatUser: ChatUser
}

export const initialUserState: ChatUserState = {
    chatUser: {
        userId: '',
        role: '',
        apiKey: '',
        isLogin: false,
        isFirstTimeUse: true,
        remainQuota: 0,
        expiredTime: 0,
    },
}
