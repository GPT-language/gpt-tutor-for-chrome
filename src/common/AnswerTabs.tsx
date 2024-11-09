import React, { useState } from 'react'
import { Block } from 'baseui-sd/block'
import { Tabs, Tab } from 'baseui-sd/tabs'
import { Delete } from 'baseui-sd/icon'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useChatStore } from '@/store/file/store'

const AnswerTabs: React.FC = () => {
    const { t } = useTranslation()
    const { currentFileId, answers, setAnswers, selectedWord, updateWordAnswers } = useChatStore()

    const [activeKey, setActiveKey] = useState<string>('')

    const handleTabDelete = async (actionName: string, event: React.MouseEvent) => {
        event.stopPropagation()
        const updatedAnswers = { ...answers }
        delete updatedAnswers[actionName]

        if (selectedWord && currentFileId) {
            try {
                await updateWordAnswers(updatedAnswers)
                setAnswers(updatedAnswers)
                toast.success(t('Deleted successfully'))
            } catch (error) {
                console.error('删除失败:', error)
                toast.error(t('Failed to delete'))
            }
        } else {
            setAnswers(updatedAnswers)
        }
    }

    return (
        <Tabs
            activeKey={activeKey}
            onChange={({ activeKey }) => setActiveKey(activeKey as string)}
            overrides={{
                Root: {
                    style: {
                        width: '100%',
                    },
                },
            }}
        >
            {Object.entries(answers).map(([actionName]) => (
                <Tab
                    key={actionName}
                    title={
                        <Block display='flex' alignItems='center' $style={{ gap: '8px' }}>
                            <span>{actionName}</span>
                            <Block
                                as='span'
                                onClick={(e) => handleTabDelete(actionName, e)}
                                $style={{
                                    'cursor': 'pointer',
                                    ':hover': { opacity: 0.7 },
                                }}
                            >
                                <Delete size={16} />
                            </Block>
                        </Block>
                    }
                ></Tab>
            ))}
        </Tabs>
    )
}

export default AnswerTabs
