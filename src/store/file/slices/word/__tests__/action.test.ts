import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { useChatStore } from '../../../store'
import { ChatMessage } from '../../chat/initialState'
import { Content } from '@/common/internal-services/db'

describe('addMessageToHistory', () => {
    // 模拟 crypto.randomUUID
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000'
    global.crypto = {
        ...global.crypto,
        randomUUID: () => mockUUID,
    }

    beforeEach(() => {
        // 重置 store 状态
        useChatStore.setState({
            isMultipleConversation: true,
            conversationHistory: [],
            selectedWord: {
                idx: 1,
                text: '测试文本',
                answers: {},
            } as Content,
            activateAction: {
                name: 'translate',
                outputRenderingFormat: 'text',
                idx: 1,
                groups: ['test'],
                updatedAt: '',
                createdAt: '',
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
                            reviewCount: 0,
                        },
                    ],
                    category: 'test',
                    name: 'test',
                },
            ],
        })
    })

    it('应该正确添加消息并更新相关状态', () => {
        const now = Date.now()
        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        // 执行添加消息操作
        useChatStore.getState().addMessageToHistory(testMessage)

        // 获取更新后的状态
        const state = useChatStore.getState()

        // 验证消息是否被正确添加到历史记录
        expect(state.conversationHistory).toHaveLength(1)
        expect(state.conversationHistory[0]).toEqual({
            ...testMessage,
            messageId: mockUUID,
            createdAt: expect.any(Number),
        })

        // 验证 selectedWord 是否被正确更新
        expect(state.selectedWord?.answers?.translate).toEqual({
            text: '你好',
            format: 'text',
            conversationMessages: state.conversationHistory,
            updatedAt: expect.any(Date),
            isMultipleConversation: true,
        })

        // 验证 files 中的 word 是否被正确更新
        const updatedWord = state.files?.[0].words[0]
        expect(updatedWord?.answers?.translate).toEqual({
            text: '你好',
            format: 'text',
            conversationMessages: state.conversationHistory,
            updatedAt: expect.any(Date),
            isMultipleConversation: true,
        })
    })

    it('当 isMultipleConversation 为 false 时不应该更新状态', () => {
        // 设置 isMultipleConversation 为 false
        useChatStore.setState({ isMultipleConversation: false })

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        // 执行添加消息操作
        useChatStore.getState().addMessageToHistory(testMessage)

        // 验证状态没有改变
        const state = useChatStore.getState()
        expect(state.conversationHistory).toHaveLength(0)
    })

    it('当缺少必要的状态时应该正确处理', () => {
        // 设置缺少必要状态的情况
        useChatStore.setState({
            selectedWord: null,
            activateAction: undefined,
        })

        const testMessage: ChatMessage = {
            role: 'user',
            content: '你好',
            messageId: '',
            createdAt: 0,
        }

        // 执行添加消息操作
        useChatStore.getState().addMessageToHistory(testMessage)

        // 验证消息被添加但没有更新其他状态
        const state = useChatStore.getState()
        expect(state.conversationHistory).toHaveLength(1)
        expect(state.selectedWord).toBeNull()
    })
})
