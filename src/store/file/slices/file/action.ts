import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file'
import { ChatStore } from '../../store'
import { ReviewSettings, SavedFile, Translations, Word } from '@/common/internal-services/db'
import { getInitialFileState } from '../file/initialState'
import i18n from '@/common/i18n'
import { strategyOptions } from '@/common/components/ReviewSettings'
import toast from 'react-hot-toast'

declare const chrome: any

export interface ChatFileAction {
    getInitialFile: () => Promise<boolean>
    addFile: (file: File, category: string) => Promise<number>
    selectFile: (fileId: number) => void
    deleteFile: (fileId: number) => Promise<void>
    deleteSelectedWord: () => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: Word) => void
    selectWordNotInCurrentFile: (text: string) => void
    deleteWords: () => void
    loadWords: (fileId: number, pageNumber: number, pageSize: number) => Promise<boolean>
    loadFiles: (selectedGroup: string) => Promise<void>
    setCurrentFileId: (fileId: number) => void
    setCurrentPage: (page: number) => void
    setFiles: (files: SavedFile[]) => void
    addWordToReviewFile: (word: Word, fileName: string) => Promise<void>
    updateReviewStatus: (word: Word) => Promise<void>
    markWordAsLearned: (word: Word, fileName: string) => Promise<void>
    markWordAsForgotten: (word: Word) => Promise<void>
    addWordToHistoryFile: (word: Word) => Promise<void>
    checkIfInitialized: () => Promise<boolean>
    initializeReviewFiles(): Promise<void>
    updateTranslationText: (translationText: string, actionName: string, wordContent?: string) => void
    setTranslations: (translations: Translations) => void
    setSelectedGroup: (group: string) => void
}

