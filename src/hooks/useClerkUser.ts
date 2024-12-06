import { useUser } from '@clerk/chrome-extension'
import { useEffect } from 'react'
import { useChatStore } from '@/store/file/store'
import { useClientDataSWR } from '@/utils/swr'

export function useClerkUser() {
    const { user, isLoaded, isSignedIn } = useUser()
    const setUser = useChatStore((state) => state.setUser)
    const setShowAuthModal = useChatStore((state) => state.setShowAuthModal)

    const { data: clerkUserData, mutate: refreshClerkUser } = useClientDataSWR(
        isLoaded ? ['clerkUser', user?.id] : null,
        async () => {
            if (!user) return null
            return {
                userId: user.id,
                isLogin: true,
                apiKey: (user.publicMetadata.token as string) || '',
                role: (user.publicMetadata.role as string) || '',
                isFirstTimeUse: (user.publicMetadata.isFirstTimeUse as boolean) || true,
            }
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    )

    useEffect(() => {
        if (clerkUserData) {
            setUser(clerkUserData)
        } else if (isLoaded && !user) {
            console.log('user is guest')
            setShowAuthModal(true)
        }
    }, [clerkUserData, isLoaded, user, setUser, setShowAuthModal])

    return { user, isLoaded, isSignedIn, refreshClerkUser }
}
