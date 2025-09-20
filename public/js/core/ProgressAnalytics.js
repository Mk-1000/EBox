// Progress Analytics and Insights System
import { stateManager } from './state.js';
import { eventBus, EVENTS } from './events.js';

class ProgressAnalytics {
  constructor() {
    this.analytics = {
      projectProgress: new Map(),
      taskCompletionRates: new Map(),
      timeToComplete: new Map(),
      productivityMetrics: new Map(),
      trends: []
    };
    
    this.initialize();
  }

  initialize() {
    // Listen for progress updates
    eventBus.on(EVENTS.PROGRESS_UPDATED, (data) => this.recordProgressUpdate(data));
    eventBus.on(EVENTS.TASK_STATUS_CHANGED, (task) => this.recordTaskCompletion(task));
    eventBus.on(EVENTS.PROJECT_CREATED, (project) => this.recordProjectCreation(project));
  }

  // Record progress update
  recordProgressUpdate(progressData) {
    const { projectId, progress, totalTasks, completedTasks, timestamp } = progressData;
    
    if (!this.analytics.projectProgress.has(projectId)) {
      this.analytics.projectProgress.set(projectId, []);
    }
    
    this.analytics.projectProgress.get(projectId).push({
      progress,
      totalTasks,
      completedTasks,
      timestamp: timestamp || Date.now()
    });
    
    // Keep only last 100 entries per project
    const entries = this.analytics.projectProgress.get(projectId);
    if (entries.length > 100) {
      entries.splice(0, entries.length - 100);
    }
  }

  // Record task completion
  recordTaskCompletion(task) {
    const projectId = task.project_id;
    const now = Date.now();
    
    if (!this.analytics.taskCompletionRates.has(projectId)) {
      this.analytics.taskCompletionRates.set(projectId, {
        total: 0,
        completed: 0,
        completionTimes: []
      });
    }
    
    const rates = this.analytics.taskCompletionRates.get(projectId);
    rates.total++;
    
    if (task.status === 'Done') {
      rates.completed++;
      
      // Estimate completion time (if task has creation date)
      if (task.created_at) {
        const completionTime = now - new Date(task.created_at).getTime();
        rates.completionTimes.push(completionTime);
        
        // Keep only last 50 completion times
        if (rates.completionTimes.length > 50) {
          rates.completionTimes.splice(0, rates.completionTimes.length - 50);
        }
      }
    }
  }

  // Record project creation
  recordProjectCreation(project) {
    this.analytics.productivityMetrics.set(project.id, {
      createdAt: Date.now(),
      tasksCreated: 0,
      tasksCompleted: 0,
      lastActivity: Date.now()
    });
  }

  // Get project progress trend
  getProjectProgressTrend(projectId, days = 7) {
    const entries = this.analytics.projectProgress.get(projectId) || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return entries
      .filter(entry => entry.timestamp >= cutoff)
      .map(entry => ({
        date: new Date(entry.timestamp).toISOString().split('T')[0],
        progress: entry.progress,
        totalTasks: entry.totalTasks,
        completedTasks: entry.completedTasks
      }));
  }

  // Get completion rate for project
  getProjectCompletionRate(projectId) {
    const rates = this.analytics.taskCompletionRates.get(projectId);
    if (!rates || rates.total === 0) return 0;
    
    return Math.round((rates.completed / rates.total) * 100);
  }

  // Get average completion time for project
  getAverageCompletionTime(projectId) {
    const rates = this.analytics.taskCompletionRates.get(projectId);
    if (!rates || rates.completionTimes.length === 0) return null;
    
    const totalTime = rates.completionTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(totalTime / rates.completionTimes.length);
  }

  // Get productivity insights
  getProductivityInsights() {
    const insights = {
      mostProductiveProject: null,
      fastestCompletingProject: null,
      mostActiveProject: null,
      overallCompletionRate: 0
    };
    
    let totalTasks = 0;
    let totalCompleted = 0;
    let maxCompletionRate = 0;
    let minAvgTime = Infinity;
    let maxActivity = 0;
    
    for (const [projectId, rates] of this.analytics.taskCompletionRates) {
      totalTasks += rates.total;
      totalCompleted += rates.completed;
      
      const completionRate = this.getProjectCompletionRate(projectId);
      if (completionRate > maxCompletionRate) {
        maxCompletionRate = completionRate;
        insights.mostProductiveProject = projectId;
      }
      
      const avgTime = this.getAverageCompletionTime(projectId);
      if (avgTime && avgTime < minAvgTime) {
        minAvgTime = avgTime;
        insights.fastestCompletingProject = projectId;
      }
      
      const activity = this.analytics.projectProgress.get(projectId)?.length || 0;
      if (activity > maxActivity) {
        maxActivity = activity;
        insights.mostActiveProject = projectId;
      }
    }
    
    insights.overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    return insights;
  }

  // Get progress summary
  getProgressSummary() {
    const currentState = stateManager.getState();
    const projects = currentState.projects || [];
    
    const summary = {
      totalProjects: projects.length,
      activeProjects: 0,
      completedProjects: 0,
      averageProgress: 0,
      totalTasks: 0,
      completedTasks: 0
    };
    
    let totalProgress = 0;
    
    projects.forEach(project => {
      const progressData = this.analytics.projectProgress.get(project.id);
      if (progressData && progressData.length > 0) {
        const latest = progressData[progressData.length - 1];
        totalProgress += latest.progress;
        summary.totalTasks += latest.totalTasks;
        summary.completedTasks += latest.completedTasks;
        
        if (latest.progress > 0) summary.activeProjects++;
        if (latest.progress === 100) summary.completedProjects++;
      }
    });
    
    summary.averageProgress = projects.length > 0 ? Math.round(totalProgress / projects.length) : 0;
    
    return summary;
  }

  // Export analytics data
  exportAnalytics() {
    return {
      analytics: this.analytics,
      summary: this.getProgressSummary(),
      insights: this.getProductivityInsights(),
      exportedAt: new Date().toISOString()
    };
  }

  // Clear analytics data
  clearAnalytics() {
    this.analytics.projectProgress.clear();
    this.analytics.taskCompletionRates.clear();
    this.analytics.timeToComplete.clear();
    this.analytics.productivityMetrics.clear();
    this.analytics.trends = [];
  }
}

export const progressAnalytics = new ProgressAnalytics();
