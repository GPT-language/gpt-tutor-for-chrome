import { TranslateMode } from './translate'

export const CUSTOM_MODEL_ID = '__custom__'
export const PREFIX = '__yetone-openai-translator'
export const builtinActionModes: {
    name: string
    mode: Exclude<TranslateMode, 'big-bang'>
    icon: string
    group: string
}[] = [
    {
        name: 'Translate',
        mode: 'translate',
        icon: 'MdOutlineGTranslate',
        group: 'default',
    },
    {
        name: 'Explain Code',
        mode: 'explain-code',
        icon: 'MdCode',
        group: 'default',
    },
]
export const chatgptArkoseReqParams = 'cgb=vhwi'
