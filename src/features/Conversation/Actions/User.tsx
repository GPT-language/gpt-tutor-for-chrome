import { ActionIconGroup } from '@lobehub/ui'
import { memo } from 'react'

import { useChatListActionsBar } from '../hooks/useChatListActionsBar'
import { RenderAction } from '../types'

export const UserActionsBar: RenderAction = memo(({ onActionClick }) => {
    const { regenerate, edit, copy, divider, del } = useChatListActionsBar()

    return (
        <ActionIconGroup
            dropdownMenu={[edit, copy, divider, divider, regenerate, del]}
            items={[regenerate, edit]}
            onActionClick={onActionClick}
            type='ghost'
        />
    )
})
