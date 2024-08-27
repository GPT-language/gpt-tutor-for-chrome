import { SavedFile, Translations, Word } from '@/common/internal-services/db'
import i18n from '@/common/i18n'
export interface ChatFileState {
    words: Word[]
    currentFileId: number | null
    currentPage: number
    translations: Translations
    files: SavedFile[]
    categories: string[]
    selectedCategory: string
    selectedWord: Word | null
    selectedWords: { [fileId: number]: Word | null }
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

function getObjectFromStorage(key: string, defaultValue: unknown) {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
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

export const getInitialFileState = async (): Promise<ChatFileState> => {
    const currentFileId = getNumberFromStorage('currentFileId', 0)
    const categories = await getFromStorage('categories', [
        'Vocabulary',
        'Expression',
        'Grammar',
        'Writing',
        'Review',
        'History',
    ])
    const selectedCategory = await getFromStorage('currentCategory', i18n.t('Vocabulary'))
    const selectedWord = await getFromChromeStorage('selectedWord', { idx: 1, text: '', reviewCount: 0 })
    const selectedWords = await getObjectFromChromeStorage('selectedWords', {})

    return {
        words: [],
        translations: {},
        currentFileId,
        currentPage: 1,
        files: [],
        categories,
        selectedCategory,
        selectedWord,
        selectedWords,
    }
}

export const initialFileState: ChatFileState = {
    words: [], // 当前文件的单词
    translations: {},
    currentFileId: getNumberFromStorage('currentFileId', 0),
    currentPage: 1,
    files: [],
    categories: getFromStorage('categories', ['词汇', '表达', '语法', '复习', '历史记录']),
    selectedCategory: getFromStorage('currentCategory', '默认'),
    selectedWord: { idx: 1, text: '', reviewCount: 0 },
    selectedWords: {}, // 每个文件的选中单词
}
