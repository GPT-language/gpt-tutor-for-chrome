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
        marginBottom: '4px',
    })

    const userMessageStyles = css({
        'backgroundColor': '#E3F2FD',
        'padding': '4px 8px',
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
    const { answers, setCurrentConversationTitle, selectedWord } = useChatStore()
    const [activeKey, setActiveKey] = React.useState<string>('')
    const [latestExpandedMessageId, setLatestExpandedMessageId] = React.useState<string | null>(null)
    const previousMessagesLength = React.useRef(0)

    // 获取所有的会话消息
    const allConversations = useMemo(() => {
        // 首先使用answers，如果answers为空，则使用selectedWord.answers
        const conversations = answers || selectedWord?.answers
        if (!conversations) return []
        return Object.entries(conversations)
            .map(([key, value]) => ({
                key,
                messages: value.conversationMessages || [],
            }))
            .filter((item) => item.messages.length > 0)
    }, [answers, selectedWord])

    // 当前选中的会话消息
    const currentMessages = useMemo(() => {
        const conversation = allConversations[parseInt(activeKey)]
        return conversation ? conversation.messages : []
    }, [allConversations, activeKey])

    // Tab 样式
    const MAX_TAB_WIDTH = 100
    const MIN_TAB_WIDTH = 60
    const MORE_TAB_WIDTH = 20
    const ACTION_BUTTONS_WIDTH = 30
    const tabsOverrides = useMemo(
        () => ({
            Root: {
                style: {
                    flexGrow: 1,
                    padding: 0,
                    margin: 0,
                },
            },
            TabList: {
                style: {
                    flexWrap: 'nowrap',
                    padding: 0,
                    margin: 0,
                },
            },
            TabBorder: {
                style: { display: 'none' },
            },
            Tab: {
                style: {
                    'minWidth': `${MIN_TAB_WIDTH}px`,
                    'transition': 'all 0.2s ease',
                    'padding': '6px 12px', // 减小内边距
                    'fontSize': '12px', // 减小字号
                    'fontWeight': 400, // 正常字重
                    'backgroundColor': 'transparent',
                    ':hover': {
                        backgroundColor: 'rgba(39, 110, 241, 0.05)',
                    },
                },
            },
            TabHighlight: {
                style: {
                    height: '2px', // 设置下划线高度
                    backgroundColor: '#276EF1', // 设置下划线颜色
                },
            },
        }),
        []
    )

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
            // 找到最后一组用户消息和助手回复
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                    setLatestExpandedMessageId(messages[i].messageId)
                    break
                }
            }
        }

        // 更新消息长度记录
        previousMessagesLength.current = messages.length
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

    const toggleMessage = (messageId: string) => {
        setLatestExpandedMessageId((prevId) => (prevId === messageId ? null : messageId))
    }

    // 初始化title和activeKey为空
    useEffect(() => {
        setCurrentConversationTitle('')

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
            <Block>
                <Tabs activeKey={activeKey} onChange={handleTabChange} activateOnFocus>
                    {allConversations.map((conversation, index) => (
                        <Tab key={index} title={conversation.key} overrides={tabsOverrides}>
                            <Block>
                                {groupedMessages.map((group) => (
                                    <Block key={group.date} marginBottom='24px'>
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
