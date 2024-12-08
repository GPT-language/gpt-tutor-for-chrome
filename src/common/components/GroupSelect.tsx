import * as React from 'react'
import { useStyletron } from 'baseui-sd'
import { Input, StyledInput } from 'baseui-sd/input'
import { Tag } from 'baseui-sd/tag'
import { useTranslation } from 'react-i18next'

const InputReplacement = React.forwardRef(({ tags, removeTag, ...restProps }: any, ref) => {
    const [css] = useStyletron()
    return (
        <div
            className={css({
                flex: '1 1 0%',
                flexWrap: 'wrap',
                display: 'flex',
                alignItems: 'center',
            })}
        >
            {tags.map((tag: string, index: number) => (
                <Tag onActionClick={() => removeTag(tag)} key={index}>
                    {tag}
                </Tag>
            ))}
            <StyledInput ref={ref} {...restProps} />
        </div>
    )
})

export interface IGroupSelectProps {
    tagsValue?: string[] // Assuming the value should be an array of action IDs
    onChange?: (tagsValue: string[] | undefined) => void
    intialTags?: string[]
    onKeyDown?: (e: React.KeyboardEvent) => void
}

export default function GroupSelect({ tagsValue, onChange, intialTags, onKeyDown }: IGroupSelectProps) {
    // Function to group actions into options
    // 将actions根据group属性分组
    const [value, setValue] = React.useState<string>('')
    const [tags, setTags] = React.useState(intialTags || [])
    const { t } = useTranslation()
    const addTag = (tag: string) => {
        if (tags.includes(tag)) {
            // Prevent adding duplicates
            return
        }
        tagsValue = [...tags, tag]
        setTags(tagsValue)
        onChange?.(tagsValue) // Update external state on change
    }
    const removeTag = (tag: string) => {
        tagsValue = tags.filter((t) => t !== tag)
        setTags(tagsValue)
        onChange?.(tagsValue) // Update external state on change
    }
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
            // Enter
            case 'Enter': {
                if (!value) return
                addTag(value)
                setValue('')
                return
            }
            // Backspace
            case 'Backspace': {
                if (value || !tags.length) return
                removeTag(tags[tags.length - 1])
                return
            }
        }
    }

    const handleTagsChange = (value: string) => {
        setValue(value)
        onChange?.(tags)
    }
    return (
        <Input
            placeholder={tags.length ? '' : t('Enter a group, then press Enter') || 'Enter a group,then press Enter'}
            value={value}
            onChange={(e) => handleTagsChange(e.target.value)}
            overrides={{
                Input: {
                    style: { width: 'auto', flexGrow: 1 },
                    component: InputReplacement,
                    props: {
                        tags: tags,
                        removeTag: removeTag,
                        onKeyDown: handleKeyDown,
                    },
                },
            }}
        />
    )
}
