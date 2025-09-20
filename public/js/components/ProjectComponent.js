// Project management component
import { $, $$, el } from '../core/utils.js';
import { apiService } from '../services/api.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';
import { QUADRANTS } from '../core/constants.js';

export class ProjectComponent {
  constructor() {
    this.projectsDashboard = $('#projectsDashboard');
    this.projectPage = $('#projectPage');
    this.newProjectBtn = $('#newProjectBtn');
    this.backToProjectsBtn = $('#backToProjects');
    this.projectModal = $('#projectModal');
    this.projectForm = $('#projectForm');
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.loadProjects();
  }

  setupEventListeners() {
    this.newProjectBtn.addEventListener('click', () => this.showProjectModal());
    this.backToProjectsBtn.addEventListener('click', () => this.showProjectsDashboard());
    this.projectForm.addEventListener('submit', (e) => this.handleCreateProject(e));
    
    // Modal controls
    $('#closeProjectModal').addEventListener('click', () => this.hideProjectModal());
    $('#cancelProject').addEventListener('click', () => this.hideProjectModal());
    
    // Listen for events
    eventBus.on(EVENTS.PROJECT_CREATED, () => this.loadProjects());
    eventBus.on(EVENTS.PROJECT_DELETED, () => this.loadProjects());
  }

  async loadProjects() {
    try {
      stateManager.setLoading(true);
      const response = await apiService.getProjects();
      stateManager.setProjects(response.projects);
      this.renderProjects(response.projects);
      eventBus.emit(EVENTS.PROJECTS_LOADED, response.projects);
    } catch (error) {
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
            textContent: `${project.totalTasks || 0} tasks` 
          })
        ])
      ]),
      el('p', { 
        className: 'project-description',
        textContent: this.truncateDescription(project.description || 'No description')
      }),
      el('div', { className: 'project-progress' }, [
        el('div', { className: 'progress-bar' }, [
          el('div', { 
            className: 'progress-fill',
            style: `width: ${project.progress || 0}%`
          }),
          el('span', { 
            className: 'progress-text',
            textContent: `${project.progress || 0}%`
          })
        ])
      ])
    ]);

    // Add drag and drop event listeners
    this.setupProjectDragAndDrop(projectEl, project);

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
  }

  showProjectModal() {
    this.projectModal.hidden = false;
    $('#projectFormTitle').focus();
  }

  hideProjectModal() {
    this.projectModal.hidden = true;
    this.projectForm.reset();
  }

  async handleCreateProject(e) {
    e.preventDefault();
    
    const title = $('#projectFormTitle').value.trim();
    const description = $('#projectFormDescription').value.trim();
    const quadrant = 'not-urgent-not-important'; // Default quadrant
    
    if (!title) {
      alert('Project title is required');
      return;
    }

    try {
      stateManager.setLoading(true);
      const response = await apiService.createProject(title, description, quadrant);
      
      this.hideProjectModal();
      eventBus.emit(EVENTS.PROJECT_CREATED, response.project);
    } catch (error) {
      console.error('Failed to create project:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  updateProjectStats(project) {
    const totalTasks = project.tasks ? project.tasks.length : 0;
    const completedTasks = project.tasks ? project.tasks.filter(t => t.status === 'Done').length : 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    $('#totalTasks').textContent = totalTasks;
    $('#completedTasks').textContent = completedTasks;
    $('#progressText').textContent = `${progress}%`;
    $('#progressFill').style.width = `${progress}%`;
  }

  setupProjectDragAndDrop(projectEl, project) {
    let draggedProject = null;

    // Drag start
    projectEl.addEventListener('dragstart', (e) => {
      draggedProject = project;
      projectEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', projectEl.outerHTML);
    });

    // Drag end
    projectEl.addEventListener('dragend', (e) => {
      projectEl.classList.remove('dragging');
      draggedProject = null;
      // Remove dragover class from all quadrants
      $$('.eisenhower-quadrant').forEach(quadrant => {
        quadrant.classList.remove('dragover');
      });
    });

    // Setup drop zones (quadrants)
    $$('.eisenhower-quadrant').forEach(quadrant => {
      quadrant.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        quadrant.classList.add('dragover');
      });

      quadrant.addEventListener('dragleave', (e) => {
        quadrant.classList.remove('dragover');
      });

      quadrant.addEventListener('drop', async (e) => {
        e.preventDefault();
        quadrant.classList.remove('dragover');
        
        if (draggedProject && draggedProject.id !== project.id) {
          const newQuadrant = quadrant.getAttribute('data-quadrant');
          if (newQuadrant && newQuadrant !== project.quadrant) {
            try {
              await this.updateProjectQuadrant(project.id, newQuadrant);
            } catch (error) {
              console.error('Failed to update project quadrant:', error);
              eventBus.emit(EVENTS.ERROR_OCCURRED, error);
            }
          }
        }
      });
    });
  }

  async updateProjectQuadrant(projectId, quadrant) {
    try {
      stateManager.setLoading(true);
      const response = await apiService.updateProjectQuadrant(projectId, quadrant);
      
      // Reload projects to reflect the change
      await this.loadProjects();
      eventBus.emit(EVENTS.PROJECT_UPDATED, response.project);
    } catch (error) {
      console.error('Failed to update project quadrant:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  truncateDescription(description, maxLength = 120) {
    if (!description || description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength).trim() + '...';
  }
}
