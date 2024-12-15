import React, { useEffect, useMemo } from 'react'
import { Block } from 'baseui-sd/block'
import { Tab, Tabs } from 'baseui-sd/tabs-motion'
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
        marginBottom: '16px',
    })

    const userMessageStyles = css({
        'backgroundColor': '#E3F2FD',
        'padding': '12px 16px',
        'borderRadius': '12px',
        'borderTopRightRadius': '4px',
        'cursor': 'pointer',
        ':hover': {
            backgroundColor: '#D0E8FC',
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
                        {renderContent(
                            message.actionName || message.content,
                            message.format || 'markdown',
                            message.actionName,
                            message.messageId
                        )}
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
    const { answers, setCurrentConversationTitle } = useChatStore()
    const [activeKey, setActiveKey] = React.useState<string>('0')
    const [css] = useStyletron()
    const [latestExpandedMessageId, setLatestExpandedMessageId] = React.useState<string | null>(null)
    const [isNewMessage, setIsNewMessage] = React.useState(false)
    const previousMessagesLength = React.useRef(0)
    const lastUsedAction = useChatStore((state) => state.lastUsedAction)

    useEffect(() => {
        console.log('answers is', answers)
        console.log('lastUsedAction is', lastUsedAction?.name)
        console.log('answers lastUsedAction is', answers?.[lastUsedAction?.name || 'default']?.conversationMessages)
    }, [answers, lastUsedAction])

    // 获取所有的会话消息
    const allConversations = useMemo(() => {
        if (!answers) return []

        return Object.entries(answers)
            .map(([key, value]) => ({
                key,
                messages: value.conversationMessages || [],
            }))
            .filter((item) => item.messages.length > 0)
    }, [answers])

    // 当前选中的会话消息
    const currentMessages = useMemo(() => {
        const conversation = allConversations[parseInt(activeKey)]
        return conversation ? conversation.messages : []
    }, [allConversations, activeKey])

    // Tab 样式
    const tabStyles = css({
        borderBottom: '1px solid #E6E8EB',
        marginBottom: '16px',
    })

    // 分组消息的逻辑
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

    // 监听消息变化，检测新消息并自动展开
    useEffect(() => {
        // 获取当前选中的会话的消息
        const currentConversation = allConversations[parseInt(activeKey)]
        const messages = currentConversation?.messages || []

        // 检查是否有新消息
        if (messages.length > previousMessagesLength.current) {
            setIsNewMessage(true)
            // 找到最后一组用户消息和助手回复
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                    setLatestExpandedMessageId(messages[i].messageId)
                    break
                }
            }
        } else {
            setIsNewMessage(false)
        }

        // 更新消息长度记录
        previousMessagesLength.current = messages.length
        setIsNewMessage(false)
    }, [allConversations, activeKey])

    // 创建防抖的滚动函数
    const debouncedScroll = useMemo(
        () =>
            debounce((node: HTMLElement) => {
                node.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                })
            }, 100),
        []
    )

    // 清理防抖函数
    useEffect(() => {
        return () => {
            debouncedScroll.cancel()
        }
    }, [debouncedScroll])

    // 替换原来的 toggleMessage 函数
    const toggleMessage = (messageId: string) => {
        setLatestExpandedMessageId((prevId) => (prevId === messageId ? null : messageId))
    }

    // 定义样式
    const animatedContentStyles = css({
        transition: 'all 0.3s ease-in-out',
        overflow: 'hidden',
    })

    const expandIconStyles = (isExpanded: boolean) =>
        css({
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease',
            marginLeft: '8px',
        })

    const messageContainerStyles = css({
        'position': 'relative',
        'cursor': 'pointer',
        ':hover': {
            '::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#F7F7F8',
                opacity: 0.1,
                borderRadius: '12px',
                pointerEvents: 'none',
            },
        },
    })

    const handleTabChange = ({ activeKey }: { activeKey: React.Key }) => {
        setActiveKey(activeKey as string)
        const conversation = allConversations[Number(activeKey)]
        if (conversation) {
            // 设置当前对话的标题
            setCurrentConversationTitle(conversation.key)
        }
    }

    return (
        <Block
            width='100%'
            height='100%'
            $style={{
                display: allConversations.length === 0 ? 'none' : 'flex',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                flexDirection: 'column',
            }}
        >
            {/* 添加 Tabs */}
            <Block className={tabStyles}>
                <Tabs activeKey={activeKey} onChange={handleTabChange} activateOnFocus>
                    {allConversations.map((conversation, index) => (
                        <Tab key={index} title={conversation.key}>
                            <Block>
                                {groupedMessages.map((group) => (
                                    <Block key={group.date} marginBottom='24px'>
                                        {/* 日期分隔线 */}
                                        <Block
                                            marginBottom='16px'
                                            display='flex'
                                            alignItems='center'
                                            justifyContent='center'
                                            $style={{
                                                'position': 'relative',
                                                '::before': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    left: 0,
                                                    right: 0,
                                                    top: '50%',
                                                    height: '1px',
                                                    backgroundColor: '#E6E8EB',
                                                    zIndex: 0,
                                                },
                                            }}
                                        >
                                            <Block
                                                padding='4px 12px'
                                                backgroundColor='white'
                                                $style={{
                                                    fontSize: '12px',
                                                    color: '#666',
                                                    zIndex: 1,
                                                    borderRadius: '12px',
                                                    border: '1px solid #E6E8EB',
                                                }}
                                            >
                                                {group.date}
                                            </Block>
                                        </Block>

                                        {/* 消息列表 */}
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
                        </Tab>
                    ))}
                </Tabs>
            </Block>
        </Block>
    )
}

export default React.memo(ConversationView)
