import { Answers, Word } from '@/common/internal-services/db'

export interface ChatWordState {
    words: Word[] // 当前文件的所有单词
    answers: Answers
    selectedGroup: string
    selectedWord: Word | null
    selectedWords: { [fileId: number]: Word | null }
}

export const initialWordState: ChatWordState = {
    words: [], // 当前文件的单词
    answers: {},
    selectedWord: { idx: 1, text: '', reviewCount: 0 },
    selectedWords: {}, // 每个文件的选中单词
    selectedGroup: 'Unsorted',
}