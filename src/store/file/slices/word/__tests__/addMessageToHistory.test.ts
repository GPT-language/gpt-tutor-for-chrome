import { beforeEach, describe, expect, it } from '@jest/globals'
import { produce } from 'immer'
import { ChatMessage } from '../../chat/initialState'
import { ChatStore } from '../../../store'

// 模拟最小化的 store 状态和类型
interface MinimalChatStore {
    conversationHistory: ChatMessage[]
    selectedWord: any
    activateAction?: {
        name: string
        outputRenderingFormat: string
    }
    currentFileId?: number
    files: Array<{
        id: number
        words: Array<any>
    }>
    currentConversationKey: string
    editableText: string
}

// 创建独立的 addMessageToHistory 函数
const addMessageToHistory = (message: ChatMessage) =>
    produce((draft: MinimalChatStore) => {
        const newMessage = {
            ...message,
            createdAt: Date.now(),
            messageId: message.messageId || crypto.randomUUID(),
        }
        draft.conversationHistory.push(newMessage)

        if (draft.selectedWord && draft.activateAction?.name) {
            const currentAnswer = draft.selectedWord.answers?.[draft.activateAction.name] || {}
            const existingMessages = currentAnswer.conversationMessages || []

            const updatedAnswers = {
                ...draft.selectedWord.answers,
                [draft.activateAction.name]: {
                    ...currentAnswer,
                    text: [...existingMessages, newMessage].map((m) => m.content).join('\n'),
                    format: draft.activateAction.outputRenderingFormat || 'text',
                    conversationMessages: [...existingMessages, newMessage],
                    updatedAt: new Date(),
                },
            }

            draft.selectedWord = {
                ...draft.selectedWord,
                answers: updatedAnswers,
            }

            const fileIndex = draft.files?.findIndex((f) => f.id === draft.currentFileId)
            if (fileIndex !== -1 && draft.files[fileIndex].words) {
                const wordIndex = draft.files[fileIndex].words.findIndex((w) => w.idx === draft.selectedWord?.idx)
                if (wordIndex !== -1) {
                    draft.files[fileIndex].words[wordIndex] = {
                        ...draft.files[fileIndex].words[wordIndex],
                        answers: updatedAnswers,
                    }
                }
            }
        }
    })

describe('addMessageToHistory', () => {
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
    Object.defineProperty(global, 'crypto', {
        value: {
            ...global.crypto,
            randomUUID: () => mockUUID,
        },
    })

    let initialState: MinimalChatStore

    beforeEach(() => {
        initialState = {
            conversationHistory: [],
            selectedWord: {
                idx: 1,
                text: '测试文本',
                answers: {},
            },
            activateAction: {
                name: 'translate',
                outputRenderingFormat: 'text',
            },
            currentFileId: 1,
            files: [
                {
                    id: 1,
                    words: [
                        {
                            idx: 1,
                            text: '测试文本',
                            answers: {},
                        },
                    ],
                },
            ],
            currentConversationKey: 'translate',
            editableText: 'edit',
        }
    })

    it('应该使用 activateAction.name 作为优先 saveKey', () => {
        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)

        expect(newState.conversationHistory).toHaveLength(1)
        expect(newState.selectedWord.answers.translate.conversationMessages).toHaveLength(1)
        expect(newState.selectedWord.answers.translate.conversationMessages[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })
    })

    it('当 activateAction 为空时应该使用 currentConversationKey', () => {
        // 重新初始化状态，确保数据结构完整
        initialState = {
            ...initialState,
            activateAction: undefined,  // 清除 activateAction
            currentConversationKey: 'customKey',
            selectedWord: {
                idx: 1,
                text: '测试文本',
                answers: {
                    customKey: {  // 预先初始化 customKey 的数据结构
                        text: '',
                        format: 'text',
                        conversationMessages: [],
                    }
                }
            },
            files: [
                {
                    id: 1,
                    words: [
                        {
                            idx: 1,
                            text: '测试文本',
                            answers: {
                                customKey: {  // 文件中的 word 也需要初始化
                                    text: '',
                                    format: 'text',
                                    conversationMessages: [],
                                }
                            }
                        }
                    ]
                }
            ]
        }

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)

        expect(newState.conversationHistory).toHaveLength(1)
        expect(newState.selectedWord.answers.customKey.conversationMessages).toHaveLength(1)
        expect(newState.selectedWord.answers.customKey.conversationMessages[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })
    })

    it('当 activateAction 和 currentConversationKey 都为空时应该使用 editableText', () => {
        // 重新初始化状态，确保数据结构完整
        initialState = {
            ...initialState,
            activateAction: undefined,
            currentConversationKey: '',
            editableText: 'editKey',
            selectedWord: {
                idx: 1,
                text: '测试文本',
                answers: {
                    editKey: {  // 预先初始化 editKey 的数据结构
                        text: '',
                        format: 'text',
                        conversationMessages: [],
                    }
                }
            },
            files: [
                {
                    id: 1,
                    words: [
                        {
                            idx: 1,
                            text: '测试文本',
                            answers: {
                                editKey: {  // 文件中的 word 也需要初始化
                                    text: '',
                                    format: 'text',
                                    conversationMessages: [],
                                }
                            }
                        }
                    ]
                }
            ]
        }

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)

        expect(newState.conversationHistory).toHaveLength(1)
        expect(newState.selectedWord.answers.editKey.conversationMessages).toHaveLength(1)
        expect(newState.selectedWord.answers.editKey.conversationMessages[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })
    })

    it('应该正确更新文件中的单词答案', () => {
        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)

        const updatedWord = newState.files[0].words[0]
        expect(updatedWord.answers.translate.conversationMessages).toHaveLength(1)
        expect(updatedWord.answers.translate.conversationMessages[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })
    })

    it('应该保留现有的对话历史并添加新消息', () => {
        // 先添加一条初始消息
        const firstMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }
        let newState = addMessageToHistory(firstMessage)(initialState)

        // 再添加第二条消息
        const secondMessage: ChatMessage = {
            role: 'user',
            content: '第二条消息',
            messageId: '',
            createdAt: 0,
        }
        newState = addMessageToHistory(secondMessage)(newState)

        // 验证 conversationHistory 包含两条消息
        expect(newState.conversationHistory).toHaveLength(2)

        // 验证 selectedWord 中的 conversationMessages 也包含两条消息
        const conversationMessages = newState.selectedWord.answers.translate.conversationMessages
        expect(conversationMessages).toHaveLength(2)
        expect(conversationMessages[0].content).toBe('你好')
        expect(conversationMessages[1].content).toBe('第二条消息')
    })

    it('当 selectedWord 为 null 时应该只更新 conversationHistory', () => {
        initialState.selectedWord = null

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)

        expect(newState.conversationHistory).toHaveLength(1)
        expect(newState.selectedWord).toBeNull()
    })
})
