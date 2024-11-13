import { EventType } from './EventType'

export interface Event {
  type: EventType
  payload: Record<string, unknown>
}
