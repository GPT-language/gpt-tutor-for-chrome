import { SavedFile } from '@/common/internal-services/db'
export interface ChatFileState {
    currentFileId: number | null
    currentPage: number
    selectedFiles: SavedFile[]
    files: SavedFile[]
}

export const initialFileState: ChatFileState = {
    selectedFiles: [],
    currentFileId: 0,
    currentPage: 1,
    files: [],
}
