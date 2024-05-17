import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file'
import { ChatStore } from '../../store'
import { Word } from '@/common/internal-services/db'

export interface ChatFileAction {
    addFile: (file: File, category: string) => Promise<void>
    selectFile: (fileId: number) => void
    deleteFile: (fileId: number) => Promise<void>
    addCategory: (category: string) => void
    deleteCategory: (category: string) => void
    nextPage: () => void
    prevPage: () => void
    searchWord: () => void
    selectWord: (word: Word) => void
    loadWords: (fileId: number) => Promise<void>
    setCurrentFileId: (fileId: number) => void
    setFileNames: (fileNames: { id: number; name: string }[]) => void
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
                draft.fileNames.push({ id: fileId, name: file.name })
                draft.currentPage = 1
            })
        )
    },

    addOrUpdateTranslationInWords: (words: Word[]) => {
        set({ words })
    },

    loadWords: async (fileId) => {
        const fileDetails = await fileService.fetchFileDetails(fileId)
        set(
            produce((draft) => {
                draft.words = fileDetails.words
            })
        )
    },

    setCurrentFileId: (fileId: number) => {
        set({ currentFileId: fileId })
    },

    setFileNames: (fileNames: { id: number; name: string }[]) => {
        set({ fileNames })
    },

    selectFile: (fileId) => {
        set(
            produce((draft) => {
                draft.currentFileId = fileId
                localStorage.setItem('currentFileId', fileId.toString())
                const savedPages = JSON.parse(localStorage.getItem('currentPages') || '{}')
                if (savedPages[fileId]) {
                    draft.currentPage = Number(savedPages[fileId])
                } else {
                    draft.currentPage = 1
                }
            })
        )
        get().loadWords(fileId)
    },
    deleteFile: async (fileId) => {
        await fileService.deleteFile(fileId)
        set(
            produce((draft) => {
                draft.words = []
                draft.fileNames = draft.fileNames.filter((file: { id: number; name: string }) => file.id !== fileId)
                if (draft.currentFileId === fileId) {
                    draft.currentFileId = 0
                }
            })
        )
    },
    addCategory: (category) => {
        set((state) => ({ categories: [...state.categories, category] }))
    },
    deleteCategory: (category) => {
        set((state) => ({
            categories: state.categories.filter((c) => c !== category),
            // Reset category if the current one is deleted
        }))
    },
    nextPage: () => {
        set((state) => ({ currentPage: state.currentPage + 1 }))
    },
    prevPage: () => {
        set((state) => ({ currentPage: Math.max(1, state.currentPage - 1) }))
    },
    searchWord: () => {
        const { words, searchTerm } = get()
        const foundWord = words.find((word) => word.text.includes(searchTerm))
        if (foundWord) {
            get().selectWord(foundWord)
        } else {
            alert('Word not found')
        }
    },
    selectWord: (word) => {
        set({ selectedWord: word })
    },
})
