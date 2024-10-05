import { useTranslation } from 'react-i18next'
import { ICreateActionOption } from ''
import { Action } from '../internal-services/db'
import { createForm } from './Form'
import { Input } from 'baseui-sd/input'
import { Textarea } from 'baseui-sd/textarea'
import { Button } from 'baseui-sd/button'
import { useCallback, useState, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { IconPicker } from './IconPicker'
import { RenderingFormatSelector } from './RenderingFormatSelector'
import ModelSelect from './ModelSelect'
import GroupSelect from './GroupSelect'
import { useIsAdmin } from '@/utils/auth'
import { StatefulTooltip } from 'baseui-sd/tooltip'
import { useChatStore } from '@/store/file/store'

const useStyles = createUseStyles({
    placeholder: (props: IThemedStyleProps) => ({
        color: props.theme.colors.positive,
    }),
    promptCaptionContainer: () => ({
        'lineHeight': 1.8,
        '& *': {
            '-ms-user-select': 'text',
            '-webkit-user-select': 'text',
            'user-select': 'text',
        },
    }),
    placeholderCaptionContainer: () => ({
        listStyle: 'square',
        margin: 0,
        padding: 0,
        marginTop: 10,
        paddingLeft: 20,
    }),
})

export interface IActionFormProps {
    action?: Action
    onSubmit: (action: Action) => void
}

const { Form, FormItem } = createForm<ICreateActionOption>()

export function ActionForm(props: IActionFormProps) {
    const { createAction, updateAction, actions } = useChatStore()
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [actionGroups, setActionGroups] = useState<string[]>([])
    const isAdmin = useIsAdmin()

    const onSubmit = useCallback(
        async (values: ICreateActionOption) => {
            setLoading(true)
            let action: Action
            if (props.action) {
                action = await updateAction(props.action, values)
            } else {
                action = await createAction(values)
            }
            props.onSubmit(action)
            setLoading(false)
        },
        [props, createAction, updateAction]
    )


    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const groups = actions.map((action) => action.groups).flat()
                setActionGroups(groups)
            } catch (error) {
                console.error('Failed to fetch groups:', error)
            }
        }

        fetchGroups()
    }, [actions])

    const handleFeedbackClick = () => {
        window.open(
            'https://github.com/GPT-language/gpt-tutor-resources/discussions/categories/prompt-related',
            '_blank'
        )
    }

    const actionGroupsPlaceholderCaption = (
        <ul className={styles.placeholderCaptionContainer}>
            <li>
                <span className={styles.placeholder}>{t("Action's Groups")}</span>{' '}
                {t('Determine which groups this action belongs to')}
            </li>
        </ul>
    )

    const rolePlaceholdersCaption = (
        <ul className={styles.placeholderCaptionContainer}>
            <li>
                <span className={styles.placeholder}>{'${sourceLang}'}</span> {t('The Language You Want to Learn')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${targetLang}'}</span> {t('The Language You are Using')}
            </li>
        </ul>
    )

    const commandPlaceholdersCaption = (
        <ul className={styles.placeholderCaptionContainer}>
            <li>
                <span className={styles.placeholder}>{'${sourceLang}'}</span> {t('The Language You Want to Learn')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${targetLang}'}</span> {t('The Language You are Using')}
            </li>
            <li>
                <span className={styles.placeholder}>{'${text}'}</span>{' '}
                {t(
                    'represents the original text, which is usually not needed inside the prompt because it is automatically injected'
                )}
            </li>
        </ul>
    )

    const rolePromptCaption = (
        <div className={styles.promptCaptionContainer}>
            <div>{t('Role prompt indicates what role the action represents.')}</div>
            <div>{t('Role prompt example: You are a translator.')}</div>
            <div>{t('Placeholders')}:</div>
            <div>{rolePlaceholdersCaption}</div>
        </div>
    )

    const actionGroupsCaption = (
        <div className={styles.promptCaptionContainer}>
            <div>{actionGroupsPlaceholderCaption}</div>
            <div>{t('You can set multiple group names')}</div>
        </div>
    )

    const commandPromptCaption = (
        <div className={styles.promptCaptionContainer}>
            <div>
                {t(
                    'Command prompt indicates what command should be issued to the role represented by the action when the action is executed.'
                )}
            </div>
            <div>
                {t('Command prompt example: Please translate the following text from ${sourceLang} to ${targetLang}.')}
            </div>
            <div>{t('Placeholders')}:</div>
            <div>{commandPlaceholdersCaption}</div>
        </div>
    )

    return (
        <Form initialValues={props.action} onFinish={onSubmit}>
            <FormItem required name='name' label={t('Name')}>
                <Input size='compact' />
            </FormItem>
            <FormItem required name='icon' label={t('Icon')}>
                <IconPicker />
            </FormItem>
            <FormItem required name='groups' label={t("Action's Groups")} caption={actionGroupsCaption}>
                <GroupSelect intialTags={props.action?.groups || []}></GroupSelect>
            </FormItem>
            <FormItem name='rolePrompt' label={t('Role Prompt')} caption={rolePromptCaption}>
                <Textarea size='compact' />
            </FormItem>
            <FormItem required name='commandPrompt' label={t('Command Prompt')} caption={commandPromptCaption}>
                <Textarea size='compact' />
            </FormItem>
            <FormItem name='model' label={t('API Model')}>
                <ModelSelect></ModelSelect>
            </FormItem>
            <FormItem name='outputRenderingFormat' label={t('Output rendering format')}>
                <RenderingFormatSelector />
            </FormItem>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 10,
                }}
            >
                <StatefulTooltip content={t('Submit feedback or suggestions for this action')}>
                    <Button onClick={handleFeedbackClick} size='compact'>
                        {t('Feedback')}
                    </Button>
                </StatefulTooltip>
                <div
                    style={{
                        marginRight: 'auto',
                    }}
                />
                <StatefulTooltip
                    content={
                        props.action?.mode === 'built-in' && !isAdmin
                            ? t('Built-in actions cannot be modified')
                            : t('Save changes to this action')
                    }
                    placement='top'
                >
                    <span>
                        {' '}
                        {/* 使用 span 包裹 Button，因为 Tooltip 不能直接包裹 disabled 的元素 */}
                        <Button
                            isLoading={loading}
                            size='compact'
                            disabled={props.action?.mode === 'built-in' && !isAdmin}
                        >
                            {t('Save')}
                        </Button>
                    </span>
                </StatefulTooltip>
            </div>
        </Form>
    )
}
