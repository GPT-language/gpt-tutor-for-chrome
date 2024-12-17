import icon from '../assets/images/icon.png'
import { FiEdit } from 'react-icons/fi'
import { createUseStyles } from 'react-jss'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { Button } from 'baseui-sd/button'
import { List, arrayMove } from 'baseui-sd/dnd-list'
import { RiDeleteBinLine } from 'react-icons/ri'
import { useCallback, useRef, useState } from 'react'
import { Action, ActionGroup } from '../internal-services/db'
import { Modal, ModalBody, ModalButton, ModalFooter, ModalHeader } from 'baseui-sd/modal'
import { ActionForm } from './ActionForm'
import { isDesktopApp, exportToJson, jsonToActions } from '../utils'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import { KIND, Tag } from 'baseui-sd/tag'
import { useStyletron } from 'styletron-react'
import { useChatStore } from '@/store/file/store'
import toast from 'react-hot-toast'
import { Octokit } from '@octokit/rest'
import { Base64 } from 'js-base64'
import { ActionGroupForm } from './ActionGroupForm'
import { emit } from '@tauri-apps/api/event'

export const useStyles = createUseStyles({
    root: () => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isDesktopApp() ? '40px 20px 20px 20px' : 0,
        boxSizing: 'border-box',
        width: isDesktopApp() ? '100%' : 'auto', // 当是桌面应用时占满容器，否则自适应内容
        minWidth: '300px', // 最小宽度设置为300px
        maxWidth: '600px', // 最大宽度设置为600px
    }),
    header: (props: IThemedStyleProps) => ({
        width: '100%',
        color: props.theme.colors.contentPrimary,
        padding: isDesktopApp() ? '40px 20px 20px 20px' : 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        position: isDesktopApp() ? 'fixed' : 'block',
        backdropFilter: 'blur(10px)',
        zIndex: 1,
        left: 0,
        top: 0,
        background: props.themeType === 'dark' ? 'rgba(31, 31, 31, 0.5)' : 'rgba(255, 255, 255, 0.5)',
        flexFlow: 'row nowrap',
        cursor: 'move',
        borderBottom: `1px solid ${props.theme.colors.borderTransparent}`,
    }),
    iconContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        marginRight: 'auto',
    },
    icon: {
        'display': 'block',
        'width': '16px',
        'height': '16px',
        '-ms-user-select': 'none',
        '-webkit-user-select': 'none',
        'user-select': 'none',
    },
    iconText: (props: IThemedStyleProps) => ({
        'color': props.themeType === 'dark' ? props.theme.colors.contentSecondary : props.theme.colors.contentPrimary,
        'fontSize': '14px',
        'fontWeight': 600,
        'cursor': 'unset',
        '@media screen and (max-width: 570px)': {
            display: props.isDesktopApp ? 'none' : undefined,
        },
    }),
    operationList: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionList: () => ({
        paddingTop: isDesktopApp() ? 70 : 0,
        width: '100%',
    }),
    actionItem: () => ({
        'width': '100%',
        'display': 'flex',
        'flexDirection': 'row',
        'alignItems': 'center',
        'gap': '20px',
        '&:hover $actionOperation': {
            display: 'flex',
        },
    }),
    actionContent: () => ({
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        width: '100%',
        overflow: 'hidden',
    }),
    actionOperation: {
        'flexShrink': 0,
        'display': 'none',
        'flexDirection': 'row',
        'alignItems': 'center',
        'marginLeft': 'auto',
        'gap': 10,
        '@media (min-width: 540px)': {
            // 当屏幕宽度大于400px时应用以下样式
            'display': 'flex', // 始终为 flex
            'opacity': 0, // 默认透明度为0，使其不可见
            'transition': 'opacity 0.3s ease', // 过渡效果
            '&:hover': {
                opacity: 1, // 鼠标悬停时透明度为1
            },
        },
    },
    name: {
        fontSize: '16px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    prompts: (props: IThemedStyleProps) => ({
        'color': props.theme.colors.contentSecondary,
        'fontSize': '12px',
        'display': 'flex',
        'flexDirection': 'column',
        'gap': '3px',
        '& > div': {
            'display': '-webkit-box',
            'overflow': 'hidden',
            'lineHeight': '1.5',
            'maxWidth': '12px',
            'textOverflow': 'ellipsis',
            '-webkit-line-clamp': 2,
            '-webkit-box-orient': 'vertical',
        },
    }),
    metadata: (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentSecondary,
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
    }),
})

