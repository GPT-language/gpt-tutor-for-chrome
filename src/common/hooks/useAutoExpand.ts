import { useState, useEffect, useCallback } from 'react'
import { ChatMessage } from '@/store/file/slices/chat/initialState'

interface UseAutoExpandProps {
    messages: ChatMessage[]
    source: 'main' | 'followup'
    currentConversationKey: string
}

export const useAutoExpand = ({ messages, source, currentConversationKey }: UseAutoExpandProps) => {
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

    // 初始化和更新展开状态
    useEffect(() => {
        // main 消息只展开最新的对话
        const latestUserMessage = messages.findLast(
            (msg, index) =>
                msg.role === 'user' && index + 1 < messages.length && messages[index + 1].role === 'assistant'
        )
        if (latestUserMessage) {
            setExpandedMessages(new Set([latestUserMessage.messageId]))
        }
    }, [messages, currentConversationKey])

    // 处理消息展开/折叠
    const handleExpand = (messageId: string) => {
        setExpandedMessages((prev) => {
            const next = new Set(prev)

            if (next.has(messageId)) {
                next.delete(messageId)
            } else {
                next.add(messageId)
            }

            return next
        })
    }

    return {
        expandedMessages,
        handleExpand,
        isExpanded: useCallback((messageId: string) => expandedMessages.has(messageId), [expandedMessages]),
    }
}
