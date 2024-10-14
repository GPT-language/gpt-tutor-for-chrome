import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { ClerkProvider } from '@clerk/chrome-extension'
import { useEffect } from 'react'
import { Provider as StyletronProvider } from 'styletron-react'
import { useChatStore } from '@/store/file/store'
import { AuthModal } from '@/common/components/AuthModal'

const root = createRoot(document.getElementById('root') as HTMLElement)

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('缺少发布密钥')
}

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

function AppContent() {
    const chatUser = useChatStore((state) => state.chatUser)
    const setChatUser = useChatStore((state) => state.setUser)
    const showAuthModal = useChatStore((state) => state.showAuthModal)

    useEffect(() => {
        // 如果用户未登录，默认设置为游客模式
        if (!chatUser.isLogin) {
            setChatUser({
                userId: Date.now().toString(),
                role: 'guest',
                apiKey: '',
                isLogin: true,
                isFirstTimeUse: true,
            })
        }
    }, [])

    return (
        <StyletronProvider value={engine}>
            <div className='App'>
                <main className='App-main'>
                    <Translator showSettings defaultShowSettings text='' engine={engine} autoFocus />
                </main>
                {showAuthModal && <AuthModal />}
            </div>
        </StyletronProvider>
    )
}

function App() {
    return (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <AppContent />
        </ClerkProvider>
    )
}

root.render(<App />)