export interface IActionManagerProps {
    draggable?: boolean
}

// 添加 GitHub 配置
export const GitHubConfig = {
    owner: 'BlackStar1453',
    repo: 'gpt-tutor-actionGroup',
    branch: 'main',
}

export const PublicGithubConfig = {
    owner: 'GPT-language',
    repo: 'gpt-tutor-resources',
    branch: 'main',
}

export function ActionManager({ draggable = true }: IActionManagerProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const [css] = useStyletron()
    const styles = useStyles({ theme, themeType })
    const { actions, getActionsByGroup, actionGroups } = useChatStore()
    const [selectedGroup, setSelectedGroup] = useState<string>('')
    const [selectedActions, setSelectedActions] = useState<Action[]>([])
    const [showActionForm, setShowActionForm] = useState(false)
    const [updatingAction, setUpdatingAction] = useState<Action>()
    const [deletingAction, setDeletingAction] = useState<Action>()
    const [openGroups, setOpenGroups] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeType, setActiveType] = useState<'user' | 'store'>('user')
    const [showPublishForm, setShowPublishForm] = useState(false)

    const refreshActions = useCallback(() => {
        if (!isDesktopApp()) {
            useChatStore.getState().setActions([...useChatStore.getState().actions])
            return
        }
        emit('refresh-actions', {})
    }, [])

    if (!actions) {
        return null
    }

    // 根据选择的标签过滤 actions
    /*     const filteredActions =
        activeType === 'user'
            ? actions.filter((action) => action.mode !== 'built-in')
            : actions.filter((action) => action.mode === 'built-in') */

    /*     const actionGroups = filteredActions.reduce((groups: { [key: string]: Action[] }, action) => {
        // 每个 action 可能属于多个 group
        action.groups.forEach((group) => {
            if (!groups[group]) {
                groups[group] = []
            }
            groups[group].push(action)
        })
        return groups
    }, {}) */

    const TagButton = ({ type, label }: { type: 'user' | 'store'; label: string }) => (
        <Tag
            closeable={false}
            kind={activeType === type ? KIND.primary : KIND.neutral}
            onClick={() => {
                if (type === 'store') {
                    window.open('https://gpt-tutor-website-with-stripe.vercel.app/actionStore', '_blank')
                    return
                }
                setActiveType(type)
            }}
            overrides={{
                Root: {
                    style: {
                        'marginRight': '10px',
                        'cursor': 'pointer',
                        'borderRadius': '16px',
                        'padding': '6px 12px',
                        'fontSize': '14px',
                        'fontWeight': activeType === type ? 'bold' : 'normal',
                        'border': `2px solid ${activeType === type ? theme.colors.primary : theme.colors.borderOpaque}`,
                        'backgroundColor':
                            activeType === type ? theme.colors.primary : theme.colors.backgroundSecondary,
                        'color': activeType === type ? theme.colors.white : theme.colors.contentPrimary,
                        ':hover': {
                            backgroundColor:
                                activeType === type ? theme.colors.primary700 : theme.colors.backgroundTertiary,
                        },
                    },
                },
            }}
        >
            {label}
        </Tag>
    )

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) {
                return
            }

            const file = event.target.files[0]
            if (!file || file.type !== 'application/json') {
                toast.error(t('Invalid file type'))
                return
            }

            const importedActions = await jsonToActions(file)
            if (!importedActions || importedActions.length === 0) {
                toast.error(t('No valid actions found in file'))
                return
            }

            actions.push(...importedActions)
            refreshActions()
            toast.success(t('Actions imported successfully'))
        } catch (error) {
            console.error('Error importing actions:', error)
            toast.error(t('Failed to import actions'))
        }
    }

    const ExportActions = async (group: string) => {
        try {
            const filteredActions = actions.filter((action) => {
                return action.groups.includes(group)
            })
            await exportToJson<Action>(group + `-${new Date().valueOf()}`, filteredActions)
        } catch (e) {
            console.error(e)
        }
    }

    const publishToGitHub = async (actionGroup: ActionGroup) => {
        try {
            const token = import.meta.env.VITE_REACT_APP_GITHUB_TOKEN
            if (!token) {
                toast.error(t('GitHub token not found'))
                return
            }

            const octokit = new Octokit({ auth: token })
            const content = JSON.stringify(actionGroup, null, 2)
            const path = `${actionGroup.title}/${actionGroup.title}.json`

            try {
                // 1. 获取默认分支的最新 commit SHA
                const { data: ref } = await octokit.git.getRef({
                    owner: GitHubConfig.owner,
                    repo: GitHubConfig.repo,
                    ref: `heads/${GitHubConfig.branch}`,
                })
                const latestCommitSha = ref.object.sha

                // 2. 创建新分支
                const branchName = `update-actions-${actionGroup.title}`
                try {
                    await octokit.git.createRef({
                        owner: GitHubConfig.owner,
                        repo: GitHubConfig.repo,
                        ref: `refs/heads/${branchName}`,
                        sha: latestCommitSha,
                    })
                } catch (e: any) {
                    // 如果分支已存在，忽略错误
                    if (e.status !== 422) {
                        throw e
                    }
                }

                // 3. 检查文件是否存在
                try {
                    const { data: existingFile } = await octokit.repos.getContent({
                        owner: GitHubConfig.owner,
                        repo: GitHubConfig.repo,
                        path,
                        ref: branchName,
                    })

                    // 更新现有文件
                    await octokit.repos.createOrUpdateFileContents({
                        owner: GitHubConfig.owner,
                        repo: GitHubConfig.repo,
                        path,
                        message: `Add/Update action group: ${actionGroup.title}`,
                        content: Base64.encode(content),
                        sha: (existingFile as any).sha,
                        branch: branchName,
                    })
                } catch (e: any) {
                    if (e.status === 404) {
                        // 创建新文件
                        await octokit.repos.createOrUpdateFileContents({
                            owner: GitHubConfig.owner,
                            repo: GitHubConfig.repo,
                            path,
                            message: `Add/Update action group: ${actionGroup.title}`,
                            content: Base64.encode(content),
                            branch: branchName,
                        })
                    } else {
                        throw e
                    }
                }

                // 4. 创建 Pull Request
                try {
                    await octokit.pulls.create({
                        owner: GitHubConfig.owner,
                        repo: GitHubConfig.repo,
                        title: `Update actions for group: ${actionGroup.title}`,
                        head: branchName,
                        base: GitHubConfig.branch,
                        body: `Automatically generated PR for updating actions in group: ${actionGroup.title}`,
                    })

                    toast.success(t('Successfully published to GitHub'))
                } catch (prError: any) {
                    console.error('Error creating PR:', prError)
                    if (prError.status === 422) {
                        toast.error(t('PR already exists or invalid branch'))
                    } else {
                        toast.error(t('Failed to create PR'))
                    }
                }
            } catch (error: any) {
                console.error('Error in GitHub operations:', error)
                if (error.status === 404) {
                    toast.error(t('Repository not found or insufficient permissions'))
                } else if (error.status === 401) {
                    toast.error(t('Invalid GitHub token'))
                } else {
                    toast.error(t('Failed to publish to GitHub'))
                }
            }
        } catch (error) {
            console.error('Error in publishToGitHub:', error)
            toast.error(t('Failed to publish to GitHub'))
        }
    }

    return (
        <>
            <div
                className={styles.root}
                style={{
                    width: !draggable ? '800px' : undefined,
                }}
            >
                <div
                    className={css({
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '20px 0',
                        borderBottom: `1px solid ${theme.colors.borderOpaque}`,
                        marginBottom: '20px',
                    })}
                >
                    <TagButton type='user' label={t('Actions')} />
                    <TagButton type='store' label={t('Store')} />
                </div>
                {activeType !== 'store' && (
                    <>
                        <div className={styles.header} data-tauri-drag-region>
                            <div className={styles.iconContainer}>
                                <img data-tauri-drag-region className={styles.icon} src={icon} />
                                <div className={styles.iconText}>{t('Action Manager')}</div>
                            </div>
                            <div
                                style={{
                                    marginRight: 'auto',
                                }}
                            />
                            <div className={styles.operationList}>
                                <Button
                                    size='mini'
                                    kind='secondary'
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setUpdatingAction(undefined)
                                        setShowActionForm(true)
                                    }}
                                >
                                    {t('Create')}
                                </Button>
                                {/*                                 <Button
                                    size='mini'
                                    kind='secondary'
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (fileInputRef.current) {
                                            fileInputRef.current.click()
                                        }
                                    }}
                                >
                                    {t('Import')}
                                </Button> */}
                            </div>
                        </div>
                        <input type='file' ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                        <div className={styles.actionList}>
                            {Object.keys(actionGroups).map((group) => (
                                <div key={group}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <h3
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                if (openGroups.includes(group)) {
                                                    setOpenGroups(openGroups.filter((g) => g !== group))
                                                } else {
                                                    setOpenGroups([...openGroups, group])
                                                }
                                            }}
                                        >
                                            {group}
                                        </h3>
                                        {/*                                         <Button
                                            size='mini'
                                            kind='secondary'
                                            onClick={() => {
                                                ExportActions(group)
                                            }}
                                        >
                                            {t('Export')}
                                        </Button> */}
{/*                                         <Button
                                            size='mini'
                                            kind='secondary'
                                            onClick={() => {
                                                setSelectedGroup(group)
                                                setSelectedActions(getActionsByGroup(group))
                                                setShowPublishForm(true)
                                            }}
                                        >
                                            {t('Publish')}
                                        </Button> */}
                                    </div>
                                    {openGroups.includes(group) && (
                                        <List
                                            onChange={async ({ oldIndex, newIndex }) => {
                                                const groupActions = actionGroups[group]
                                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                const newActions = arrayMove(groupActions!, oldIndex, newIndex)
                                                actions.push(...newActions)
                                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                newActions.map((a, idx) => {
                                                    return {
                                                        ...a,
                                                        idx,
                                                    }
                                                })
                                                if (!isDesktopApp()) {
                                                    refreshActions()
                                                }
                                            }}
                                            items={actionGroups[group]?.map((action, idx) => (
                                                <div key={action.id} className={styles.actionItem}>
                                                    <div className={styles.actionContent}>
                                                        <div className={styles.name}>
                                                            {action.mode ? t(action.name) : action.name}
                                                            {action.mode && (
                                                                <div
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        fontSize: '12px',
                                                                        background: theme.colors.backgroundTertiary,
                                                                        padding: '1px 4px',
                                                                        borderRadius: '2px',
                                                                    }}
                                                                >
                                                                    {t('built-in')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.actionOperation}>
                                                        {!draggable && (
                                                            <>
                                                                <Button
                                                                    size='mini'
                                                                    kind='secondary'
                                                                    disabled={idx === 0}
                                                                    onClick={async (e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        const newActions = arrayMove(
                                                                            actions,
                                                                            idx,
                                                                            idx - 1
                                                                        )
                                                                        actions.push(...newActions)
                                                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                                        newActions.map((a, idx) => {
                                                                            return {
                                                                                ...a,
                                                                                idx,
                                                                            }
                                                                        })
                                                                        if (!isDesktopApp()) {
                                                                            refreshActions()
                                                                        }
                                                                    }}
                                                                >
                                                                    <MdArrowUpward size={12} />
                                                                </Button>
                                                                <Button
                                                                    size='mini'
                                                                    kind='secondary'
                                                                    disabled={idx === actions.length - 1}
                                                                    onClick={async (e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        const newActions = arrayMove(
                                                                            actions,
                                                                            idx,
                                                                            idx + 1
                                                                        )
                                                                        actions.push(...newActions)
                                                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                                        newActions.map((a, idx) => {
                                                                            return {
                                                                                ...a,
                                                                                idx,
                                                                            }
                                                                        })
                                                                        if (!isDesktopApp()) {
                                                                            refreshActions()
                                                                        }
                                                                    }}
                                                                >
                                                                    <MdArrowDownward size={12} />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button
                                                            size='mini'
                                                            kind='secondary'
                                                            startEnhancer={<FiEdit size={12} />}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setUpdatingAction(action)
                                                                setShowActionForm(true)
                                                            }}
                                                        >
                                                            {action.mode === 'built-in' ? t('View') : t('Update')}
                                                        </Button>
                                                        <Button
                                                            size='mini'
                                                            kind='secondary'
                                                            disabled={action.mode === 'built-in'}
                                                            startEnhancer={<RiDeleteBinLine size={12} />}
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setDeletingAction(action)
                                                            }}
                                                        >
                                                            {t('Delete')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        />
                                    )}
                                </div>
                            ))}
                            <Modal
                                isOpen={showActionForm}
                                onClose={() => {
                                    setShowActionForm(false)
                                    setUpdatingAction(undefined)
                                }}
                                closeable
                                size='default'
                                autoFocus
                                animate
                                role='dialog'
                                overrides={{
                                    Dialog: {
                                        style: {
                                            padding: '10px',
                                            marginTop: '80px', // 增加与顶部的距离,确保不会被顶部组件遮挡
                                        },
                                    },
                                }}
                            >
                                <ModalHeader>
                                    {updatingAction ? t('Update sth', [t('Action')]) : t('Create sth', [t('Action')])}
                                </ModalHeader>
                                <ModalBody>
                                    <ActionForm
                                        action={updatingAction}
                                        onSubmit={() => {
                                            setShowActionForm(false)
                                            if (!isDesktopApp()) {
                                                refreshActions()
                                            }
                                        }}
                                    />
                                </ModalBody>
                            </Modal>
                            <Modal
                                isOpen={!!deletingAction}
                                onClose={() => {
                                    setDeletingAction(undefined)
                                }}
                                closeable
                                size='default'
                                autoFocus
                                animate
                                role='dialog'
                            >
                                <ModalHeader>{t('Delete sth', [t('Action')])}</ModalHeader>
                                <ModalBody>
                                    {t('Are you sure to delete sth?', [`${t('Action')} ${deletingAction?.name}`])}
                                </ModalBody>
                                <ModalFooter>
                                    <ModalButton
                                        size='compact'
                                        kind='tertiary'
                                        onClick={() => {
                                            setDeletingAction(undefined)
                                        }}
                                    >
                                        {t('Cancel')}
                                    </ModalButton>
                                    <ModalButton
                                        size='compact'
                                        onClick={async () => {
                                            actions.splice(actions.indexOf(deletingAction as Action), 1)
                                            if (!isDesktopApp()) {
                                                refreshActions()
                                            }
                                            setDeletingAction(undefined)
                                        }}
                                    >
                                        {t('Ok')}
                                    </ModalButton>
                                </ModalFooter>
                            </Modal>
                        </div>
                    </>
                )}
            </div>
            <ActionGroupForm
                isOpen={showPublishForm}
                onClose={() => setShowPublishForm(false)}
                onSubmit={publishToGitHub}
                title={selectedGroup}
                actions={selectedActions}
            />
        </>
    )
}
