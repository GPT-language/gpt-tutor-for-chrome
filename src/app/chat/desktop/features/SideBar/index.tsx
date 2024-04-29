import { DraggablePanel, DraggablePanelContainer } from '@lobehub/ui'
import { createStyles } from 'antd-style'
import { memo } from 'react'
import TopicListContent from '@/app/chat/features/TopicListContent'

const useStyles = createStyles(({ css, token }) => ({
    content: css`
        display: flex;
        flex-direction: column;
        height: 100% !important;
    `,
    drawer: css`
        z-index: 0;
        background: ${token.colorBgLayout};
    `,
    header: css`
        border-bottom: 1px solid ${token.colorBorder};
    `,
}))

const Desktop = memo(() => {
    const { styles } = useStyles()

    return (
        <DraggablePanel
            className={styles.drawer}
            classNames={{
                content: styles.content,
            }}
            minWidth={280}
            mode={'fixed'}
            placement={'right'}
        >
            <DraggablePanelContainer
                style={{
                    flex: 'none',
                    height: '100%',
                    maxHeight: '100vh',
                    minWidth: 280,
                }}
            >
                <TopicListContent />
            </DraggablePanelContainer>
        </DraggablePanel>
    )
})

export default Desktop
