import { beforeEach, describe, expect, it } from '@jest/globals'
import { produce } from 'immer'
import { ChatMessage } from '../../chat/initialState'
import { ChatStore } from '../../../store'

// 模拟最小化的 store 状态和类型
interface MinimalChatStore {
    isMultipleConversation: boolean
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
}

// 创建独立的 addMessageToHistory 函数
const addMessageToHistory = (message: ChatMessage) =>
    produce((draft: MinimalChatStore) => {
        if (draft.isMultipleConversation) {
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
                        isMultipleConversation: true,
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
        }
    })

describe('addMessageToHistory', () => {
    // 修改 crypto 模拟实现
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
    Object.defineProperty(global, 'crypto', {
        value: {
            ...global.crypto,
            randomUUID: () => mockUUID,
        }
    })

    let initialState: MinimalChatStore

    beforeEach(() => {
        // 设置测试始状态
        initialState = {
            isMultipleConversation: true,
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
        }
    })

    it('应该正确添加消息并更新相关状态', () => {
        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        // 执行添加消息操作
        const newState = addMessageToHistory(testMessage)(initialState)

        // 验证消息是否被正确添加到历史记录
        expect(newState.conversationHistory).toHaveLength(1)
        expect(newState.conversationHistory[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })

        // 验证 selectedWord 是否被正确更新
        expect(newState.selectedWord?.answers?.translate).toEqual({
            text: '你好',
            format: 'text',
            conversationMessages: newState.conversationHistory,
            updatedAt: expect.any(Date),
            isMultipleConversation: true,
        })

        // 验证 files 中的 word 是否被正确更新
        const updatedWord = newState.files[0].words[0]
        expect(updatedWord?.answers?.translate).toEqual({
            text: '你好',
            format: 'text',
            conversationMessages: newState.conversationHistory,
            updatedAt: expect.any(Date),
            isMultipleConversation: true,
        })
    })

    it('当 isMultipleConversation 为 false 时不应该更新状态', () => {
        initialState.isMultipleConversation = false

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        const newState = addMessageToHistory(testMessage)(initialState)
        expect(newState.conversationHistory).toHaveLength(0)
    })

    it('当缺少必要的状态时的正确处理', () => {
        initialState.selectedWord = null
        initialState.activateAction = undefined

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
        const conversationMessages = newState.selectedWord?.answers?.translate?.conversationMessages
        expect(conversationMessages).toHaveLength(2)
        expect(conversationMessages[0].content).toBe('你好')
        expect(conversationMessages[1].content).toBe('第二条消息')
        
        // 验证文本内容包含两条消息
        expect(newState.selectedWord?.answers?.translate?.text).toBe('你好\n第二条消息')
    })
})
