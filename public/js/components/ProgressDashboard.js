// Progress Dashboard Component
import { $, $$, el } from '../core/utils.js';
import { progressAnalytics } from '../core/ProgressAnalytics.js';
import { progressManager } from '../core/ProgressManager.js';
import { eventBus, EVENTS } from '../core/events.js';

export class ProgressDashboard {
  constructor() {
    this.dashboard = null;
    this.isVisible = false;
    this.refreshInterval = null;
    
    this.initialize();
  }

  initialize() {
    this.createDashboard();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  createDashboard() {
    this.dashboard = el('div', {
      className: 'progress-dashboard',
      id: 'progressDashboard',
      hidden: true
    }, [
      el('div', { className: 'dashboard-header' }, [
        el('h3', { textContent: 'Progress Analytics' }),
        el('button', {
          className: 'btn-icon close-dashboard',
          onclick: () => this.hide(),
          title: 'Close Dashboard'
        }, [el('span', { className: 'icon-text', textContent: '×' })])
      ]),
      el('div', { className: 'dashboard-content' }, [
        el('div', { className: 'dashboard-grid' }, [
          el('div', { className: 'dashboard-card summary' }, [
            el('h4', { textContent: 'Overall Summary' }),
            el('div', { className: 'summary-stats', id: 'summaryStats' })
          ]),
          el('div', { className: 'dashboard-card insights' }, [
            el('h4', { textContent: 'Productivity Insights' }),
            el('div', { className: 'insights-content', id: 'insightsContent' })
          ]),
          el('div', { className: 'dashboard-card trends' }, [
            el('h4', { textContent: 'Progress Trends' }),
            el('div', { className: 'trends-content', id: 'trendsContent' })
          ]),
          el('div', { className: 'dashboard-card performance' }, [
            el('h4', { textContent: 'Performance Metrics' }),
            el('div', { className: 'performance-content', id: 'performanceContent' })
          ])
        ])
      ])
    ]);

    // Add to body
    document.body.appendChild(this.dashboard);
  }

  setupEventListeners() {
    // Listen for progress updates
    eventBus.on(EVENTS.PROGRESS_BATCH_UPDATED, () => this.refresh());
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  show() {
    this.dashboard.hidden = false;
    this.isVisible = true;
    this.refresh();
    eventBus.emit(EVENTS.MODAL_OPEN, 'progress-dashboard');
  }

  hide() {
    this.dashboard.hidden = true;
    this.isVisible = false;
    eventBus.emit(EVENTS.MODAL_CLOSE, 'progress-dashboard');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  refresh() {
    if (!this.isVisible) return;

    this.updateSummaryStats();
    this.updateInsights();
    this.updateTrends();
    this.updatePerformance();
  }

  updateSummaryStats() {
    const summary = progressAnalytics.getProgressSummary();
    const summaryStats = $('#summaryStats');
    
    if (summaryStats) {
      summaryStats.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Projects</span>
          <span class="stat-value">${summary.totalProjects}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active Projects</span>
          <span class="stat-value">${summary.activeProjects}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Completed Projects</span>
          <span class="stat-value">${summary.completedProjects}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Average Progress</span>
          <span class="stat-value">${summary.averageProgress}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Tasks</span>
          <span class="stat-value">${summary.totalTasks}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Completed Tasks</span>
          <span class="stat-value">${summary.completedTasks}</span>
        </div>
      `;
    }
  }

  updateInsights() {
    const insights = progressAnalytics.getProductivityInsights();
    const insightsContent = $('#insightsContent');
    
    if (insightsContent) {
      insightsContent.innerHTML = `
        <div class="insight-item">
          <span class="insight-label">Most Productive Project</span>
          <span class="insight-value">${insights.mostProductiveProject || 'N/A'}</span>
        </div>
        <div class="insight-item">
          <span class="insight-label">Fastest Completing Project</span>
          <span class="insight-value">${insights.fastestCompletingProject || 'N/A'}</span>
        </div>
        <div class="insight-item">
          <span class="insight-label">Most Active Project</span>
          <span class="insight-value">${insights.mostActiveProject || 'N/A'}</span>
        </div>
        <div class="insight-item">
          <span class="insight-label">Overall Completion Rate</span>
          <span class="insight-value">${insights.overallCompletionRate}%</span>
        </div>
      `;
    }
  }

  updateTrends() {
    const trendsContent = $('#trendsContent');
    
    if (trendsContent) {
      // Get recent trends (last 7 days)
      const trends = this.getRecentTrends();
      
      trendsContent.innerHTML = `
        <div class="trend-chart">
          <canvas id="trendChart" width="300" height="150"></canvas>
        </div>
        <div class="trend-stats">
          <div class="trend-item">
            <span class="trend-label">Tasks Completed Today</span>
            <span class="trend-value">${trends.todayCompleted}</span>
          </div>
          <div class="trend-item">
            <span class="trend-label">Tasks Created Today</span>
            <span class="trend-value">${trends.todayCreated}</span>
          </div>
        </div>
      `;
      
      // Draw simple trend chart
      this.drawTrendChart(trends);
    }
  }

  updatePerformance() {
    const performanceContent = $('#performanceContent');
    const stats = progressManager.getStats();
    
    if (performanceContent) {
      performanceContent.innerHTML = `
        <div class="performance-item">
          <span class="performance-label">Cache Hit Rate</span>
          <span class="performance-value">${this.calculateCacheHitRate()}%</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Update Frequency</span>
          <span class="performance-value">${stats.updateFrequency / 1000}s</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Cached Projects</span>
          <span class="performance-value">${stats.cacheStats.cacheSize}</span>
        </div>
        <div class="performance-item">
          <span class="performance-label">Queued Updates</span>
          <span class="performance-value">${stats.cacheStats.queuedUpdates}</span>
        </div>
      `;
    }
  }

  getRecentTrends() {
    // This would typically come from analytics data
    return {
      todayCompleted: Math.floor(Math.random() * 10),
      todayCreated: Math.floor(Math.random() * 15),
      weeklyData: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20))
    };
  }

  drawTrendChart(trends) {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw simple line chart
    ctx.strokeStyle = '#2bd4c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const data = trends.weeklyData;
    const stepX = width / (data.length - 1);
    const maxValue = Math.max(...data);
    
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - (value / maxValue) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }

  calculateCacheHitRate() {
    const stats = progressManager.getStats();
    const totalRequests = stats.cacheStats.cacheSize + stats.cacheStats.queuedUpdates;
    return totalRequests > 0 ? Math.round((stats.cacheStats.cacheSize / totalRequests) * 100) : 0;
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (this.isVisible) {
        this.refresh();
      }
    }, 10000); // Refresh every 10 seconds
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
    if (this.dashboard && this.dashboard.parentNode) {
      this.dashboard.parentNode.removeChild(this.dashboard);
    }
  }
}
