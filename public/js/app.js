// Main application entry point
import { stateManager } from './core/state.js';
import { eventBus, EVENTS } from './core/events.js';
import { AuthComponent } from './components/AuthComponent.js';
import { ProjectComponent } from './components/ProjectComponent.js';
import { TaskComponent } from './components/TaskComponent.js';
import { ThemeComponent } from './components/ThemeComponent.js';
import { SyncStatusComponent } from './components/SyncStatusComponent.js';
import { ProgressDashboard } from './components/ProgressDashboard.js';

class EBoxApp {
  constructor() {
    this.components = {};
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize state manager
      stateManager.initialize();
      
      // Initialize components
      this.components.theme = new ThemeComponent();
      this.components.auth = new AuthComponent();
      this.components.project = new ProjectComponent();
      this.components.task = new TaskComponent();
      this.components.syncStatus = new SyncStatusComponent();
      this.components.progressDashboard = new ProgressDashboard();
      
      // Setup global error handling
      this.setupErrorHandling();
      
      // Setup global event listeners
      this.setupGlobalEventListeners();
      
      console.log('EBox application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Failed to initialize application');
    }
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred');
    });

    // Listen for application errors
    eventBus.on(EVENTS.ERROR_OCCURRED, (error) => {
      this.showError(error.message || 'An error occurred');
    });
  }

  setupGlobalEventListeners() {
    // Listen for loading state changes
    stateManager.subscribe('isLoading', (isLoading) => {
      this.toggleLoadingState(isLoading);
    });

    // Listen for user authentication changes
    eventBus.on(EVENTS.USER_LOGIN, (user) => {
      console.log('User logged in:', user.username);
    });

    eventBus.on(EVENTS.USER_LOGOUT, () => {
      console.log('User logged out');
    });
  }

  toggleLoadingState(isLoading) {
    // You can add a global loading spinner here
    const body = document.body;
    if (isLoading) {
      body.classList.add('loading');
    } else {
      body.classList.remove('loading');
    }
  }

  showError(message) {
    // Simple error display - you can enhance this with a proper error component
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-toast';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Cleanup method
  destroy() {
    // Cleanup state manager
    stateManager.destroy();
    
    // Cleanup components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EBoxApp();
  });
} else {
  new EBoxApp();
}
