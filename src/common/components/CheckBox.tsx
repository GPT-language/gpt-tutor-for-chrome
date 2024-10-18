import * as React from 'react'
import { Checkbox, LABEL_PLACEMENT } from 'baseui-sd/checkbox'

export interface ICheckBox {
    label?: string
    value?: boolean
    onChange?: (value: boolean) => void
}

export function CheckBox({ label, value, onChange }: ICheckBox) {
    return (
        <Checkbox checked={value} onChange={() => onChange?.(!value)} labelPlacement={LABEL_PLACEMENT.right}>
            {label || ''}
        </Checkbox>
    )
}
