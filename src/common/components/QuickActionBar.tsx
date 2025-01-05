import React, { useCallback, useMemo } from 'react'
import { Block } from 'baseui-sd/block'
import { Button, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { RxSpeakerLoud } from 'react-icons/rx'
import { RiSpeakerFill } from 'react-icons/ri'
import { StatefulTooltip } from 'baseui-sd/tooltip'
import { useStyletron } from 'baseui-sd'
import { TbMessageQuestion } from 'react-icons/tb'
import { useChatStore } from '@/store/file/store'
import { Action } from '../internal-services/db'
import * as mdIcons from 'react-icons/md'
import { IconType } from 'react-icons'

interface QuickActionBarProps {
    onSpeak?: () => void
    onYouglish?: () => void
    onExplainWord?: () => void
    isSpeaking?: boolean
    disabled?: boolean
    independentText?: string
    onSubmit?: () => void
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({
    onSpeak,
    onYouglish,
    onExplainWord,
    isSpeaking,
    disabled = false,
    independentText,
    onSubmit,
}) => {
    const [css] = useStyletron()
    const { t } = useTranslation()
    const { actions, setAction } = useChatStore()

    // 获取常用 actions
    const frequentActions = useMemo(() => {
        return actions?.filter((action) => action.isFrequentlyUsed).slice(0, 10) || []
    }, [actions])

    const handleActionClick = useCallback(
        (action: Action) => {
            if (setAction) {
                setAction(action)
            }
            if (onSubmit) {
                onSubmit()
            }
        },
        [setAction, onSubmit]
    )

    const tooltipOverrides = {
        Body: {
            style: {
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
    }

    const renderIcon = (iconName: string) => {
        const Icon = (mdIcons as Record<string, IconType>)[iconName]
        return Icon ? <Icon size={15} /> : iconName[0]
    }

    return (
        <Block
            className={css({
                display: 'flex',
                gap: '8px',
                padding: '8px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                zIndex: 100,
            })}
            data-testid='quick-action-bar'
        >
            {onSpeak && (
                <StatefulTooltip
                    content={() => t('Speak')}
                    placement='top'
                    showArrow
                    triggerType='hover'
                    overrides={tooltipOverrides}
                >
                    <Button
                        onClick={onSpeak}
                        size={SIZE.mini}
                        kind='tertiary'
                        disabled={disabled}
                        overrides={{
                            BaseButton: {
                                style: {
                                    padding: '8px',
                                },
                            },
                        }}
                    >
                        <RxSpeakerLoud size={15} />
                    </Button>
                </StatefulTooltip>
            )}

            {onYouglish && (
                <StatefulTooltip
                    content={() => t('On/Off Youglish')}
                    placement='top'
                    showArrow
                    triggerType='hover'
                    overrides={tooltipOverrides}
                >
                    <Button
                        onClick={onYouglish}
                        size={SIZE.mini}
                        kind='tertiary'
                        disabled={disabled}
                        overrides={{
                            BaseButton: {
                                style: {
                                    padding: '8px',
                                },
                            },
                        }}
                    >
                        <RiSpeakerFill size={15} />
                    </Button>
                </StatefulTooltip>
            )}

            {onExplainWord && (
                <StatefulTooltip
                    content={() => t('Explain word in context')}
                    placement='top'
                    showArrow
                    triggerType='hover'
                    overrides={tooltipOverrides}
                >
                    <Button
                        onClick={onExplainWord}
                        size={SIZE.mini}
                        kind='tertiary'
                        disabled={disabled}
                        overrides={{
                            BaseButton: {
                                style: {
                                    padding: '8px',
                                },
                            },
                        }}
                    >
                        <TbMessageQuestion size={15} />
                    </Button>
                </StatefulTooltip>
            )}

            {/* 分隔线 */}
            {frequentActions.length > 0 && (
                <Block
                    className={css({
                        width: '1px',
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        margin: '0 4px',
                    })}
                />
            )}

            {/* 常用 Actions */}
            {frequentActions.map((action) => (
                <StatefulTooltip
                    key={action.id}
                    content={() => action.name}
                    placement='top'
                    showArrow
                    triggerType='hover'
                    overrides={tooltipOverrides}
                >
                    <Button
                        onClick={() => handleActionClick(action)}
                        size={SIZE.mini}
                        kind='tertiary'
                        disabled={disabled}
                        overrides={{
                            BaseButton: {
                                style: {
                                    padding: '8px',
                                },
                            },
                        }}
                    >
                        {action.icon ? (
                            renderIcon(action.icon)
                        ) : (
                            <div
                                style={{
                                    width: '15px',
                                    height: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                }}
                            >
                                {action.name[0]}
                            </div>
                        )}
                    </Button>
                </StatefulTooltip>
            ))}
        </Block>
    )
}

export default QuickActionBar
