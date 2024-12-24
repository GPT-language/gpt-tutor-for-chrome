import { backgroundFetch } from './background/fetch'
import { userscriptFetch } from './polyfills/userscript'
import { isDesktopApp, isUserscript } from './utils'

export function getUniversalFetch() {
    // 检查运行环境
    const globalScope = typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : null

    if (isUserscript()) {
        return userscriptFetch
    }

    if (isDesktopApp()) {
        return globalScope?.fetch ?? fetch
    }

    return backgroundFetch
}
