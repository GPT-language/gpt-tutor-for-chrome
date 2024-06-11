import * as React from 'react'
import { Checkbox, LABEL_PLACEMENT } from 'baseui-sd/checkbox'
import { useTranslation } from 'react-i18next'

export interface ICheckBox {
    value?: boolean
    onChange?: (value: boolean) => void
}

export function CheckBox({ value, onChange }: ICheckBox) {
    const { t } = useTranslation()
    return (
        <Checkbox checked={value} onChange={() => onChange?.(!value)} labelPlacement={LABEL_PLACEMENT.right}>
            {t('Use better model')}
        </Checkbox>
    )
}
