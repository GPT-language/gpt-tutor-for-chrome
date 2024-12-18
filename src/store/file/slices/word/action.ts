import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { ChatStore } from '../../store'
import {
    Answers,
    Content,
    SavedFile,
    ActionOutputRenderingFormat,
    FollowUpAnswer,
    Action,
} from '@/common/internal-services/db'
import toast from 'react-hot-toast'
import { ActionGroups } from './initialState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any

export interface ChatWordAction {
    deleteSelectedWord: () => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: Content) => void
    deleteWords: () => void
    loadWords: (fileId: number, pageNumber: number, pageSize: number) => Promise<boolean>
    addWordToFile: (word: Content, fileName: string) => Promise<{ fileId: number; wordIdx: number } | null | undefined>
    setAnswers: (answers: Answers) => void
    setSelectedGroup: (group: string) => void
    setCurrentWordPositions: (fileId: number, wordIdx: number) => void
    updateWordAnswer: (
        actionName: string,
        answerText: string,
        answerFormat?: ActionOutputRenderingFormat,
        messageId?: string,
        conversationId?: string,
        fileId?: number,
        wordIdx?: number
    ) => Promise<void>
    updateWordAnswers: (answers: Answers) => void
    updateFollowUpAnswer: (
        fileId: number,
        wordIdx: number,
        index: number,
        followUpAnswerText: string,
        actionName: string
    ) => Promise<void>
    updateSentenceAnswer: (fileId: number, wordIdx: number, index: number, sentenceAnswerText: string) => Promise<void>
    setActionGroups: (actions: Action[]) => void
    updateSelectedWordText: (text: string) => void
    resetInitialState: () => void
    getOrCreateTargetFile: (
        fileName: string,
        selectedGroup: string,
        currentFileId: number | null,
        selectedFiles: SavedFile[],
        files: SavedFile[]
    ) => SavedFile
    addWordToTargetFile: (
        word: Content,
        targetFile: SavedFile,
        currentDate: Date
    ) => Promise<{ fileId: number; wordIdx: number }>
}

