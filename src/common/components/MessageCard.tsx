import React, { useEffect, useState } from 'react'
import { MessageCard } from 'baseui-sd/message-card'
import { useChatStore } from '@/store/file/store'
import { useTranslation } from 'react-i18next'
import * as utils from '../utils'
import { ISettings } from '../types'

export default function MessageCardsContainer() {
    const { isShowMessageCard, setShowActionManager, setShowSettings } = useChatStore()
    const { t } = useTranslation()
    const [targetLang, setTargetLang] = useState<string>('zh-Hans')

    useEffect(() => {
        const getLanguage = async () => {
            const settings: ISettings = await utils.getSettings()
            if (settings && settings.i18n) {
                console.log(settings.i18n)
                setTargetLang(settings.i18n)
            }
        }
        getLanguage()
    }, [])

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
                    onClick={() =>
                        targetLang === 'zh-Hans'
                            ? window.open('https://afdian.net/a/zy1999')
                            : window.open('https://www.patreon.com/yaoyaoyao')
                    }
                    paragraph={t('Join our learning group to get help')}
                />
            </div>
        </div>
    )
}
