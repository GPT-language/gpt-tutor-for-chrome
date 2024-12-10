import React, { useMemo } from 'react'
import { Block } from 'baseui-sd/block'
import { Markdown } from './Markdown'
import { useTranslation } from 'react-i18next'
import { ChatMessage } from '@/store/file/slices/chat/initialState'
import { Button } from 'baseui-sd/button'
import { RxCopy, RxSpeakerLoud } from 'react-icons/rx'
import { Tooltip } from './Tooltip'
import { formatDate } from '@/common/utils/format'
import SpeakerMotion from './SpeakerMotion'

interface ConversationViewProps {
    messages: ChatMessage[]
    onCopy?: (text: string) => void
    onSpeak?: (text: string) => void
    isSpeaking?: boolean
}

const ConversationView: React.FC<ConversationViewProps> = ({ messages, onCopy, onSpeak, isSpeaking }) => {
    const { t } = useTranslation()

    // 对消息按时间分组
    const groupedMessages = useMemo(() => {
        const groups: { date: string; messages: ChatMessage[] }[] = []
        let currentDate = ''
        let currentGroup: ChatMessage[] = []

        messages.forEach((message) => {
            const messageDate = formatDate(message.createdAt)

            if (messageDate !== currentDate) {
                if (currentGroup.length > 0) {
                    groups.push({
                        date: currentDate,
                        messages: [...currentGroup],
                    })
                }
                currentDate = messageDate
                currentGroup = [message]
            } else {
                currentGroup.push(message)
            }
        })

        if (currentGroup.length > 0) {
            groups.push({
                date: currentDate,
                messages: currentGroup,
            })
        }

        return groups
    }, [messages])

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'assistant':
                return '#2B7CEA'
            case 'user':
                return '#000000'
            case 'system':
                return '#666666'
            default:
                return '#000000'
        }
    }

    return (
        <Block
            width='100%'
            padding='16px'
            $style={{
                maxHeight: '600px',
                overflowY: 'auto',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
            }}
        >
            {groupedMessages.map((group, groupIndex) => (
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
                    {group.messages.map((message, index) => (
                        <Block
                            key={message.messageId}
                            display='flex'
                            marginBottom='16px'
                            flexDirection={message.role === 'assistant' ? 'row' : 'row-reverse'}
                        >
                            {/* 角色头像 */}
                            <Block
                                marginRight={message.role === 'assistant' ? '12px' : '0'}
                                marginLeft={message.role === 'assistant' ? '0' : '12px'}
                                $style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: getRoleColor(message.role),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '14px',
                                    flexShrink: 0,
                                }}
                            >
                                {message.role === 'assistant' ? 'AI' : 'U'}
                            </Block>

                            {/* 消息内容 */}
                            <Block
                                backgroundColor={message.role === 'assistant' ? '#F7F7F8' : '#E3F2FD'}
                                padding='12px 16px'
                                maxWidth='80%'
                                $style={{
                                    borderRadius: '12px',
                                    position: 'relative',
                                }}
                            >
                                <Markdown>{message.content}</Markdown>

                                {/* 消息操作按钮 */}
                                <Block display='flex' justifyContent='flex-end' marginTop='8px' $style={{ gap: '8px' }}>
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
                                </Block>

                                {/* 消息时间 */}
                                <Block
                                    position='absolute'
                                    bottom='-20px'
                                    $style={{
                                        [message.role === 'assistant' ? 'left' : 'right']: '12px',
                                        fontSize: '11px',
                                        color: '#999',
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
