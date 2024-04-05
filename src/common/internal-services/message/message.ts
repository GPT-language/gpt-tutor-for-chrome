import { CreateMessageParams, QueryMessageParams } from '@/database/models/message'
import { getLocalDB, getTable } from './db'
import { ChatMessage } from '@/database/types/message'
import { DeepPartial } from 'utility-types'
import { DB_Message } from '@/database/schemas/message'
import { nanoid } from 'nanoid/non-secure'
import { DBModel } from '@/database/core/types/db'

export interface IMessageInternalService {
    create(params: CreateMessageParams): Promise<ChatMessage>
    query(params: QueryMessageParams): Promise<ChatMessage[]>
    update(id: string, data: DeepPartial<DB_Message>): Promise<void>
    delete(id: string): Promise<void>
    batchDeleteBySessionId(sessionId: string): Promise<void>
    batchUpdate(messageIds: string[], updateFields: Partial<DB_Message>): Promise<number>
    // 其他必要的方法
}

class MessageInternalService implements IMessageInternalService {
    private get db() {
        return getLocalDB()
    }

    async create(params: CreateMessageParams): Promise<ChatMessage> {
        const id = nanoid()
        const messageData: DB_Message = this.mapChatMessageToDBMessage({ ...params, id })
        await this.db.message.add(messageData)
        return this.mapToChatMessage(messageData)
    }

    // **************** Query *************** //

    async query({ sessionId, topicId, pageSize = 9999, current = 0 }: QueryMessageParams): Promise<ChatMessage[]> {
        const offset = current * pageSize
        const messageTabel = getTable('vocabulary')
        const query = topicId
            ? // TODO: The query {"sessionId":"xxx","topicId":"xxx"} on messages would benefit of a compound index [sessionId+topicId]
              messageTabel.where({ sessionId, topicId }) // Use a compound index
            : messageTabel
                  .where('sessionId')
                  .equals(sessionId)
                  .and((message) => !message.topicId)

        const dbMessages: DBModel<DB_Message>[] = await query
            .sortBy('createdAt')
            // handle page size
            .then((sortedArray) => sortedArray.slice(offset, offset + pageSize))

        const messages = dbMessages.map((msg) => this.mapToChatMessage(msg))

        const finalList: ChatMessage[] = []

        const addItem = (item: ChatMessage) => {
            const isExist = finalList.findIndex((i) => item.id === i.id) > -1
            if (!isExist) {
                finalList.push(item)
            }
        }
        const messageMap = new Map<string, ChatMessage>()
        for (const item of messages) messageMap.set(item.id, item)

        for (const item of messages) {
            if (!item.parentId || !messageMap.has(item.parentId)) {
                // 如果消息没有父消息或者父消息不在列表中，直接添加
                addItem(item)
            } else {
                // 如果消息有父消息，确保先添加父消息
                addItem(messageMap.get(item.parentId)!)
                addItem(item)
            }
        }
        return finalList
    }

    async update(id: string, data: DeepPartial<DB_Message>): Promise<void> {
        // 更新消息逻辑
    }

    async delete(id: string): Promise<void> {
        // 删除消息逻辑
    }

    async batchDeleteBySessionId(sessionId: string): Promise<void> {
        // 批量删除逻辑
    }

    async batchUpdate(messageIds: string[], updateFields: Partial<DB_Message>): Promise<number> {
        // 批量更新逻辑
    }

    // 私有方法，帮助转换数据模型
    private mapChatMessageToDBMessage(message: ChatMessage): DB_Message {
        // 实现转换逻辑，参考 MessageModel 中的相应方法
    }

    private mapToChatMessage(dbMessage: DB_Message): ChatMessage {
        // 实现转换逻辑
    }
}

export const messageInternalService = new MessageInternalService()
