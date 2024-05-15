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

export interface Translation {
    text: string
    format: string // 如 "text", "markdown", "latex"
}

export interface Translations {
    [actionName: string]: Translation
}

export interface Word {
    idx: number
    text: string
    translations?: Translations
    isNew?: boolean
}

export interface File {
    id?: number
    fileName: string
    words: Word[]
}

export class LocalDB extends Dexie {
    action!: Table<Action, number>
    files!: Table<File, number>

    constructor() {
        super('openai-translator')
        this.version(1).stores({
            action: '++id, idx, mode, name, group, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            files: '++id, fileName, words',
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
