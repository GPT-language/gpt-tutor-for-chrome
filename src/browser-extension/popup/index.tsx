/* eslint-disable @typescript-eslint/no-unused-vars */
import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { useTheme } from '../../common/hooks/useTheme'
import Desktop from '@/app/chat/desktop/index'
import Page from '@/app/chat/page'
import { BrowserRouter as Router } from 'react-router-dom'

const root = createRoot(document.getElementById('root') as HTMLElement)

function App() {
    const { theme } = useTheme()

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100vh',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <Router>
                <Page />
            </Router>
        </div>
    )
}

root.render(<App />)
