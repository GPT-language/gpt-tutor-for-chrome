import { useUser } from '@clerk/clerk-react'

export function useIsAdmin() {
    const { user } = useUser()
    return user?.publicMetadata?.role === 'admin' ?? false
}

export function useIsSubscriber() {
    const { user } = useUser()
    return user?.publicMetadata?.role === 'subscriber' ?? false
}
