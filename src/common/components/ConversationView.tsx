import React, { useEffect, useMemo } from 'react'
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
    renderContent: (text: string, format: string, actionName?: string) => React.ReactNode
}

const ConversationView: React.FC<ConversationViewProps> = ({ onCopy, onSpeak, isSpeaking, renderContent }) => {
    const { t } = useTranslation()
    const { selectedWord, activateAction, answers, conversationHistory } = useChatStore()
    const [css] = useStyletron()
    const [latestExpandedMessageId, setLatestExpandedMessageId] = React.useState<string | null>(null)
    const [isNewMessage, setIsNewMessage] = React.useState(false)
    const previousMessagesLength = React.useRef(0)

    useEffect(() => {
        console.log('answers is', answers)
        console.log('conversationHistory is', conversationHistory)
    }, [answers, conversationHistory])

    // 只依赖消息ID列表进行分组
    const groupedMessages = useMemo(() => {
        const messages = answers?.[activateAction?.name || 'default']?.conversationMessages || conversationHistory
        const groups: { date: string; messages: ChatMessage[] }[] = []
        let currentDate = ''
        let currentGroup: ChatMessage[] = []

        messages.forEach((message) => {
            const messageDate = formatDate(message.createdAt)

            // 过滤role为system的消息
            if (message.role === 'system') return

            // 使用 messageId 作为唯一标识
            const existingMessageIndex = currentGroup.findIndex((m) => m.messageId === message.messageId)
            if (existingMessageIndex !== -1) {
                // 如果消息已存在，创建新的消息对象替换原有的
                currentGroup[existingMessageIndex] = { ...currentGroup[existingMessageIndex], ...message }
                return
            }

            if (messageDate !== currentDate) {
                if (currentGroup.length > 0) {
                    groups.push({
                        date: currentDate,
                        messages: [...currentGroup],
                    })
                }
                currentDate = messageDate
                currentGroup = [{ ...message }] // 创建消息对象的副本
            } else {
                currentGroup.push({ ...message }) // 创建消息对象的副本
            }
        })

        if (currentGroup.length > 0) {
            groups.push({
                date: currentDate,
                messages: [...currentGroup],
            })
        }

        return groups
    }, [activateAction?.name, answers, conversationHistory])

    // 监听消息变化，检测新消息并自动展开
    useEffect(() => {
        const messages = answers?.[activateAction?.name || 'default']?.conversationMessages || conversationHistory

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
    }, [answers, activateAction?.name, conversationHistory])

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

    return (
        <Block
            width='100%'
            height='100%'
            $style={{
                display: groupedMessages.length === 0 ? 'none' : 'flex',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                flexDirection: 'column',
            }}
        >
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

                    {/* 消息列表  */}
                    {group.messages.map((message, index) => {
                        const assistantMessage = group.messages[index + 1]
                        const hasAssistantResponse = assistantMessage?.role === 'assistant'
                        const isExpanded = message.messageId === latestExpandedMessageId

                        return message.role === 'user' ? (
                            <Block
                                key={message.messageId}
                                marginBottom='16px'
                                // 只在新消息时触发滚动
                                ref={(node: HTMLElement | null) => {
                                    if (node && isExpanded && isNewMessage) {
                                        debouncedScroll(node)
                                    }
                                }}
                            >
                                <div
                                    className={messageContainerStyles}
                                    onClick={() => hasAssistantResponse && toggleMessage(message.messageId)}
                                >
                                    <Block
                                        backgroundColor='#E3F2FD'
                                        padding='12px 16px'
                                        display='flex'
                                        alignItems='center'
                                        justifyContent='space-between'
                                        $style={{
                                            borderRadius: '12px',
                                            borderTopRightRadius: '4px',
                                        }}
                                    >
                                        <Block flex='1'>
                                            {renderContent(
                                                message.content,
                                                message.format || 'markdown',
                                                message.actionName
                                            )}
                                        </Block>
                                        {hasAssistantResponse && (
                                            <RxChevronDown size={20} className={expandIconStyles(isExpanded)} />
                                        )}
                                    </Block>

                                    <div
                                        className={`${animatedContentStyles} ${css({
                                            maxHeight: isExpanded ? '2000px' : '0px',
                                            marginTop: isExpanded ? '12px' : '0px',
                                            opacity: isExpanded ? 1 : 0,
                                        })}`}
                                    >
                                        {hasAssistantResponse && (
                                            <Block
                                                backgroundColor='#F7F7F8'
                                                padding='12px 16px'
                                                $style={{
                                                    borderRadius: '12px',
                                                    borderTopLeftRadius: '4px',
                                                }}
                                            >
                                                {renderContent(
                                                    assistantMessage.content,
                                                    assistantMessage.format || 'markdown',
                                                    assistantMessage.actionName
                                                )}
                                            </Block>
                                        )}
                                    </div>
                                </div>
                            </Block>
                        ) : null
                    })}
                </Block>
            ))}
        </Block>
    )
}

export default React.memo(ConversationView)
