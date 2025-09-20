// Intelligent Progress Cache System
class ProgressCache {
  constructor() {
    this.cache = new Map();
    this.lastUpdated = new Map();
    this.updateQueue = new Set();
    this.batchTimeout = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.batchDelay = 1000; // 1 second
  }

  // Get cached progress data
  get(projectId) {
    const cached = this.cache.get(projectId);
    const lastUpdate = this.lastUpdated.get(projectId);
    
    if (cached && lastUpdate && (Date.now() - lastUpdate) < this.cacheExpiry) {
      return cached;
    }
    
    return null;
  }

  // Set cached progress data
  set(projectId, progressData) {
    this.cache.set(projectId, progressData);
    this.lastUpdated.set(projectId, Date.now());
  }

  // Queue project for batch update
  queueUpdate(projectId) {
    this.updateQueue.add(projectId);
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchUpdate();
      }, this.batchDelay);
    }
  }

  // Process batched updates
  async processBatchUpdate() {
    if (this.updateQueue.size === 0) return;

    const projectIds = Array.from(this.updateQueue);
    this.updateQueue.clear();
    this.batchTimeout = null;

    try {
      const { apiService } = await import('../services/api.js');
      
      // Batch fetch progress data for all queued projects
      const progressPromises = projectIds.map(async (projectId) => {
        try {
          const response = await apiService.getTasksByProject(projectId);
          const tasks = response.tasks || [];
          
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'Done').length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const progressData = {
            projectId,
            progress,
            totalTasks,
            completedTasks,
            lastUpdated: Date.now()
          };
          
          this.set(projectId, progressData);
          return progressData;
        } catch (error) {
          console.error(`Failed to fetch progress for project ${projectId}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(progressPromises);
      
      // Emit update event for successful results
      const validResults = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      if (validResults.length > 0) {
        const { eventBus, EVENTS } = await import('./events.js');
        eventBus.emit(EVENTS.PROGRESS_BATCH_UPDATED, validResults);
      }
    } catch (error) {
      console.error('Batch progress update failed:', error);
    }
  }

  // Invalidate cache for specific project
  invalidate(projectId) {
    this.cache.delete(projectId);
    this.lastUpdated.delete(projectId);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.lastUpdated.clear();
    this.updateQueue.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  // Get cache statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      queuedUpdates: this.updateQueue.size,
      oldestEntry: Math.min(...Array.from(this.lastUpdated.values())),
      newestEntry: Math.max(...Array.from(this.lastUpdated.values()))
    };
  }
}

export const progressCache = new ProgressCache();
