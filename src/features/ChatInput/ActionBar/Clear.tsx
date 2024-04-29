import { ActionIcon } from '@lobehub/ui'
import { Popconfirm } from 'antd'
import { Eraser } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useChatStore } from '@/store/chat'

const Clear = memo(() => {
    const { t } = useTranslation('setting')
    const [clearMessage] = useChatStore((s) => [s.clearMessage])
    const [confirmOpened, updateConfirmOpened] = useState(false)

    const resetConversation = useCallback(() => {
        clearMessage()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Popconfirm
            arrow={false}
            okButtonProps={{ danger: true, type: 'primary' }}
            onConfirm={resetConversation}
            onOpenChange={updateConfirmOpened}
            open={confirmOpened}
            placement={'topRight'}
            title={t('confirmClearCurrentMessages', { ns: 'chat' })}
        >
            <ActionIcon icon={Eraser} placement={'bottom'} />
        </Popconfirm>
    )
})

export default Clear