export const chatWord: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatWordAction> = (set, get) => ({
    async getCompletedWords() {
        try {
            const { currentFileId, files } = get()
            if (!currentFileId) return []
            const allWords = files.find((f) => f.id === currentFileId)?.words
            return allWords?.filter((word) => word.nextReview === null)
        } catch (error) {
            console.error('Failed to get completed words:', error)
            return []
        }
    },

    // 添加到历史记录的文件中
    async addWordToFile(word: Content, fileName: string) {
        try {
            console.log('Starting to add word to History file', word)
            console.log('fileName is', fileName)

            const currentDate = new Date()
            const { selectedGroup, setCurrentWordPositions, selectedFiles, currentFileId, files, selectFile } = get()

            // 第一部分：获取或创建目标文件
            const targetFile = get().getOrCreateTargetFile(fileName, selectedGroup, currentFileId, selectedFiles, files)
            if (!targetFile) {
                throw new Error('Failed to get or create target file')
            }

            // 第二部分：添加单词到目标文件
            const result = await get().addWordToTargetFile(word, targetFile, currentDate)
            if (!result) {
                throw new Error('Failed to add word to target file')
            }

            selectFile(result.fileId)
            console.log('Word added to History file:', { fileId: result.fileId, wordIdx: result.wordIdx })
            setCurrentWordPositions(result.fileId, result.wordIdx)
            return result
        } catch (error) {
            console.error('Failed to add word to History file:', error)
            toast.error('Failed to add word to History file')
            return null
        }
    },

    // 获取或创建目标文件
    getOrCreateTargetFile(
        fileName: string,
        selectedGroup: string,
        currentFileId: number | null,
        selectedFiles: SavedFile[],
        files: SavedFile[]
    ): SavedFile {
        const currentFile = selectedFiles.find((file) => file.id === currentFileId)
        let targetFile = currentFile || selectedFiles.find((file) => file.name === fileName)

        if (!targetFile) {
            targetFile = {
                id: files.length > 0 ? Math.max(...files.map((f) => f.id || 0)) + 1 : 1,
                name: fileName,
                category: selectedGroup,
                words: [],
            }

            set(
                produce((draft) => {
                    draft.files.push(targetFile)
                    draft.selectedFiles.push(targetFile)
                })
            )
        }

        return targetFile
    },

    // 添加单词到目标文件
    addWordToTargetFile(
        word: Content,
        targetFile: SavedFile,
        currentDate: Date
    ): Promise<{ fileId: number; wordIdx: number }> {
        // 获取新单词的 idx
        const getNextIdx = (fileId: number) => {
            const file = get().files.find((f) => f.id === fileId)
            if (!file?.words?.length) return 1
            return Math.max(...file.words.map((w) => w.idx)) + 1
        }

        const nextIdx = targetFile.id ? getNextIdx(targetFile.id) : 1
        const wordCopy: Content = {
            ...word,
            idx: nextIdx,
            inHistory: true,
            lastReviewed: currentDate,
        }

        let addedFileId = 0
        let addedWordIdx = 0

        set(
            produce((draft) => {
                const fileToUpdate = draft.files.find((file: SavedFile) => file.id === targetFile.id)
                if (fileToUpdate) {
                    if (!fileToUpdate.words) {
                        fileToUpdate.words = []
                    }
                    fileToUpdate.words.push(wordCopy)
                    addedFileId = fileToUpdate.id || 0
                    addedWordIdx = wordCopy.idx
                }
                draft.selectedWord = wordCopy
                draft.currentFileId = addedFileId
            })
        )

        return Promise.resolve({ fileId: addedFileId, wordIdx: addedWordIdx })
    },

    loadWords: async (fileId: number, pageNumber: number, pageSize: number) => {
        console.log('fileId is', fileId)
        if (fileId === 0) {
            return false
        }
        const { files } = get()
        try {
            const file = files.find((f) => f.id === fileId)
            if (!file) {
                console.error('File not found')
                return false
            }

            if (file.words.length > 0) {
                set(
                    produce((draft) => {
                        draft.words = file.words
                        draft.currentPage = pageNumber
                        draft.totalPages = Math.ceil(file.words.length / pageSize)
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

    setSelectedGroup(category: string) {
        set({ selectedGroup: category, currentFileId: null })
    },

    setCurrentWordPositions: (fileId: number, wordIdx: number) => {
        set(
            produce((draft) => {
                draft.currentWordPositions[fileId] = wordIdx
            })
        )
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
    selectWord: (word: Content | null) => {
        const { currentFileId, setAnswers } = get()

        set(
            produce((draft) => {
                draft.selectedWord = word
                if (currentFileId) {
                    draft.currentWordPositions[currentFileId] = word?.idx
                }
                draft.quoteText = word?.text || ''
                draft.answers = word?.answers || {}
                setAnswers(draft.answers)
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

    deleteSelectedWord: () => {
        set({ selectedWord: null, answers: {} })
    },

    // 更新单词答案
    updateWordAnswer: async (
        actionName: string,
        answerText: string,
        answerFormat?: ActionOutputRenderingFormat,
        messageId?: string,
        conversationId?: string
    ) => {
        try {
            const { updateFileWords, currentFileId, selectedWord, selectedGroup, files } = get()
            let fileId = currentFileId
            let wordIdx = selectedWord?.idx
            if (!fileId) {
                const targetFiles = files.filter((f: SavedFile) => f.category === selectedGroup)
                fileId = targetFiles.length + 1
            }
            if (!wordIdx) {
                const targetFile = files.find((f: SavedFile) => f.id === fileId)
                wordIdx = targetFile?.words.length ? targetFile.words.length + 1 : 1
            }
            updateFileWords(fileId, (words) =>
                words.map((word) => {
                    if (word.idx === wordIdx) {
                        return {
                            ...word,
                            messageId,
                            conversationId,
                            answers: {
                                ...word.answers,
                                [actionName]: {
                                    text: answerText,
                                    format: answerFormat || 'markdown',
                                },
                            },
                        }
                    }
                    return word
                })
            )
        } catch (error) {
            console.error('更新单词答案失败:', error)
            // 这里可以添加错误处理逻辑，如显示错误提示等
        }
    },

    updateWordAnswers: (answers: Answers) => {
        try {
            const { updateFileWords, currentFileId, selectedWord, selectedGroup, files } = get()
            let fileId = currentFileId
            let wordIdx = selectedWord?.idx
            if (!fileId) {
                const targetFiles = files.filter((f: SavedFile) => f.category === selectedGroup)
                fileId = targetFiles.length + 1
            }
            if (!wordIdx) {
                const targetFile = files.find((f: SavedFile) => f.id === fileId)
                wordIdx = targetFile?.words.length ? targetFile.words.length + 1 : 1
            }
            updateFileWords(fileId, (words) =>
                words.map((word) => {
                    if (word.idx === wordIdx) {
                        return {
                            ...word,
                            answers: answers,
                        }
                    }
                    return word
                })
            )
        } catch (error) {
            console.error('更新单词答案失败:', error)
            // 这里可以添加错误处理逻辑，如显示错误提示等
        }
    },

    // 更新content的sentenceAnswers
    updateSentenceAnswer: async (fileId: number, wordIdx: number, index: number, sentenceAnswerText: string) => {
        set(
            produce((draft) => {
                const file = draft.files.find((f: SavedFile) => f.id === fileId)
                if (!file) console.error('File not found')

                const word = file.words.find((w: Content) => w.idx === wordIdx) || draft.selectedWord
                if (!word) console.error('Word not found')

                if (!word.sentenceAnswers) {
                    word.sentenceAnswers = []
                }
                const existingAnswerIndex = word.sentenceAnswers.findIndex((a: FollowUpAnswer) => a.idx === index)

                if (existingAnswerIndex !== -1) {
                    // 更新现有答案，只添加新内容
                    const existingAnswer = word.sentenceAnswers[existingAnswerIndex]
                    const newContent = sentenceAnswerText.replace(existingAnswer.text, '').trim()
                    word.sentenceAnswers[existingAnswerIndex] = {
                        ...existingAnswer,
                        text: existingAnswer.text + (newContent ? '\n\n' + newContent : ''),
                        updatedAt: new Date(),
                    }
                    // 更新selectedWord
                    draft.selectedWord = word
                } else {
                    // 添加新答案
                    word.sentenceAnswers.push({
                        idx: index,
                        text: sentenceAnswerText,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    // 更新selectedWord
                    draft.selectedWord = word
                }
            })
        )
    },

    // 更新content的 followUpAnswer
    updateFollowUpAnswer: async (
        fileId: number,
        wordIdx: number,
        index: number,
        followUpAnswerText: string,
        actionName: string
    ) => {
        set(
            produce((draft) => {
                const file = draft.files.find((f: SavedFile) => f.id === fileId)
                if (!file) console.error('File not found')

                const word = file.words.find((w: Content) => w.idx === wordIdx) || draft.selectedWord
                if (!word) console.error('Word not found')

                if (!word.answers) {
                    word.answers = {}
                }

                const answer = word.answers[actionName]
                if (!answer.followUpAnswers) {
                    answer.followUpAnswers = []
                }

                const existingAnswerIndex = answer.followUpAnswers.findIndex((a: FollowUpAnswer) => a.idx === index)

                if (existingAnswerIndex !== -1) {
                    // 更新现有答案
                    const existingAnswer = answer.followUpAnswers[existingAnswerIndex]
                    const newContent = followUpAnswerText.replace(existingAnswer.text, '').trim()
                    answer.followUpAnswers[existingAnswerIndex] = {
                        ...existingAnswer,
                        text: existingAnswer.text + (newContent ? '\n\n' + newContent : ''),
                        updatedAt: new Date(),
                    }
                    // 更新selectedWord
                    draft.selectedWord = word
                } else {
                    // 添加新答案
                    answer.followUpAnswers.push({
                        idx: index,
                        text: followUpAnswerText,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                    // 更新selectedWord
                    draft.selectedWord = word
                }
            })
        )
    },

    setAnswers: async (answers: Answers) => {
        set({ answers })
    },

    setActionGroups: (actions: Action[]) => {
        const groups = actions.reduce((groups: ActionGroups, action) => {
            if (!action.groups) return groups
            action.groups.forEach((group) => {
                if (!groups[group]) groups[group] = []
                groups[group].push(action)
            })
            return groups
        }, {} as ActionGroups)
        console.log('groups', groups)
        set({ actionGroups: groups })
    },

    updateSelectedWordText: (text: string) => {
        const { currentFileId, selectedWord } = get()

        if (!currentFileId || !selectedWord) {
            console.warn('No current file or selected word')
            return
        }

        set(
            produce((draft) => {
                // 更新 files 中的 word
                const file = draft.files.find((f: SavedFile) => f.id === currentFileId)
                if (file) {
                    const word = file.words.find((w: Content) => w.idx === selectedWord.idx)
                    if (word) {
                        word.text = text
                    }
                }

                // 更新 selectedWord
                if (draft.selectedWord) {
                    draft.selectedWord.text = text
                }

                // 更新 quoteText
                draft.quoteText = text
            })
        )
    },

    resetInitialState: () => {
        set(
            produce((draft) => {
                // 重置相关状态
                draft.words = []
                draft.answers = {}
                draft.selectedWord = null
                draft.selectedGroup = 'Unsorted' // 或其他默认值
                // 其他需要重置的状态...
            })
        )
    },
})
