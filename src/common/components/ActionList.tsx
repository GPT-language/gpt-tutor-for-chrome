import { memo, useState, useEffect } from 'react'
import { Action, Word } from '../internal-services/db'
import { useChatStore } from '@/store/file/store'
import { Button, KIND, SHAPE, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { actionInternalService } from '../internal-services/action'
import { Select, Value } from 'baseui-sd/select'
import { Textarea } from 'baseui-sd/textarea'
import toast from 'react-hot-toast'

interface ActionListProps {
    onActionClick: (action: Action | undefined, assistantActionText?: string) => void // 从父组件传入的处理函数
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const {
        words,
        selectedWord,
        selectWord,
        selectedGroup,
        addWordToReviewFile,
        updateReviewStatus,
        markWordAsForgotten,
        actions,
        activateAction,
        setAction,
        currentPage,
        setCurrentPage,
        translations,
    } = useChatStore()
    const [nextAction, setNextAction] = useState<Action | undefined>(undefined)
    const [isCompleted, setIsCompleted] = useState(false)
    const [showNext, setShowNext] = useState(false)
    const [isNextWord, setIsNextWord] = useState(false)
    const [isSelectedNextWord, setIsSelectedNextWord] = useState(false)
    const [assistantActions, setAssistantActions] = useState<Action[]>([])
    const { t } = useTranslation()
    const [isShowAssistantList, setIsShowAssistantList] = useState(false)
    const [value, setValue] = useState<Value>([])
    const reviewFileName = t('To review') + t(selectedGroup)
    const [assistantActionText, setAssistantActionText] = useState('')

    const handleAddWordClick = async () => {
        setNextAction(undefined)
        if (!selectedWord) {
            return
        }
        try {
            await addWordToReviewFile(selectedWord, reviewFileName)
            toast.success(t('Added to review'))
            if (!showNext) {
                setShowNext(true)
            }
        } catch (error) {
            if (error instanceof Error && error.message === 'This word has already been added to review') {
                toast.error(t('This word has already been added to review'))
            } else {
                toast.error(t('Failed to add to review'))
                console.error('Failed to add word to review file:', error)
            }
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
            if (selectedGroup === 'Review') {
                return
            }
            setCurrentPage(currentPage + 1)
            setIsSelectedNextWord(false)
        }
    }

    const handleStartToLearnClick = () => {
        setShowNext(false)
        if (!selectedWord) {
            return
        }
        const nextAction = actions.find((action) => action.idx === 0)
        setAction(nextAction)
        onActionClick(nextAction)
    }

    const handleReviewClick = async () => {
        if (!selectedWord) {
            toast.error(t('No word selected'))
            return
        }
        await updateReviewStatus(selectedWord)
        toast.success(t('You have finished the review of this word'))
        handleNextWordClick()
    }

    const handleForgetClick = async () => {
        if (!selectedWord) {
            return
        }
        await markWordAsForgotten(selectedWord)
        toast.error(t('You have marked this word as forgotten'))
    }

    const handleSelectAndExecuteAction = (selectedIdx: number | string | undefined) => {
        if (!selectedIdx) return
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        if (action) onActionClick(action)
    }

    const handleAssistantActionChange = (value: Value) => {
        setValue(value)
    }

    useEffect(() => {
        if (!activateAction) {
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
            return
        }
        const nextWord = words.find((word) => word.idx === selectedWord.idx + 1)
        if (nextWord) {
            setIsNextWord(true)
        } else {
            setIsNextWord(false)
        }
    }, [words, selectedWord, setCurrentPage, currentPage])

    const handleOpenAction = (selectedIdx: number | string | undefined, assistantActionText?: string) => {
        if (!selectedIdx || !assistantActionText) return
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        if (action) onActionClick(action, assistantActionText)
    }

    useEffect(() => {
        if (activateAction?.parentIds) {
            setIsShowAssistantList(false)
            setAssistantActions([])
        }
    }, [activateAction?.parentIds])

    useEffect(() => {
        const fetchActions = async () => {
            if (!activateAction?.childrenIds) {
                return
            }
            const childrenActionsId = activateAction?.childrenIds

            const childrenActions = await actionInternalService.getByChildrenIds(childrenActionsId)

            if (childrenActions) {
                setAssistantActions(childrenActions)
            }
        }
        fetchActions()
    }, [activateAction])

    const renderButtons = () => {
        if (!selectedWord) {
            return null
        }

        if (selectedGroup === 'Review') {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            width: '50%',
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
                    <div
                        style={{
                            width: '50%',
                            marginTop: '8px',
                        }}
                    ></div>
                </div>
            )
        }

        if (showNext && isCompleted) {
            return (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                >
                    <Button
                        size={SIZE.compact}
                        shape={SHAPE.default}
                        kind={KIND.tertiary}
                        onClick={isSelectedNextWord ? handleStartToLearnClick : handleNextWordClick}
                        style={{ width: '50%' }}
                    >
                        <u>
                            {!isNextWord
                                ? t('Next page')
                                : isSelectedNextWord
                                ? t('Start to learn new item')
                                : t('Next item')}
                        </u>
                    </Button>
                </div>
            )
        }

        const showAddToReview =
            (selectedWord.translations &&
                typeof selectedWord.translations === 'object' &&
                Object.keys(selectedWord.translations).length > 0) ||
            translations
        const buttons = []

        if (showAddToReview || isCompleted) {
            buttons.push(
                <Button
                    key='addToReview'
                    size={SIZE.compact}
                    shape={SHAPE.default}
                    kind={KIND.tertiary}
                    onClick={handleAddWordClick}
                    style={{ width: '100%', marginBottom: '8px' }}
                >
                    <u>{t('Add to the review')}</u>
                </Button>
            )
        }

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '50%',
                        alignItems: 'center',
                    }}
                >
                    {buttons}
                </div>
                {isShowAssistantList && renderAssistantList()}
            </div>
        )
    }

    const renderAssistantList = () => (
        <div
            style={{
                display: 'flex',
                width: '50%',
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
                    onChange={({ value }) => handleAssistantActionChange(value)}
                />
                <Button
                    kind={KIND.secondary}
                    size={SIZE.compact}
                    onClick={() =>
                        assistantActionText
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
                    resize='vertical'
                />
            </div>
        </div>
    )

    return renderButtons()
})

export default ActionList
