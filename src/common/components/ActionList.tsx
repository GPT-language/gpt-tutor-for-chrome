import { memo, useState, useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'
import { Button, KIND, SHAPE, SIZE } from 'baseui-sd/button'
import { useTranslation } from 'react-i18next'
import { actionInternalService } from '../internal-services/action'
interface ActionListProps {
    onActionClick: (action: Action | undefined) => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const { selectedWord, addWordToLearningFile, actions, activateAction, isShowActionList, toggleMessageCard } =
        useChatStore()
    const parentActions = actions.filter((action) => !action.parentIds)
    const [nextAction, setNextAction] = useState<Action | undefined>(undefined)
    const [isCompleted, setIsCompleted] = useState(false)
    const [assistantActions, setAssistantActions] = useState<Action[]>([])
    const { t } = useTranslation()

    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        setNextAction(undefined)
        setIsCompleted(false)
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord)
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

    const handleShowMessageCard = () => {
        toggleMessageCard()
    }

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

    if (!isShowActionList) {
        return null
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div style={{ width: '50%' }}>
                <div style={{ display: 'flex', marginBottom: '8px' }}>
                    <Button
                        size={SIZE.compact}
                        shape={SHAPE.default}
                        kind={KIND.tertiary}
                        onClick={() => handleShowMessageCard(true)}
                        style={{ width: '50%', marginRight: '8px' }}
                    >
                        <u>{t('存在疑惑？')}</u>
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
            </div>
        </div>
    )
})

export default ActionList
