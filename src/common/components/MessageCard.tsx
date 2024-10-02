import React, { useEffect, useState } from 'react'
import { MessageCard } from 'baseui-sd/message-card'
import { useChatStore } from '@/store/file/store'
import { useTranslation } from 'react-i18next'
import * as utils from '../utils'
import { ISettings } from '../types'
import { HeadingXSmall } from 'baseui-sd/typography'
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

  const handleFeedbackClick = () => {
    window.open('https://github.com/GPT-language/gpt-tutor-resources/discussions/categories/prompt-related', '_blank')
  }

  if (!isShowMessageCard) return null

  return (
    <div style={{ position: 'relative' }}>
      <HeadingXSmall marginBottom='20px'>{t('Not satisfied with the results? Try the following:')}</HeadingXSmall>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <MessageCard
          heading={t('Better Model')}
          buttonLabel={t('Open Settings')}
          onClick={() => setShowSettings(true)}
          paragraph={t('Use a better model(gpt-4o or claude-3.5-opus) to get more accurate results')}
        />
        <MessageCard
          heading={t('Prompt Engineering')}
          buttonLabel={t('Open ActionManager')}
          onClick={() => setShowActionManager(true)}
          paragraph={t('Adjust your prompt in ActionManager')}
        />
        <MessageCard
          heading={t('Submit Feedback')}
          buttonLabel={t('Submit')}
          onClick={handleFeedbackClick}
          paragraph={t('Submit your feedback about the current functionality')}
        />
      </div>
    </div>
  )
}
