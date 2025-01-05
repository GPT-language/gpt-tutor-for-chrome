import { Action, Answers, Content } from '@/common/internal-services/db'
import { ChatMessage } from '../chat/initialState'

export interface ActionGroups {
    [key: string]: Action[]
}

export interface ChatWordState {
    words: Content[]
    answers: Answers
    selectedGroup: string
    selectedWord: Content | null
    currentWordPositions: { [fileId: number]: number | null }
    actionGroups: ActionGroups
    conversationHistory: ChatMessage[]
}

const defaultSelectedWord: Content = {
    idx: 1,
    text: 'This is a example',
    reviewCount: 0,
    answers: {
        'translate to Chinese': {
            text: '这是例子',
            format: 'text',
            conversationMessages: [
                {
                    messageId: '1',
                    content: 'Translate to Chinese',
                    role: 'user',
                    createdAt: Date.now(),
                },
                {
                    messageId: '2',
                    content: '这是例子',
                    role: 'assistant',
                    createdAt: Date.now(),
                },
            ],
        },
    },
}

const defaultAnswers: Answers = { ['Translate to Chinese']: { text: '翻译：这是一个例子', format: 'text' } }


export const initialWordState: ChatWordState = {
    words: [],
    answers: defaultAnswers,
    selectedWord: defaultSelectedWord,
    currentWordPositions: {},
    selectedGroup: 'Unsorted',
    actionGroups: {},
    conversationHistory: [],
}
