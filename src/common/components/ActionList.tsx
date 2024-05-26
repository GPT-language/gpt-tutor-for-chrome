import { memo, useState, useEffect } from 'react'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file'

interface ActionListProps {
    onActionClick: () => void // 从父组件传入的处理函数
    performAll: (actions: Action[]) => void
}

const ActionList: React.FC<ActionListProps> = memo(({ onActionClick, performAll }) => {
    const { selectedWord, addWordToLearningFile, actions, setAction, activatedAction } = useChatStore()
    const [unUsedActions, setUnUsedActions] = useState<Action[]>(actions)
    const handlePerformAllClick = () => {
        performAll(actions)
    }

    const handleAddWordClick = async () => {
        console.log('selectedWord in handleAddWordClick', selectedWord)
        if (!selectedWord) {
            return
        }
        await addWordToLearningFile(selectedWord)
    }

    useEffect(() => {
        if (!actions) {
            return
        }
        console.log('set unUsedActions', actions)
        setUnUsedActions(actions)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, selectedWord?.idx])

    const handleActionClick = async (action: Action) => {
        console.log('handleActionClick', action)
        setAction(action)
        console.log('setAction', activatedAction)
        onActionClick()
        setUnUsedActions(unUsedActions?.filter((a) => a.idx > action.idx))
        console.log('unUsedActions', unUsedActions)
    }
    return (
        <div>
            <ol>
                {unUsedActions?.map((action) => (
                    <li key={action.idx}>
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
