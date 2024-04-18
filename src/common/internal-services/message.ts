import { ChatMessage, getLocalDB, getTable } from './db'
import { DeepPartial } from 'utility-types'
import { nanoid } from 'nanoid/non-secure'
import { ChatMessageError } from '@lobehub/ui'

export interface CreateMessageParams extends ChatMessage {
    fromModel?: string
    fromProvider?: string
}

export interface QueryMessageParams {
    current?: number
    pageSize?: number
    sessionId: string
    topicId?: string
}

export interface IMessageInternalService {
    getMessages(sessionId: string, topicId?: string): Promise<ChatMessage[]>
    create(params: CreateMessageParams): Promise<string>
    query(params: QueryMessageParams): Promise<ChatMessage[]>
    update(id: string, data: DeepPartial<ChatMessage>): Promise<void>
    delete(id: string): Promise<void>
    batchUpdate(messageIds: string[], updateFields: Partial<ChatMessage>): Promise<number>
    // 其他必要的方法
}

class MessageInternalService implements IMessageInternalService {
    schema: ChatMessage | undefined
    private get db() {
        return getLocalDB()
    }

    async create(params: CreateMessageParams) {
        // 生成一个唯一的ID
        const id = nanoid()
        const primaryKey = 'id'
        // 添加创建时间和更新时间
        const record = {
            ...params,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            [primaryKey]: id,
        }

        // 在数据库的message表中添加新记录
        await this.db.message.add(record)

        // 如果有需要，将数据库记录格式转换回ChatMessage格式
        return id
    }

    // **************** Query *************** //

    async getMessages(sessionId: string, topicId?: string): Promise<ChatMessage[]> {
        return this.query({ sessionId, topicId })
    }

    async query({ sessionId, topicId, pageSize = 9999, current = 0 }: QueryMessageParams): Promise<Message[]> {
        const offset = current * pageSize
        const messageTabel = getTable('messages')
        const query = topicId
            ? // TODO: The query {"sessionId":"xxx","topicId":"xxx"} on messages would benefit of a compound index [sessionId+topicId]
              messageTabel.where({ sessionId, topicId }) // Use a compound index
            : messageTabel
                  .where('sessionId')
                  .equals(sessionId)
                  .and((message) => !message.topicId)

        const dbMessages: ChatMessage[] = await query
            .sortBy('createdAt')
            // handle page size
            .then((sortedArray) => sortedArray.slice(offset, offset + pageSize))

        const messages = dbMessages

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

    async queryAll() {
        const data: ChatMessage[] = await this.db.message.orderBy('updatedAt').toArray()

        return data
    }

    queryByTopicId = async (topicId: string) => {
        const dbMessages = await this.db.message.where('topicId').equals(topicId).toArray()

        return dbMessages
    }

    async update(id: string, data: DeepPartial<ChatMessage>): Promise<void> {
        // 更新消息逻辑
        await this.db.message.update(id, data)
    }

    async updateMessageError(id: string, error: ChatMessageError) {
        return this.update(id, { error })
    }

    async updateMessage(id: string, message: Partial<ChatMessage>) {
        return this.update(id, message)
    }

    async delete(id: string): Promise<void> {
        // 删除消息逻辑
        await this.db.message.delete(id)
    }

    async batchDeleteBytopicId(topicId: string): Promise<void> {
        // 批量删除逻辑
        await this.db.message.where('topicId').equals(topicId).delete()
    }

    async removeMessage(id: string) {
        return this.delete(id)
    }

    async removeMessages(topicId: string) {
        return this.batchDeleteBytopicId(topicId)
    }

    async clearAllMessage() {
        // 清空表逻辑
        await this.db.message.clear()
    }

    async batchUpdate(messageIds: string[], updateFields: Partial<ChatMessage>): Promise<number> {
        // 批量更新逻辑
        return await this.db.message.update(messageIds, updateFields)
    }

    // 私有方法，帮助转换数据模型
}

export const messageService = new MessageInternalService()
