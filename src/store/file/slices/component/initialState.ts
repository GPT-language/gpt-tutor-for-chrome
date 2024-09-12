export interface ComponentState {
    showSettings: boolean
    showWordBookManager: boolean
    showCategorySelector: boolean
    showActionManager: boolean
    showReviewManager: boolean
    showYouGlish: boolean
    showTextParser: boolean
    showBuyMeACoffee: boolean
    showSidebar: boolean
    isShowMessageCard: boolean
    isShowActionList: boolean
}

export const initialComponentState: ComponentState = {
    showSettings: false,
    showWordBookManager: false,
    showCategorySelector: false,
    showActionManager: false,
    showReviewManager: false,
    showYouGlish: false,
    showTextParser: false,
    showBuyMeACoffee: false,
    isShowMessageCard: false,
    isShowActionList: false,
    showSidebar: false,
}
