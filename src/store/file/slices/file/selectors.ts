import { ChatStore } from '../../store'

// fileSelectors.ts
export const fileSelectors = {
    getFile: (fileId: number) => (state: ChatStore) => {
        return state.files.find((f: { id: number }) => f.id === fileId)
    },
    getAllFiles: (state: ChatStore) => {
        return state.files
    },
    getWordInFile: (fileId: number, wordIndex: number) => (state: ChatStore) => {
        const file = state.files.find((f) => f.id === fileId)
        return file ? file.words[wordIndex] : undefined
    },
    getTranslationInWord: (fileId: number, wordIndex: number, actionName: string) => (state: ChatStore) => {
        const file = state.files.find((f) => f.id === fileId)
        const word = file ? file.words[wordIndex] : undefined
        return word && word.translations ? word.translations[actionName] : undefined
    },
}

export const chatSelectors = {
    currentFiles: (state: ChatStore) => state.files,
    // Add more chat-related selectors if needed
}
