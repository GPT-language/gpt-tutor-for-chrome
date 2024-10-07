/* eslint-disable prettier/prettier */
import { StateCreator } from 'zustand'
import { ComponentState } from './initialState'
import { ISettings } from '@/common/types'
import { getSettings } from '@/common/utils'
export interface ComponentAction {
    setShowActionManager: (isShow: boolean) => void
    setShowSettings: (isShow: boolean) => void
    setShowWordBookManager: (isShow: boolean) => void
    setShowCategorySelector: (isShow: boolean) => void
    setShowReviewManager: (isShow: boolean) => void
    setShowYouGlish: (isShow: boolean) => void
    setShowTextParser: (isShow: boolean) => void
    setShowBuyMeACoffee: (isShow: boolean) => void
    setShowSidebar: (isShow: boolean) => void
    toggleMessageCard: () => void
    setIsShowActionList: (isShow: boolean) => void
    refreshTextArea: () => void
    initializeSettings: () => void
    updateSettings: (newSettings: Partial<ISettings>) => void
}

export const component: StateCreator<ComponentState, [['zustand/devtools', never]], [], ComponentAction> = (set) => ({
    setShowActionManager: (isShow) => set({ showActionManager: isShow }),
    setShowSettings: (isShow) => set({ showSettings: isShow }),
    setShowWordBookManager: (isShow) => set({ showWordBookManager: isShow }),
    setShowCategorySelector: (isShow) => set({ showCategorySelector: isShow }),
    setShowReviewManager: (isShow) => set({ showReviewManager: isShow }),
    setShowYouGlish: (isShow) => set({ showYouGlish: isShow }),
    setShowTextParser: (isShow) => set({ showTextParser: isShow }),
    setShowBuyMeACoffee: (isShow) => set({ showBuyMeACoffee: isShow }),
    toggleMessageCard: () => set((state) => ({ isShowMessageCard: !state.isShowMessageCard })),
    setIsShowActionList: (isShow) => set({ isShowActionList: isShow }),
    setShowSidebar: (isShow) => set({ showSidebar: isShow }),
    refreshTextArea: () => set((state) => ({ refreshTextAreaFlag: state.refreshTextAreaFlag + 1 })),
    initializeSettings: async () => {
        const settings = await getSettings()
        set({ settings })
    },
    updateSettings: (newSettings: Partial<ISettings>) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
})
