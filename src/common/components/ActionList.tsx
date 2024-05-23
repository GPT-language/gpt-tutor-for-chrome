import React, { useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'

interface ActionListProps {
    actions: Action[]
    onActionClick: (action: Action) => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = React.memo(({ actions, onActionClick, performAll }) => {
    const [unUsedActions, setUnUsedActions] = React.useState<Action[]>(actions)
    const { selectedWord, addWordToLearningFile } = useChatStore()
    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        console.log('selectedWord in handleAddWordClick', selectedWord)
        await addWordToLearningFile(selectedWord)
    }

    useEffect(() => {
        setUnUsedActions(actions)
        console.log('actions', actions)

        return () => {
            setUnUsedActions([])
        }
    }, [actions])

    const handleActionClick = (action: Action) => {
        onActionClick(action)
        setUnUsedActions(unUsedActions.filter((a) => a.id !== action.id))
        console.log('unUsedActions', unUsedActions)
    }
    return (
        <div>
            <ol>
                {unUsedActions.map((action) => (
                    <li key={action.id}>
                        <button onClick={() => handleActionClick(action)}>{action.name}</button>
                    </li>
                ))}
                <button onClick={handleAddWordClick}>添加到学习列表中</button> {/* 新增按钮 */}
            </ol>
            <button onClick={handlePerformAllClick}>一键完成学习</button> {/* 新增按钮 */}
        </div>
    )
})

export default ActionList
