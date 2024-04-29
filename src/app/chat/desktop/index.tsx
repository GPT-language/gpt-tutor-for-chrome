'use client'

import { memo } from 'react'
import { Flexbox } from 'react-layout-kit'

import Conversation from './features/Conversation'
import SideBar from './features/SideBar'

const Desktop = memo(() => (
    <>
        <Flexbox flex={1} height={'calc(100% - 64px)'} horizontal>
            <Conversation />
            <SideBar />
        </Flexbox>
    </>
))

export default Desktop
