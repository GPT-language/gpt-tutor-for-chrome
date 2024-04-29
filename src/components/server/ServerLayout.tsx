import { FC, PropsWithChildren } from 'react'
interface ServerLayoutProps {
    Desktop: FC<PropsWithChildren>
}

const ServerLayout =
    ({ Desktop }: ServerLayoutProps) =>
    ({ children }: PropsWithChildren) => {
        return <Desktop>{children}</Desktop>
    }

ServerLayout.displayName = 'ServerLayout'

export default ServerLayout
