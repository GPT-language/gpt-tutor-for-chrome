import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file'
import { ChatStore } from '../../store'
import { SavedFile, Word } from '@/common/internal-services/db'
import { selectedWord } from './initialState'

export interface ChatFileAction {
    addFile: (file: File, category: string) => Promise<void>
    selectFile: (fileId: number) => void
    deleteFile: (fileId: number) => Promise<void>
    addCategory: (category: string) => void
    deleteCategory: (category: string) => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: selectedWord) => void
    deleteWords: () => void
    loadWords: (fileId: number) => Promise<void>
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
        set(
            produce((draft) => {
                draft.words = words
                draft.currentFileId = fileId
                draft.files.push({ id: fileId, name: file.name, category: category, words: words })
                draft.currentPage = 1
            })
        )
    },

    loadWords: async (fileId) => {
        const fileDetails = await fileService.fetchFileDetailsById(fileId)
        set(
            produce((draft) => {
                draft.words = fileDetails.words
                draft.selectedCategory = fileDetails.category
            })
        )
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
        set(
            produce((draft) => {
                draft.currentFileId = fileId
                localStorage.setItem('currentFileId', fileId.toString())
            })
        )
        get().loadWords(fileId)
    },
    deleteFile: async (fileId) => {
        await fileService.deleteFile(fileId)
        set(
            produce((draft) => {
                draft.words = []
                draft.files = draft.files.filter((file: { id: number; name: string }) => file.id !== fileId)
                if (draft.currentFileId === fileId) {
                    draft.currentFileId = 0
                }
            })
        )
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
