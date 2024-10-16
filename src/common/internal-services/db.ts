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
    uselanguageLevelInfo?: boolean
}

export interface FollowUpAnswer {
    idx: number
    text: string
    createdAt: Date
    updatedAt: Date
}

export interface Answer {
    text: string
    format: ActionOutputRenderingFormat
    messageId?: string
    conversationId?: string
    followUpAnswers?: FollowUpAnswer[]
}

export interface Answers {
    [actionName: string]: Answer
}

export interface ReviewSettings {
    dailyWords: number
    interval: number[]
    startTime: Date
}

export interface Word {
    idx: number
    text: string
    answers?: Answers
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
    words: Word[]
    reviewSettings?: ReviewSettings
}
