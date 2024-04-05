import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'

export interface VocabularyItem {
    word: string
    reviewCount: number
    description: string
    updatedAt: string
    createdAt: string
    [prop: string]: string | number
}

export type ActionOutputRenderingFormat = 'text' | 'markdown' | 'latex'

export interface Action {
    id?: number
    idx: number
    mode?: TranslateMode
    name: string
    group?: string
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    updatedAt: string
    createdAt: string
}

export interface Message {
    id: string
    createdAt: number
    updatedAt: number
    role: 'user' | 'system' | 'assistant' | 'function'
    content: string
    files?: string[]
    favorite?: 0 | 1
    error?: any

    // foreign keys
    // topicId == conversationId
    parentId?: string
    quotaId?: string
    sessionId: string
    topicId?: string | null
}

export interface Topic {
    title: string
    favorite: boolean
    // foreign keys
    sessionId?: string
}

export class LocalDB extends Dexie {
    vocabulary!: Table<VocabularyItem>
    action!: Table<Action>
    message!: Table<Message>
    topic!: Table<Topic>

    constructor() {
        super('openai-translator')
        this.version(5).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, group, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            message: '++id, role, content, parentId, quotaId, sessionId, topicId',
            topic: '++id, title, favorite, sessionId',
        })
    }
}

let localDB: LocalDB

export const getLocalDB = () => {
    if (!localDB) {
        localDB = new LocalDB()
    }
    return localDB
}

export const getTable = (tableName: string): Dexie.Table => {
    // 确保localDB已经初始化
    if (!localDB) {
        localDB = new LocalDB()
    }
    return localDB.table(tableName) as Dexie.Table
}
