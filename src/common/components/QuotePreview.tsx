import React, { useState } from 'react'
import { Block } from 'baseui-sd/block'
import { Button } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { RxSpeakerLoud, RxEraser } from 'react-icons/rx'
import { RiSpeakerFill } from 'react-icons/ri'
import { StatefulTooltip } from 'baseui-sd/tooltip'
import { useChatStore } from '@/store/file/store'
import SpeakerMotion from './SpeakerMotion'

interface QuotePreviewProps {
    showFullText: boolean
    toggleFullText: () => void
    onClose: () => void
    previewLength?: number
    onSpeak?: () => void
    onYouglish?: () => void
    isSpeaking?: boolean
    text?: string
}

const QuotePreview: React.FC<QuotePreviewProps> = ({
    showFullText,
    toggleFullText,
    onClose,
    previewLength = 100,
    onSpeak,
    onYouglish,
    isSpeaking,
}) => {
    const { t } = useTranslation()
    const { selectedWord } = useChatStore()
    const [isHovered, setIsHovered] = useState(false)

    const previewText =
        selectedWord?.text && selectedWord.text.length > previewLength
            ? selectedWord.text.slice(0, previewLength) + '...'
            : selectedWord?.text

    return (
        <Block
            position='relative'
            style={{ marginBottom: '10px' }}
            data-testid='quote-preview-container'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Block
                $style={{
                    fontStyle: 'italic',
                    fontSize: '14px',
                    borderLeft: '3px solid gray',
                    paddingLeft: '10px',
                    paddingRight: '30px',
                    marginBottom: '10px',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
                data-testid='quote-preview-text'
            >
                <StatefulTooltip
                    content={() => (showFullText ? t('Show Less') : t('Show Full Text'))}
                    placement='bottom'
                    showArrow
                    triggerType='hover'
                    initialState={{ isOpen: false }}
                    overrides={{
                        Body: {
                            style: {
                                zIndex: 999,
                                pointerEvents: 'auto',
                                opacity: 1,
                            },
                        },
                        Inner: {
                            style: {
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                color: 'white',
                                padding: '6px 10px',
                            },
                        },
                    }}
                >
                    <span
                        onClick={toggleFullText}
                        style={{
                            maxWidth: isHovered ? 'calc(100% - 150px)' : '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'max-width 0.2s ease-in-out',
                            cursor: 'pointer',
                        }}
                    >
                        &quot;{showFullText ? selectedWord?.text : previewText}&quot;
                    </span>
                </StatefulTooltip>

                {isHovered && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            position: 'absolute',
                            right: '30px',
                        }}
                    >
                        <StatefulTooltip
                            content={() => t('Speak')}
                            placement='bottom'
                            showArrow
                            triggerType='hover'
                            initialState={{ isOpen: false }}
                            overrides={{
                                Body: {
                                    style: {
                                        zIndex: 999,
                                        pointerEvents: 'auto',
                                        opacity: 1,
                                    },
                                },
                                Inner: {
                                    style: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                        color: 'white',
                                        padding: '6px 10px',
                                    },
                                },
                            }}
                        >
                            <Button onClick={onSpeak} size='mini' kind='tertiary'>
                                {isSpeaking ? <SpeakerMotion /> : <RxSpeakerLoud size={15} />}
                            </Button>
                        </StatefulTooltip>

                        <StatefulTooltip
                            content={() => t('On/Off Youglish')}
                            placement='bottom'
                            showArrow
                            triggerType='hover'
                            initialState={{ isOpen: false }}
                            overrides={{
                                Body: {
                                    style: {
                                        zIndex: 999,
                                        pointerEvents: 'auto',
                                        opacity: 1,
                                    },
                                },
                                Inner: {
                                    style: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                        color: 'white',
                                        padding: '6px 10px',
                                    },
                                },
                            }}
                        >
                            <Button onClick={onYouglish} size='mini' kind='tertiary'>
                                <RiSpeakerFill size={15} />
                            </Button>
                        </StatefulTooltip>

                        <StatefulTooltip
                            content={() => t('Clear selection')}
                            placement='bottom'
                            showArrow
                            triggerType='hover'
                            initialState={{ isOpen: false }}
                            overrides={{
                                Body: {
                                    style: {
                                        zIndex: 999,
                                        pointerEvents: 'auto',
                                        opacity: 1,
                                    },
                                },
                                Inner: {
                                    style: {
                                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                        color: 'white',
                                        padding: '6px 10px',
                                    },
                                },
                            }}
                        >
                            <Button onClick={onClose} size='mini' kind='tertiary'>
                                <RxEraser size={16} />
                            </Button>
                        </StatefulTooltip>
                    </div>
                )}
            </Block>
        </Block>
    )
}

export default QuotePreview
