import React, { useEffect, useMemo, useRef } from 'react'
import { Block } from 'baseui-sd/block'
import { useTranslation } from 'react-i18next'
import { ChatMessage } from '@/store/file/slices/chat/initialState'
import { formatDate } from '@/common/utils/format'
import { useChatStore } from '@/store/file/store'
import { RxChevronDown } from 'react-icons/rx'
import { useStyletron } from 'styletron-react'
import { debounce } from 'lodash-es'

interface ConversationViewProps {
    onCopy?: (text: string) => void
    onSpeak?: (text: string) => void
    isSpeaking?: boolean
    renderContent: (text: string, format: string, actionName?: string, messageId?: string) => React.ReactNode
}

// 定义消息组件
const MessageItem: React.FC<{
    message: ChatMessage
    nextMessage?: ChatMessage
    isExpanded: boolean
    onToggle: () => void
    renderContent: (text: string, format: string, actionName?: string, messageId?: string) => React.ReactNode
}> = ({ message, nextMessage, isExpanded, onToggle, renderContent }) => {
    const [css] = useStyletron()

    // 样式定义
    const messageContainerStyles = css({
        marginBottom: '4px',
    })

    const userMessageStyles = css({
        'backgroundColor': '#F8F9FA',
        'padding': '8px 12px',
        'borderRadius': '8px',
        'boxShadow': '0 1px 2px rgba(0,0,0,0.05)',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
        'margin': '4px 0',
        'maxWidth': '85%', // 限制最大宽度
        'width': 'fit-content', // 根据内容自适应宽度
        'minWidth': '120px',
        ':hover': {
            backgroundColor: '#F1F3F5',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        },
    })

    const assistantMessageStyles = css({
        backgroundColor: '#F7F7F8',
        padding: '12px 16px',
        borderRadius: '12px',
        borderTopLeftRadius: '4px',
    })

    const expandIconStyles = css({
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
        transition: 'transform 0.3s ease',
        marginLeft: '8px',
    })

    const animatedContentStyles = css({
        transition: 'all 0.3s ease-in-out',
        maxHeight: isExpanded ? '2000px' : '0px',
        marginTop: isExpanded ? '12px' : '0px',
        opacity: isExpanded ? 1 : 0,
        overflow: 'hidden',
    })

    if (message.role === 'user') {
        return (
            <div className={messageContainerStyles}>
                <Block
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    className={userMessageStyles}
                    onClick={onToggle}
                >
                    <Block flex='1'>
                        <Block>{message.actionName || message.content}</Block>
                    </Block>
                    <RxChevronDown size={20} className={expandIconStyles} />
                </Block>

                {nextMessage?.role === 'assistant' && (
                    <div className={animatedContentStyles}>
                        <Block className={assistantMessageStyles}>
                            {renderContent(
                                nextMessage.content,
                                nextMessage.format || 'markdown',
                                nextMessage.actionName,
                                nextMessage.messageId
                            )}
                        </Block>
                    </div>
                )}
            </div>
        )
    }

    return null
}

const ConversationView: React.FC<ConversationViewProps> = ({ renderContent }) => {
    const { t } = useTranslation()
    const {
        answers,
        selectedWord,
        currentConversationKey,
        setCurrentConversationKey, // 添加这个
    } = useChatStore()
    const [latestExpandedMessageId, setLatestExpandedMessageId] = React.useState<string | null>(null)
    const previousConversationKey = useRef<string | null>(null)
    const previousMessagesLength = useRef<number>(0)

    const currentMessages = useMemo(() => {
        const conversations = answers || selectedWord?.answers
        if (!conversations || !currentConversationKey) return []
        return conversations[currentConversationKey]?.conversationMessages || []
    }, [answers, selectedWord, currentConversationKey])

    // 监听 answers 变化，自动选择最新的对话
    useEffect(() => {
        const conversations = answers || selectedWord?.answers
        if (!conversations) return
        console.log('conversations', conversations)
        console.log('currentConversationKey', currentConversationKey)

        // 获取所有对话的 key
        const conversationKeys = Object.keys(conversations)
        if (conversationKeys.length === 0) return

        // 如果 currentConversationKey 发生变化或不存在，自动选择最新的对话
        if (currentConversationKey !== previousConversationKey.current) {
            // 找到最新对话中最新的用户消息
            const latestMessages = conversations[currentConversationKey]?.conversationMessages || []
            for (let i = latestMessages.length - 1; i >= 0; i--) {
                if (
                    latestMessages[i].role === 'user' &&
                    i + 1 < latestMessages.length &&
                    latestMessages[i + 1].role === 'assistant'
                ) {
                    setLatestExpandedMessageId(latestMessages[i].messageId)
                    break
                }
            }

            previousConversationKey.current = currentConversationKey
        }
    }, [answers, selectedWord, currentConversationKey, setCurrentConversationKey])

    const groupedMessages = useMemo(() => {
        const messages = currentMessages
        const groups: { date: string; messages: ChatMessage[] }[] = []
        let currentDate = ''
        let currentGroup: ChatMessage[] = []

        messages?.forEach((message) => {
            const messageDate = formatDate(message.createdAt)

            if (message.role === 'system') return

            if (messageDate !== currentDate) {
                if (currentGroup.length > 0) {
                    groups.push({
                        date: currentDate,
                        messages: [...currentGroup],
                    })
                }
                currentDate = messageDate
                currentGroup = [{ ...message }]
            } else {
                currentGroup.push({ ...message })
            }
        })

        if (currentGroup.length > 0) {
            groups.push({
                date: currentDate,
                messages: [...currentGroup],
            })
        }

        return groups
    }, [currentMessages])

    useEffect(() => {
        if (currentMessages.length > previousMessagesLength.current) {
            for (let i = currentMessages.length - 1; i >= 0; i--) {
                if (
                    currentMessages[i].role === 'user' &&
                    i + 1 < currentMessages.length &&
                    currentMessages[i + 1].role === 'assistant'
                ) {
                    setLatestExpandedMessageId(currentMessages[i].messageId)
                    break
                }
            }
        }
        previousMessagesLength.current = currentMessages.length
    }, [currentMessages])

    const toggleMessage = (messageId: string) => {
        setLatestExpandedMessageId((prevId) => (prevId === messageId ? null : messageId))
    }

    return (
        <Block
            width='100%'
            height='100%'
            $style={{
                display: !currentMessages.length ? 'none' : 'flex',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                flexDirection: 'column',
            }}
        >
            <Block>
                {groupedMessages.map((group) => (
                    <Block key={group.date} marginBottom='24px'>
                        {group.messages.map((message, msgIndex) => (
                            <MessageItem
                                key={message.messageId}
                                message={message}
                                nextMessage={group.messages[msgIndex + 1]}
                                isExpanded={message.messageId === latestExpandedMessageId}
                                onToggle={() => toggleMessage(message.messageId)}
                                renderContent={renderContent}
                            />
                        ))}
                    </Block>
                ))}
            </Block>
        </Block>
    )
}

export default React.memo(ConversationView)
