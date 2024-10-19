import { SavedFile } from '@/common/internal-services/db'
export interface ChatFileState {
    currentFileId: number | null
    currentPage: number
    selectedFiles: SavedFile[]
    files: SavedFile[]
}

function getFromChromeStorage<T>(key: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            const item = result[key]
            try {
                // 解析并断言为 T 类型
                const parsedItem: T = item ? JSON.parse(item) : defaultValue
                resolve(parsedItem)
            } catch (error) {
                console.error('Error parsing JSON from chrome.storage.local for key:', key, error)
                resolve(defaultValue) // 若出错返回默认值
            }
        })
    })
}

function getNumberFromStorage(key: string, defaultValue: number) {
    const item = localStorage.getItem(key)
    return item ? Number(item) : defaultValue
}

function getObjectFromChromeStorage<T>(key: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            const item = result[key]
            try {
                // 使用类型断言确保返回的是 T 类型
                const parsedItem: T = item ? JSON.parse(item) : defaultValue
                resolve(parsedItem)
            } catch (error) {
                console.error('Error parsing JSON from chrome.storage.local for key:', key, error)
                resolve(defaultValue) // 出错时返回默认值
            }
        })
    })
}

export const initialFileState: ChatFileState = {
    selectedFiles: [],
    currentFileId: 0,
    currentPage: 1,
    files: [],
}
