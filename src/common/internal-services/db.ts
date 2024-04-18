import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'

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

export interface ChatMessage {
    id: string
    createdAt: number
    updatedAt?: number
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

export class LocalDB extends Dexie {
    action!: Table<Action>
    message!: Table<ChatMessage>
    topic!: Table<Topic>

    constructor() {
        super('openai-translator')
        this.version(5).stores({
            action: '++id, idx, mode, name, group, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            message: '++id, role, content, parentId, quotaId, sessionId, topicId',
            topic: '++id, title, favorite, sessionId, createdAt, createAt, updatedAt, updateAt',
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
