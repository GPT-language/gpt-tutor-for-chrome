import { useEffect, useMemo, useState } from 'react'
import { Select, TYPE, OnChangeParams, SelectProps } from 'baseui-sd/select'
import { Action } from '../internal-services/db'
import { useChatStore } from '@/store/file/store'
import { actionService } from '../services/action'

export interface IActionSelectProps extends Omit<SelectProps, 'options' | 'value' | 'onChange'> {
    value?: number[] // Assuming the value should be an array of action IDs
    onChange?: (value: number[] | undefined) => void
    initialActions: Action[]
    updatingAction: Action | undefined
}

export default function ActionSelect({ value, onChange, initialActions, updatingAction }: IActionSelectProps) {
    // Function to group actions into options
    // 将actions根据group属性分组
    const [prevValue, setPrevValue] = useState<number[]>([])
    const getGroupedOptions = (actions: Action[] | undefined) => {
        if (!actions) {
            return []
        }
        return actions.reduce<Record<string, { id: number; name: string }[]>>((acc, action) => {
            action.groups.forEach((group) => {
                acc[group] = acc[group] || []
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                acc[group].push({ id: action.id!, name: action.name })
            })
            return acc
        }, {})
    }
    // Memoize options to avoid unnecessary recalculations
    const options = useMemo(() => getGroupedOptions(initialActions), [initialActions])

    useEffect(() => {
        setPrevValue(value || [])
    }, [value])

    const handleSelectAssistantAction = (currentValue: number[] | undefined) => {
        if (!updatingAction?.id) {
            console.log('not found updatingAction?.id')
            return
        }

        const addedIds = currentValue?.filter((id) => !prevValue.includes(id)) || []
        const removedIds = prevValue.filter((id) => !(currentValue || []).includes(id))
        console.log('addedIds:', addedIds, 'removedIds:', removedIds)

        if (addedIds.length > 0) {
            actionService.addParentIdToChildrenActions(updatingAction.id, addedIds)
        }
        if (removedIds.length > 0) {
            actionService.deleteParentIdFromChildrenActions(updatingAction.id, removedIds)
        }
    }
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
                handleSelectAssistantAction(newValue)
            }}
        />
    )
}
