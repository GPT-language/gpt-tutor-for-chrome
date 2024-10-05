import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { ChatStore } from '../../store'
import { ReviewSettings, SavedFile, Answers, Word } from '@/common/internal-services/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any

export interface ChatFileAction {
    addFile: (file: File, category: string, UserId?: string, reviewSettings?: ReviewSettings) => Promise<number>
    createFile: (file: SavedFile) => void
    selectFile: (fileId: number) => void
    updateFile: (updatedFile: SavedFile) => void
    updateFileWords: (fileId: number, updater: (words: Word[]) => Word[]) => void
    deleteFile: (fileId: number) => Promise<void>
    loadFiles: (selectedGroup: string) => void
    setCurrentFileId: (fileId: number) => void
    setCurrentPage: (page: number) => void
}

export const chatFile: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatFileAction> = (set, get) => ({
    addFile: async (file, category) => {
        const { files } = get()
        const response = await new Promise<{ data: string[][] }>((resolve) =>
            parse(file, {
                complete: resolve,
                header: false,
            })
        )

        const words = response.data.map((entry, index) => ({
            idx: index + 1,
            text: entry[0],
            answers: {},
            reviewCount: 0,
        }))

        // 获取最新的 fileId 并加 1
        const latestFileId = files.length > 0 ? Math.max(...files.map((f) => f.id || 0)) : 0
        const newFileId = latestFileId + 1
        set(
            produce((draft) => {
                draft.selectedWord = words[0]
                draft.currentPage = 1
                draft.selectedFiles = [
                    ...draft.selectedFiles,
                    { id: newFileId, name: file.name, category: category, words: words },
                ]
                draft.currentFileId = newFileId
                draft.words = words
                draft.selectedWords = { [newFileId]: words[0] }
                draft.files.push({ id: newFileId, name: file.name, category: category, words: words })
            })
        )
        return words.length
    },

    // 手动创建文件
    createFile: (file: SavedFile) => {
        set(
            produce((draft) => {
                draft.files.push(file)
            })
        )
    },

    // 更新
    updateFile: (updatedFile: SavedFile) =>
        set((state) => ({
            files: state.files.map((file) => (file.id === updatedFile.id ? updatedFile : file)),
        })),

    // 更新 files 中的单词
    updateFileWords: (fileId: number, updater: (words: Word[]) => Word[]) => {
        set(
            produce((draft: ChatStore) => {
                const fileIndex = draft.files.findIndex((file) => file.id === fileId)
                if (fileIndex !== -1) {
                    draft.files[fileIndex].words = updater(draft.files[fileIndex].words)
                    // 如果是当前文件，同时更新 words
                    if (fileId === draft.currentFileId) {
                        draft.words = draft.files[fileIndex].words
                    }
                }
            })
        )
    },

    async getCompletedWords() {
        try {
            const { currentFileId, files } = get()
            if (!currentFileId) return []
            const allWords = files.find((f) => f.id === currentFileId)?.words
            if (!allWords) return []
            return allWords.filter((word) => word.nextReview === null)
        } catch (error) {
            console.error('Failed to get completed words:', error)
            return []
        }
    },

    loadFiles: (selectedGroup) => {
        const { files } = get()
        const selectedFiles = files.filter((file) => file.category === selectedGroup)
        set({ selectedFiles })
    },

    setCurrentFileId: (fileId: number) => {
        set({ currentFileId: fileId })
    },

    setCurrentPage: (page: number) => {
        set({ currentPage: page })
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
        get().loadWords(fileId, page, 10)
    },
    deleteFile: async (fileId) => {
        const { selectedGroup, loadFiles, setCurrentFileId, files } = get()
        const updatedFiles = files.filter((file) => file.id !== fileId)
        set({ files: updatedFiles })
        set(
            produce((draft) => {
                draft.words = []
                draft.files = draft.files.filter((file: { id: number; name: string }) => file.id !== fileId)
                draft.currentFileId = 0 // 先重置为0
            })
        )
        loadFiles(selectedGroup) // 等待文件列表加载完毕
        if (files.length > 0) {
            setCurrentFileId(files[0].id || 0) // 设置为新的有效ID
        } else {
            setCurrentFileId(0)
        }
    },

    setSelectedGroup(category: string) {
        set({ selectedGroup: category, currentFileId: null, selectedWord: null })
    },

    setAnswers: (answers: Answers) => {
        set({ answers })
    },
})
