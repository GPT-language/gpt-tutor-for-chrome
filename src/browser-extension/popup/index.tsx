import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { useTheme } from '../../common/hooks/useTheme'
import { useChatStore } from '@/store/file/store'
import { useEffect, useState } from 'react'
import AppTutorial from '@/common/components/AppTutorial'

const root = createRoot(document.getElementById('root') as HTMLElement)

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

function App() {
    const { theme } = useTheme()
    const { settings, showSettings } = useChatStore()
    const [shouldShowTutorial, setShouldShowTutorial] = useState(false)
    const [defaultShowSettings, setDefaultShowSettings] = useState(false)

    // 处理首次使用逻辑
    useEffect(() => {
        if (settings?.isFirstTimeUse) {
            setDefaultShowSettings(false)
        } else {
            setDefaultShowSettings(true)
        }
    }, [settings?.isFirstTimeUse])

    // 监听设置界面的关闭
    useEffect(() => {
        if (showSettings) {
            // 当设置页面打开时，确保不显示教程
            setShouldShowTutorial(false)
        } else if (!showSettings && settings?.isFirstTimeUse && !settings?.tutorialCompleted) {
            // 当设置页面关闭且满足条件时，延迟显示教程
            // 给予足够时间让主界面组件完全渲染
            const timer = setTimeout(() => {
                setShouldShowTutorial(true)
            }, 500) // 添加适当的延迟

            return () => clearTimeout(timer)
        }
    }, [showSettings, settings?.isFirstTimeUse, settings?.tutorialCompleted])

    return (
        <div
            style={{
                position: 'relative',
                height: '100%',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <Translator text='' defaultShowSettings={defaultShowSettings} engine={engine} autoFocus />
            {shouldShowTutorial && <AppTutorial />}
        </div>
    )
}

root.render(<App />)
