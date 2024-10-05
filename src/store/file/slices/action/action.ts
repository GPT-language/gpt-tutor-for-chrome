import { StateCreator } from 'zustand'
import { ChatStore } from '../../store'
import { Action } from '../../../../common/internal-services/db'
import { ICreateActionOption, IUpdateActionOption } from '../../../../common/internal-services/action'

export interface ActionSlice {
    actions: Action[]
    createAction: (opt: ICreateActionOption) => Promise<Action>
    updateAction: (action: Action, opt: IUpdateActionOption) => Promise<Action>
    deleteAction: (id: number) => Promise<void>
    loadActions: () => Promise<void>
    exportActions: (filename: string) => Promise<void>
    importActions: (file: File) => Promise<void>
    getAllGroups: () => Promise<string[]>
}

export const createActionSlice: StateCreator<ChatStore, [['zustand/devtools', never]], [], ActionSlice> = (
    set,
    get
) => ({
    actions: [],

    createAction: async (opt) => {
        const newAction: Action = {
            id: Date.now(),
            idx: get().actions.length,
            name: opt.name,
            mode: opt.mode,
            icon: opt.icon,
            rolePrompt: opt.rolePrompt,
            commandPrompt: opt.commandPrompt,
            outputRenderingFormat: opt.outputRenderingFormat,
            groups: opt.groups,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
        set((state) => ({ actions: [...state.actions, newAction] }))
        return newAction
    },

    updateAction: async (action, opt) => {
        const updatedAction = { ...action, ...opt, updatedAt: new Date().toISOString() }
        set((state) => ({
            actions: state.actions.map((a) => (a.id === action.id ? updatedAction : a)),
        }))
        return updatedAction
    },

    deleteAction: async (id) => {
        set((state) => ({
            actions: state.actions.filter((a) => a.id !== id),
        }))
    },

    loadActions: async () => {
        // 这里可以从本地存储或API加载actions
        // 暂时使用空数组
        set({ actions: [] })
    },

    exportActions: async (filename) => {
        const actions = get().actions
        const jsonString = JSON.stringify(actions, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    },

    importActions: async (file) => {
        const text = await file.text()
        const importedActions = JSON.parse(text) as Action[]
        set((state) => ({
            actions: [...state.actions, ...importedActions],
        }))
    },

    getAllGroups: async () => {
        const actions = get().actions
        const groups = actions.flatMap((action) => action.groups)
        return Array.from(new Set(groups))
    },
})
