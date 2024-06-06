import { useMemo } from 'react'
import { Select, TYPE, OnChangeParams, SelectProps } from 'baseui-sd/select'
import { Action } from '../internal-services/db'

export interface IActionSelectProps extends Omit<SelectProps, 'options' | 'value' | 'onChange'> {
    value?: number[] // Assuming the value should be an array of action IDs
    onChange?: (value: number[] | undefined) => void
    initialActions: Action[]
}

export default function ActionSelect({ value, onChange, initialActions }: IActionSelectProps) {
    // Function to group actions into options
    // 将actions根据group属性分组
    const getGroupedOptions = (actions: Action[] | undefined) => {
        if (!actions) {
            return []
        }
        return actions.reduce<Record<string, { id: number; name: string }[]>>((acc, action) => {
            const group = action.group || '__ungrouped'
            acc[group] = acc[group] || []
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            acc[group].push({ id: action.id!, name: action.name })
            return acc
        }, {})
    }
    // Memoize options to avoid unnecessary recalculations
    const options = useMemo(() => getGroupedOptions(initialActions), [initialActions])

    return (
        <Select
            multi
            creatable
            options={options}
            labelKey='name'
            valueKey='id'
            placeholder='Select Actions'
            type={TYPE.search}
            value={value?.map((id) => ({ id })) || []}
            onChange={(params: OnChangeParams) => {
                const newValue = params.value.map((item) => item.id).filter((id): id is number => id !== undefined)
                onChange?.(newValue)
            }}
        />
    )
}
