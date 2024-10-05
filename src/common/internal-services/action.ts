import { TranslateMode } from '../translate'
import { ActionOutputRenderingFormat } from './db'

export interface ICreateActionOption {
    name: string
    parentIds?: number[]
    childrenIds?: number[]
    model?: string
    groups: string[]
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
}

export interface IUpdateActionOption {
    idx?: number
    name?: string
    parentIds?: number[]
    model?: string
    groups?: string[]
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
}