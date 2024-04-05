import { Message, getLocalDB, getTable } from './db'
import { DeepPartial } from 'utility-types'
import { nanoid } from 'nanoid/non-secure'


export interface CreateMessageParams extends Message {
    fromModel?: string
    fromProvider?: string
    sessionId: string
}

export interface QueryMessageParams {
    current?: number
    pageSize?: number
    sessionId: string
    topicId?: string
}

export interface IMessageInternalService {
    create(params: CreateMessageParams): Promise<Message>
    query(params: QueryMessageParams): Promise<Message[]>
    update(id: string, data: DeepPartial<Message>): Promise<void>
    delete(id: string): Promise<void>
    batchDeleteBySessionId(sessionId: string): Promise<void>
    batchUpdate(messageIds: string[], updateFields: Partial<Message>): Promise<number>
    // 其他必要的方法
}

class MessageInternalService implements IMessageInternalService {
    schema: Message | undefined
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
        return record
    }

    // **************** Query *************** //

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

        const dbMessages: Message[] = await query
            .sortBy('createdAt')
            // handle page size
            .then((sortedArray) => sortedArray.slice(offset, offset + pageSize))

        const messages = dbMessages

        const finalList: Message[] = []

        const addItem = (item: Message) => {
            const isExist = finalList.findIndex((i) => item.id === i.id) > -1
            if (!isExist) {
                finalList.push(item)
            }
        }
        const messageMap = new Map<string, Message>()
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

    async update(id: string, data: DeepPartial<Message>): Promise<void> {
        // 更新消息逻辑
        await this.db.message.update(id, data)
    }

    async delete(id: string): Promise<void> {
        // 删除消息逻辑
        await this.db.message.delete(id)
    }

    async batchDeleteBySessionId(sessionId: string): Promise<void> {
        // 批量删除逻辑
        await this.db.message.where('sessionId').equals(sessionId).delete()
    }

    async batchUpdate(messageIds: string[], updateFields: Partial<Message>): Promise<number> {
        // 批量更新逻辑
        return await this.db.message.update(messageIds, updateFields)
    }

    // 私有方法，帮助转换数据模型

}

export const messageInternalService = new MessageInternalService()
