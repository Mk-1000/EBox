// Real-time sync status component
import { $, $$, el } from '../core/utils.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';

export class SyncStatusComponent {
  constructor() {
    this.statusIndicator = null;
    this.syncQueue = [];
    this.isVisible = false;
    
    this.initialize();
  }

  initialize() {
    this.createStatusIndicator();
    this.setupEventListeners();
    this.startStatusMonitoring();
  }

  createStatusIndicator() {
    this.statusIndicator = el('div', {
      className: 'sync-status',
      id: 'syncStatus',
      style: `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--card);
        border: 1px solid #1b2733;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: var(--text);
        z-index: 1000;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `
    }, [
      el('div', {
        className: 'sync-spinner',
        style: `
          width: 12px;
          height: 12px;
          border: 2px solid #007bff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        `
      }),
      el('span', { textContent: 'Syncing...' })
    ]);

    document.body.appendChild(this.statusIndicator);
  }

  setupEventListeners() {
    // Listen for sync events
    eventBus.on(EVENTS.SYNC_QUEUE_UPDATED, (queue) => {
      this.syncQueue = queue;
      this.updateStatus();
    });

    eventBus.on(EVENTS.SYNC_SUCCESS, (operation) => {
      this.onSyncSuccess(operation);
    });

    eventBus.on(EVENTS.SYNC_FAILED, (operation) => {
      this.onSyncFailed(operation);
    });

    eventBus.on(EVENTS.OPTIMISTIC_UPDATE, (update) => {
      this.onOptimisticUpdate(update);
    });
  }

  startStatusMonitoring() {
    // Monitor state for pending updates
    setInterval(() => {
      const state = stateManager.getState();
      const pendingCount = state.pendingUpdates ? state.pendingUpdates.size : 0;
      const queueCount = state.syncQueue ? state.syncQueue.length : 0;
      
      if (pendingCount > 0 || queueCount > 0) {
        this.showStatus(pendingCount, queueCount);
      } else {
        this.hideStatus();
      }
    }, 500);
  }

  showStatus(pendingCount, queueCount) {
    if (!this.isVisible) {
      this.isVisible = true;
      this.statusIndicator.style.opacity = '1';
      this.statusIndicator.style.transform = 'translateY(0)';
    }

    const totalCount = pendingCount + queueCount;
    const statusText = totalCount === 1 ? 'Syncing 1 update...' : `Syncing ${totalCount} updates...`;
    
    const textElement = this.statusIndicator.querySelector('span');
    if (textElement) {
      textElement.textContent = statusText;
    }
  }

  hideStatus() {
    if (this.isVisible) {
      this.isVisible = false;
      this.statusIndicator.style.opacity = '0';
      this.statusIndicator.style.transform = 'translateY(-10px)';
    }
  }

  updateStatus() {
    const state = stateManager.getState();
    const pendingCount = state.pendingUpdates ? state.pendingUpdates.size : 0;
    const queueCount = state.syncQueue ? state.syncQueue.length : 0;
    
    if (pendingCount > 0 || queueCount > 0) {
      this.showStatus(pendingCount, queueCount);
    } else {
      this.hideStatus();
    }
  }

  onSyncSuccess(operation) {
    console.log('✅ Sync successful:', operation);
    // Show success briefly
    this.showTemporaryStatus('✅ Synced', 'success');
  }

  onSyncFailed(operation) {
    console.error('❌ Sync failed:', operation);
    // Show error briefly
    this.showTemporaryStatus('❌ Sync failed', 'error');
  }

  onOptimisticUpdate(update) {
    console.log('🔄 Optimistic update:', update);
    this.updateStatus();
  }

  showTemporaryStatus(message, type = 'info') {
    const originalContent = this.statusIndicator.innerHTML;
    const originalOpacity = this.statusIndicator.style.opacity;
    
    // Update content
    this.statusIndicator.innerHTML = `
      <div class="sync-icon" style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : '🔄'}
      </div>
      <span>${message}</span>
    `;
    
    // Show
    this.statusIndicator.style.opacity = '1';
    this.statusIndicator.style.transform = 'translateY(0)';
    
    // Hide after delay
    setTimeout(() => {
      this.statusIndicator.style.opacity = '0';
      this.statusIndicator.style.transform = 'translateY(-10px)';
      
      // Restore original content
      setTimeout(() => {
        this.statusIndicator.innerHTML = originalContent;
        this.statusIndicator.style.opacity = originalOpacity;
      }, 300);
    }, 2000);
  }

  destroy() {
    if (this.statusIndicator && this.statusIndicator.parentNode) {
      this.statusIndicator.parentNode.removeChild(this.statusIndicator);
    }
  }
}
