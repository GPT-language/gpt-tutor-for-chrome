import { File, Translations, Word, getLocalDB } from './db'

export class FileService {
    private db = getLocalDB()

    // 添加新文件
    async addFile(fileName: string, words: Word[]): Promise<number> {
        const fileId = await this.db.files.add({ fileName, words })
        return fileId
    }

    // 更新文件信息
    async updateFile(fileId: number, updatedData: { fileName?: string; words?: Word[] }): Promise<void> {
        await this.db.files.update(fileId, updatedData)
    }

    // 删除文件
    async deleteFile(fileId: number): Promise<void> {
        await this.db.files.delete(fileId)
    }

    // 获取文件详情
    async fetchFileDetails(fileId: number): Promise<File> {
        const file = await this.db.files.get(fileId)
        if (!file) {
            throw new Error('File not found')
        }
        return file
    }

    // 添加单词到文件中
    async addWordToFile(fileId: number, newWord: Word): Promise<void> {
        const file = await this.fetchFileDetails(fileId)
        file.words.push(newWord)
        await this.updateFile(fileId, { words: file.words })
    }

    // 更新文件中的某个单词
    async updateWordInFile(fileId: number, wordIndex: number, updatedWord: Word): Promise<void> {
        const file = await this.fetchFileDetails(fileId)
        file.words[wordIndex] = updatedWord
        await this.updateFile(fileId, { words: file.words })
    }

    // 删除文件中的某个单词
    async deleteWordFromFile(fileId: number, wordIndex: number): Promise<void> {
        const file = await this.fetchFileDetails(fileId)
        file.words.splice(wordIndex, 1)
        await this.updateFile(fileId, { words: file.words })
    }

    // 添加翻译到文件中的某个单词
    async addOrUpdateTranslationInWord(
        fileId: number,
        wordIdx: number,
        actionName: string,
        wordText: string,
        text: string,
        format: string
    ): Promise<void> {
        const file = await this.fetchFileDetails(fileId)
        let word = file.words.find((w) => w.idx === wordIdx)

        if (!word) {
            // 如果没有找到，创建新单词，并标记为新
            word = {
                idx: file.words.length + 1, // 简单地使用长度作为 idx
                text: wordText,
                translations: { [actionName]: { text, format } },
                isNew: true,
            }
            file.words.push(word) // 添加到列表末尾
        } else {
            // 更新现有单词的翻译
            if (!word.translations) {
                word.translations = {}
            }
            word.translations[actionName] = { text, format }
        }

        await this.updateFile(fileId, { words: file.words })
    }

    // 删除某个单词的某个翻译
    async deleteTranslationFromFile(fileId: number, wordIndex: number, actionName: string): Promise<void> {
        const file = await this.fetchFileDetails(fileId)
        const word = file.words[wordIndex]
        if (word.translations && word.translations[actionName]) {
            delete word.translations[actionName]
            await this.updateFile(fileId, { words: file.words })
        }
    }

    // 根据 FileId 和 wordIndex 查找并返回单词的 translations
    async getTranslationsByWordIndex(fileId: number, wordIndex: number): Promise<Translations | undefined> {
        const file = await this.fetchFileDetails(fileId)
        if (!file || !file.words) {
            throw new Error('File not found or no words in file')
        }
        const word = file.words[wordIndex] // 使用索引直接访问数组元素
        if (!word) {
            throw new Error('Word not found at the provided index')
        }
        return word.translations || {} // 返回找到的 translations 或空对象
    }
}
export const fileService = new FileService()
