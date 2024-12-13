import React, { useEffect, useMemo } from 'react'
import { Block } from 'baseui-sd/block'
import { useTranslation } from 'react-i18next'
import { ChatMessage } from '@/store/file/slices/chat/initialState'
import { Button } from 'baseui-sd/button'
import { RxCopy, RxSpeakerLoud } from 'react-icons/rx'
import { Tooltip } from './Tooltip'
import { formatDate } from '@/common/utils/format'
import SpeakerMotion from './SpeakerMotion'
import { useChatStore } from '@/store/file/store'

interface ConversationViewProps {
    onCopy?: (text: string) => void
    onSpeak?: (text: string) => void
    isSpeaking?: boolean
    renderContent: (text: string, format: string, actionName?: string) => React.ReactNode
}

const ConversationView: React.FC<ConversationViewProps> = ({ onCopy, onSpeak, isSpeaking, renderContent }) => {
    const { t } = useTranslation()
    const { selectedWord, activateAction, answers, conversationHistory } = useChatStore()

    useEffect(() => {
        console.log('conversationHistory is', conversationHistory)
    }, [conversationHistory])

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
    }, [activateAction?.name, answers])

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
                    {group.messages.map((message) => (
                        <Block
                            key={message.messageId}
                            display='flex'
                            marginBottom='24px'
                            justifyContent={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
                            $style={{
                                width: '100%',
                                minWidth: 0,
                            }}
                        >
                            <Block
                                backgroundColor={message.role === 'assistant' ? '#F7F7F8' : '#E3F2FD'}
                                padding='12px 16px'
                                maxWidth='95%'
                                marginLeft={message.role === 'assistant' ? '0' : 'auto'}
                                marginRight={message.role === 'assistant' ? 'auto' : '0'}
                                $style={{
                                    borderRadius: '12px',
                                    position: 'relative',
                                    borderTopLeftRadius: message.role === 'assistant' ? '4px' : '12px',
                                    borderTopRightRadius: message.role === 'assistant' ? '12px' : '4px',
                                    minWidth: 0,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {/* 消息内容容器 */}
                                <Block
                                    $style={{
                                        'minWidth': 0,
                                        'width': '100%',
                                        'flex': '1 1 auto',
                                        '& p, & div, & span, & code, & pre': {
                                            maxWidth: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            overflowWrap: 'break-word',
                                            wordWrap: 'break-word',
                                            wordBreak: 'break-all',
                                            hyphens: 'auto',
                                        },
                                        '& pre, & code': {
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            overflowX: 'auto',
                                        },
                                        '& table': {
                                            'width': '100%',
                                            'tableLayout': 'fixed',
                                            '& td, & th': {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            },
                                        },
                                        '& img': {
                                            maxWidth: '100%',
                                            height: 'auto',
                                            objectFit: 'contain',
                                        },
                                        '& a': {
                                            wordBreak: 'break-all',
                                        },
                                    }}
                                >
                                    {renderContent(message.content, message.format || 'markdown', message.actionName)}
                                </Block>

                                {/* 操作按钮容器 */}
                                {/*  <Block
                                    display='flex'
                                    justifyContent='flex-end'
                                    marginTop='8px'
                                    $style={{
                                        'gap': '8px',
                                        'minWidth': 0,
                                        'opacity': 0.7,
                                        'transition': 'opacity 0.2s',
                                        ':hover': {
                                            opacity: 1,
                                        },
                                    }}
                                >
                                    {onCopy && (
                                        <Tooltip content={t('Copy')} placement='bottom'>
                                            <Button size='mini' kind='tertiary' onClick={() => onCopy(message.content)}>
                                                <RxCopy size={14} />
                                            </Button>
                                        </Tooltip>
                                    )}

                                    {onSpeak && (
                                        <Tooltip content={t('Speak')} placement='bottom'>
                                            <Button
                                                size='mini'
                                                kind='tertiary'
                                                onClick={() => onSpeak(message.content)}
                                            >
                                                {isSpeaking ? <SpeakerMotion /> : <RxSpeakerLoud size={14} />}
                                            </Button>
                                        </Tooltip>
                                    )}
                                </Block> */}

                                {/* 时间戳容器 */}
                                <Block
                                    position='absolute'
                                    bottom='-20px'
                                    $style={{
                                        [message.role === 'assistant' ? 'left' : 'right']: '12px',
                                        fontSize: '11px',
                                        color: '#999',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {new Date(message.createdAt).toLocaleTimeString()}
                                </Block>
                            </Block>
                        </Block>
                    ))}
                </Block>
            ))}
        </Block>
    )
}

export default React.memo(ConversationView)
