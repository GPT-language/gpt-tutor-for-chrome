import { produce } from 'immer'
import { ChatMessage } from '@/types/message'

interface UpdateMessage {
    id: string
    key: keyof ChatMessage
    type: 'updateMessage'
    value: ChatMessage[keyof ChatMessage]
}

interface UpdateMessageExtra {
    id: string
    key: string
    type: 'updateMessageExtra'
    value: unknown
}

export type MessageDispatch = UpdateMessage | UpdateMessageExtra

export const messagesReducer = (state: ChatMessage[], payload: MessageDispatch): ChatMessage[] => {
    switch (payload.type) {
        case 'updateMessage': {
            return produce(state, (draftState) => {
                const { id, key, value } = payload
                const message = draftState.find((i) => i.id === id)
                if (!message) return

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                message[key] = value
                message.updatedAt = Date.now()
            })
        }

        default: {
            throw new Error('暂未实现的 type，请检查 reducer')
        }
    }
}
