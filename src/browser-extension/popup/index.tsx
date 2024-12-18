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


    return (
        <div
            style={{
                position: 'relative',
                height: '100%',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <AppTutorial />
            <Translator text='' defaultShowSettings={true} engine={engine} autoFocus />
        </div>
    )
}

root.render(<App />)
