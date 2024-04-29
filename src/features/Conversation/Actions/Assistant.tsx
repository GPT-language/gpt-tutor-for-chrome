import { ActionIconGroup } from '@lobehub/ui'
import { memo } from 'react'

import { useChatListActionsBar } from '../hooks/useChatListActionsBar'
import { RenderAction } from '../types'
import { ErrorActionsBar } from './Error'

export const AssistantActionsBar: RenderAction = memo(({ id, onActionClick, error }) => {
    const { regenerate, edit, delAndRegenerate, copy, divider, del } = useChatListActionsBar()

    if (id === 'default') return null

    if (error) return <ErrorActionsBar onActionClick={onActionClick} />

    return (
        <ActionIconGroup
            dropdownMenu={[edit, copy, divider, divider, regenerate, delAndRegenerate, del]}
            items={[regenerate, copy]}
            onActionClick={onActionClick}
            type='ghost'
        />
    )
})
