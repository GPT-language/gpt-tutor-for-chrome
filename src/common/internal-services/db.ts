import { ChatMessage } from '@/store/file/slices/chat/initialState'
import { TranslateMode } from '../translate'

export type ActionOutputRenderingFormat = 'text' | 'markdown' | 'latex' | 'json'

export interface Action {
    userId?: string
    id?: number
    idx: number
    mode?: TranslateMode
    name: string
    model?: string
    groups: string[]
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    updatedAt: string
    createdAt: string
    parentIds?: number[]
    childrenIds?: number[]
    useBackgroundInfo?: boolean
    useLanguageLevelInfo?: boolean
    isFrequentlyUsed?: boolean
}

export interface ActionGroup {
    id: string
    title: string
    description: string
    category: string
    price: number
    version: string
    actions: Action[]
}

export interface FollowUpAnswer {
    idx: number
    question: string
    text: string
    createdAt: Date
    updatedAt: Date
    conversationMessages?: ChatMessage[]
}

export interface Answer {
    text?: string
    format?: ActionOutputRenderingFormat
    messageId?: string
    conversationId?: string
    followUpAnswers?: FollowUpAnswer[]
    conversationMessages?: ChatMessage[]
}

export interface Answers {
    [actionName: string]: Answer
}

export interface ReviewSettings {
    dailyWords: number
    interval: number[]
    startTime: Date
}

export interface Content {
    idx: number
    text: string
    answers?: Answers
    sentenceAnswers?: FollowUpAnswer[]
    isNew?: boolean
    lastReviewed?: Date
    nextReview?: Date
    reviewCount: number
    completed?: boolean
    inHistory?: boolean
    inReview?: boolean
}

export interface SavedFile {
    userId?: string
    category: string
    id?: number
    name: string
    words: Content[]
    reviewSettings?: ReviewSettings
}
