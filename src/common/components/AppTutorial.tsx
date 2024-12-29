import React, { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Placement } from 'react-joyride'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/store/file/store'

const AppTutorial = () => {
    const { t } = useTranslation()
    const { tutorialState, setTutorialState, endTutorial, settings, updateSettings, showSettings } = useChatStore()
    const hasCompletedTutorial = useChatStore.getState().settings.tutorialCompleted
    const [isReady, setIsReady] = useState(false)
    const [steps, setSteps] = useState([
        {
            target: '[data-testid="category-tabs"]',
            content: t('Here you can switch between different function categories.'),
            placement: 'bottom' as Placement,
            disableBeacon: true,
        },
        {
            target: '[data-testid="more-button"]',
            content: t('Click here to see more options and manage your settings.'),
            placement: 'bottom-end' as Placement,
        },
        {
            target: '[data-testid="sidebar-toggle"]',
            content: t('Toggle this button to show/hide the history list sidebar.'),
            placement: 'right' as Placement,
        },
        {
            target: '[data-testid="quote-preview-container"]',
            content: t(
                'This section shows the content you want to ask. It could be a word, sentence, or paragraph. If the text is too long, it will be truncated.'
            ),
            placement: 'bottom' as Placement,
        },
        {
            target: '[data-testid="quote-preview-toggle"]',
            content: t('Click this button to expand long text and read it sentence by sentence.'),
            placement: 'bottom' as Placement,
        },
        {
            target: '[data-testid="quick-action-bar"]',
            content: t(
                'This quick action bar provides convenient access to frequently used features like text-to-speech, Youglish, and your favorite actions.'
            ),
            placement: 'bottom' as Placement,
        },
        {
            target: '[data-testid="textarea-with-actions"]',
            content: t(
                'This is where you can ask your question. Type @ to select a action, ~ to select a conversation, / to select a action group, and press Enter to submit.'
            ),
            placement: 'top' as Placement,
        },
        {
            target: '[data-testid="answer-manager"]',
            content: t('This is the answer area where you can view AI responses and manage them.'),
            placement: 'top' as Placement,
        },
        {
            target: '[data-testid="answer-actions"]',
            content: t(
                'Here you can find various actions to interact with the answer, such as speaking, copying, and adding to Anki for review.'
            ),
            placement: 'bottom' as Placement,
        },
        {
            target: '[data-testid="add-to-anki-button"]',
            content: t(
                'Click this button to add the current answer to your Anki deck for later review and memorization.'
            ),
            placement: 'bottom' as Placement,
        },
    ])

    const checkTargets = () => {
        const elements = {
            categoryTabs: document.querySelector('[data-testid="category-tabs"]'),
            moreButton: document.querySelector('[data-testid="more-button"]'),
            sidebarToggle: document.querySelector('[data-testid="sidebar-toggle"]'),
            quickActionBar: document.querySelector('[data-testid="quick-action-bar"]'),
            textareaWithActions: document.querySelector('[data-testid="textarea-with-actions"]'),
            answerManager: document.querySelector('[data-testid="answer-manager"]'),
            answerActions: document.querySelector('[data-testid="answer-actions"]'),
            addToAnkiButton: document.querySelector('[data-testid="add-to-anki-button"]'),
        }

        const isVisible = (element: Element | null) => {
            if (!element) return false
            const rect = element.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden'
        }

        // 过滤掉不可见的步骤
        const visibleSteps = steps.filter((step) => isVisible(document.querySelector(step.target)))

        if (visibleSteps.length === 0) {
            console.log('[Tutorial] No visible steps, skipping tutorial')
            return false
        }

        // 更新步骤为可见步骤
        setSteps(visibleSteps)
        return true
    }

    useEffect(() => {
        // 只在非设置页面时初始化检查
        if (showSettings) {
            setIsReady(false)
            return
        }

        console.log('[Tutorial] Initial tutorialState:', tutorialState)
        const checkInterval = setInterval(() => {
            if (checkTargets()) {
                console.log('[Tutorial] All targets are ready')
                setIsReady(true)
                clearInterval(checkInterval)
            }
        }, 100)

        return () => {
            console.log('[Tutorial] Cleaning up check interval')
            clearInterval(checkInterval)
        }
    }, [showSettings])

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { action, index, status, type } = data

        console.log('[Tutorial] Joyride callback:', data)

        if (type === 'tour:end' && (action === 'close' || action === 'skip')) {
            endTutorial()
            updateSettings({
                ...settings,
                tutorialCompleted: true,
            })
        } else if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            // 处理教程完成或跳过的情况
            endTutorial()
            updateSettings({
                ...settings,
                tutorialCompleted: true,
            })
        } else {
            setTutorialState({ currentStep: index })
        }
    }

    if (!isReady || hasCompletedTutorial || showSettings) {
        console.log('[Tutorial] Not showing tutorial:', {
            isReady,
            hasCompletedTutorial,
            showSettings,
        })
        return null
    }

    return (
        <Joyride
            steps={steps}
            run={true}
            continuous
            showSkipButton
            showProgress
            debug={true} // 启用 Joyride 的调试模式
            styles={{
                options: {
                    zIndex: 10000,
                },
            }}
            callback={handleJoyrideCallback}
            locale={{
                back: t('Back'),
                close: t('Close'),
                last: t('Got it'),
                next: t('Next'),
                skip: t('Skip'),
            }}
        />
    )
}

export default AppTutorial
