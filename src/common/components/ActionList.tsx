import { memo, useState, useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'
import { ListHeading } from 'baseui-sd/list'
import { Button, KIND, SHAPE, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
interface ActionListProps {
    onActionClick: () => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const { selectedWord, addWordToLearningFile, actions, setAction, activatedAction, isShowActionList, isLoading } =
        useChatStore()
    const [nextAction, setNextAction] = useState<Action | undefined>(undefined)
    const [isComleted, setIsCompleted] = useState(false)
    const { t } = useTranslation()
    const finished = t('finished')
    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        console.log('selectedWord in handleAddWordClick', selectedWord)
        setNextAction(undefined)
        setIsCompleted(false)
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord)
    }

    useEffect(() => {
        if (!actions) {
            return
        }
        if (actions.length === 1) {
            setNextAction(undefined)
            setIsCompleted(true)
        }
        if (actions.length > 1) {
            setNextAction(
                activatedAction?.idx ? actions.find((action) => action.idx === activatedAction?.idx + 1) : actions[1]
            )
            setIsCompleted(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions])

    useEffect(() => {
        console.log('isComleted', isComleted)
        console.log('isLoading', isLoading)
        console.log('nextAction', nextAction)
        console.log('actions', actions)
        console.log('activatedAction', activatedAction)
    }, [actions, activatedAction, isComleted, isLoading, nextAction])

    const handleActionClick = async (action: Action | undefined) => {
        if (!action) {
            return
        }
        setAction(action)
        onActionClick()
        console.log('handleActionClick', action)
        if (!actions || !activatedAction?.idx) {
            return
        }
        console.log('activatedAction?.idx', activatedAction?.idx)
        console.log('actions is not empty', actions)

        const nextAction = actions.find((action) => action.idx === action.idx + 1)
        console.log('next action is not empty', nextAction)

        if (nextAction) {
            setNextAction(nextAction)
        } else {
            setIsCompleted(true)
        }
    }

    if (!isShowActionList) {
        return null
    }

    return (
        <div>
            <ol>
                {!isComleted && nextAction && (
                    <ListHeading
                        overrides={{
                            HeadingContainer: {
                                style: ({ $theme }) => ({
                                    fontSize: '18px', // 使用主题中的尺寸变量，也可以直接使用像素值
                                }),
                            },
                            SubHeadingContainer: {
                                style: ({ $theme }) => ({
                                    fontSize: '14px', // 使用主题中的尺寸变量，也可以直接使用像素值
                                    color: $theme.colors.contentSecondary,
                                }),
                            },
                        }}
                        key={nextAction?.idx}
                        heading={nextAction?.name}
                        subHeading={nextAction?.description}
                        endEnhancer={() => (
                            <Button
                                size={SIZE.compact}
                                shape={SHAPE.default}
                                kind={KIND.secondary}
                                onClick={() => handleActionClick(nextAction)}
                            >
                                {t('确定')}
                            </Button>
                        )}
                        maxLines={2}
                    />
                )}
            </ol>
            {isComleted && !isLoading && (
                <ListHeading
                    overrides={{
                        HeadingContainer: {
                            style: ({ $theme }) => ({
                                fontSize: '18px', // 使用主题中的尺寸变量，也可以直接使用像素值
                            }),
                        },
                        SubHeadingContainer: {
                            style: ({ $theme }) => ({
                                fontSize: '14px', // 使用主题中的尺寸变量，也可以直接使用像素值
                                color: $theme.colors.contentSecondary,
                            }),
                        },
                    }}
                    heading={t('完成学习！💖')}
                    subHeading={t('恭喜！你已经完成了该单词的学习，点击确定加入到复习中')}
                    endEnhancer={() => (
                        <Button
                            size={SIZE.compact}
                            shape={SHAPE.default}
                            kind={KIND.secondary}
                            onClick={handleAddWordClick}
                        >
                            {t('完成学习')}
                        </Button>
                    )}
                    maxLines={2}
                />
            )}
        </div>
    )
})

export default ActionList
