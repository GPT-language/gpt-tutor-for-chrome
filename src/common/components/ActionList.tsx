import { memo, useState, useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'
import { Button, KIND, SHAPE, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { actionInternalService } from '../internal-services/action'
import { Select, Value } from 'baseui-sd/select'
import { Input } from 'baseui-sd/input'
import { Textarea } from 'baseui-sd/textarea'
interface ActionListProps {
    onActionClick: (action: Action | undefined) => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const {
        selectedWord,
        selectedCategory,
        addWordToLearningFile,
        actions,
        activateAction,
        isShowActionList,
        assistantActionText,
        setAssistantActionText,
        setAssistantAction,
    } = useChatStore()
    const parentActions = actions.filter((action) => !action.parentIds)
    const [nextAction, setNextAction] = useState<Action | undefined>(undefined)
    const [isCompleted, setIsCompleted] = useState(false)
    const [assistantActions, setAssistantActions] = useState<Action[]>([])
    const { t } = useTranslation()
    const [isShowAssistantList, setIsShowAssistantList] = useState(false)
    const [value, setValue] = useState<Value>([])
    const reviewCategory = 'Review'
    const reviewFileName = t('To review') + t(selectedCategory)

    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        setNextAction(undefined)
        setIsCompleted(false)
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord, reviewFileName, reviewCategory)
    }

    const handleReviewClick = async () => {
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord, reviewFileName, reviewCategory)
    }

    const handleForgetClick = async () => {
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord, reviewFileName, reviewCategory, true)
    }

    useEffect(() => {
        if (!parentActions || !activateAction?.idx || activateAction.parentIds) {
            return
        }
        if (parentActions.length === 1) {
            setNextAction(undefined)
            setIsCompleted(true)
        }
        if (parentActions.length > 1 && activateAction?.idx < parentActions.length - 1) {
            setNextAction(actions.find((action) => action.idx === activateAction?.idx + 1))
            setIsCompleted(false)
        } else if (parentActions.length > 1 && activateAction?.idx === parentActions.length - 1) {
            setIsCompleted(true)
        }
    }, [actions, activateAction?.idx, activateAction?.parentIds, parentActions])

    const handleSelectAndExecuteAction = (selectedIdx: number | string | undefined) => {
        console.log('handleSelectAndExecuteAction', selectedIdx)
        if (!selectedIdx) return
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        console.log('handleSelectAndExecuteAction', action)
        if (action) onActionClick(action)
    }

    const handlSetValue = (value: Value) => {
        setValue(value)
        const selectedIdx = value[0]?.id
        const action = assistantActions.find((a) => a.idx === selectedIdx)
        if (action) {
            setAssistantAction(action)
        } else {
            console.debug('action is not found')
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

    useEffect(() => {
        console.log(value[0])
        console.log(value[0]?.label !== t('Open Questioning'))
        console.log(value[0]?.label)
        console.log(t('Open Questioning'))
        console.log(assistantActionText)
    }, [assistantActionText, t, value])

    switch (selectedCategory) {
        case 'Review':
            if (selectedWord !== null) {
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
                            <u>{t('我不记得了')}</u>
                        </Button>
                        <Button
                            size={SIZE.compact}
                            shape={SHAPE.default}
                            kind={KIND.tertiary}
                            onClick={handleReviewClick}
                            style={{ width: '50%' }}
                        >
                            <u>{t('完成复习')}</u>
                        </Button>
                    </div>
                )
            }
            return null // 当selectedWord === null时，不显示内容

        default:
            if (isShowActionList) {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
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
                                <u>{t('补充解释')}</u>
                            </Button>
                            <Button
                                size={SIZE.compact}
                                shape={SHAPE.default}
                                kind={KIND.tertiary}
                                onClick={isCompleted ? handleAddWordClick : () => onActionClick(nextAction)}
                                style={{ width: '50%' }}
                            >
                                <u>{isCompleted ? t('Finish') : t('继续学习')}</u>
                            </Button>
                        </div>
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
                                        onChange={({ value }) => handleSelectAndExecuteAction(value[0]?.id)}
                                    />
                                    <Button
                                        kind={KIND.secondary}
                                        size={SIZE.compact}
                                        onClick={() => handleSelectAndExecuteAction(value[0]?.id)}
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
            return null // 当 isShowActionList 为 false 时不显示任何内容
    }
})

export default ActionList
