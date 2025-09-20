// Real-time Progress Management System
import { progressCache } from './ProgressCache.js';
import { stateManager } from './state.js';
import { eventBus, EVENTS } from './events.js';

class ProgressManager {
  constructor() {
    this.updateInterval = null;
    this.isActive = false;
    this.updateFrequency = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds
    
    this.initialize();
  }

  initialize() {
    // Listen for task changes to trigger progress updates
    eventBus.on(EVENTS.TASK_CREATED, (task) => this.handleTaskChange(task.project_id));
    eventBus.on(EVENTS.TASK_UPDATED, (task) => this.handleTaskChange(task.project_id));
    eventBus.on(EVENTS.TASK_DELETED, (taskId) => this.handleTaskChangeFromId(taskId));
    eventBus.on(EVENTS.TASK_STATUS_CHANGED, (task) => this.handleTaskChange(task.project_id));
    
    // Listen for project changes
    eventBus.on(EVENTS.PROJECT_CREATED, () => this.refreshAllProgress());
    eventBus.on(EVENTS.PROJECT_DELETED, () => this.refreshAllProgress());
    
    // Listen for batch progress updates
    eventBus.on(EVENTS.PROGRESS_BATCH_UPDATED, (progressData) => this.updateUI(progressData));
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  // Handle task changes
  handleTaskChange(projectId) {
    if (projectId) {
      this.invalidateAndUpdate(projectId);
    }
  }

  // Handle task deletion (need to find project ID)
  async handleTaskChangeFromId(taskId) {
    try {
      const { apiService } = await import('../services/api.js');
      const response = await apiService.getTask(taskId);
      if (response.task && response.task.project_id) {
        this.handleTaskChange(response.task.project_id);
      }
    } catch (error) {
      // If we can't get the task, refresh all progress
      this.refreshAllProgress();
    }
  }

  // Invalidate cache and queue update
  invalidateAndUpdate(projectId) {
    progressCache.invalidate(projectId);
    progressCache.queueUpdate(projectId);
  }

  // Refresh all progress data
  async refreshAllProgress() {
    const currentState = stateManager.getState();
    const projects = currentState.projects || [];
    
    projects.forEach(project => {
      progressCache.queueUpdate(project.id);
    });
  }

  // Update UI with progress data
  updateUI(progressDataArray) {
    progressDataArray.forEach(progressData => {
      this.updateProjectProgressUI(progressData);
    });
  }

  // Update specific project progress UI
  updateProjectProgressUI(progressData) {
    const { projectId, progress, totalTasks, completedTasks } = progressData;
    
    // Update Eisenhower Box project cards
    const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
    if (projectElement) {
      const progressFill = projectElement.querySelector('.progress-fill');
      const progressText = projectElement.querySelector('.progress-text');
      const taskCount = projectElement.querySelector('.task-count');
      
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${progress}%`;
      }
      if (taskCount) {
        taskCount.textContent = `${totalTasks} tasks`;
      }
    }
    
    // Update project page if it's the current project
    const currentState = stateManager.getState();
    const currentProject = currentState.currentProject;
    
    if (currentProject && currentProject.id === projectId) {
      this.updateProjectPageProgress(progressData);
    }
  }

  // Update project page progress
  updateProjectPageProgress(progressData) {
    const { progress, totalTasks, completedTasks } = progressData;
    
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const totalTasksEl = document.getElementById('totalTasks');
    const completedTasksEl = document.getElementById('completedTasks');
    
    if (progressText) progressText.textContent = `${progress}%`;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (totalTasksEl) totalTasksEl.textContent = totalTasks;
    if (completedTasksEl) completedTasksEl.textContent = completedTasks;
  }

  // Start periodic updates
  startPeriodicUpdates() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.updateInterval = setInterval(() => {
      this.refreshAllProgress();
    }, this.updateFrequency);
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isActive = false;
  }

  // Get progress for specific project
  async getProjectProgress(projectId) {
    // Check cache first
    const cached = progressCache.get(projectId);
    if (cached) {
      return cached;
    }
    
    // Queue for update and return null
    progressCache.queueUpdate(projectId);
    return null;
  }

  // Force refresh specific project
  async forceRefreshProject(projectId) {
    progressCache.invalidate(projectId);
    progressCache.queueUpdate(projectId);
  }

  // Get progress statistics
  getStats() {
    return {
      isActive: this.isActive,
      updateFrequency: this.updateFrequency,
      cacheStats: progressCache.getStats()
    };
  }

  // Cleanup
  destroy() {
    this.stopPeriodicUpdates();
    progressCache.clear();
  }
}

export const progressManager = new ProgressManager();
