import { EventEmitter } from 'events';
import { EVENT_TYPES } from '@urlshortener/shared';

const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100);

export { eventEmitter, EVENT_TYPES };

export function publishEvent(eventName: string, data: Record<string, unknown>): void {
  eventEmitter.emit(eventName, data);
}
