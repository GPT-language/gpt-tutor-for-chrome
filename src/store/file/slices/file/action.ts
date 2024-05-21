import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file'
import { ChatStore } from '../../store'
import { SavedFile } from '@/common/internal-services/db'
import { selectedWord } from './initialState'

export interface ChatFileAction {
    addFile: (file: File, category: string) => Promise<number>
    selectFile: (fileId: number) => void
    deleteFile: (fileId: number) => Promise<void>
    addCategory: (category: string) => void
    deleteCategory: (category: string) => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: selectedWord) => void
    deleteWords: () => void
    loadWords: (fileId: number, pageNumber: number) => Promise<boolean>
    loadFiles: (selectedCategory: string) => Promise<void>
    setCurrentFileId: (fileId: number) => void
    setFiles: (files: SavedFile[]) => void
    setSelectedCategory: (category: string) => void
}

export const chatFile: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatFileAction> = (set, get) => ({
    addFile: async (file, category) => {
        const response = await new Promise<{ data: string[][] }>((resolve) =>
            parse(file, {
                complete: resolve,
                header: false,
            })
        )

        const words = response.data.map((entry, index) => ({
            idx: index + 1,
            text: entry[0],
            translations: {},
        }))

        const fileId = await fileService.addFile(file.name, words, category)
        localStorage.setItem('currentFileId', fileId.toString())
        set(
            produce((draft) => {
                draft.words = words
                draft.currentFileId = fileId
                draft.files.push({ id: fileId, name: file.name, category: category, words: words })
                draft.currentPage = 1
            })
        )
        return words.length
    },

    loadWords: async (fileId, pageNumber) => {
        try {
            const words = await fileService.loadWordsByPage(fileId, pageNumber)
            if (words) {
                set(
                    produce((draft) => {
                        draft.words = words
                        console.log('New words set:', words)
                    })
                )
                return true
            }
            return false // 加载失败
        } catch (error) {
            console.error('Error loading words:', error)
            return false
        }
    },

    loadFiles: async (selectedCategory) => {
        const files = await fileService.fetchFilesByCategory(selectedCategory)
        set({ files })
    },

    setCurrentFileId: (fileId: number) => {
        set({ currentFileId: fileId })
        localStorage.setItem('currentFileId', fileId.toString())
    },

    setFiles: (files: SavedFile[]) => {
        set({ files })
    },

    selectFile: (fileId) => {
        const { selectedWords } = get()
        const saveWord = selectedWords[fileId]
        let page
        if (saveWord) {
            page = Math.floor((saveWord.idx - 1) / 10) + 1
        } else {
            page = 1
        }
        set(
            produce((draft) => {
                draft.currentFileId = fileId
            })
        )
        get().loadWords(fileId, page)
        localStorage.setItem('currentFileId', fileId.toString())
    },
    deleteFile: async (fileId) => {
        const { selectedCategory, loadFiles, setCurrentFileId } = get()
        await fileService.deleteFile(fileId)
        set(
            produce((draft) => {
                draft.words = []
                draft.files = draft.files.filter((file: { id: number; name: string }) => file.id !== fileId)
                draft.currentFileId = 0 // 先重置为0
            })
        )
        await loadFiles(selectedCategory) // 等待文件列表加载完毕
        const files = get().files
        if (files.length > 0) {
            setCurrentFileId(files[0].id || 0) // 设置为新的有效ID
        } else {
            setCurrentFileId(0)
        }
        localStorage.setItem('currentFileId', get().currentFileId.toString())
    },

    setSelectedCategory(category: string) {
        set({ selectedCategory: category })
    },
    addCategory: (category) => {
        const { categories } = get()
        set((state) => ({ categories: [...state.categories, category] }))
        localStorage.setItem('categories', JSON.stringify([...categories, category]))
    },
    deleteCategory: (category) => {
        const { categories } = get()
        set((state) => ({
            categories: state.categories.filter((c) => c !== category),
            // Reset category if the current one is deleted
        }))
        localStorage.setItem('categories', JSON.stringify(categories.filter((c) => c !== category)))
    },
    searchWord: (searchTerm) => {
        const { words } = get()
        const foundWord = words.find((word) => word.text.includes(searchTerm))
        if (foundWord) {
            get().selectWord(foundWord)
        } else {
            alert('Word not found')
        }
    },
    selectWord: (word: selectedWord) => {
        const { currentFileId } = get()

        set(
            produce((draft) => {
                draft.selectedWord = word
                draft.selectedWords[currentFileId] = word
                localStorage.setItem('selectedWords', JSON.stringify(draft.selectedWords))
            })
        )
    },

    deleteWords: () => {
        set(
            produce((draft) => {
                draft.words = []
            })
        )
    },
})
