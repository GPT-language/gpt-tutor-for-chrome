import { SavedFile } from '@/common/internal-services/db'
import { ChatStore } from '../../store'

// fileSelectors.ts
export const fileSelectors = {
  getFile: (fileId: number) => (state: ChatStore) => {
    return state.files.find((file: SavedFile) => file.id !== undefined && file.id === fileId)
  },

  getAllFiles: (state: ChatStore) => {
    return state.files
  },

  getCategroyOfFile: (fileId: number) => (state: ChatStore) => {
    const file = state.files.find((f) => f.id === fileId)
    return file ? file.category : undefined
  },

  getWordsInFile: (fileId: number) => (state: ChatStore) => {
    const file = state.files.find((f) => f.id === fileId)
    return file ? file.words : undefined
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
