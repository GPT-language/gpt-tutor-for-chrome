import * as utils from '../../common/utils'
import { popupThumbID, zIndex } from './consts'
import { getContainer, queryPopupCardElement, queryPopupThumbElement } from './utils'
import '../../common/i18n.js'

const hidePopupThumbTimer: number | null = null

async function popupThumbClickHandler(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        return
    }
    sendText($popupThumb.dataset['text'] || '')
}

async function removeContainer() {
    const $container = await getContainer()
    $container.remove()
}

async function hidePopupThumb() {
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        return
    }
    removeContainer()
}

async function hidePopupCard() {
    const $popupCard: HTMLDivElement | null = await queryPopupCardElement()
    if (!$popupCard) {
        return
    }
    speechSynthesis.cancel()
    if (root) {
        root.unmount()
        root = null
    }
    removeContainer()
}

async function sendText(text: string) {
    const $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if ($popupThumb) {
        $popupThumb.style.display = 'none'
    }

    chrome.runtime.sendMessage({ type: 'Text', text: text })
}

// 检查当前URL是否匹配目标URL
function isTargetUrl(url: string): boolean {
    // 如果 VITE_NODE_ENV 是 undefined，说明是开发环境
    let isDev = false
    if (url.startsWith('http://localhost')) {
        isDev = true
    } else if (url.startsWith('https://gpt-tutor-website-with-stripe.vercel.app')) {
        isDev = false
    }
    const targetUrl = isDev ? 'http://localhost:3000' : 'https://gpt-tutor-website-with-stripe.vercel.app'
    console.log('当前环境:', isDev ? 'development' : 'production')
    console.log('检查URL:', url)
    console.log('目标URL:', targetUrl)
    return url.includes(targetUrl)
}

// 监听网页发出的消息
if (isTargetUrl(window.location.href)) {
    window.addEventListener('message', (event) => {
        // 确保消息来源可信
        if (event.source !== window) return

        if (event.data.type === 'SYNC_ACTION_GROUP') {
            console.log('Content Script 收到消息:', event.data)
            // 转发消息到扩展的 background script
            chrome.runtime.sendMessage(event.data)
        }
    })
}

async function showPopupThumb(text: string, x: number, y: number) {
    if (!text) {
        return
    }
    if (hidePopupThumbTimer) {
        clearTimeout(hidePopupThumbTimer)
    }
    const isDark = await utils.isDarkMode()
    let $popupThumb: HTMLDivElement | null = await queryPopupThumbElement()
    if (!$popupThumb) {
        $popupThumb = document.createElement('div')
        $popupThumb.id = popupThumbID
        $popupThumb.style.position = 'absolute'
        $popupThumb.style.zIndex = zIndex
        $popupThumb.style.background = isDark ? '#1f1f1f' : '#fff'
        $popupThumb.style.padding = '8px 12px'
        $popupThumb.style.borderRadius = '4px'
        $popupThumb.style.boxShadow = '0 0 4px rgba(0,0,0,.2)'
        $popupThumb.style.cursor = 'pointer'
        $popupThumb.style.userSelect = 'none'
        $popupThumb.style.color = isDark ? '#fff' : '#000'
        $popupThumb.style.fontSize = '14px'
        $popupThumb.addEventListener('click', popupThumbClickHandler)
        $popupThumb.addEventListener('mousemove', (event) => {
            event.stopPropagation()
        })

        $popupThumb.textContent = 'Add to gpt-tutor'

        const $container = await getContainer()
        $container.shadowRoot?.querySelector('div')?.appendChild($popupThumb)
    }
    $popupThumb.dataset['text'] = text
    $popupThumb.style.display = 'block'
    $popupThumb.style.opacity = '100'
    $popupThumb.style.left = `${x}px`
    $popupThumb.style.top = `${y}px`
}

async function main() {
    const browser = await utils.getBrowser()
    let mousedownTarget: EventTarget | null

    document.addEventListener('mouseup', async (event: MouseEvent) => {
        const settings = await utils.getSettings()
        if (
            (mousedownTarget instanceof HTMLInputElement || mousedownTarget instanceof HTMLTextAreaElement) &&
            settings.selectInputElementsText === false
        ) {
            return
        }
        window.setTimeout(async () => {
            let text = (window.getSelection()?.toString() ?? '').trim()
            if (!text) {
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                    const elem = event.target
                    text = elem.value.substring(elem.selectionStart ?? 0, elem.selectionEnd ?? 0).trim()
                }
            } else {
                if (settings.autoTranslate === true) {
                    sendText(text)
                } else if (settings.alwaysShowIcons === true) {
                    showPopupThumb(text, event.pageX + 7, event.pageY + 7)
                }
            }
        })
    })

    browser.runtime.onMessage.addListener(function (request) {
        if (request.type === 'gpt-tutor') {
            console.log('gpt-tutor', request)

            const text = request.info.selectionText ?? ''
            sendText(text)
        }
    })

    document.addEventListener('mousedown', (event: MouseEvent) => {
        mousedownTarget = event.target
        hidePopupCard()
        hidePopupThumb()
    })
}

const config = {
    chatgptArkoseReqUrl: localStorage.getItem('chatgptArkoseReqUrl') || '',
    chatgptArkoseReqParams: 'cgb=vhwi',
    chatgptArkoseReqForm: localStorage.getItem('chatgptArkoseReqForm') || '',
}

export async function getArkoseToken() {
    console.log('getArkoseToken', config)
    if (!config.chatgptArkoseReqUrl)
        throw new Error(
            'Please login at https://chat.openai.com first' +
                '\n\n' +
                "Please keep https://chat.openai.com open and try again. If it still doesn't work, type some characters in the input box of chatgpt web page and try again."
        )
    const arkoseToken = await fetch(config.chatgptArkoseReqUrl + '?' + config.chatgptArkoseReqParams, {
        method: 'POST',
        body: config.chatgptArkoseReqForm,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    })
        .then((resp) => resp.json())
        .then((resp) => resp.token)
        .catch(() => null)
    if (!arkoseToken)
        throw new Error(
            'Failed to get arkose token.' +
                '\n\n' +
                "Please keep https://chat.openai.com open and try again. If it still doesn't work, type some characters in the input box of chatgpt web page and try again."
        )
    console.log(arkoseToken)

    return arkoseToken
}

main()
