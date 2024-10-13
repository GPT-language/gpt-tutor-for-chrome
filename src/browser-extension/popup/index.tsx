import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { useTheme } from '../../common/hooks/useTheme'
import { Routes, Route, MemoryRouter } from 'react-router-dom'

const root = createRoot(document.getElementById('root') as HTMLElement)

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

function AppRoutes() {
    const { theme } = useTheme()
    return (
        <div
            className='App'
            style={{
                position: 'relative',
                minHeight: '100vh',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <main className='App-main'>
                <Routes>
                    <Route
                        path='/'
                        element={<Translator showSettings defaultShowSettings text='' engine={engine} autoFocus />}
                    />
                </Routes>
            </main>
        </div>
    )
}

function App() {
    return (
        <MemoryRouter>
            <AppRoutes />
        </MemoryRouter>
    )
}

root.render(<App />)
