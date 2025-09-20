// API service layer
import { API_BASE } from '../core/constants.js';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    console.log('API request:', url, options);
    
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
      console.log('API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      // Don't log 401 errors as errors - they're expected when not authenticated
      if (error.message && error.message.includes('Not authenticated')) {
        console.log('API request returned 401 (expected when not authenticated):', url);
      } else {
        console.error('API request failed:', error);
        console.error('Request details:', { url, config });
      }
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
    console.log('Due date value:', dueDate, 'Type:', typeof dueDate);
    return this.request('/api/tasks', {
      method: 'POST',
      body
    });
  }

  async updateTask(id, data) {
    console.log('API updateTask called with id:', id, 'data:', data);
    console.log('Due date in update data:', data.dueDate, 'Type:', typeof data.dueDate);
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
