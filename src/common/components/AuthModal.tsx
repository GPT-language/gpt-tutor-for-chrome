import { useState, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody } from 'baseui-sd/modal'
import { useClerk } from '@clerk/clerk-react'
import { useChatStore } from '@/store/file/store'
import { Button } from 'baseui-sd/button'
import { Input } from 'baseui-sd/input'
import { useTranslation } from 'react-i18next'

export const AuthModal = () => {
    const [isOpen, setIsOpen] = useState(true)
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [verificationStep, setVerificationStep] = useState<'initial' | 'email_sent' | 'complete'>('initial')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const setShowAuthModal = useChatStore((state) => state.setShowAuthModal)
    const setChatUser = useChatStore((state) => state.setUser)
    const clerk = useClerk()
    const { t } = useTranslation()

    // 1️⃣ 关闭模态框并更新用户状态
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

    // 2️⃣ 处理登录
    const handleSignIn = useCallback(async () => {
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
            // 这里可以添加错误处理逻辑，比如显示错误消息
        }
    }, [clerk, email, password, closeModal])

    const handleSignUp = useCallback(async () => {
        try {
            const signUp = await clerk.client.signUp.create({
                emailAddress: email,
                password,
            })

            if (signUp.status === 'complete') {
                await clerk.setActive({ session: signUp.createdSessionId })
                closeModal()
            } else if (signUp.status === 'missing_requirements') {
                // 检查是否需要验证电子邮件
                if (signUp.unverifiedFields.includes('email_address')) {
                    // 发送验证邮件
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
                    setVerificationStep('email_sent')
                }
            }
        } catch (error) {
            console.error('注册错误:', error)
            // 这里可以添加错误处理逻辑，比如显示错误消息
        }
    }, [clerk, email, password, closeModal])

    const handleEmailVerification = useCallback(
        async (code: string) => {
            try {
                const signUp = await clerk.client.signUp.attemptEmailAddressVerification({
                    code,
                })

                if (signUp.status === 'complete') {
                    await clerk.setActive({ session: signUp.createdSessionId })
                    closeModal()
                } else {
                    // 处理其他状态
                    console.log('验证未完成:', signUp.status)
                }
            } catch (error) {
                console.error('邮箱验证错误:', error)
            }
        },
        [clerk, closeModal]
    )

    // 4️⃣ 渲染表单
    const renderForm = () => {
        if (mode === 'signin') {
            return (
                <>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='邮箱' type='email' />
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('密码') || 'password'}
                        type='password'
                    />
                    <Button kind='secondary' onClick={handleSignIn} style={{ marginTop: '16px' }}>
                        {t('登录')}
                    </Button>
                </>
            )
        } else if (verificationStep === 'initial') {
            return (
                <>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='邮箱' type='email' />
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('密码') || 'password'}
                        type='password'
                    />
                    <Button onClick={handleSignUp} kind='secondary' style={{ marginTop: '16px' }}>
                        {t('注册')}
                    </Button>
                </>
            )
        } else if (verificationStep === 'email_sent') {
            return (
                <>
                    <p>验证邮件已发送，请输入验证码：</p>
                    <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder={t('验证码') || '验证码'}
                        type='text'
                    />
                    <Button
                        onClick={() => handleEmailVerification(verificationCode)}
                        kind='secondary'
                        style={{ marginTop: '16px' }}
                    >
                        {t('验证')}
                    </Button>
                </>
            )
        }
    }

    return (
        <Modal onClose={closeModal} isOpen={isOpen}>
            <ModalHeader>{mode === 'signin' ? t('登录') : t('注册')}</ModalHeader>
            <ModalBody>
                {renderForm()}
                <Button
                    kind='secondary'
                    style={{ display: 'flex-end', marginTop: '16px', gap: '16px' }}
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                    {mode === 'signin' ? t('切换到注册') : t('切换到登录')}
                </Button>
            </ModalBody>
        </Modal>
    )
}
