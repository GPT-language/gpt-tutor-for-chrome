/* import { useState, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody } from 'baseui-sd/modal'
import { useClerk } from '@clerk/chrome-extension'
import { useChatStore } from '@/store/file/store'
import { Button } from 'baseui-sd/button'
import { Input } from 'baseui-sd/input'
import { useTranslation } from 'react-i18next'
import { Notification, KIND } from 'baseui-sd/notification'
import { Spinner } from 'baseui-sd/spinner'

export const AuthModal = () => {
    const [isOpen, setIsOpen] = useState(true)
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [verificationStep, setVerificationStep] = useState<'initial' | 'email_sent' | 'complete'>('initial')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const setShowAuthModal = useChatStore((state) => state.setShowAuthModal)
    const setChatUser = useChatStore((state) => state.setUser)
    const clerk = useClerk()
    const { t } = useTranslation()

    const closeModal = useCallback(() => {
        setIsOpen(false)
        setShowAuthModal(false)

        const user = clerk.user
        if (user) {
            setChatUser({
                userId: user.id,
                role: 'user',
                apiKey: '',
                isLogin: true,
                isFirstTimeUse: false,
            })
        }
    }, [clerk.user, setShowAuthModal, setChatUser])

    const handleSignIn = useCallback(async () => {
        setError(null)
        setIsLoading(true)
        try {
            const signIn = await clerk.client.signIn.create({
                identifier: email,
                password,
            })

            if (signIn.status === 'complete') {
                await clerk.setActive({ session: signIn.createdSessionId })
                closeModal()
            }
        } catch (error) {
            console.error('登录错误:', error)
            setError(t('邮箱或密码错误，请重试'))
        } finally {
            setIsLoading(false)
        }
    }, [clerk, email, password, closeModal, t])

    const handleSignUp = useCallback(async () => {
        setError(null)
        setIsLoading(true)
        try {
            const signUp = await clerk.client.signUp.create({
                emailAddress: email,
                password,
            })

            if (signUp.status === 'complete') {
                try {
                    const response = await fetch('http://localhost:3000/api/user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username: email, // 使用邮箱作为 username
                            display_name: '',
                            password: password,
                        }),
                    })

                    if (!response.ok) {
                        throw new Error('本地服务器响应不成功')
                    }
                    await clerk.setActive({ session: signUp.createdSessionId })
                    closeModal()
                } catch (error) {
                    console.error('注册错误:', error)
                    setError(t('注册失败，请重试'))
                }
            } else if (signUp.status === 'missing_requirements') {
                if (signUp.unverifiedFields.includes('email_address')) {
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
                    setVerificationStep('email_sent')
                }
            }
        } catch (error) {
            console.error('注册错误:', error)
            setError(t('注册失败，请重试'))
        } finally {
            setIsLoading(false)
        }
    }, [clerk, email, password, closeModal, t])

    const handleEmailVerification = useCallback(
        async (code: string) => {
            setError(null)
            setIsLoading(true)
            try {
                const signUp = await clerk.client.signUp.attemptEmailAddressVerification({
                    code,
                })

                if (signUp.status === 'complete') {
                    await clerk.setActive({ session: signUp.createdSessionId })
                    closeModal()
                } else {
                    setError(t('验证未完成，请重试'))
                }
            } catch (error) {
                console.error('邮箱验证错误:', error)
                setError(t('验证码错误，请重试'))
            } finally {
                setIsLoading(false)
            }
        },
        [clerk, closeModal, t]
    )

    const renderForm = () => {
        if (mode === 'signin') {
            return (
                <>
                    <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('邮箱') || '邮箱'}
                        type='email'
                    />
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('密码') || '密码'}
                        type='password'
                    />
                    <Button kind='secondary' onClick={handleSignIn} isLoading={isLoading} style={{ marginTop: '16px' }}>
                        {isLoading ? <Spinner /> : t('登录')}
                    </Button>
                </>
            )
        } else if (verificationStep === 'initial') {
            return (
                <>
                    <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('邮箱') || '邮箱'}
                        type='email'
                    />
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('密码') || '密码'}
                        type='password'
                    />
                    <Button onClick={handleSignUp} kind='secondary' isLoading={isLoading} style={{ marginTop: '16px' }}>
                        {isLoading ? <Spinner /> : t('注册')}
                    </Button>
                </>
            )
        } else if (verificationStep === 'email_sent') {
            return (
                <>
                    <p>{t('验证邮件已发送，请输入验证码：')}</p>
                    <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder={t('验证码') || '验证码'}
                        type='text'
                    />
                    <Button
                        onClick={() => handleEmailVerification(verificationCode)}
                        kind='secondary'
                        isLoading={isLoading}
                        style={{ marginTop: '16px' }}
                    >
                        {isLoading ? <Spinner /> : t('验证')}
                    </Button>
                </>
            )
        }
    }

    return (
        <Modal onClose={closeModal} isOpen={isOpen}>
            <ModalHeader>{mode === 'signin' ? t('登录') : t('注册')}</ModalHeader>
            <ModalBody>
                {error && (
                    <Notification kind={KIND.negative} closeable onClose={() => setError(null)}>
                        {error}
                    </Notification>
                )}
                {renderForm()}
                <Button
                    kind='tertiary'
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                        setMode(mode === 'signin' ? 'signup' : 'signin')
                        setError(null)
                    }}
                >
                    {mode === 'signin' ? t('切换到注册') : t('切换到登录')}
                </Button>
            </ModalBody>
        </Modal>
    )
} */
