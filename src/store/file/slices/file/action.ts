import { StateCreator } from 'zustand'
import { produce } from 'immer'
import { parse } from 'papaparse'
import { fileService } from '@/common/internal-services/file'
import { ChatStore } from '../../store'
import { Action, SavedFile, Word } from '@/common/internal-services/db'
import { getInitialFileState } from '../file/initialState'

export interface ChatFileAction {
    getInitialFile: () => Promise<boolean>
    addFile: (file: File, category: string) => Promise<number>
    selectFile: (fileId: number) => void
    deleteFile: (fileId: number) => Promise<void>
    addCategory: (category: string) => void
    deleteCategory: (category: string) => void
    searchWord: (searchTerm: string) => void
    selectWord: (word: Word) => void
    deleteWords: () => void
    loadWords: (fileId: number, pageNumber: number) => Promise<boolean>
    loadFiles: (selectedCategory: string) => Promise<void>
    setCurrentFileId: (fileId: number) => void
    setFiles: (files: SavedFile[]) => void
    setSelectedCategory: (category: string) => void
    addWordToLearningFile: (word: Word) => Promise<void>
    checkIfInitialized: () => Promise<boolean>
    initializeReviewFiles(): Promise<void>
    updateTranslationText: (translationText: string, actionName: string) => void
    setActions: (actions: Action[]) => void
    setAction: (action: Action) => void
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
                draft.words = words
                draft.currentFileId = fileId
                draft.files.push({ id: fileId, name: file.name, category: category, words: words })
                draft.currentPage = 1
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
        const category = '学习'
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

    async addWordToLearningFile(word: Word) {
        try {
            console.log('Starting to add/update word', word)
            const { selectedCategory, currentFileId, selectWord, words } = get()
            const currentDate = new Date()
            const reviewCount = word.reviewCount || 0
            const nextReviewDate = fileService.getNextReviewDate(currentDate, reviewCount)
            const fileName = '待复习' + selectedCategory

            const updatedWord = {
                ...word,
                lastReviewed: currentDate,
                nextReview: nextReviewDate,
                reviewCount: reviewCount + 1,
            }

            console.log('Updated word:', updatedWord)

            if (selectedCategory === '学习' && currentFileId) {
                console.log('Updating word in file with ID:', currentFileId)
                await fileService.updateWordInFile(currentFileId, word.idx, updatedWord)
                const reviewedWords = words.filter((w) => w.idx !== word.idx)
                set({ words: reviewedWords })
                const nextWord = reviewedWords[0]
                selectWord(nextWord || null)
                console.log('Selected next word or cleared:', nextWord)
            } else {
                console.log('Fetching files for category 学习')
                const files = await fileService.fetchFilesByCategory('学习')
                const targetFile = files.find((file) => file.name === fileName)
                if (targetFile?.id) {
                    console.log('Updating word in existing file:', targetFile.id)
                    await fileService.updateWordInFile(targetFile.id, word.idx, updatedWord)
                } else {
                    console.log('Creating new file:', fileName)
                    await fileService.createFile(fileName, '学习', [updatedWord])
                }
            }
        } catch (error) {
            console.error('Failed to add word to learning file:', error)
        }
    },

    loadWords: async (fileId, pageNumber) => {
        const currentCategory = get().selectedCategory
        try {
            if (currentCategory === '学习') {
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
            }
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
    selectWord: (word: Word) => {
        const { currentFileId } = get()

        set(
            produce((draft) => {
                draft.selectedWord = word
                draft.selectedWords[currentFileId] = word
                chrome.storage.local.set({ selectedWord: JSON.stringify(draft.selectedWord) })
                chrome.storage.local.set({ selectedWords: JSON.stringify(draft.selectedWords) })
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

    updateTranslationText: (newText: string, actionName: string) => {
        set(
            produce((draft) => {
                // 确保 selectedWord 和 translations 存在
                if (!draft.selectedWord.translations) {
                    draft.selectedWord.translations = {} // 如果没有translations，则初始化为空对象
                }

                // 检查特定 actionName 是否存在于 translations 中
                if (!draft.selectedWord.translations[actionName]) {
                    draft.selectedWord.translations[actionName] = { text: newText } // 如果不存在，则创建并设置文本
                } else {
                    draft.selectedWord.translations[actionName].text = newText // 如果已存在，则更新文本
                }
            })
        )
    },

    setActions: (actions: Action[]) => {
        set({ actions })
    },

    setAction: (activatedAction: Action) => {
        set({ activatedAction })
    },
})