export const chatFile: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatFileAction> = (set, get) => ({
    getInitialFile: async () => {
        const ChatFileState = await getInitialFileState()
        set(ChatFileState)
        return true
    },
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
            reviewCount: 0,
        }))

        const fileId = await fileService.addFile(file.name, words, category)
        localStorage.setItem('currentFileId', fileId.toString())
        set(
            produce((draft) => {
                draft.selectedWord = words[0]
                draft.currentPage = 1
                draft.currentFileId = fileId
                draft.words = words
                draft.files.push({ id: fileId, name: file.name, category: category, words: words })
            })
        )
        return words.length
    },

    async checkIfInitialized() {
        const files = await fileService.fetchFilesByCategory('学习')
        if (files.length > 0) {
            return true
        }

        return false
    },

    async initializeReviewFiles() {
        // 检查是否初始化，如果已经初始化，返回
        const isInitialized = await get().checkIfInitialized()
        if (isInitialized) {
            return
        }
        const intervals = [0, 1, 3, 5, 7] // 复习间隔天数
        const category = i18n.t('Review')
        const files = []

        for (let i = 0; i < intervals.length; i++) {
            const interval = intervals[i]
            const fileName = interval === 0 ? '待复习' : `${interval}天后复习`
            const fileId = i + 1 // ID从1开始递增

            // 调用文件服务创建文件
            await fileService.createFile(fileName, category, [])
            const newFile = {
                id: fileId, // 这里假设createFile返回了正确的文件ID
                name: fileName,
                category: category,
                words: [], // 初始时没有单词
            }
            files.push(newFile)
        }

        // 更新全局状态
        set({ files }) // 假设zustand的状态设置方法
        console.log('Review files initialized successfully.')
    },

    async getCompletedWords() {
        try {
            const { currentFileId } = get()
            if (!currentFileId) return []
            const allWords = await fileService.fetchAllWordsInFile(currentFileId)
            return allWords.filter((word) => word.nextReview === null)
        } catch (error) {
            console.error('Failed to get completed words:', error)
            return []
        }
    },

    async addWordToReviewFile(word, fileName) {
        const { currentFileId, selectedGroup } = get()
        const reviewCategory = 'Review'

        // 检查单词是否已经存在于复习文件中
        const reviewFiles = await fileService.fetchFilesByCategory(reviewCategory)
        const targetFile = reviewFiles.find((file) => file.name === fileName)

        if (targetFile && targetFile.id) {
            const existingWords = await fileService.fetchAllWordsInFile(targetFile.id)
            const wordExists = existingWords.some((w) => w.text === word.text)

            if (wordExists) {
                throw new Error('This word has already been added to review.')
            }
        }

        const currentDate = new Date()
        let fileLength
        let reviewSettings: ReviewSettings | undefined
        if (selectedGroup !== 'Review') {
            fileLength = await fileService.getFileLengthByName(reviewCategory, fileName)
        } else {
            fileLength = await fileService.getFileLengthById(currentFileId)
        }
        if (currentFileId) {
            const currentFile = await fileService.fetchFileDetailsById(currentFileId)
            reviewSettings = currentFile.reviewSettings
        }

        const reviewCount = word.reviewCount || 0
        const nextReviewDate = fileService.getNextReviewDate(
            currentDate,
            reviewCount,
            reviewSettings ? reviewSettings?.interval : strategyOptions[2].array
        )

        const newWordIdx = reviewCount === 0 ? fileLength + 1 : word.idx
        let updatedWord: Word
        if (nextReviewDate) {
            updatedWord = {
                ...word,
                idx: newWordIdx,
                lastReviewed: currentDate,
                nextReview: nextReviewDate,
                reviewCount: reviewCount + 1,
            }
        } else {
            updatedWord = {
                ...word,
                idx: newWordIdx,
                completed: true,
            }
        }

        if (targetFile?.id) {
            await fileService.updateWordInFile(targetFile.id, newWordIdx, updatedWord)
        } else {
            await fileService.createFile(fileName, reviewCategory, [updatedWord], reviewSettings)
        }
    },

    async updateReviewStatus(word: Word) {
        try {
            const { selectWord, currentFileId } = get()
            const currentDate = new Date()
            if (!currentFileId) {
                return
            }
            const currentFile = await fileService.fetchFileDetailsById(currentFileId)
            const reviewSettings = currentFile.reviewSettings
            const nextReviewDate = fileService.getNextReviewDate(
                currentDate,
                word.reviewCount + 1,
                reviewSettings ? reviewSettings?.interval : strategyOptions[2].array
            )
            let updatedWord: Word
            if (!nextReviewDate) {
                updatedWord = {
                    ...word,
                    completed: true,
                }
                return
            }
            updatedWord = {
                ...word,
                lastReviewed: currentDate,
                nextReview: nextReviewDate,
                reviewCount: word.reviewCount + 1,
            }
            const updatedWords = await fileService.updateWordInFile(currentFileId, word.idx, updatedWord)
            const disPlayedWords = updatedWords.filter(
                (word) => !word.completed && word.nextReview && word.nextReview <= currentDate
            )
            if (disPlayedWords.length === 0) {
                // 没有更多需要复习的单词
                set({ words: [], selectedWord: null })
                // 可能还需要更新其他状态，比如通知用户所有单词已复习完成
            } else {
                set({ words: disPlayedWords })
                const nextWord = disPlayedWords[0]
                selectWord(nextWord)
            }
        } catch (error) {
            console.error('Failed to update review status:', error)
        }
    },

    async markWordAsLearned(word: Word, fileName: string) {
        const { currentFileId, selectedGroup } = get()
        const reviewCategory = 'Review'

        // 检查单词是否已经存在于复习文件中
        const reviewFiles = await fileService.fetchFilesByCategory(reviewCategory)
        const targetFile = reviewFiles.find((file) => file.name === fileName)

        if (targetFile && targetFile.id) {
            const existingWords = await fileService.fetchAllWordsInFile(targetFile.id)
            const wordExists = existingWords.some((w) => w.text === word.text)

            if (wordExists) {
                throw new Error('This word has already been added to review.')
            }
        }

        let fileLength
        let reviewSettings: ReviewSettings | undefined
        if (selectedGroup !== 'Review') {
            fileLength = await fileService.getFileLengthByName(reviewCategory, fileName)
        } else {
            fileLength = await fileService.getFileLengthById(currentFileId)
        }
        if (currentFileId) {
            const currentFile = await fileService.fetchFileDetailsById(currentFileId)
            reviewSettings = currentFile.reviewSettings
        }

        const reviewCount = word.reviewCount || 0

        const newWordIdx = reviewCount === 0 ? fileLength + 1 : word.idx
        const updatedWord = {
            ...word,
            idx: newWordIdx,
            completed: true,
        }

        if (targetFile?.id) {
            await fileService.updateWordInFile(targetFile.id, newWordIdx, updatedWord)
        } else {
            await fileService.createFile(fileName, reviewCategory, [updatedWord], reviewSettings)
        }
        toast.success('Mark as learned')
    },

    async markWordAsForgotten(word: Word) {
        try {
            const { selectWord } = get()
            const updatedWord = {
                ...word,
                lastReviewed: new Date(),
                nextReview: new Date(),
                reviewCount: 1,
            }

            const { currentFileId } = get()
            if (!currentFileId) {
                toast.error('No current file exists')
                return
            }
            const updatedWords = await fileService.updateWordInFile(currentFileId, word.idx, updatedWord)
            const disPlayedWords = updatedWords.filter((word) => word.nextReview && word.nextReview <= new Date())
            set({ words: disPlayedWords })
            const nextWord = disPlayedWords[0]
            selectWord(nextWord || null)
        } catch (error) {
            const { setActionStr } = get()
            setActionStr(JSON.stringify(error.message))
            console.error('Failed to mark word as forgotten:', error)
        }
    },

    // 添加到历史记录的文件中

    async addWordToHistoryFile(word: Word) {
        try {
            console.log('Starting to add/update word in History file', word)
            const currentDate = new Date()
            const formattedDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '/') // 格式化日期
            const fileName = formattedDate // 文件名为当前日期
            const updatedWord = {
                ...word,
                lastReviewed: currentDate,
                nextReview: undefined, // 假设 History 类别不需要复习日期
                reviewCount: 0,
            }

            console.log('Updated word for History:', updatedWord)

            // 尝试在历史文件中更新单词
            console.log('Fetching files for category History')
            const files = await fileService.fetchFilesByCategory('History')
            const targetFile = files.find((file) => file.name === fileName)
            if (targetFile?.id) {
                console.log('Updating word in existing file:', targetFile.id)
                await fileService.updateWordInFile(targetFile.id, word.idx, updatedWord)
            } else {
                console.log('Creating new file with date:', fileName)
                await fileService.createFile(fileName, 'History', [updatedWord])
            }
        } catch (error) {
            const { setActionStr } = get()
            setActionStr(JSON.stringify(error.message))
            console.error('Failed to add word to History file:', error)
        }
    },

    loadWords: async (fileId, pageNumber, pageSize) => {
        if (fileId === 0) {
            return false
        }
        const currentCategory = get().selectedGroup
        try {
            if (currentCategory === 'Review') {
                const reviewWords = await fileService.getWordsToReviewByFileId(fileId)
                if (reviewWords) {
                    set(
                        produce((draft) => {
                            draft.words = reviewWords
                            console.log('New words set:', reviewWords)
                        })
                    )
                    return true
                }
                return false
            } else {
                const words = await fileService.loadWordsByPage(fileId, pageNumber, pageSize)
                if (words) {
                    set(
                        produce((draft) => {
                            draft.words = words
                        })
                    )
                    return true
                }
                return false // 加载失败
            }
        } catch (error) {
            console.error('Error loading words:', error)
            return false
        }
    },

    loadFiles: async (selectedGroup) => {
        const files = await fileService.fetchFilesByCategory(selectedGroup)
        set({ files })
    },

    setCurrentFileId: (fileId: number) => {
        set({ currentFileId: fileId })
        localStorage.setItem('currentFileId', fileId.toString())
    },

    setCurrentPage: (page: number) => {
        set({ currentPage: page })
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
        const { selectedGroup, loadFiles, currentFileId, setCurrentFileId } = get()
        await fileService.deleteFile(fileId)
        set(
            produce((draft) => {
                draft.words = []
                draft.files = draft.files.filter((file: { id: number; name: string }) => file.id !== fileId)
                draft.currentFileId = 0 // 先重置为0
            })
        )
        await loadFiles(selectedGroup) // 等待文件列表加载完毕
        const files = get().files
        if (files.length > 0) {
            setCurrentFileId(files[0].id || 0) // 设置为新的有效ID
        } else {
            setCurrentFileId(0)
        }
        if (currentFileId !== null) {
            localStorage.setItem('currentFileId', currentFileId.toString())
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
        const { currentFileId, editableText } = get()

        set(
            produce((draft) => {
                draft.selectedWord = word
                if (currentFileId !== null && currentFileId !== undefined) {
                    draft.selectedWords[currentFileId] = word
                }
                draft.editableText = word?.text || ''
                draft.translations = word?.translations || {}
                chrome.storage.local.set({ selectedWord: JSON.stringify(draft.selectedWord) })
                chrome.storage.local.set({ selectedWords: JSON.stringify(draft.selectedWords) })
            })
        )
    },

    selectWordNotInCurrentFile: async (text) => {
        const { addWordToHistoryFile, selectWord } = get()
        const category = 'History'
        const currentDate = new Date()
        const formattedDate = currentDate.toISOString().slice(0, 10).replace(/-/g, '/') // 格式化日期
        const fileName = formattedDate
        let wordIdx: number
        const wordLength = await fileService.getFileLengthByName(category, fileName)
        if (wordLength === 0) {
            wordIdx = 1
        } else {
            wordIdx = wordLength + 1
        }
        const word: Word = { idx: wordIdx, text: text, reviewCount: 0 }
        await addWordToHistoryFile(word)
        selectWord(word)
    },

    deleteWords: () => {
        set(
            produce((draft) => {
                draft.words = []
            })
        )
    },

    deleteSelectedWord: () => {
        set({ selectedWord: null, translations: {} })
    },

    // 该方法并不处理indexDB中的保存，只负责更新显示状态
    // selectWordNotInCurrentFile方法负责将搜索结果中的单词idx和text添加到历史文件中，该方法则负责更新其中的translations
    updateTranslationText: async (newText: string, actionName: string, wordContent?: string) => {
        try {
            const category = 'History'
            const formattedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
            const files = await fileService.fetchFilesByCategory(category)
            const file = files.find((file) => file.category === category && file.name === formattedDate)
            const wordInFile = file?.words.find((w) => w.text === wordContent)

            set(
                produce((draft) => {
                    // 更新全局 translations 状态
                    if (!draft.translations) {
                        draft.translations = {}
                    }

                    if (!draft.translations[actionName]) {
                        draft.translations[actionName] = { text: newText, format: 'markdown' }
                    } else {
                        draft.translations[actionName].text = newText
                    }

                    // 如果 selectedWord 存在，也更新它的 translations
                    if (draft.selectedWord) {
                        if (!draft.selectedWord.translations) {
                            draft.selectedWord.translations = {}
                        }
                        draft.selectedWord.translations[actionName] = { text: newText, format: 'markdown' }
                    }

                    // 验证 word 是否存在于 words 数组中
                    const wordInWords = draft.words.find((word: Word) => word.text === wordContent)

                    if (!wordInWords) {
                        console.log('word is not in words')
                        if (wordInFile) {
                            draft.selectedWord = {
                                ...wordInFile,
                                translations: { ...draft.translations },
                            }
                        } else if (wordContent) {
                            draft.selectedWord = {
                                text: wordContent,
                                translations: { ...draft.translations },
                            }
                        }
                    } else {
                        // 更新 words 数组中的 word 的 translations
                        wordInWords.translations = { ...draft.translations }
                    }

                    console.log('Updated translations:', draft.translations)
                })
            )

            // 如果需要，这里可以添加将更新后的数据保存到数据库的逻辑
            // await fileService.updateWordInFile(...)
        } catch (error) {
            console.error('更新翻译文本时出错:', error)
            // 可以在这里添加错误处理逻辑，如显示错误提示等
        }
    },

    setTranslations: (translations: Translations) => {
        set({ translations })
    },
})
