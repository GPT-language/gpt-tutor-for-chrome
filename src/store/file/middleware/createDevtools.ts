import { optionalDevtools } from 'zustand-utils'
import { devtools as _devtools } from 'zustand/middleware'

const isDev = process.env.NODE_ENV === 'development'

export const createDevtools =
    (name: string): typeof _devtools =>
    (initializer) => {
        let showDevtools = false

        // check url to show devtools
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            const debug = url.searchParams.get('debug')
            if (debug?.includes(name)) {
                showDevtools = true
            }
        }

        return optionalDevtools(showDevtools)(initializer, {
            name: `LobeChat_${name}` + (isDev ? '_DEV' : ''),
        })
    }
