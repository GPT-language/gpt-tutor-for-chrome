import React from 'react'
import { Action } from '../internal-services/db'

interface ActionListProps {
    actions: Action[]
    onActionClick: (action: Action) => void // 从父组件传入的处理函数
}

const ActionList: React.FC<ActionListProps> = React.memo(({ actions, onActionClick }) => {
    return (
        <ul>
            {actions.map((action, index) => (
                <li key={action.id}>
                    <button onClick={() => onActionClick(action)}>
                        {index + 1}. {action.name}
                    </button>
                </li>
            ))}
        </ul>
    )
})

export default ActionList
