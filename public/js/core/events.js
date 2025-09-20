// Event system for component communication
class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }

  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

export const eventBus = new EventBus();

// Event constants
export const EVENTS = {
  // Auth events
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  AUTH_ERROR: 'auth:error',
  
  // Project events
  PROJECTS_LOADED: 'projects:loaded',
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_SELECTED: 'project:selected',
  PROJECT_QUADRANT_CHANGED: 'project:quadrantChanged',
  
  // Task events
  TASKS_LOADED: 'tasks:loaded',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_STATUS_CHANGED: 'task:statusChanged',
  TASK_MOVED: 'task:moved',
  SUBTASK_COMPLETED: 'subtask:completed',
  
  // Real-time update events
  OPTIMISTIC_UPDATE: 'realtime:optimisticUpdate',
  SYNC_QUEUE_UPDATED: 'realtime:syncQueueUpdated',
  SYNC_SUCCESS: 'realtime:syncSuccess',
  SYNC_FAILED: 'realtime:syncFailed',
  
  // UI events
  THEME_CHANGED: 'ui:themeChanged',
  LANGUAGE_CHANGED: 'ui:languageChanged',
  MODAL_OPEN: 'ui:modalOpen',
  MODAL_CLOSE: 'ui:modalClose',
  DRAG_START: 'ui:dragStart',
  DRAG_END: 'ui:dragEnd',
  
  // Progress events
  PROGRESS_UPDATED: 'progress:updated',
  PROGRESS_BATCH_UPDATED: 'progress:batchUpdated',
  PROGRESS_CACHE_INVALIDATED: 'progress:cacheInvalidated',
  
  // Error events
  ERROR_OCCURRED: 'error:occurred',
  ERROR_CLEARED: 'error:cleared'
};
