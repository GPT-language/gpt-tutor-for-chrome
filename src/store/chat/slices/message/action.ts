/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
import { copyToClipboard } from '@lobehub/ui'
import { SWRResponse, mutate } from 'swr'
import { StateCreator } from 'zustand/vanilla'

import { LOADING_FLAT } from '@/const/message'
import { CreateMessageParams, messageService } from '@/common/internal-services/message'
import { useClientDataSWR } from '@/libs/swr'
import { topicService } from '@/common/internal-services/topic'
import { ChatStore } from '@/store/chat/store'
import { Action, ChatMessage } from '@/common/internal-services/db'
import { setNamespace } from '@/utils/storeDebug'
import { chatSelectors } from '../../selectors'
import { MessageDispatch, messagesReducer } from './reducer'
import { nanoid } from 'nanoid/non-secure'
import { chatService } from '@/services/chat'

const n = setNamespace('message')

const SWR_USE_FETCH_MESSAGES = 'SWR_USE_FETCH_MESSAGES'

interface SendMessageParams {
    message: string
    files?: { id: string; url: string }[]
    onlyAddUserMessage?: boolean
    topicTitle?: string
}

export interface ChatMessageAction {
    // create
    sendMessage: (params: SendMessageParams) => Promise<void>
    /**
     * regenerate message
     * trace enabled
     * @param id
     */
    regenerateMessage: (id: string) => Promise<void>

    // delete
    /**
     * clear message on the active session
     */
    clearMessage: () => Promise<void>
    deleteMessage: (id: string) => Promise<void>
    delAndRegenerateMessage: (id: string) => Promise<void>
    clearAllMessages: () => Promise<void>
    // update
    updateInputMessage: (message: string) => void
    modifyMessageContent: (id: string, content: string) => Promise<void>
    // query
    useFetchMessages: (topicId?: string) => SWRResponse<ChatMessage[]>
    stopGenerateMessage: () => void
    copyMessage: (id: string, content: string) => Promise<void>

    // =========  ↓ Internal Method ↓  ========== //
    // ========================================== //
    // ========================================== //

    /**
     * update message at the frontend point
     * this method will not update messages to database
     */
    dispatchMessage: (payload: MessageDispatch) => void
    /**
     * core process of the AI message (include preprocess and postprocess)
     */
    coreProcessMessage: (messages: ChatMessage[], parentId: string) => Promise<void>
    /**
     * 实际获取 AI 响应
     * @param messages - 聊天消息数组
     * @param options - 获取 SSE 选项
     */
    fetchAIChatMessage: (
        messages: ChatMessage[],
        assistantMessageId: string
    ) => Promise<{
        content: string
    }>
    toggleChatLoading: (loading: boolean, id?: string, action?: string) => AbortController | undefined
    refreshMessages: () => Promise<void>
    // TODO: 后续 smoothMessage 实现考虑落到 sse 这一层
    createSmoothMessage: (id: string) => {
        startAnimation: (speed?: number) => Promise<void>
        stopAnimation: () => void
        outputQueue: string[]
        isAnimationActive: boolean
    }
    /**
     * a method used by other action
     * @param id
     * @param content
     */
    internalUpdateMessageContent: (id: string, content: string) => Promise<void>
    internalResendMessage: (id: string, traceId?: string) => Promise<void>
    getSavedAction: () => Action | undefined
}

const preventLeavingFn = (e: BeforeUnloadEvent) => {
    // set returnValue to trigger alert modal
    // Note: No matter what value is set, the browser will display the standard text
    e.returnValue = '你有正在生成中的请求，确定要离开吗？'
}

