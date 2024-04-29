import { ErrorType } from '@/types/fetch'
import { Translate } from './translate'

/**
 * 聊天消息错误对象
 */
export interface ChatMessageError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
    message: string
    type: ErrorType
}

export interface ChatTranslate extends Translate {
    content?: string
}

export interface ChatTTS {
    contentMd5?: string
    file?: string
    voice?: string
}

export * from './tools'

export interface ChatMessage {
    id: string
    createdAt: number
    updatedAt?: number
    role: 'user' | 'system' | 'assistant' | 'function'
    content: string
    files?: string[]
    favorite?: 0 | 1
    error?: unknown

    // foreign keys
    // topicId == conversationId
    parentId?: string
    quotaId?: string
    sessionId: string
    topicId?: string | null
}

export type ChatMessageMap = Record<string, ChatMessage>
