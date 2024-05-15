import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { File, Translation, Word } from '@/common/internal-services/db'
import { ChatStore } from '../../store'
import { fileService } from '@/common/internal-services/file'

export interface ChatFileAction {
    addOrUpdateTranslation: (
        fileId: number,
        wordIndex: number,
        actionName: string,
        text: string,
        format: string
    ) => Promise<void>
    fetchFileDetails: (fileId: number) => Promise<void>
    removeTranslation: (fileId: number, wordIndex: number, actionName: string) => Promise<void>
    refreshFile: (fileId: number) => Promise<void>
    setActiveFile: (file: File) => void
    setActiveWord: (word: Word) => void
    setActiveTranslation: (translation: Translation) => void
}

export const chatFile: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatFileAction> = (set, get) => ({
    addOrUpdateTranslation: async (
        fileId: number,
        wordIndex: number,
        actionName: string,
        text: string,
        format: string
    ) => {
        await fileService.addTranslationToFile(fileId, wordIndex, actionName, text, format)
        get().refreshFile(fileId)
    },

    fetchFileDetails: async (fileId: number) => {
        const file = await fileService.fetchFileDetails(fileId)
        set(
            produce((state: ChatStore) => {
                state.activeFile = file
            })
        )
    },

    removeTranslation: async (fileId: number, wordIndex: number, actionName: string) => {
        await fileService.deleteTranslationFromFile(fileId, wordIndex, actionName)
        get().refreshFile(fileId)
    },

    refreshFile: async (fileId: number) => {
        get().fetchFileDetails(fileId)
    },

    setActiveFile: (file: File) => {
        set({ activeFile: file })
    },

    setActiveWord: (word: Word) => {
        set((state: ChatStore) => ({ ...state, activeWord: word }))
    },

    setActiveTranslation: (translation: Translation) => {
        set((state: ChatStore) => ({ ...state, activeTranslation: translation }))
    },
})
