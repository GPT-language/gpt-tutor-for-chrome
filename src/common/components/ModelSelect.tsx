import { useEffect, useState } from 'react'
import { Select, TYPE, OnChangeParams } from 'baseui-sd/select'
import { getModels } from '../utils'
import { IModel } from '../engines/interfaces'

export interface IModelSelectProps {
    value?: string
    onChange?: (value: string | undefined) => void
}

export default function ModelSelect({ value, onChange }: IModelSelectProps) {
    const [groupedModels, setGroupedModels] = useState<IModel[]>([])
    // Function to group actions into options
    // 将actions根据group属性分组
    useEffect(() => {
        // Fetch all models for each provider
        const fetchAllModels = async () => {
            const models = await getModels()
            console.log('models', models)
            setGroupedModels(models)
        }
        fetchAllModels()
    }, [])

    useEffect(() => {
        console.log('groupedModels', groupedModels)
        console.log('value is ' + value)
    }, [groupedModels, value])

    return (
        <Select
            options={groupedModels}
            labelKey='name'
            valueKey='id'
            placeholder='Select Actions'
            type={TYPE.search}
            value={value ? [{ id: value, label: value }] : undefined}
            onChange={(params: OnChangeParams) => {
                const newValue = params.value[0]?.id?.toString()
                onChange?.(newValue)
            }}
        />
    )
}
