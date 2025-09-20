// State management system with optimistic updates
class StateManager {
  constructor() {
    this.state = {
      user: null,
      projects: [],
      currentProject: null,
      tasks: [],
      theme: 'light',
      language: 'en',
      isLoading: false,
      error: null,
      pendingUpdates: new Map(), // Track pending optimistic updates
      syncQueue: [] // Background sync queue
    };
    this.listeners = new Map();
    this.syncWorker = null;
    this.initializeSyncWorker();
  }

  getState() {
    return { ...this.state };
  }

  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.notifyListeners(prevState, this.state);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  notifyListeners(prevState, newState) {
    this.listeners.forEach((callbacks, key) => {
      if (prevState[key] !== newState[key]) {
        callbacks.forEach(callback => {
          try {
            callback(newState[key], prevState[key]);
          } catch (error) {
            console.error('State listener error:', error);
          }
        });
      }
    });
  }

  // Specific state setters
  setUser(user) {
    this.setState({ user });
  }

  setProjects(projects) {
    this.setState({ projects });
  }

  setCurrentProject(project) {
    this.setState({ currentProject: project });
  }

  setTasks(tasks) {
    this.setState({ tasks });
  }

  setTheme(theme) {
    this.setState({ theme });
    localStorage.setItem('ebox:theme', theme);
  }

  setLanguage(language) {
    this.setState({ language });
    localStorage.setItem('ebox:lang', language);
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  setError(error) {
    this.setState({ error });
  }

  clearError() {
    this.setState({ error: null });
  }

  // Optimistic update methods
  optimisticUpdateTaskStatus(taskId, newStatus) {
    const currentTasks = [...this.state.tasks];
    const taskIndex = currentTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      const updatedTask = { ...currentTasks[taskIndex], status: newStatus };
      currentTasks[taskIndex] = updatedTask;
      
      // Add to pending updates
      this.state.pendingUpdates.set(`task-${taskId}`, {
        type: 'task-status',
        taskId,
        originalStatus: currentTasks[taskIndex].status,
        newStatus,
        timestamp: Date.now()
      });
      
      this.setState({ tasks: currentTasks });
      return updatedTask;
    }
    return null;
  }

  optimisticUpdateProjectQuadrant(projectId, newQuadrant) {
    const currentProjects = [...this.state.projects];
    const projectIndex = currentProjects.findIndex(project => project.id === projectId);
    
    if (projectIndex !== -1) {
      const updatedProject = { ...currentProjects[projectIndex], quadrant: newQuadrant };
      currentProjects[projectIndex] = updatedProject;
      
      // Add to pending updates
      this.state.pendingUpdates.set(`project-${projectId}`, {
        type: 'project-quadrant',
        projectId,
        originalQuadrant: currentProjects[projectIndex].quadrant,
        newQuadrant,
        timestamp: Date.now()
      });
      
      this.setState({ projects: currentProjects });
      return updatedProject;
    }
    return null;
  }

  optimisticUpdateSubtaskCompletion(subtaskId, completed) {
    const currentTasks = [...this.state.tasks];
    let updated = false;
    
    const updatedTasks = currentTasks.map(task => {
      if (task.subtasks && Array.isArray(task.subtasks)) {
        const updatedSubtasks = task.subtasks.map(subtask => {
          if (subtask.id === subtaskId) {
            updated = true;
            return { ...subtask, completed };
          }
          return subtask;
        });
        
        if (updated) {
          return { ...task, subtasks: updatedSubtasks };
        }
      }
      return task;
    });
    
    if (updated) {
      // Add to pending updates
      this.state.pendingUpdates.set(`subtask-${subtaskId}`, {
        type: 'subtask-completion',
        subtaskId,
        completed,
        timestamp: Date.now()
      });
      
      this.setState({ tasks: updatedTasks });
      return true;
    }
    return false;
  }

  // Rollback optimistic updates
  rollbackUpdate(key) {
    const update = this.state.pendingUpdates.get(key);
    if (!update) return false;

    switch (update.type) {
      case 'task-status':
        this.optimisticUpdateTaskStatus(update.taskId, update.originalStatus);
        break;
      case 'project-quadrant':
        this.optimisticUpdateProjectQuadrant(update.projectId, update.originalQuadrant);
        break;
      case 'subtask-completion':
        this.optimisticUpdateSubtaskCompletion(update.subtaskId, !update.completed);
        break;
    }
    
    this.state.pendingUpdates.delete(key);
    return true;
  }

  // Confirm optimistic update
  confirmUpdate(key) {
    this.state.pendingUpdates.delete(key);
  }

  // Background sync worker
  initializeSyncWorker() {
    this.syncWorker = {
      isRunning: false,
      interval: null,
      start: () => {
        if (this.syncWorker.isRunning) return;
        this.syncWorker.isRunning = true;
        this.syncWorker.interval = setInterval(() => {
          this.processSyncQueue();
        }, 1000); // Process every second
      },
      stop: () => {
        if (this.syncWorker.interval) {
          clearInterval(this.syncWorker.interval);
          this.syncWorker.interval = null;
        }
        this.syncWorker.isRunning = false;
      }
    };
    this.syncWorker.start();
  }

  // Add to sync queue
  addToSyncQueue(operation) {
    this.state.syncQueue.push({
      ...operation,
      id: `sync-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    });
  }

  // Process sync queue
  async processSyncQueue() {
    if (this.state.syncQueue.length === 0) return;

    const operations = [...this.state.syncQueue];
    this.state.syncQueue = [];

    for (const operation of operations) {
      try {
        await this.executeSyncOperation(operation);
        this.confirmUpdate(operation.key);
      } catch (error) {
        console.error('Sync operation failed:', error);
        operation.retries++;
        
        if (operation.retries < 3) {
          // Retry after delay
          setTimeout(() => {
            this.state.syncQueue.push(operation);
          }, 2000 * operation.retries);
        } else {
          // Max retries reached, rollback
          this.rollbackUpdate(operation.key);
        }
      }
    }
  }

  // Execute sync operation
  async executeSyncOperation(operation) {
    const { apiService } = await import('../services/api.js');
    
    switch (operation.type) {
      case 'task-status':
        await apiService.updateTaskStatus(operation.taskId, operation.newStatus);
        break;
      case 'project-quadrant':
        await apiService.updateProjectQuadrant(operation.projectId, operation.newQuadrant);
        break;
      case 'subtask-completion':
        await apiService.toggleTaskCompletion(operation.subtaskId, operation.completed);
        break;
    }
  }

  // Initialize state from localStorage
  initialize() {
    const savedTheme = localStorage.getItem('ebox:theme') || 'light';
    const savedLang = localStorage.getItem('ebox:lang') || 'en';
    
    this.setState({
      theme: savedTheme,
      language: savedLang
    });
  }

  // Cleanup
  destroy() {
    if (this.syncWorker) {
      this.syncWorker.stop();
    }
  }
}

export const stateManager = new StateManager();
