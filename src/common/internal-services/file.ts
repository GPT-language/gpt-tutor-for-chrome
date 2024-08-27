import { ReviewSettings, SavedFile, Translations, Word, getLocalDB, ActionOutputRenderingFormat } from './db'

export class FileService {
    private db = getLocalDB()
    private pageSize = 10

    private async getFileOrThrow(fileId: number): Promise<SavedFile> {
        const file = await this.db.files.get(fileId)
        if (!file) {
            throw new Error(`File with ID ${fileId} not found`)
        }
        return file
    }

    // 添加新文件
    async addFile(name: string, words: Word[], category: string): Promise<number> {
        const fileId = await this.db.files.add({ name, words, category })
        return fileId
    }

    // 更新文件信息
    async updateFile(
        fileId: number,
        updatedData: { fileName?: string; words?: Word[]; category?: string; reviewSettings?: ReviewSettings }
    ): Promise<void> {
        await this.db.files.update(fileId, updatedData)
    }

    // 删除文件
    async deleteFile(fileId: number): Promise<void> {
        await this.db.files.delete(fileId)
    }

    async deleteFilesByCategory(cat: string): Promise<void> {
        await this.db.files.where({ category: cat }).delete()
    }

    // 获取文件详情
    async fetchFileDetailsById(fileId: number): Promise<SavedFile> {
        return this.getFileOrThrow(fileId)
    }

    // 获取所有文件
    async fetchAllFiles(): Promise<SavedFile[]> {
        const files = await this.db.files.toArray()
        return files
    }

    // 获取文件名和类别
    async fetchFilesWithoutWords(): Promise<{ name: string; category: string; id?: number }[]> {
        const files = await this.db.files.toArray()
        return files.map((file) => ({ name: file.name, category: file.category, id: file.id }))
    }

    async fetchAllWordsInFile(fileId: number): Promise<Word[]> {
        const file = await this.fetchFileDetailsById(fileId)
        return file.words
    }

    // 获取文件名和ID（按类别）
    async fetchFilesByCategory(category: string): Promise<SavedFile[]> {
        const files = await this.db.files.where({ category }).toArray()
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return files.map((file) => ({ id: file.id, name: file.name, category: file.category, words: file.words }))
    }

    async fetchFileByCategoryAndName(category: string, name: string): Promise<SavedFile | null> {
        const fileId = await this.getFileIdByName(category, name)
        if (fileId) {
            return this.fetchFileDetailsById(fileId)
        } else {
            return null
        }
    }

    async getFileIdByName(category: string, name: string): Promise<number | null> {
        try {
            // 查询指定类别的所有文件
            const files = await this.db.files.where({ category }).toArray()
            // 在结果中寻找匹配指定名称的文件
            const file = files.find((file) => file.name === name)

            // 如果找到了文件，返回其 ID
            if (file && file.id) {
                return file.id
            } else {
                // 如果没有找到文件，可以返回 null 或抛出一个错误
                console.log(`No file found with name '${name}' in category '${category}'`)
                return null
            }
        } catch (error) {
            console.error('Failed to retrieve file ID:', error)
            throw new Error('Error retrieving file ID')
        }
    }

    async getFileLengthByName(category: string, name: string): Promise<number> {
        try {
            // 查询指定类别的所有文件
            const files = await this.db.files.where({ category }).toArray()
            // 在结果中寻找匹配指定名称的文件
            const file = files.find((file) => file.name === name)

            // 如果找到了文件，返回其长度
            if (file && file.words) {
                return file.words.length
            } else {
                // 如果没有找到文件，可以返回 null 或抛出一个错误
                console.log(`No file found with name '${name}' in category '${category}'`)
                return 0
            }
        } catch (error) {
            console.error('No word in this file:', error)
            throw new Error('No word in this file')
        }
    }

    async getFileLengthById(fileId: number | null): Promise<number> {
        if (!fileId) {
            console.debug('File ID is null')
            return 0
        }
        const file = await this.getFileOrThrow(fileId)
        return file.words.length
    }

    // 通过文件名来获取length
    async getWordLengthByName(category: string, name: string): Promise<number> {
        const fileId = await this.getFileIdByName(category, name)
        if (fileId) {
            return this.getFileLengthById(fileId)
        } else {
            return 0
        }
    }

    // 创建文件
    async createFile(name: string, category: string, words?: Word[], reviewSettings?: ReviewSettings): Promise<number> {
        if (words) {
            const fileId = await this.db.files.add({ name, words, category, reviewSettings })
            return fileId
        } else {
            const fileId = await this.db.files.add({ name, category, words: [] })
            return fileId
        }
    }

    async getTotalWordCount(fileId: number): Promise<number> {
        const file = await this.fetchFileDetailsById(fileId)
        return file.words.length
    }

    // 按页获取文件中的单词
    async loadWordsByPage(fileId: number, pageNumber: number): Promise<Word[]> {
        console.log('loadWordsByPage', fileId, pageNumber)
        const start = (pageNumber - 1) * this.pageSize
        const end = start + this.pageSize
        const file = await this.fetchFileDetailsById(fileId)
        return file.words.slice(start, Math.min(end, file.words.length))
    }

    // 按文件Id获取单词
    async loadWordsByFileId(fileId: number): Promise<Word[]> {
        const file = await this.fetchFileDetailsById(fileId)
        return file.words
    }

