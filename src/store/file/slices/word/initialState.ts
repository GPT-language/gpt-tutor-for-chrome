import { Action, Answers, Content } from '@/common/internal-services/db'

export interface ActionGroups {
    [key: string]: Action[]
}

export interface ChatWordState {
    words: Content[] // 当前文件的所有单词
    answers: Answers
    selectedGroup: string
    selectedWord: Content | null
    currentWordPositions: { [fileId: number]: number | null }
    actionGroups: ActionGroups
}

export const initialWordState: ChatWordState = {
    words: [], // 当前文件的单词
    answers: {},
    selectedWord: { idx: 1, text: '', reviewCount: 0 },
    currentWordPositions: {}, // 每个文件的选中单词
    selectedGroup: 'Unsorted',
    actionGroups: {},
}
