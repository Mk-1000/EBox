// Authentication component
import { $, $$ } from '../core/utils.js';
import { apiService } from '../services/api.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';

export class AuthComponent {
  constructor() {
    this.authSection = $('#authSection');
    this.appSection = $('#appSection');
    this.authForm = $('#authForm');
    this.usernameInput = $('#username');
    this.passwordInput = $('#password');
    this.signupBtn = $('#signupBtn');
    this.authError = $('#authError');
    this.isSignup = false;
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  setupEventListeners() {
    this.authForm.addEventListener('submit', (e) => this.handleSubmit(e));
    this.signupBtn.addEventListener('click', () => this.toggleMode());
    
    // Listen for auth events
    eventBus.on(EVENTS.USER_LOGIN, () => this.showApp());
    eventBus.on(EVENTS.USER_LOGOUT, () => this.handleLogout());
  }

  async checkAuthStatus() {
    try {
      const response = await apiService.getCurrentUser();
      if (response.user) {
        stateManager.setUser(response.user);
        eventBus.emit(EVENTS.USER_LOGIN, response.user);
        console.log('User logged in successfully:', response.user.username);
      }
    } catch (error) {
      // User not authenticated, show auth form
      console.log('User not authenticated, showing auth form');
      this.showAuth();
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.clearError();
    
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value;
    
    if (!username || !password) {
      this.showError('Username and password are required');
      return;
    }

    try {
      stateManager.setLoading(true);
      
      const response = this.isSignup 
        ? await apiService.signup(username, password)
        : await apiService.login(username, password);
      
      if (response.user) {
        stateManager.setUser(response.user);
        eventBus.emit(EVENTS.USER_LOGIN, response.user);
        console.log('User logged in successfully:', response.user.username);
      }
    } catch (error) {
      this.showError(error.message || 'Authentication failed');
      eventBus.emit(EVENTS.AUTH_ERROR, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  toggleMode() {
    this.isSignup = !this.isSignup;
    const submitBtn = this.authForm.querySelector('button[type="submit"]');
    
    if (this.isSignup) {
      submitBtn.textContent = 'Create Account';
      this.signupBtn.textContent = 'Already have an account?';
    } else {
      submitBtn.textContent = 'Login';
      this.signupBtn.textContent = 'Create account';
    }
    
    this.clearError();
  }

  showAuth() {
    this.authSection.hidden = false;
    this.appSection.hidden = true;
    this.usernameInput.focus();
  }

  showApp() {
    this.authSection.hidden = true;
    this.appSection.hidden = false;
  }

  showError(message) {
    this.authError.textContent = message;
    this.authError.style.display = 'block';
  }

  clearError() {
    this.authError.textContent = '';
    this.authError.style.display = 'none';
  }

  async handleLogout() {
    try {
      await apiService.logout();
      stateManager.setUser(null);
      this.showAuth();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
      stateManager.setUser(null);
      this.showAuth();
    }
  }

  async logout() {
    // This method can be called directly if needed
    await this.handleLogout();
  }
}
