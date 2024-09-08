import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { useTheme } from '../../common/hooks/useTheme'
import { ClerkProvider, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/chrome-extension'
import { useNavigate, Routes, Route, MemoryRouter } from 'react-router-dom'

const root = createRoot(document.getElementById('root') as HTMLElement)

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Publishable Key')
}

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

function ClerkProviderWithRoutes() {
    const { theme } = useTheme()
    const navigate = useNavigate()
    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} navigate={(to) => navigate(to)}>
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
                        <Route path='/sign-up/*' element={<SignUp signInUrl='/' />} />
                        <Route
                            path='/'
                            element={
                                <>
                                    <SignedIn>
                                        <Translator
                                            showSettings
                                            defaultShowSettings
                                            text=''
                                            engine={engine}
                                            autoFocus
                                        />
                                    </SignedIn>
                                    <SignedOut>
                                        <SignIn afterSignInUrl='/' signUpUrl='/sign-up' />
                                    </SignedOut>
                                </>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </ClerkProvider>
    )
}

function App() {
    const { theme } = useTheme()

    return (
        <MemoryRouter>
            <ClerkProviderWithRoutes />
        </MemoryRouter>
    )
}

root.render(<App />)
