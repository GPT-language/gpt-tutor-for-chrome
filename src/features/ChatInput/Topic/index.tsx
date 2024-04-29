import { ActionIcon, Icon, Tooltip } from '@lobehub/ui'
import { Button } from 'antd'
import { LucideGalleryVerticalEnd, LucideMessageSquarePlus } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useChatStore } from '@/store/chat'

const SaveTopic = memo<{ mobile?: boolean }>(({ mobile }) => {
    const { t } = useTranslation('chat')
    const [hasTopic, openNewTopicOrSaveTopic] = useChatStore((s) => [!!s.activeTopicId, s.openNewTopicOrSaveTopic])

    const icon = hasTopic ? LucideMessageSquarePlus : LucideGalleryVerticalEnd
    const Render = mobile ? ActionIcon : Button
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iconRender: any = mobile ? icon : <Icon icon={icon} />
    const desc = t(hasTopic ? 'topic.openNewTopic' : 'topic.saveCurrentMessages')

    return (
        <Tooltip>
            <Render aria-label={desc} icon={iconRender} onClick={openNewTopicOrSaveTopic} />
        </Tooltip>
    )
})

export default SaveTopic
