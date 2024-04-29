export interface ChatTopic {
    id: string
    title: string
    favorite?: boolean
    // foreign keys
    sessionId?: string
    createAt?: number
    createdAt?: number
    updatedAt?: number
    updateAt?: number
}

export type ChatTopicMap = Record<string, ChatTopic>
