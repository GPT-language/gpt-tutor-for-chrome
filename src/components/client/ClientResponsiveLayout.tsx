import { FC, PropsWithChildren, memo } from 'react'

interface ClientResponsiveLayoutProps {
    Desktop: FC<PropsWithChildren>
}
const ClientResponsiveLayout = ({ Desktop }: ClientResponsiveLayoutProps) => {
    const Layout = memo<PropsWithChildren>(({ children }) => {
        return <Desktop>{children}</Desktop>
    })

    Layout.displayName = 'ClientLayout'

    return Layout
}

export default ClientResponsiveLayout
