import { Word } from '@/common/internal-services/db'
import { fileService } from '@/common/internal-services/file'
import { current } from 'immer'

export interface ChatFileState {
    currentUserId: number
    words: Word[]
    currentPage: number
    currentFileId: number
    fileNames: { id: number; name: string }[]
    categories: string[]
    currentCategory: string
    selectedWord: {
        idx: number
        text: string
    }
    searchTerm: string
}

function getFromStorage(key: string, defaultValue: any) {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
}

function getNumberFromStorage(key: string, defaultValue: any) {
    const item = localStorage.getItem(key)
    return item ? Number(item) : defaultValue
}

export const getInitialFileState = async () => {
    return initialFileState
}

export const initialFileState: ChatFileState = {
    currentUserId: getNumberFromStorage('currentUserId', 0),
    words: [], // 初始为空，组件挂载后异步加载
    currentPage: getNumberFromStorage('currentPage', 1),
    currentFileId: getNumberFromStorage('currentFileId', 0),
    fileNames: [],
    categories: getFromStorage('categories', ['单词', '表达', '语法', '默认']),
    currentCategory: localStorage.getItem('currentCategory') || '单词',
    selectedWord: getFromStorage('selectedWord', { idx: 0, text: '' }),
    searchTerm: '',
}