    // 确定单词是否在该文件中
    async isWordInFile(fileId: number, wordIdx: number, wordText: string): Promise<boolean> {
        // 先根据idx在words中找到对应的词，然后看它们text是否相同
        const file = await this.fetchFileDetailsById(fileId)
        const word = file.words.find((w) => w.idx === wordIdx)
        if (word) {
            return word.text === wordText
        } else {
            return false
        }
    }

    // 添加单词到文件中
    async addWordToFile(fileId: number, newWord: Word): Promise<void> {
        const file = await this.getFileOrThrow(fileId)
        file.words.push(newWord)
        await this.updateFile(fileId, { words: file.words })
    }

    // 更新文件中的某个单词
    async updateWordInFile(fileId: number, wordId: number, updatedWord: Word): Promise<Word[]> {
        const file = await this.fetchFileDetailsById(fileId)
        // 找到需要更新的单词的正确索引
        const index = file.words.findIndex((w) => w.idx === wordId)
        if (index !== -1) {
            file.words.splice(index, 1)
            // 然后将更新后的单词添加到数组末尾
            file.words.push(updatedWord)
            await this.updateFile(fileId, { words: file.words })
        } else {
            this.addWordToFile(fileId, updatedWord)
        }
        return file.words
    }

    // 删除文件中的某个单词
    async deleteWordFromFile(fileId: number, wordIndex: number): Promise<void> {
        const file = await this.fetchFileDetailsById(fileId)
        if (!file.words) {
            return
        }
        file.words.splice(wordIndex, 1)
        await this.updateFile(fileId, { words: file.words })
    }

    // 添加翻译到文件中的某个单词
    async addOrUpdateTranslationInWord(
        isParent: boolean,
        fileId: number,
        actionName: string,
        wordIdx: number,
        wordText: string,
        text: string,
        format: ActionOutputRenderingFormat,
        messageId?: string,
        conversationId?: string
    ): Promise<void> {
        const file = await this.fetchFileDetailsById(fileId)
        let word: Word | undefined
        // 这里传入的wordText是最新的输入内容，但是传入的idx仍然是之前激活action的idx
        if (isParent) {
            word = file?.words.find((w) => w.idx === wordIdx)
        } else {
            word = file?.words.find((w) => w.text === wordText)
        }
        if (!word) {
            // 使用更安全的方式生成新 idx
            const maxIdx = file.words?.reduce((max, w) => Math.max(max, w.idx), 0)
            word = {
                idx: maxIdx + 1,
                text: wordText,
                translations: { [actionName]: { text, format, messageId, conversationId } },
                isNew: true,
                reviewCount: 0,
            }
            file.words.push(word) // 添加到列表末尾
        } else {
            // 更新现有单词的翻译
            if (!word.translations) {
                word.translations = {}
            }
            if (word.translations[actionName]) {
                // 如果已存在翻译，追加新的翻译文本
                word.translations[actionName].text += '\n' + text
            } else {
                // 如果不存在翻译，则新建
                word.translations[actionName] = { text, format, messageId, conversationId }
            }
        }

        await this.updateFile(fileId, { words: file.words })
    }

    // 删除单词
    async deleteWord(fileId: number, wordIndex: number): Promise<void> {
        const file = await this.fetchFileDetailsById(fileId)
        file.words.splice(wordIndex, 1)
        await this.updateFile(fileId, { words: file.words })
    }

    // 删除某个单词的某个翻译
    async deleteTranslationFromFile(fileId: number, wordIndex: number, actionName: string): Promise<void> {
        const file = await this.fetchFileDetailsById(fileId)
        const word = file.words[wordIndex]
        if (word.translations && word.translations[actionName]) {
            delete word.translations[actionName]
            await this.updateFile(fileId, { words: file.words })
        }
    }

    // 根据 FileId 和 wordIndex 查找并返回单词的 translations
    async getTranslationsByWordIndex(fileId: number, wordIndex: number): Promise<Translations | undefined> {
        const file = await this.fetchFileDetailsById(fileId)
        if (!file || !file.words) {
            throw new Error('File not found or no words in file')
        }
        const word = file.words[wordIndex] // 使用索引直接访问数组元素
        if (!word) {
            throw new Error('Word not found at the provided index')
        }
        return word.translations || {} // 返回找到的 translations 或空对象
    }

    // 更新复习设置
    async updateReviewSettings(fileId: number, reviewSettings: ReviewSettings): Promise<void> {
        const file = await this.fetchFileDetailsById(fileId)
        file.reviewSettings = reviewSettings
        await this.updateFile(fileId, { reviewSettings: file.reviewSettings })
    }

    // 根据上次复习时间和复习次数计算下次复习时间
    getNextReviewDate(lastReviewed: Date, reviewCount: number, intervals: number[]): Date | undefined {

        // 如果复习次数超过了间隔数组的长度，返回 undefined 表示复习完成
        if (reviewCount >= intervals.length) {
            return undefined
        }

        const nextInterval = intervals[reviewCount]
        // 计算下次复习时间
        return new Date(lastReviewed.getTime() + nextInterval * 60 * 1000)
    }

    // 获取需要复习的单词
    getWordsToReview(words: Word[]): Word[] {
        const today = new Date()
        return words.filter((word) => word.nextReview && word.nextReview <= today)
    }

    // 根据文件Id获取需要复习的单词
    async getWordsToReviewByFileId(fileId: number): Promise<Word[]> {
        const file = await this.fetchFileDetailsById(fileId)
        return this.getWordsToReview(file.words)
    }
}
export const fileService = new FileService()
