import { ISettings } from '@/common/types'
import { getUniversalFetch } from '@/common/universal-fetch'
import { useChatStore } from '@/store/file/store'

export function isCreditEnough(credit: number, price: number): boolean {
    return credit >= price
}

export const isSettingsComplete = (
    settings: ISettings | undefined,
    defaultShowSettings: boolean | undefined
): boolean => {
    if (!defaultShowSettings) {
        return true
    }
    if (!settings) {
        return false
    }
    if (settings.provider === 'ChatGLM' || settings.provider === 'Kimi') {
        return true
    }
    if (settings.provider === 'ChatGPT' && !settings.apiModel) {
        return false
    }
    if (settings.provider !== 'ChatGPT' && !settings.apiKeys) {
        return false
    }
    return true
}

async function getUserIdFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userId'], (result) => {
            resolve(result.userId)
        })
    })
}

export async function handleCheckoutCompletion(sessionId: string) {
    const userId = await getUserIdFromStorage()
    try {
        const response = await fetch('http://localhost:3000/api/gpt-tutor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 1234567890',
            },
            body: JSON.stringify({ sessionId, userId }),
        })

        console.log('response', response)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        console.log('data', data)

        if (data.success) {
            await updateExtensionUserState(data)
            chrome.runtime.sendMessage({ type: 'CHECKOUT_SUCCESS' })
        } else {
            console.error('Failed to retrieve checkout session:', data.error)
            chrome.runtime.sendMessage({ type: 'CHECKOUT_ERROR', error: data.error })
        }
    } catch (error) {
        console.error('Error handling checkout completion:', error)
        chrome.runtime.sendMessage({ type: 'CHECKOUT_ERROR', error: error.message })
    }
}

async function getAuthToken() {
    // 实现获取认证令牌的逻辑
    // 这可能涉及从扩展的存储中检索令牌
}

async function updateExtensionUserState(data) {
    // 使用从 API 返回的数据更新扩展中的用户状态
    // 这可能涉及将数据保存到扩展的存储中
    console.log('updateExtensionUserState', data)
}

export async function fetchUserInfo() {
    const userId = await getUserIdFromStorage()
    const url = `http://localhost:3000/api/user/${userId}`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const userInfo = await response.json()
        return userInfo
    } catch (error) {
        console.error('Error fetching user info:', error)
        throw error
    }
}

export const checkAuth = () => {
    const chatUser = useChatStore.getState().chatUser
    return chatUser.role !== 'guest'
}

export const requireAuth = (callback: () => void) => {
    if (checkAuth()) {
        callback()
    } else {
        // 显示登录/注册模态框
        useChatStore.getState().setShowAuthModal(true)
    }
}
