import React from 'react'
import { MessageCard } from 'baseui-sd/message-card'
import { useChatStore } from '@/store/file/store'
import { useTranslation } from 'react-i18next'

export default function MessageCardsContainer() {
    const { isShowMessageCard, setShowActionManager, setShowSettings } = useChatStore()
    const { t } = useTranslation()

    if (!isShowMessageCard) return null

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <MessageCard
                    heading={t('Better Model')}
                    buttonLabel={t('Open Settings')}
                    onClick={() => setShowSettings(true)}
                    paragraph={t('Use a better model to get more accurate results')}
                />
                <MessageCard
                    heading={t('Prompt Enginering')}
                    buttonLabel='Open ActionManager'
                    onClick={() => setShowActionManager(true)}
                    paragraph={t('Adjust your prompt in the actionManager to get more accurate results')}
                />
                <MessageCard
                    heading={t('Ask for Help on Reddit')}
                    buttonLabel={t('Visit Reddit')}
                    onClick={() => window.open('https://www.reddit.com/r/EnglishLearning/')}
                    paragraph={t(
                        'There are a large number of native speakers on Reddit, where you can get quick and accurate answers'
                    )}
                />
                <MessageCard
                    heading={t('Join Our Learning Group')}
                    buttonLabel={t('Join Our Learning Group')}
                    onClick={() => window.open('https://chatgpt-tutor.vercel.app/docs/socialmedia')}
                    paragraph={t('Join our learning group to get help')}
                />
            </div>
        </div>
    )
}
