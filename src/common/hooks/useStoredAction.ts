import { useState } from 'react'
import { Action } from '../internal-services/db'

export function useStoredAction() {
  const activateAction = useState<Action | undefined>(() => {
    const savedAction = localStorage.getItem('savedAction')
    return savedAction ? JSON.parse(savedAction) : undefined
  })
  return activateAction
}
