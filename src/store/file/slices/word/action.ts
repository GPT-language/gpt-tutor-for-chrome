import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { ChatStore } from '../../store'
import { Answers, Word, SavedFile, ActionOutputRenderingFormat, FollowUpAnswer } from '@/common/internal-services/db'
import { strategyOptions } from '@/common/components/ReviewSettings'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any

export interface ChatWordAction {
    deleteSelectedWord: () => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: Word) => void
    deleteWords: () => void
    loadWords: (fileId: number, pageNumber: number, pageSize: number) => Promise<boolean>
    addWordToFile: (word: Word, fileName: string) => Promise<{ fileId: number; wordIdx: number } | null | undefined>
    setAnswers: (answers: Answers) => void
    setSelectedGroup: (group: string) => void
    updateWordAnswer: (
        fileId: number,
        wordIdx: number,
        actionName: string,
        answerText: string,
        answerFormat?: ActionOutputRenderingFormat,
        messageId?: string,
        conversationId?: string
    ) => Promise<void>
    updateFollowUpAnswer: (
        fileId: number,
        wordIdx: number,
        actionName: string,
        index: number,
        followUpAnswerText: string
    ) => Promise<void>
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

    async addWordToFile(word: Word, fileName: string) {
        try {
            console.log('Starting to add word to History file', word)
            console.log('fileName is', fileName)

            const currentDate = new Date()
            const { selectedGroup } = get()
            let addedFileId = 0
            let addedWordIdx = 0

            set(
                produce((draft) => {
                    // 搜索当前类别中是否存在历史文件
                    let targetFile = draft.selectedFiles.find((file: SavedFile) => file.name === fileName)

                    if (!targetFile) {
                        // 如果历史文件不存在，创建新文件
                        targetFile = {
                            // 获取最大的 fileId 并加 1，保证文件的唯一性
                            id:
                                draft.files.length > 0
                                    ? Math.max(...draft.files.map((f: SavedFile) => f.id || 0)) + 1
                                    : 1,
                            name: fileName,
                            category: selectedGroup,
                            words: [],
                        }
                        draft.files.push(targetFile)
                        draft.selectedFiles.push(targetFile)
                    }

                    // 创建单词的副本并添加到历史文件
                    const wordCopy: Word = {
                        ...word,
                        idx: targetFile.words.length + 1, // 新的索引
                        inHistory: true,
                        lastReviewed: currentDate,
                    }

                    // 直接修改 files 数组中的对象
                    draft.files.find((file: SavedFile) => file.id === targetFile.id)?.words.push(wordCopy)

                    console.log('Word added to History file:', wordCopy.idx)
                    addedFileId = targetFile.id
                    addedWordIdx = wordCopy.idx
                })
            )
            console.log('Word added to History file:', { fileId: addedFileId, wordIdx: addedWordIdx })
            // 3. 更新 状态

            set({ currentFileId: addedFileId })
            return { fileId: addedFileId, wordIdx: addedWordIdx }
        } catch (error) {
            console.error('Failed to add word to History file:', error)
            toast.error('Failed to add word to History file')
            return null
        }
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
        set({ selectedGroup: category, currentFileId: null, selectedWord: null })
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
    selectWord: (word: Word | null) => {
        const { currentFileId, setAnswers } = get()

        set(
            produce((draft) => {
                draft.selectedWord = word
                if (currentFileId !== null && currentFileId !== undefined) {
                    draft.selectedWords[currentFileId] = word
                }
                draft.editableText = word?.text || ''
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
        fileId: number,
        wordIdx: number,
        actionName: string,
        answerText: string,
        answerFormat?: ActionOutputRenderingFormat
    ) => {
        try {
            set(
                produce((draft) => {
                    const fileIndex = draft.files.findIndex((f: SavedFile) => f.id === fileId)
                    if (fileIndex === -1) throw new Error('File not found')

                    const wordToUpdate = draft.files[fileIndex].words.find((w: Word) => w.idx === wordIdx)
                    if (wordToUpdate) {
                        if (!wordToUpdate.answers) {
                            wordToUpdate.answers = {}
                        }
                        wordToUpdate.answers[actionName] = {
                            text: answerText,
                            format: answerFormat || 'markdown',
                        }
                    }
                })
            )
        } catch (error) {
            console.error('更新单词答案失败:', error)
            // 这里可以添加错误处理逻辑，如显示错误提示等
        }
    },

    // 更新单词的 followUpAnswer
    updateFollowUpAnswer: async (
        fileId: number,
        wordIdx: number,
        actionName: string,
        index: number,
        followUpAnswerText: string
    ) => {
        set(
            produce((draft) => {
                const file = draft.files.find((f: SavedFile) => f.id === fileId)
                if (!file) console.error('File not found')

                const word = file.words.find((w: Word) => w.idx === wordIdx)
                if (!word) console.error('Word not found')

                if (!word.answers) {
                    word.answers = {}
                }

                if (!word.answers[actionName]) {
                    word.answers[actionName] = { text: '', format: 'markdown', followUpAnswers: [] }
                }

                const answer = word.answers[actionName]
                if (!answer.followUpAnswers) {
                    answer.followUpAnswers = []
                }

                const existingAnswerIndex = answer.followUpAnswers.findIndex((a: FollowUpAnswer) => a.idx === index)

                if (existingAnswerIndex !== -1) {
                    // 更新现有答案
                    answer.followUpAnswers[existingAnswerIndex] = {
                        ...answer.followUpAnswers[existingAnswerIndex],
                        text: answer.followUpAnswers[existingAnswerIndex].text + followUpAnswerText,
                        updatedAt: new Date(),
                    }
                } else {
                    // 添加新答案
                    answer.followUpAnswers.push({
                        idx: index,
                        text: followUpAnswerText,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                }
            })
        )
    },

    setAnswers: async (answers: Answers) => {
        set({ answers })
    },
})
