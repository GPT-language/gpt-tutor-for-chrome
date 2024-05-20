import { Word, SavedFile } from '@/common/internal-services/db'

export interface ChatFileState {
    words: Word[]
    currentFileId: number
    files: SavedFile[]
    categories: string[]
    selectedCategory: string
    selectedWord: selectedWord
    selectedWords: { [fileId: number]: selectedWord }
}

export interface selectedWord {
    idx: number
    text: string
}

function getFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    try {
        return item ? JSON.parse(item) : defaultValue
    } catch (error) {
        console.error('Error parsing JSON from localStorage for key:', key, error)
        return defaultValue // 返回默认值或执行其他错误处理
    }
}

function getNumberFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    return item ? Number(item) : defaultValue
}

function getObjectFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
}

export const getInitialFileState = async () => {
    return initialFileState
}

export const initialFileState: ChatFileState = {
    words: [], // 当前文件的单词
    currentFileId: getNumberFromStorage('currentFileId', 0),
    files: [],
    categories: getFromStorage('categories', ['单词', '表达', '语法', '默认']),
    selectedCategory: getFromStorage('currentCategory', '默认'),
    selectedWord: getFromStorage('selectedWord', { idx: 1, text: '' }),
    selectedWords: getObjectFromStorage('selectedWords', {}), // 每个文件的选中单词
}
