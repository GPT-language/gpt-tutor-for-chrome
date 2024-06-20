import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'

export type ActionOutputRenderingFormat = 'text' | 'markdown' | 'latex' | 'json'

export interface Action {
    id?: number
    idx: number
    mode?: TranslateMode
    name: string
    model?: string
    description?: string
    group?: string
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    updatedAt: string
    createdAt: string
    parentIds?: number[]
    childrenIds?: number[]
}

export interface Translation {
    text: string
    format: ActionOutputRenderingFormat
    messageId?: string
    conversationId?: string
}

export interface Translations {
    [actionName: string]: Translation
}

export interface ReviewSettings {
    dailyWords: number
    interval: number[]
    startTime: Date
}

export interface Word {
    idx: number
    text: string
    translations?: Translations
    isNew?: boolean
    lastReviewed?: Date
    nextReview?: Date
    reviewCount: number
    fileId?: number
}

export interface SavedFile {
    category: string
    id?: number
    name: string
    words: Word[]
    reviewSettings?: ReviewSettings
}

export class LocalDB extends Dexie {
    action!: Table<Action, number>
    files!: Table<SavedFile, number>

    constructor() {
        super('gpt-tutor')
        this.version(11).stores({
            action: '++id, idx, mode, name, group, description, model, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt, parentIds, childrenIds',
            files: '++id, name, words,category,reviewSettings',
        })
        this.action = this.table('action')
        this.files = this.table('files')
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
    // 确保 localDB 已经初始化
    if (!localDB) {
        localDB = new LocalDB()
    }
    return localDB.table(tableName) as Dexie.Table
}
