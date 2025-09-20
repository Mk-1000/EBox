// Project management component
import { $, $$, el } from '../core/utils.js';
import { apiService } from '../services/api.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';
import { QUADRANTS } from '../core/constants.js';
import { progressManager } from '../core/ProgressManager.js';
import { progressAnalytics } from '../core/ProgressAnalytics.js';

export class ProjectComponent {
  constructor() {
    this.projectsDashboard = $('#projectsDashboard');
    this.projectPage = $('#projectPage');
    this.newProjectBtn = $('#newProjectBtn');
    this.backToProjectsBtn = $('#backToProjects');
    this.projectModal = $('#projectModal');
    this.projectForm = $('#projectForm');
    this.currentEditingProject = null;
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.loadProjects();
    
    // Set up periodic progress bar updates
    this.setupProgressBarRefresh();
    
    // Listen for user login to reload projects
    eventBus.on(EVENTS.USER_LOGIN, () => {
      console.log('User logged in, reloading projects');
      this.loadProjects();
    });
  }

  setupEventListeners() {
    this.newProjectBtn.addEventListener('click', () => this.showProjectModal());
    this.backToProjectsBtn.addEventListener('click', () => this.showProjectsDashboard());
    this.projectForm.addEventListener('submit', (e) => this.handleCreateProject(e));
    
    // Project action buttons
    $('#editProjectBtn').addEventListener('click', () => this.editProject());
    $('#deleteProjectBtn').addEventListener('click', () => this.deleteProject());
    
    // Modal controls
    $('#closeProjectModal').addEventListener('click', () => this.hideProjectModal());
    $('#cancelProject').addEventListener('click', () => this.hideProjectModal());
    
    // Listen for events
    eventBus.on(EVENTS.PROJECT_CREATED, () => this.loadProjects());
    eventBus.on(EVENTS.PROJECT_DELETED, () => this.loadProjects());
    eventBus.on(EVENTS.PROJECT_UPDATED, () => this.loadProjects());
    
    // Listen for task changes to update progress bars dynamically
    eventBus.on(EVENTS.TASK_CREATED, () => this.updateAllProgressBars());
    eventBus.on(EVENTS.TASK_UPDATED, () => this.updateAllProgressBars());
    eventBus.on(EVENTS.TASK_DELETED, () => this.updateAllProgressBars());
    eventBus.on(EVENTS.TASK_STATUS_CHANGED, () => this.updateAllProgressBars());
    
    // Listen for state changes to update progress bars
    stateManager.subscribe('tasks', () => this.updateAllProgressBars());
  }

