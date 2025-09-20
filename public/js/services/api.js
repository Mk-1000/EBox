// API service layer
import { API_BASE } from '../core/constants.js';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async signup(username, password) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: { username, password }
    });
  }

  async login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Project endpoints
  async getProjects() {
    return this.request('/api/projects');
  }

  async getProject(id) {
    return this.request(`/api/projects/${id}`);
  }

  async createProject(title, description, quadrant) {
    return this.request('/api/projects', {
      method: 'POST',
      body: { title, description, quadrant }
    });
  }

  async updateProject(id, data) {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteProject(id) {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE'
    });
  }

  async updateProjectQuadrant(id, quadrant) {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: { quadrant }
    });
  }

  // Task endpoints
  async getTasksByProject(projectId, filters = {}) {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    const path = `/api/tasks/project/${projectId}${queryString ? `?${queryString}` : ''}`;
    return this.request(path);
  }

  async getTask(id) {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(projectId, title, description, priority, status, dueDate, parentTaskId, completed = false) {
    const body = { projectId, title, description, priority, status, dueDate, parentTaskId, completed };
    console.log('API createTask called with body:', body);
    return this.request('/api/tasks', {
      method: 'POST',
      body
    });
  }

  async updateTask(id, data) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteTask(id) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleTaskCompletion(id, completed) {
    return this.request(`/api/tasks/${id}/toggle`, {
      method: 'POST',
      body: { completed }
    });
  }

  async updateTaskStatus(id, status) {
    return this.request(`/api/tasks/${id}/status`, {
      method: 'POST',
      body: { status }
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const apiService = new ApiService();
