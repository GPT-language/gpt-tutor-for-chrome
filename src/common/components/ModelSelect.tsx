import { useEffect, useState } from 'react'
import { Select, TYPE, OnChangeParams } from 'baseui-sd/select'
import { Provider } from '../engines'
import { getModels } from '../utils'
import { IModel } from '../engines/interfaces'

export interface IModelSelectProps {
  value?: string
  onChange?: (value: string | undefined) => void
}

export default function ModelSelect({ value, onChange }: IModelSelectProps) {
  const [groupedModels, setGroupedModels] = useState<Record<string, IModel[]>>({})
  const providers: Provider[] = ['OpenAI', 'ChatGPT']
  // Function to group actions into options
  // 将actions根据group属性分组
  useEffect(() => {
    // Fetch all models for each provider
    const fetchAllModels = async () => {
      const promises = providers.map(async (provider) => {
        const models = await getModels(provider)
        console.log('models', models)
        return { provider, models }
      })
      const results = await Promise.all(promises)
      const newGroupedModels = results.reduce((acc: Record<string, IModel[]>, { provider, models }) => {
        acc[provider] = models
        console.log('acc is', acc)

        return acc
      }, {})
      setGroupedModels(newGroupedModels)
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