export const chatMessage: StateCreator<ChatStore, [['zustand/devtools', never]], [], ChatMessageAction> = (
    set,
    get
) => ({
    deleteMessage: async (id) => {
        await messageService.removeMessage(id)
        await get().refreshMessages()
    },
    delAndRegenerateMessage: async (id) => {
        get().internalResendMessage(id)
        get().deleteMessage(id)
    },
    regenerateMessage: async (id: string) => {
        await get().internalResendMessage(id)
    },
    clearMessage: async () => {
        const { activeId, activeTopicId, refreshMessages, refreshTopic, switchTopic } = get()

        await messageService.removeMessages(activeId)

        if (activeTopicId) {
            await topicService.removeTopic(activeTopicId)
        }
        await refreshTopic()
        await refreshMessages()

        // after remove topic , go back to default topic
        switchTopic()
    },
    clearAllMessages: async () => {
        const { refreshMessages } = get()
        await messageService.clearAllMessage()
        await refreshMessages()
    },
    internalResendMessage: async (messageId) => {
        // 1. 构造所有相关的历史记录
        const chats = chatSelectors.currentChats(get())

        const currentIndex = chats.findIndex((c) => c.id === messageId)
        if (currentIndex < 0) return

        const currentMessage = chats[currentIndex]

        let contextMessages: ChatMessage[] = []

        switch (currentMessage.role) {
            case 'function':
            case 'user': {
                contextMessages = chats.slice(0, currentIndex + 1)
                break
            }
            case 'assistant': {
                // 消息是 AI 发出的因此需要找到它的 user 消息
                const userId = currentMessage.parentId
                const userIndex = chats.findIndex((c) => c.id === userId)
                // 如果消息没有 parentId，那么同 user/function 模式
                contextMessages = chats.slice(0, userIndex < 0 ? currentIndex + 1 : userIndex + 1)
                break
            }
        }

        if (contextMessages.length <= 0) return

        const { coreProcessMessage } = get()

        const latestMsg = contextMessages.filter((s) => s.role === 'user').at(-1)

        if (!latestMsg) return

        await coreProcessMessage(contextMessages, latestMsg.id)
    },
    sendMessage: async ({ message, files, topicTitle, onlyAddUserMessage }) => {
        const { coreProcessMessage, activeTopicId, activeId } = get()
        if (!activeId) return

        const fileIdList = files?.map((f) => f.id)
        const messageId = nanoid()
        const createdAt = Date.now()

        // if message is empty and no files, then stop
        if (!message && (!fileIdList || fileIdList?.length === 0)) return

        const newMessage: CreateMessageParams = {
            id: messageId,
            createdAt: createdAt,
            content: message,
            // if message has attached with files, then add files to message and the agent
            files: fileIdList,
            role: 'user',
            sessionId: activeId,
            // if there is activeTopicId，then add topicId to message
            topicId: activeTopicId,
        }

        const id = await messageService.create(newMessage)
        await get().refreshMessages()

        // if only add user message, then stop
        if (onlyAddUserMessage) return

        // Get the current messages to generate AI response
        const messages = chatSelectors.currentChats(get())

        await coreProcessMessage(messages, id)

        // check activeTopic and then auto create topic
        const chats = chatSelectors.currentChats(get())

        if (!activeTopicId) {
            const { saveToTopic, switchTopic } = get()
            const id = await saveToTopic()
            if (id) switchTopic(id)
        }
    },

    copyMessage: async (id, content) => {
        await copyToClipboard(content)
    },

    stopGenerateMessage: () => {
        const { abortController, toggleChatLoading } = get()
        if (!abortController) return

        abortController.abort()

        toggleChatLoading(false, undefined, n('stopGenerateMessage') as string)
    },
    updateInputMessage: (message) => {
        set({ inputMessage: message }, false, n('updateInputMessage', message))
    },
    modifyMessageContent: async (id, content) => {
        // tracing the diff of update
        // due to message content will change, so we need send trace before update,or will get wrong data
        await get().internalUpdateMessageContent(id, content)
    },
    useFetchMessages: (activeTopicId) =>
        useClientDataSWR<ChatMessage[]>(
            [SWR_USE_FETCH_MESSAGES, activeTopicId],
            async ([, topicId]: [string, string]) => {
                if (!topicId) throw new Error('No topic ID provided for fetching messages.')
                console.log('fetching messages for topic:', messageService.getMessages(topicId))

                return messageService.getMessages(topicId)
            },
            {
                onSuccess: (messages, key) => {
                    set(
                        { activeId: activeTopicId, messages, messagesInit: true },
                        false,
                        n('useFetchMessages', {
                            messages,
                            queryKey: key,
                        })
                    )
                },
                onError: (error) => {
                    console.error('Failed to fetch messages:', error)
                    set({ messagesInit: false, messages: error }, false, 'useFetchMessages/onError')
                },
            }
        ),
    refreshMessages: async () => {
        await mutate([SWR_USE_FETCH_MESSAGES, get().activeId, get().activeTopicId])
    },

    // the internal process method of the AI message
    coreProcessMessage: async (messages, userMessageId) => {
        const { refreshMessages, fetchAIChatMessage, activeTopicId } = get()

        // 1. Add an empty message to place the AI response
        const assistantMessage: CreateMessageParams = {
            id: nanoid(),
            role: 'assistant',
            content: LOADING_FLAT,
            createdAt: Date.now(),
            parentId: userMessageId,
            sessionId: get().activeId,
            topicId: activeTopicId, // if there is activeTopicId，then add it to topicId
        }

        const mid = await messageService.create(assistantMessage)
        await refreshMessages()

        await fetchAIChatMessage(messages, mid)
    },
    dispatchMessage: (payload) => {
        const { activeId } = get()

        if (!activeId) return

        const messages = messagesReducer(get().messages, payload)

        set({ messages }, false, n(`dispatchMessage/${payload.type}`, payload))
    },

    fetchAIChatMessage: async (messages, assistantId) => {
        const {
            toggleChatLoading,
            refreshMessages,
            internalUpdateMessageContent,
            createSmoothMessage,
            getSavedAction,
        } = get()

        // 开始加载动画
        toggleChatLoading(true, assistantId)

        let output = ''

        const { startAnimation, stopAnimation, outputQueue, isAnimationActive } = createSmoothMessage(assistantId)
        const abortController = toggleChatLoading(
            true,
            assistantId,
            n('generateMessage(start)', { assistantId, messages }) as string
        )

        const activateAction = getSavedAction()
        await chatService.getChatWebCompletion({
            activatedActionName: activateAction?.name || '',
            action: activateAction,
            signal: abortController?.signal,
            text: messages.map((m) => m.content).join('\n'),
            onAbort: async () => {
                // 如果请求被中止，停止动画
                stopAnimation()
            },
            onFinish: async (content: string) => {
                // 请求完成，停止动画并更新消息内容
                stopAnimation()

                if (outputQueue.length > 0) {
                    await startAnimation(15)
                }

                await internalUpdateMessageContent(assistantId, content)
            },
            onMessageHandle: async (text) => {
                output += text
                outputQueue.push(...text.split(''))
                // 如果是首次接收消息，则开始动画
                if (!isAnimationActive) startAnimation()
            },
            onErrorHandle: async (error: unknown) => {
                // 更新消息错误状态并刷新消息列表
                await messageService.updateMessageError(assistantId, error)
                await refreshMessages()
            },
        })

        toggleChatLoading(false, undefined, n('generateMessage(end)') as string)

        return {
            content: output,
        }
    },

    toggleChatLoading: (loading, id, action) => {
        if (loading) {
            window.addEventListener('beforeunload', preventLeavingFn)

            const abortController = new AbortController()
            set({ abortController, chatLoadingId: id }, false, action)

            return abortController
        } else {
            set({ abortController: undefined, chatLoadingId: undefined }, false, action)

            window.removeEventListener('beforeunload', preventLeavingFn)
        }
    },
    internalUpdateMessageContent: async (id, content) => {
        const { dispatchMessage, refreshMessages } = get()

        // Due to the async update method and refresh need about 100ms
        // we need to update the message content at the frontend to avoid the update flick
        // refs: https://medium.com/@kyledeguzmanx/what-are-optimistic-updates-483662c3e171
        dispatchMessage({ id, key: 'content', type: 'updateMessage', value: content })

        await messageService.updateMessage(id, { content })
        await refreshMessages()
    },

    createSmoothMessage: (id) => {
        const { dispatchMessage } = get()

        let buffer = ''
        // why use queue: https://shareg.pt/GLBrjpK
        const outputQueue: string[] = []

        // eslint-disable-next-line no-undef
        let animationTimeoutId: NodeJS.Timeout | null = null
        let isAnimationActive = false

        // when you need to stop the animation, call this function
        const stopAnimation = () => {
            isAnimationActive = false
            if (animationTimeoutId !== null) {
                clearTimeout(animationTimeoutId)
                animationTimeoutId = null
            }
        }

        // define startAnimation function to display the text in buffer smooth
        // when you need to start the animation, call this function
        const startAnimation = (speed = 2) =>
            new Promise<void>((resolve) => {
                if (isAnimationActive) {
                    resolve()
                    return
                }

                isAnimationActive = true

                const updateText = () => {
                    // 如果动画已经不再激活，则停止更新文本
                    if (!isAnimationActive) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        clearTimeout(animationTimeoutId!)
                        animationTimeoutId = null
                        resolve()
                    }

                    // 如果还有文本没有显示
                    // 检查队列中是否有字符待显示
                    if (outputQueue.length > 0) {
                        // 从队列中获取前两个字符（如果存在）
                        const charsToAdd = outputQueue.splice(0, speed).join('')
                        buffer += charsToAdd

                        // 更新消息内容，这里可能需要结合实际情况调整
                        dispatchMessage({ id, key: 'content', type: 'updateMessage', value: buffer })

                        // 设置下一个字符的延迟
                        animationTimeoutId = setTimeout(updateText, 16) // 16 毫秒的延迟模拟打字机效果
                    } else {
                        // 当所有字符都显示完毕时，清除动画状态
                        isAnimationActive = false
                        animationTimeoutId = null
                        resolve()
                    }
                }

                updateText()
            })

        return { startAnimation, stopAnimation, outputQueue, isAnimationActive }
    },
    getSavedAction() {
        const savedAction = localStorage.getItem('savedAction')
        return savedAction ? JSON.parse(savedAction) : undefined
    },
})
