import { DEFAULT_AVATAR, DEFAULT_BACKGROUND_COLOR } from '@/const/meta'
import { ChatMessage } from '@/common/internal-services/db'
import { merge } from '@/utils/merge'

import { chatHelpers } from '../../helpers'
import type { ChatStore } from '../../store'

export const INBOX_SESSION_ID = 'inbox'

const currentChatKey = (s: ChatStore) => `${s.activeId}`

// 当前激活的消息列表
const currentChats = (s: ChatStore): ChatMessage[] => {
    console.log('activeId', s.activeId)
    console.log('messages', s.messages)
    if (s.activeId) return []

    return s.messages.map((i) => ({ ...i }))
}

const defaultAgentMetaData = {
    title: '默认代理',
    description: '欢迎使用我们的聊天服务！有什么可以帮到您的？',
    tags: ['默认代理'],
    avatar: DEFAULT_AVATAR, // 假设您已经有了一个默认头像的链接或路径
    backgroundColor: DEFAULT_BACKGROUND_COLOR, // 如果您有默认背景色
}

const initTime = Date.now()

const showInboxWelcome = (s: ChatStore): boolean => {
    const isInbox = s.activeId === INBOX_SESSION_ID
    if (!isInbox) return false
    const data = currentChats(s)
    const isBrandNewChat = data.length === 0
    return isBrandNewChat
}
// 针对新助手添加初始化时的自定义消息
const currentChatsWithGuideMessage = (s: ChatStore): ChatMessage[] => {
    console.log('currentChatsWithGuideMessage', s)
    const data = currentChats(s)
    console.log('data in currentChatsWithGuideMessage', data)

    const isBrandNewChat = data.length === 0

    if (!isBrandNewChat) return data

    // 使用默认代理元数据
    const meta = defaultAgentMetaData

    // 以下是根据聊天会话上下文构造引导消息的逻辑
    const inboxMsg = '这里是您的收件箱欢迎消息'
    const agentSystemRoleMsg = `您好，${meta.title}为您服务。${meta.description}`
    const agentMsg = `您好，我是${meta.title}。`

    const guideMessageContent =
        s.activeId === INBOX_SESSION_ID ? inboxMsg : meta.description ? agentSystemRoleMsg : agentMsg

    const emptyInboxGuideMessage = {
        sessionId: INBOX_SESSION_ID,
        content: guideMessageContent,
        createdAt: initTime,
        extra: {},
        id: 'default',
        meta: merge({ avatar: meta.avatar }, meta),
        role: 'assistant',
        updatedAt: initTime,
    } as ChatMessage
    console.log(emptyInboxGuideMessage)

    return [emptyInboxGuideMessage]
}

const currentChatIDsWithGuideMessage = (s: ChatStore) => {
    console.log('try to get currentChatIDsWithGuideMessage')
    // 直接调用 currentChatsWithGuideMessage 函数，传入 s 参数
    const guideMessages = currentChatsWithGuideMessage(s)
    console.log('guideMessages', guideMessages)

    // 然后在返回的 ChatMessage[] 数组上调用 .map 方法提取 id
    return guideMessages.map((msg) => msg.id)
}

const currentChatsWithHistoryConfig = (s: ChatStore): ChatMessage[] => {
    const chats = currentChats(s)
    return chatHelpers.getSlicedMessagesByDate(chats)
}

const chatsMessageString = (s: ChatStore): string => {
    const chats = currentChatsWithHistoryConfig(s)
    return chats.map((m) => m.content).join('')
}

const getMessageById = (id: string) => (s: ChatStore) => chatHelpers.getMessageById(s.messages, id)

const latestMessage = (s: ChatStore) => currentChats(s).at(-1)

const currentChatLoadingState = (s: ChatStore) => !s.messagesInit

export const chatSelectors = {
    chatsMessageString,
    currentChatIDsWithGuideMessage,
    currentChatKey,
    currentChatLoadingState,
    currentChats,
    currentChatsWithGuideMessage,
    currentChatsWithHistoryConfig,
    getMessageById,
    latestMessage,
    showInboxWelcome,
}
