import { memo, useState, useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'
import { Button, KIND, SHAPE, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { actionInternalService } from '../internal-services/action'
import { Select, Value } from 'baseui-sd/select'
import { Textarea } from 'baseui-sd/textarea'
import { fileService } from '../internal-services/file'
interface ActionListProps {
    onActionClick: (action: Action | undefined) => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const {
        words,
        selectedWord,
        selectWord,
        currentFileId,
        selectedCategory,
        addWordToReviewFile,
        updateReviewStatus,
        markWordAsForgotten,
        actions,
        activateAction,
        setAction,
        isShowActionList,
        assistantActionText,
        setAssistantActionText,
        setIsShowActionList,
        setActionStr,
        currentPage,
        setCurrentPage,
    } = useChatStore()
    const parentActions = actions.filter((action) => !action.parentIds)
    const [nextAction, setNextAction] = useState<Action | undefined>(undefined)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showNext, setShowNext] = useState(false)
    const [isNextWord, setIsNextWord] = useState(false)
    const [isSelectedNextWord, setIsSelectedNextWord] = useState(false)
    const [assistantActions, setAssistantActions] = useState<Action[]>([])
    const { t } = useTranslation()
    const [isShowAssistantList, setIsShowAssistantList] = useState(false)
    const [value, setValue] = useState<Value>([])
    const reviewFileName = t('To review') + t(selectedCategory)

    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        setNextAction(undefined)
        if (!selectedWord) {
            return
        }
        try {
            await addWordToReviewFile(selectedWord, reviewFileName)
            setActionStr(t('Added to review'))
        } catch (error) {
            setActionStr(t('Failed to add to review'))
        }
        if (!showNext) {
            setShowNext(true)
        }
    }

    const handleNextWordClick = async () => {
        if (!selectedWord) {
            return // Exit if no word is selected
        }

        // Attempt to find the next word
        const nextWord = words.find((word) => word.idx === selectedWord.idx + 1)

        if (nextWord) {
            // If found, select the next word
            selectWord(nextWord)
            setIsSelectedNextWord(true)
        } else {
            setCurrentPage(currentPage + 1)
            setIsSelectedNextWord(false)
        }
    }

    const handleStartToLearnClick = () => {
        setShowNext(false)
        if (!selectedWord) {
            return
        }
        const nextWord = words.find((word) => word.idx === selectedWord.idx + 1)
        if (nextWord) {
            selectWord(nextWord)
            setIsSelectedNextWord(true)
        }
        const nextAction = actions.find((action) => action.idx === 0)
        setAction(nextAction)
        onActionClick(nextAction)
    }

    const handleReviewClick = async () => {
        if (!selectedWord) {
            return
        }
        await updateReviewStatus(selectedWord)
    }

    const handleForgetClick = async () => {
        if (!selectedWord) {
            return
        }
        await markWordAsForgotten(selectedWord)
    }

    const handleSelectAndExecuteAction = (selectedIdx: number | string | undefined) => {
        if (!selectedIdx) return
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        if (action) onActionClick(action)
    }

    useEffect(() => {
        if (!activateAction) {
            console.debug('continue click but no action activated')
            return
        }
        const nextAction = actions.find((action) => action.idx === activateAction?.idx + 1)
        if (nextAction) {
            setIsCompleted(false)
        } else {
            setIsCompleted(true)
        }
    }, [actions, activateAction])

    useEffect(() => {
        if (!selectedWord) {
            console.debug('no word selected')
            return
        }
        const nextWord = words.find((word) => word.idx === selectedWord.idx + 1)
        if (nextWord) {
            setIsNextWord(true)
        } else {
            setIsNextWord(false)
        }
    }, [words, selectedWord, setCurrentPage, currentPage])

    const handleOpenAction = (selectedIdx: number | string | undefined, assistantActionText: string) => {
        if (!selectedIdx || !assistantActionText) return
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        if (action) onActionClick(action)
    }

    const handleContinueClick = () => {
        if (!activateAction) {
            console.debug('continue click but no action activated')
            return
        }
        const nextAction = actions.find((action) => action.idx === activateAction?.idx + 1)
        console.log('found nextAction is', nextAction)
        console.log('found actions is ' + JSON.stringify(actions))

        if (nextAction) {
            console.log('nextAction is', nextAction)
            onActionClick(nextAction)
        } else {
            console.debug('no next action')
        }
    }

    useEffect(() => {
        if (activateAction?.parentIds) {
            setIsShowAssistantList(false)
            setAssistantActions([])
        }
    }, [activateAction?.parentIds])

    useEffect(() => {
        const fetchActions = async () => {
            if (activateAction?.parentIds || !activateAction?.childrenIds) return
            const childrenActionsId = activateAction?.childrenIds
            console.log('childrenActionsId', childrenActionsId)

            const childrenActions = await actionInternalService.getByChildrenIds(childrenActionsId)
            console.log('childrenActions', childrenActions)

            if (childrenActions) {
                setAssistantActions(childrenActions)
            }

            console.log('assistantActions', assistantActions)
        }
        fetchActions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activateAction?.childrenIds])

    switch (selectedCategory) {
        case 'Review':
            if (currentFileId !== 0 && selectedWord !== null) {
                return (
                    <div
                        style={{
                            display: 'flex',
                            marginBottom: '8px',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Button
                            size={SIZE.compact}
                            shape={SHAPE.default}
                            kind={KIND.tertiary}
                            onClick={handleForgetClick}
                            style={{ width: '50%', marginRight: '8px' }}
                        >
                            <u>{t('Can not recall')}</u>
                        </Button>
                        <Button
                            size={SIZE.compact}
                            shape={SHAPE.default}
                            kind={KIND.tertiary}
                            onClick={handleReviewClick}
                            style={{ width: '50%' }}
                        >
                            <u>{t('Complete this review')}</u>
                        </Button>
                    </div>
                )
            }
            return null // 当selectedWord === null时，不显示内容

        default:
            if (isShowActionList && selectedWord !== null) {
                if (showNext && isCompleted) {
                    return (
                        <Button
                            size={SIZE.compact}
                            shape={SHAPE.default}
                            kind={KIND.tertiary}
                            onClick={isSelectedNextWord ? handleStartToLearnClick : handleNextWordClick}
                            style={{ width: '100%' }}
                        >
                            <u>
                                {!isNextWord
                                    ? t('Next page')
                                    : isSelectedNextWord
                                    ? t('Start to learn new item')
                                    : t('Next item')}
                            </u>
                        </Button>
                    )
                } else {
                    return (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                width: '100%',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    marginBottom: '8px',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Button
                                    size={SIZE.compact}
                                    shape={SHAPE.default}
                                    kind={KIND.tertiary}
                                    onClick={() => setIsShowAssistantList(!isShowAssistantList)}
                                    style={{ width: '50%', marginRight: '8px' }}
                                >
                                    <u>{t('More explanations')}</u>
                                </Button>
                                <Button
                                    size={SIZE.compact}
                                    shape={SHAPE.default}
                                    kind={KIND.tertiary}
                                    onClick={isCompleted ? handleAddWordClick : handleContinueClick}
                                    style={{ width: '50%' }}
                                >
                                    <u>{isCompleted ? t('Add to the review') : t('Continue')}</u>
                                </Button>
                            </div>
                            {!isCompleted && (
                                <div>
                                    <Button
                                        size={SIZE.compact}
                                        shape={SHAPE.default}
                                        kind={KIND.tertiary}
                                        onClick={handleAddWordClick}
                                        style={{ width: '100%' }}
                                    >
                                        <u>{t('Add to the review')}</u>
                                    </Button>
                                </div>
                            )}
                            {isShowAssistantList && (
                                <div
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            marginBottom: '8px',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Select
                                            size={SIZE.compact}
                                            options={assistantActions.map((action) => ({
                                                id: action.idx,
                                                label: action.name,
                                            }))}
                                            placeholder={t('Select an action')}
                                            value={value}
                                            labelKey='label'
                                            valueKey='id'
                                            onChange={({ value }) => setValue(value)}
                                        />
                                        <Button
                                            kind={KIND.secondary}
                                            size={SIZE.compact}
                                            onClick={() =>
                                                value[0]?.label === t('Open Questioning')
                                                    ? handleOpenAction(value[0]?.id, assistantActionText)
                                                    : handleSelectAndExecuteAction(value[0]?.id)
                                            }
                                        >
                                            {t('Execute')}
                                        </Button>
                                    </div>
                                    <div style={{ minWidth: '200px' }}>
                                        <Textarea
                                            onChange={(e) => setAssistantActionText(e.currentTarget.value)}
                                            value={assistantActionText}
                                            disabled={value[0]?.label !== t('Open Questioning')}
                                            resize='vertical'
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            }
            return null // 当 isShowActionList 为 false 时不显示任何内容
    }
})

export default ActionList
