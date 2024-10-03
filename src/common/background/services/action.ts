import { IActionInternalService, ICreateActionOption, IUpdateActionOption } from '../../internal-services/action'
import { Action } from '../../internal-services/db'
import { callMethod } from './base'

class BackgroundActionService implements IActionInternalService {
  create(opt: ICreateActionOption): Promise<Action> {
    return callMethod('actionService', 'create', [opt])
  }
  update(action: Action, opt: IUpdateActionOption): Promise<Action> {
    return callMethod('actionService', 'update', [action, opt])
  }
  bulkPut(actions: Action[]): Promise<void> {
    return callMethod('actionService', 'bulkPut', [actions])
  }
  get(id: number): Promise<Action | undefined> {
    return callMethod('actionService', 'get', [id])
  }
  addParentIdToChildrenActions(id: number, childrenIds: number[]): Promise<void> {
    return callMethod('actionService', 'addParentIdToChildrenActions', [id, childrenIds])
  }
  deleteParentIdFromChildrenActions(id: number, childrenIds: number[]): Promise<void> {
    return callMethod('actionService', 'deleteParentIdFromChildrenActions', [id, childrenIds])
  }
  getByMode(mode: string): Promise<Action | undefined> {
    return callMethod('actionService', 'getByMode', [mode])
  }
  delete(id: number): Promise<void> {
    return callMethod('actionService', 'delete', [id])
  }
  deleteByMode(mode: string): Promise<void> {
    return callMethod('actionService', 'deleteByMode', [mode])
  }
  clearOldData(maxId: number): Promise<void> {
    return callMethod('actionService', 'clearOldData', [maxId])
  }
  list(): Promise<Action[]> {
    return callMethod('actionService', 'list', [])
  }
  count(): Promise<number> {
    return callMethod('actionService', 'count', [])
  }
  exportActions(filename: string, filteredActions: Action[]): Promise<void> {
    return callMethod('actionService', 'exportActions', [filename, filteredActions])
  }

  importActions(file: File): Promise<void> {
    return callMethod('actionService', 'importActions', [file])
  }

  getArkoseToken(): Promise<string | undefined> {
    return callMethod('actionService', 'getArkoseToken', [])
  }

  getAllGroups(): Promise<string[]> {
    return callMethod('actionService', 'getAllGroups', [])
  }
}

export const backgroundActionService = new BackgroundActionService()
