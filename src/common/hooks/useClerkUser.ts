import { useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useChatStore } from '@/store/file/store'
import { useClientDataSWR } from '@/utils/swr'

export function useClerkUser() {
    const { user, isLoaded } = useUser()
    const setUser = useChatStore((state) => state.setUser)

    const { data: clerkUserData, mutate: refreshClerkUser } = useClientDataSWR(
        isLoaded ? ['clerkUser', user?.id] : null,
        async () => {
            if (!user) return null
            return {
                userId: user.id,
                isLogin: true,
                apiKey: user.publicMetadata.token as string,
                role: (user.publicMetadata.role as string) || '',
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
            setUser({
                userId: '',
                apiKey: '',
                isLogin: false,
                role: '',
            })
        }
    }, [clerkUserData, isLoaded, user, setUser])

    return { user, isLoaded, refreshClerkUser }
}
