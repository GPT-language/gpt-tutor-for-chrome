import { File, Translation } from '@/common/internal-services/db'

export interface ChatFileState {
    activeFile: File
    activeFileId?: number
    activeWordIndex?: number
    activeActionName?: string
    activeTranslation?: Translation
}

export const initialFileState: ChatFileState = {
    activeFile: { fileName: '', words: [] },
    activeFileId: undefined,
    activeWordIndex: undefined,
    activeActionName: undefined,
    activeTranslation: undefined,
}
