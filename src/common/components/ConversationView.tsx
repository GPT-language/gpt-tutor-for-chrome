import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { Block } from 'baseui-sd/block'
import { ChatMessage } from '@/store/file/slices/chat/initialState'
import { formatDate } from '@/common/utils/format'
import { useChatStore } from '@/store/file/store'
import { RxChevronDown, RxSpeakerLoud, RxCopy } from 'react-icons/rx'
import { useStyletron } from 'styletron-react'
import SpeakerMotion from './SpeakerMotion'
import { shallow } from 'zustand/shallow'
import { useStyles } from './Translator'
import { useTheme } from '../hooks/useTheme'
import { isDesktopApp } from '../utils'
import { AiOutlinePlusSquare } from 'react-icons/ai'

interface ConversationViewProps {
    onCopy?: (text: string) => void
    onSpeak?: (text: string) => void
    isSpeaking?: boolean
    renderContent: (text: string, format: string, messageId: string, actionName: string) => React.ReactNode
}

interface MessageItemProps {
    message: ChatMessage
    nextMessage?: ChatMessage
    isExpanded: boolean
    onToggle: () => void
    onCopy?: (text: string) => void
    renderContent: (text: string, format: string, messageId: string, actionName: string) => React.ReactNode
}

// 定义消息组件
const MessageItem: React.FC<MessageItemProps> = ({
    message,
    nextMessage,
    isExpanded,
    onToggle,
    onCopy,
    renderContent,
}) => {
    const [css] = useStyletron()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType, isDesktopApp: isDesktopApp() })
    const [isHover, setIsHover] = useState(false)
    const { speakingMessageId, isSpeaking, startSpeak, currentConversationKey, addToAnki, selectedWord } = useChatStore(
        (state) => ({
            speakingMessageId: state.speakingMessageId,
            isSpeaking: state.isSpeaking,
            startSpeak: state.startSpeak,
            currentConversationKey: state.currentConversationKey,
            addToAnki: state.addToAnki,
            activateAction: state.activateAction,
            selectedWord: state.selectedWord,
        }),
        shallow
    )

    const handleSpeak = useCallback(
        async (text: string, messageId: string) => {
            if (isSpeaking) {
                // 如果当前消息正在播放，则停止播放
                console.log('stopSpeak')
                await startSpeak({
                    text: '', // 空文本触发停止
                })
            } else {
                console.log('startSpeak')
                // 开始新的播放
                try {
                    await startSpeak({
                        text,
                        messageId,
                        conversationId: currentConversationKey,
                    })
                } catch (error) {
                    console.error('Error detecting language:', error)
                }
            }
        },
        [isSpeaking, startSpeak, currentConversationKey]
    )

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
                    onMouseEnter={() => setIsHover(true)}
                    onMouseLeave={() => setIsHover(false)}
                >
                    <Block flex='1'>
                        <Block>{message.actionName || message.content}</Block>
                    </Block>
                    <Block display='flex' alignItems='center'>
                        <RxChevronDown size={20} className={expandIconStyles} />
                    </Block>
                    {isHover && nextMessage?.role === 'assistant' && (
                        <>
                            <button
                                className={styles.actionButton}
                                style={{
                                    backgroundColor: 'transparent',
                                    marginLeft: '8px',
                                    border: 'none',
                                    outline: 'none',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSpeak(nextMessage.content, message.messageId)
                                }}
                            >
                                {isSpeaking && speakingMessageId === message.messageId ? (
                                    <SpeakerMotion />
                                ) : (
                                    <RxSpeakerLoud size={13} />
                                )}
                            </button>
                            <button
                                className={styles.actionButton}
                                style={{
                                    backgroundColor: 'transparent',
                                    marginLeft: '8px',
                                    border: 'none',
                                    outline: 'none',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCopy?.(nextMessage.content)
                                }}
                            >
                                <RxCopy size={13} />
                            </button>
                            <button
                                className={styles.actionButton}
                                style={{
                                    backgroundColor: 'transparent',
                                    marginLeft: '8px',
                                    border: 'none',
                                    outline: 'none',
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    addToAnki?.(
                                        message.content || 'default',
                                        selectedWord?.text || message.content,
                                        nextMessage.content
                                    )
                                }}
                            >
                                <AiOutlinePlusSquare size={13} />
                            </button>
                        </>
                    )}
                </Block>

                {nextMessage?.role === 'assistant' && (
                    <div className={animatedContentStyles}>
                        <Block className={assistantMessageStyles}>
                            {renderContent(
                                nextMessage.content,
                                nextMessage.format || 'markdown',
                                nextMessage.messageId,
                                currentConversationKey
                            )}
                        </Block>
                    </div>
                )}
            </div>
        )
    }

    return null
}

const ConversationView: React.FC<ConversationViewProps> = ({ renderContent, onCopy }) => {
    const {
        answers,
        selectedWord,
        currentConversationKey,
        setCurrentConversationKey,
        generateNewConversationKey,
        activateAction,
        editableText,
    } = useChatStore()
    const [latestExpandedMessageId, setLatestExpandedMessageId] = React.useState<string | null>(null)
    const previousConversationKey = useRef<string | null>(null)
    const previousMessagesLength = useRef<number>(0)

    const currentMessages = useMemo(() => {
        const conversations = answers || selectedWord?.answers
        if (!conversations || !currentConversationKey) return []
        return conversations[currentConversationKey]?.conversationMessages || []
    }, [answers, selectedWord, currentConversationKey])

    // 监听 answers 变化，处理对话显示逻辑
    useEffect(() => {
        const conversations = answers || selectedWord?.answers
        if (!conversations) return
        console.log('conversations', conversations)
        console.log('currentConversationKey', currentConversationKey)

        // 如果没有选择对话或当前选择的对话不存在，生成新的对话 key
        if (!currentConversationKey) {
            const newKey = generateNewConversationKey()
            setCurrentConversationKey(newKey)
            previousConversationKey.current = newKey
            return
        }

        // 处理对话切换的情况
        if (currentConversationKey !== previousConversationKey.current) {
            // 当对话切换时，展开最新的消息
            const messages = conversations[currentConversationKey]?.conversationMessages || []
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                    setLatestExpandedMessageId(messages[i].messageId)
                    break
                }
            }
            previousConversationKey.current = currentConversationKey
        }
    }, [
        answers,
        selectedWord,
        currentConversationKey,
        activateAction,
        editableText,
        setCurrentConversationKey,
        generateNewConversationKey,
    ])

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
                                onCopy={onCopy}
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
