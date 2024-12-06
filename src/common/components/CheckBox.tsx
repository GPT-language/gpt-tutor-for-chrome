import * as React from 'react'
import { Checkbox, LABEL_PLACEMENT } from 'baseui-sd/checkbox'

export interface ICheckBox {
    label?: string
    value?: boolean
    onChange?: (value: boolean) => void
    labelSmall?: string
}

export function CheckBox({ label, value, onChange, labelSmall }: ICheckBox) {
    return (
        <Checkbox checked={value} onChange={() => onChange?.(!value)} labelPlacement={LABEL_PLACEMENT.right}>
            {label || ''}
            {labelSmall && <div style={{ fontSize: 'small', color: 'gray' }}>{labelSmall}</div>}
        </Checkbox>
    )
}