  async loadProjects() {
    try {
      stateManager.setLoading(true);
      const response = await apiService.getProjects();
      stateManager.setProjects(response.projects);
      this.renderProjects(response.projects);
      eventBus.emit(EVENTS.PROJECTS_LOADED, response.projects);
    } catch (error) {
      // Don't show error for 401 - user just needs to log in
      if (error.message && error.message.includes('Not authenticated')) {
        console.log('User not authenticated, projects will load after login');
        return;
      }
      console.error('Failed to load projects:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  renderProjects(projects) {
    // Clear existing projects
    Object.values(QUADRANTS).forEach(quadrant => {
      const container = $(`#${quadrant}-projects`);
      if (container) {
        container.innerHTML = '';
      }
    });

    // Group projects by quadrant
    const projectsByQuadrant = {};
    Object.values(QUADRANTS).forEach(quadrant => {
      projectsByQuadrant[quadrant] = [];
    });

    projects.forEach(project => {
      if (projectsByQuadrant[project.quadrant]) {
        projectsByQuadrant[project.quadrant].push(project);
      }
    });

    // Render projects in each quadrant
    Object.entries(projectsByQuadrant).forEach(([quadrant, quadrantProjects]) => {
      const container = $(`#${quadrant}-projects`);
      if (container) {
        quadrantProjects.forEach(project => {
          const projectElement = this.createProjectElement(project);
          container.appendChild(projectElement);
        });
      }
    });
  }

  createProjectElement(project) {
    // Get progress from cache or use default
    const cachedProgress = progressManager.getProjectProgress(project.id);
    const progress = cachedProgress ? cachedProgress.progress : 0;
    const totalTasks = cachedProgress ? cachedProgress.totalTasks : (project.totalTasks || 0);
    
    const projectEl = el('div', {
      className: 'project-card',
      'data-project-id': project.id,
      draggable: 'true',
      onclick: () => this.openProject(project.id)
    }, [
      el('div', { className: 'project-header' }, [
        el('h4', { 
          className: 'project-title',
          textContent: project.title 
        }),
        el('div', { className: 'project-status' }, [
          el('span', { 
            className: 'task-count',
            textContent: `${totalTasks} tasks` 
          })
        ])
      ]),
      project.description ? el('p', { 
        className: 'project-description',
        textContent: this.truncateDescription(project.description)
      }) : null,
      el('div', { className: 'project-progress' }, [
        el('div', { className: 'progress-bar' }, [
          el('div', { 
            className: 'progress-fill',
            style: `width: ${progress}%`
          }),
          el('span', { 
            className: 'progress-text',
            textContent: `${progress}%`
          })
        ])
      ])
    ]);

    // Add drag and drop event listeners
    this.setupProjectDragAndDrop(projectEl, project);

    // Queue for progress update if not cached
    if (!cachedProgress) {
      progressManager.forceRefreshProject(project.id);
    }

    return projectEl;
  }

  async openProject(projectId) {
    try {
      stateManager.setLoading(true);
      const response = await apiService.getProject(projectId);
      stateManager.setCurrentProject(response.project);
      stateManager.setTasks(response.tasks || []);
      
      this.showProjectPage(response.project);
      eventBus.emit(EVENTS.PROJECT_SELECTED, response.project);
    } catch (error) {
      console.error('Failed to open project:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  showProjectPage(project) {
    this.projectsDashboard.hidden = true;
    this.projectPage.hidden = false;
    
    $('#projectTitle').textContent = project.title;
    this.updateProjectStats(project);
  }

  showProjectsDashboard() {
    this.projectPage.hidden = true;
    this.projectsDashboard.hidden = false;
    stateManager.setCurrentProject(null);
    
    // Refresh projects to ensure progress bars are up to date
    this.loadProjects();
    
    // Also update progress bars after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.updateAllProgressBars();
    }, 100);
  }

  showProjectModal() {
    this.projectModal.hidden = false;
    $('#projectFormTitle').focus();
  }

  hideProjectModal() {
    this.projectModal.hidden = true;
    this.projectForm.reset();
    this.currentEditingProject = null;
    
    // Reset modal title and button text
    $('#projectModal h3').textContent = 'Create New Project';
    $('#projectForm button[type="submit"]').textContent = 'Create Project';
  }

  editProject() {
    const currentProject = stateManager.getState().currentProject;
    if (!currentProject) return;

    // Populate the form with current project data
    $('#projectFormTitle').value = currentProject.title;
    $('#projectFormDescription').value = currentProject.description || '';
    $('#projectFormQuadrant').value = currentProject.quadrant || '';
    
    // Update modal title and button text
    $('#projectModal h3').textContent = 'Edit Project';
    $('#projectForm button[type="submit"]').textContent = 'Update Project';
    
    // Store the current project ID for updating
    this.currentEditingProject = currentProject;
    
    this.showProjectModal();
  }

  async deleteProject() {
    const currentProject = stateManager.getState().currentProject;
    if (!currentProject) return;

    if (!confirm(`Are you sure you want to delete "${currentProject.title}"? This will also delete all associated tasks.`)) {
      return;
    }

    try {
      stateManager.setLoading(true);
      await apiService.deleteProject(currentProject.id);
      
      // Go back to projects dashboard
      this.showProjectsDashboard();
      
      eventBus.emit(EVENTS.PROJECT_DELETED, currentProject.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  async handleCreateProject(e) {
    e.preventDefault();
    
    const title = $('#projectFormTitle').value.trim();
    const description = $('#projectFormDescription').value.trim();
    const quadrant = $('#projectFormQuadrant').value;
    
    if (!title) {
      alert('Project title is required');
      return;
    }

    if (!quadrant) {
      alert('Please select a priority quadrant');
      return;
    }

    try {
      stateManager.setLoading(true);
      
      if (this.currentEditingProject) {
        // Update existing project
        const response = await apiService.updateProject(this.currentEditingProject.id, {
          title,
          description,
          quadrant
        });
        
        this.hideProjectModal();
        this.currentEditingProject = null;
        
        // Reset modal title and button text
        $('#projectModal h3').textContent = 'Create New Project';
        $('#projectForm button[type="submit"]').textContent = 'Create Project';
        
        eventBus.emit(EVENTS.PROJECT_UPDATED, response.project);
      } else {
        // Create new project
        const response = await apiService.createProject(title, description, quadrant);
        
        this.hideProjectModal();
        eventBus.emit(EVENTS.PROJECT_CREATED, response.project);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  calculateProjectProgress(project) {
    // Get current tasks from state manager for real-time progress
    const currentState = stateManager.getState();
    const currentProject = currentState.currentProject;
    
    // Use current project tasks if available, otherwise use project tasks
    const tasks = (currentProject && currentProject.id === project.id) ? 
      currentState.tasks : (project.tasks || []);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  async calculateProjectProgressWithFreshData(project) {
    try {
      // Get fresh task data for this project
      const response = await apiService.getTasksByProject(project.id);
      const tasks = response.tasks || [];
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Done').length;
      
      return {
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks
      };
    } catch (error) {
      console.error('Failed to get fresh task data for project:', project.id, error);
      // Fallback to cached data
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Done').length;
      
      return {
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalTasks,
        completedTasks
      };
    }
  }

  updateProjectStats(project) {
    const currentState = stateManager.getState();
    const tasks = currentState.tasks || [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    $('#totalTasks').textContent = totalTasks;
    $('#completedTasks').textContent = completedTasks;
    $('#progressText').textContent = `${progress}%`;
    $('#progressFill').style.width = `${progress}%`;
  }

  async updateProjectProgressAsync(projectElement, project) {
    try {
      const progressData = await this.calculateProjectProgressWithFreshData(project);
      
      const progressFill = projectElement.querySelector('.progress-fill');
      const progressText = projectElement.querySelector('.progress-text');
      const taskCount = projectElement.querySelector('.task-count');
      
      if (progressFill) {
        progressFill.style.width = `${progressData.progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${progressData.progress}%`;
      }
      if (taskCount) {
        taskCount.textContent = `${progressData.totalTasks} tasks`;
      }
    } catch (error) {
      console.error('Failed to update project progress:', error);
    }
  }

  updateAllProgressBars() {
    // Update Eisenhower Box project progress bars
    const currentState = stateManager.getState();
    const projects = currentState.projects || [];
    
    projects.forEach(project => {
      const projectElement = document.querySelector(`[data-project-id="${project.id}"]`);
      if (projectElement) {
        // Use async update for fresh data
        this.updateProjectProgressAsync(projectElement, project);
      }
    });
    
    // Update project page progress bar if we're on a project page
    const currentProject = currentState.currentProject;
    if (currentProject && this.projectPage && !this.projectPage.hidden) {
      this.updateProjectStats(currentProject);
    }
  }

  setupProjectDragAndDrop(projectEl, project) {
    let draggedProject = null;
    let dragOverQuadrant = null;

    // Drag start
    projectEl.addEventListener('dragstart', (e) => {
      draggedProject = project;
      projectEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', projectEl.outerHTML);
      
      // Add visual feedback
      projectEl.style.opacity = '0.5';
      projectEl.style.transform = 'rotate(5deg)';
      
      // Add drag preview
      const dragImage = projectEl.cloneNode(true);
      dragImage.style.transform = 'rotate(5deg)';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    });

    // Drag end
    projectEl.addEventListener('dragend', (e) => {
      projectEl.classList.remove('dragging');
      projectEl.style.opacity = '';
      projectEl.style.transform = '';
      draggedProject = null;
      dragOverQuadrant = null;
      
      // Remove dragover class from all quadrants
      $$('.eisenhower-quadrant').forEach(quadrant => {
        quadrant.classList.remove('dragover');
        quadrant.style.backgroundColor = '';
        quadrant.style.border = '';
      });
    });

    // Setup drop zones (quadrants)
    $$('.eisenhower-quadrant').forEach(quadrant => {
      quadrant.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Remove previous dragover
        $$('.eisenhower-quadrant').forEach(quad => {
          quad.classList.remove('dragover');
          quad.style.backgroundColor = '';
          quad.style.border = '';
        });
        
        // Add dragover to current quadrant
        quadrant.classList.add('dragover');
        dragOverQuadrant = quadrant;
        
        // Add visual feedback
        quadrant.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        quadrant.style.border = '2px dashed #007bff';
      });

      quadrant.addEventListener('dragleave', (e) => {
        // Only remove if we're actually leaving the quadrant
        if (!quadrant.contains(e.relatedTarget)) {
          quadrant.classList.remove('dragover');
          quadrant.style.backgroundColor = '';
          quadrant.style.border = '';
        }
      });

      quadrant.addEventListener('drop', async (e) => {
        e.preventDefault();
        quadrant.classList.remove('dragover');
        quadrant.style.backgroundColor = '';
        quadrant.style.border = '';
        
        if (draggedProject) {
          const newQuadrant = quadrant.getAttribute('data-quadrant');
          if (newQuadrant && newQuadrant !== project.quadrant) {
            // Optimistic update - immediate UI feedback
            this.updateProjectQuadrantOptimistic(project.id, newQuadrant);
          }
        }
      });
    });
  }

  // Optimistic update for project quadrant
  updateProjectQuadrantOptimistic(projectId, newQuadrant) {
    // Update state immediately
    const updatedProject = stateManager.optimisticUpdateProjectQuadrant(projectId, newQuadrant);
    if (!updatedProject) {
      console.error('Failed to update project in state');
      return;
    }

    // Move project visually in DOM immediately
    this.moveProjectInDOM(projectId, newQuadrant);
    
    // Add to sync queue for background update
    stateManager.addToSyncQueue({
      key: `project-${projectId}`,
      type: 'project-quadrant',
      projectId,
      newQuadrant
    });
    
    // Emit event for other components
    eventBus.emit(EVENTS.PROJECT_UPDATED, updatedProject);
  }

  // Move project in DOM without reloading
  moveProjectInDOM(projectId, newQuadrant) {
    const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
    if (!projectElement) return;

    const targetQuadrant = document.querySelector(`#${newQuadrant}-projects`);
    if (!targetQuadrant) return;

    // Remove from current position
    projectElement.remove();
    
    // Add to new position with animation
    projectElement.style.opacity = '0';
    projectElement.style.transform = 'scale(0.8)';
    targetQuadrant.appendChild(projectElement);
    
    // Animate in
    requestAnimationFrame(() => {
      projectElement.style.transition = 'all 0.3s ease';
      projectElement.style.opacity = '1';
      projectElement.style.transform = 'scale(1)';
    });
  }

  // Legacy method for backward compatibility
  async updateProjectQuadrant(projectId, quadrant) {
    this.updateProjectQuadrantOptimistic(projectId, quadrant);
  }

  setupProgressBarRefresh() {
    // Refresh progress bars every 30 seconds when on Eisenhower Box dashboard
    this.progressRefreshInterval = setInterval(() => {
      if (this.projectsDashboard && !this.projectsDashboard.hidden) {
        this.updateAllProgressBars();
      }
    }, 30000); // 30 seconds
  }

  truncateDescription(description, maxLength = 120) {
    if (!description || description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  // Cleanup method
  destroy() {
    if (this.progressRefreshInterval) {
      clearInterval(this.progressRefreshInterval);
    }
  }
}
