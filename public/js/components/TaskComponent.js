// Task management component
import { $, $$, el } from '../core/utils.js';
import { apiService } from '../services/api.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';
import { PRIORITIES, TASK_STATUS } from '../core/constants.js';

export class TaskComponent {
  constructor() {
    this.tasksContainer = $('#tasksContainer');
    this.newTaskForm = $('#newTaskForm');
    this.taskModal = $('#taskModal');
    this.taskForm = $('#taskForm');
    this.subtaskModal = $('#subtaskModal');
    this.subtaskForm = $('#subtaskForm');
    this.currentEditingTask = null;
    this.currentEditingSubtask = null;
    this.currentParentTaskId = null;
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    // Don't load tasks immediately - wait for project selection
  }

  setupEventListeners() {
    this.newTaskForm.addEventListener('submit', (e) => this.handleCreateTask(e));
    this.taskForm.addEventListener('submit', (e) => this.handleUpdateTask(e));
    this.subtaskForm.addEventListener('submit', (e) => this.handleCreateSubtask(e));
    
    // Modal controls
    $('#closeTaskModal').addEventListener('click', () => this.hideTaskModal());
    $('#cancelTask').addEventListener('click', () => this.hideTaskModal());
    $('#closeSubtaskModal').addEventListener('click', () => this.hideSubtaskModal());
    $('#cancelSubtask').addEventListener('click', () => this.hideSubtaskModal());
    
    // Filters
    $('#statusFilter').addEventListener('change', () => this.loadTasks());
    $('#priorityFilter').addEventListener('change', () => this.loadTasks());
    $('#sortBy').addEventListener('change', () => this.loadTasks());
    
    // Setup drag and drop for kanban columns (only once)
    this.setupKanbanDropZones();
    
    // Listen for events
    eventBus.on(EVENTS.PROJECT_SELECTED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_CREATED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_UPDATED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_DELETED, () => this.loadTasks());
    
    // Listen for task status changes to update project progress
    eventBus.on(EVENTS.TASK_STATUS_CHANGED, () => this.updateProjectProgress());
  }

  async loadTasks() {
    const currentProject = stateManager.getState().currentProject;
    if (!currentProject) return;

    try {
      stateManager.setLoading(true);
      
      const filters = {
        status: $('#statusFilter').value,
        priority: $('#priorityFilter').value,
        sortBy: $('#sortBy').value
      };
      
      const response = await apiService.getTasksByProject(currentProject.id, filters);
      
      console.log('Loaded tasks:', response.tasks);
      console.log('First task dueDate:', response.tasks[0]?.dueDate);
      
      stateManager.setTasks(response.tasks);
      this.renderTasks(response.tasks);
      eventBus.emit(EVENTS.TASKS_LOADED, response.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  renderTasks(tasks) {
    console.log('Rendering tasks:', tasks);
    
    // Clear existing tasks
    const columns = {
      'To Do': $('#list-todo'),
      'In Progress': $('#list-progress'),
      'Done': $('#list-done')
    };

    Object.values(columns).forEach(column => {
      if (column) column.innerHTML = '';
    });

    // Filter out subtasks - only render parent tasks
    const parentTasks = tasks.filter(task => !task.parentTaskId);
    console.log('Parent tasks to render:', parentTasks);

    // Render each parent task with its subtasks
    parentTasks.forEach(task => {
      const taskSubtasks = task.subtasks || [];
      const taskElement = this.createTaskElement(task, taskSubtasks);
      const column = columns[task.status];
      if (column) {
        // Find the task list within the column and insert at the top
        const taskList = column.querySelector('.task-list');
        if (taskList) {
          taskList.insertBefore(taskElement, taskList.firstChild);
        } else {
          // Fallback to appendChild if task list not found
          column.appendChild(taskElement);
        }
      }
    });
  }

  createTaskElement(task, subtasks = []) {
    console.log('Creating task element for:', task.title, 'dueDate:', task.dueDate);
    
    const isSubtask = task.parentTaskId !== null;
    const children = [
      el('div', { className: 'task-header' }, [
        el('div', { className: 'task-main' }, [
          el('div', { className: 'task-title-row' }, [
            el('h4', { 
              className: 'task-title',
              textContent: task.title 
            }),
            el('div', { className: 'task-meta-inline' }, [
              el('span', { 
                className: `priority-dot priority-${task.priority.toLowerCase()}`,
                title: task.priority
              })
            ])
          ]),
          task.dueDate ? (() => {
            console.log('Task has dueDate:', task.dueDate, 'calculating remaining time...');
            const remainingTime = this.formatRemainingTime(task.dueDate);
            console.log('Remaining time result:', remainingTime);
            return remainingTime ? el('div', { 
              className: `remaining-time ${remainingTime.urgent ? 'urgent' : ''}`,
              textContent: remainingTime.text,
              title: `Due: ${this.formatDueDate(task.dueDate)}`
            }) : null;
          })() : null,
          task.description ? el('p', { 
            className: 'task-description',
            textContent: task.description 
          }) : null
        ]),
        el('div', { className: 'task-actions' }, [
          el('button', {
            className: 'btn-icon',
            title: 'Edit task',
            onclick: () => this.editTask(task)
          }, [
            el('span', { className: 'icon-text', textContent: '✎' })
          ]),
          el('button', {
            className: 'btn-icon add-subtask',
            title: 'Add subtask',
            onclick: () => {
              this.addSubtask(task.id);
            }
          }, [
            el('span', { className: 'icon-text', textContent: '+' })
          ]),
          el('button', {
            className: 'btn-icon danger',
            title: 'Delete task',
            onclick: () => this.deleteTask(task.id)
          }, [
            el('span', { className: 'icon-text', textContent: '×' })
          ])
        ])
      ])
    ];

    // Add subtasks section for parent tasks only if they have subtasks
    if (!isSubtask && subtasks.length > 0) {
      // Calculate subtask completion stats
      const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
      const subtaskProgress = Math.round((completedSubtasks / subtasks.length) * 100);
      
      const subtaskElements = subtasks.map(subtask => {
        const checkbox = el('input', {
          type: 'checkbox',
          className: 'subtask-checkbox',
          checked: subtask.completed || false,
          'data-subtask-id': subtask.id,
          'data-subtask-title': subtask.title,
          'data-subtask-completed': subtask.completed
        });

        const subtaskElement = el('div', { className: 'subtask-item' }, [
          checkbox,
          el('span', { 
            className: `subtask-title ${subtask.completed ? 'completed' : ''}`,
            textContent: subtask.title,
            title: subtask.title // Show full title on hover
          }),
          el('div', { className: 'subtask-meta' }, [
            el('span', { 
              className: `priority-dot priority-${subtask.priority.toLowerCase()}`,
              title: subtask.priority
            })
          ]),
          subtask.dueDate ? (() => {
            const remainingTime = this.formatRemainingTime(subtask.dueDate);
            return remainingTime ? el('div', { 
              className: `subtask-remaining-time ${remainingTime.urgent ? 'urgent' : ''}`,
              textContent: remainingTime.text,
              title: `Due: ${this.formatDueDate(subtask.dueDate)}`
            }) : null;
          })() : null,
          el('div', { className: 'subtask-actions' }, [
            el('button', {
              className: 'btn-icon small',
              title: 'Edit subtask',
              onclick: () => this.editSubtask(subtask)
            }, [
              el('span', { className: 'icon-text', textContent: '✎' })
            ]),
            el('button', {
              className: 'btn-icon small danger',
              title: 'Delete subtask',
              onclick: () => this.deleteSubtask(subtask.id)
            }, [
              el('span', { className: 'icon-text', textContent: '×' })
            ])
          ])
        ]);

        // Add event listeners after element creation
        checkbox.addEventListener('change', (e) => {
          // Prevent multiple rapid clicks
          if (e.target.disabled) {
            return;
          }
          
          e.target.disabled = true;
          
          this.toggleSubtaskCompletion(subtask.id, e.target.checked).finally(() => {
            e.target.disabled = false;
          });
        });

        return subtaskElement;
      });
      
      const subtasksSection = el('div', { className: 'subtasks-section' }, [
        el('div', { className: 'subtasks-header' }, [
          el('div', { className: 'subtasks-info' }, [
            el('span', { className: 'subtasks-count', textContent: `${completedSubtasks}/${subtasks.length} completed` }),
            el('div', { className: 'subtask-progress-bar' }, [
              el('div', { 
                className: 'subtask-progress-fill',
                style: `width: ${subtaskProgress}%`
              })
            ])
          ]),
          el('button', {
            className: 'btn-icon small',
            title: 'Add subtask',
            onclick: () => this.addSubtask(task.id)
          }, [
            el('span', { className: 'icon-text', textContent: '+' })
          ])
        ]),
        el('div', { className: 'subtasks-list' }, subtaskElements)
      ]);
      
      children.push(subtasksSection);
    }

    const taskEl = el('li', {
      className: 'task-item',
      'data-task-id': task.id,
      'data-parent-id': task.parentTaskId,
      draggable: 'true'
    }, children);

    // Add drag and drop event listeners
    this.setupTaskDragAndDrop(taskEl, task);

    return taskEl;
  }

  async handleCreateTask(e) {
    e.preventDefault();
    
    const currentProject = stateManager.getState().currentProject;
    if (!currentProject) return;

    const title = $('#newTaskTitle').value.trim();
    const priority = $('#newTaskPriority').value;
    const dueDate = this.normalizeDueDate($('#newTaskDueDate').value);
    
    console.log('Creating task with dueDate:', dueDate);

    if (!title) {
      alert('Task title is required');
      return;
    }

    try {
      stateManager.setLoading(true);
      const response = await apiService.createTask(
        currentProject.id,
        title,
        '',
        priority,
        TASK_STATUS.TO_DO,
        dueDate
      );
      
      this.newTaskForm.reset();
      eventBus.emit(EVENTS.TASK_CREATED, response.task);
      this.updateProjectProgress();
    } catch (error) {
      console.error('Failed to create task:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  async handleUpdateTask(e) {
    e.preventDefault();
    
    if (!this.currentEditingTask) return;

    const title = $('#taskTitle').value.trim();
    const description = $('#taskDescription').value.trim();
    const priority = $('#taskPriority').value;
    const status = $('#taskStatus').value;
    const dueDate = this.normalizeDueDate($('#taskDueDate').value);
    
    console.log('Updating task with dueDate:', dueDate);

    if (!title) {
      alert('Task title is required');
      return;
    }

    try {
      stateManager.setLoading(true);
      const response = await apiService.updateTask(this.currentEditingTask.id, {
        title,
        description,
        priority,
        status,
        dueDate
      });
      
      console.log('Task update response:', response);
      console.log('Updated task dueDate:', response.task?.dueDate);
      
      this.hideTaskModal();
      eventBus.emit(EVENTS.TASK_UPDATED, response.task);
      this.updateProjectProgress();
    } catch (error) {
      console.error('Failed to update task:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  editTask(task) {
    this.currentEditingTask = task;
    
    $('#taskTitle').value = task.title;
    $('#taskDescription').value = task.description || '';
    $('#taskPriority').value = task.priority;
    $('#taskStatus').value = task.status;
    
    // Format due date for HTML date input (YYYY-MM-DD)
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      if (!isNaN(date.getTime())) {
        $('#taskDueDate').value = date.toISOString().split('T')[0];
      } else {
        $('#taskDueDate').value = '';
      }
    } else {
      $('#taskDueDate').value = '';
    }
    
    this.showTaskModal();
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      stateManager.setLoading(true);
      await apiService.deleteTask(taskId);
      eventBus.emit(EVENTS.TASK_DELETED, taskId);
      this.updateProjectProgress();
    } catch (error) {
      console.error('Failed to delete task:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  async deleteSubtask(subtaskId) {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      stateManager.setLoading(true);
      await apiService.deleteTask(subtaskId);
      eventBus.emit(EVENTS.TASK_DELETED, subtaskId);
      this.updateProjectProgress();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }


  updateSubtaskInLocalState(subtaskId, newCompleted) {
    // Get current tasks from state manager
    const currentState = stateManager.getState();
    const tasks = currentState.tasks;
    
    // Find and update the subtask in the current tasks array
    if (tasks && Array.isArray(tasks)) {
      let updated = false;
      const updatedTasks = tasks.map(task => {
        if (task.subtasks && Array.isArray(task.subtasks)) {
          const updatedSubtasks = task.subtasks.map(subtask => {
            if (subtask.id === subtaskId) {
              updated = true;
              return { ...subtask, completed: newCompleted };
            }
            return subtask;
          });
          
          if (updated) {
            return { ...task, subtasks: updatedSubtasks };
          }
        }
        return task;
      });
      
      if (updated) {
        // Update the state manager with the modified tasks
        stateManager.setTasks(updatedTasks);
      }
      
      // Update the checkbox in the DOM directly
      const checkbox = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
      if (checkbox) {
        checkbox.checked = newCompleted;
        
        // Update the subtask title styling
        const titleElement = checkbox.parentElement.querySelector('.subtask-title');
        if (titleElement) {
          if (newCompleted) {
            titleElement.classList.add('completed');
          } else {
            titleElement.classList.remove('completed');
          }
        }
      } else {
        console.warn(`Could not find checkbox for subtask ${subtaskId}`);
      }
    }
  }

  // Optimistic subtask completion toggle
  toggleSubtaskCompletionOptimistic(subtaskId, completed) {
    // Update state immediately
    const success = stateManager.optimisticUpdateSubtaskCompletion(subtaskId, completed);
    if (!success) {
      console.error(`Failed to update subtask ${subtaskId} in state`);
      return;
    }

    // Update DOM immediately
    this.updateSubtaskInLocalState(subtaskId, completed);
    
    // Add to sync queue for background update
    stateManager.addToSyncQueue({
      key: `subtask-${subtaskId}`,
      type: 'subtask-completion',
      subtaskId,
      completed
    });
    
    // Emit event to notify other components
    eventBus.emit(EVENTS.TASK_STATUS_CHANGED, { id: subtaskId, completed });
  }

  // Legacy method for backward compatibility
  async toggleSubtaskCompletion(subtaskId, completed) {
    this.toggleSubtaskCompletionOptimistic(subtaskId, completed);
  }

  showTaskModal() {
    this.taskModal.hidden = false;
    $('#taskTitle').focus();
  }

  hideTaskModal() {
    this.taskModal.hidden = true;
    this.taskForm.reset();
    this.currentEditingTask = null;
  }

  setupKanbanDropZones() {
    let draggedTask = null;

    // Setup drop zones (kanban columns) - only once
    $$('.kanban-column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Remove previous dragover
        $$('.kanban-column').forEach(col => col.classList.remove('dragover'));
        
        // Add dragover to current column
        column.classList.add('dragover');
        
        // Add visual feedback
        column.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        column.style.border = '2px dashed #007bff';
      });

      column.addEventListener('dragleave', (e) => {
        // Only remove if we're actually leaving the column
        // Check if relatedTarget exists and is not contained within the column
        if (!e.relatedTarget || !column.contains(e.relatedTarget)) {
          column.classList.remove('dragover');
          column.style.backgroundColor = '';
          column.style.border = '';
        }
      });

      column.addEventListener('drop', async (e) => {
        e.preventDefault();
        column.classList.remove('dragover');
        column.style.backgroundColor = '';
        column.style.border = '';
        
        if (this.draggedTask) {
          const newStatus = column.getAttribute('data-status');
          if (newStatus && newStatus !== this.draggedTask.status) {
            // Optimistic update - immediate UI feedback
            this.updateTaskStatusOptimistic(this.draggedTask.id, newStatus);
          }
        }
      });
    });

    // Store reference to draggedTask for use in drop handlers
    this.draggedTask = null;
    
    // Global drag start handler
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('task-item')) {
        const taskId = e.target.getAttribute('data-task-id');
        if (taskId) {
          // Find the task data from current state
          const currentState = stateManager.getState();
          const task = currentState.tasks.find(t => t.id == taskId);
          if (task) {
            this.draggedTask = task;
          }
        }
      }
    });

    // Global drag end handler
    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('task-item')) {
        // Remove dragover class from all columns
        $$('.kanban-column').forEach(column => {
          column.classList.remove('dragover');
          column.style.backgroundColor = '';
          column.style.border = '';
        });
        this.draggedTask = null;
      }
    });
  }

  setupTaskDragAndDrop(taskEl, task) {
    // Only setup drag start for individual tasks
    taskEl.addEventListener('dragstart', (e) => {
      taskEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', taskEl.outerHTML);
      
      // Add visual feedback
      taskEl.style.opacity = '0.5';
      taskEl.style.transform = 'rotate(5deg)';
      
      // Add drag preview
      const dragImage = taskEl.cloneNode(true);
      dragImage.style.transform = 'rotate(5deg)';
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    });

    taskEl.addEventListener('dragend', (e) => {
      taskEl.classList.remove('dragging');
      taskEl.style.opacity = '';
      taskEl.style.transform = '';
    });
  }

  // Optimistic update for task status
  updateTaskStatusOptimistic(taskId, newStatus) {
    // Update state immediately
    const updatedTask = stateManager.optimisticUpdateTaskStatus(taskId, newStatus);
    if (!updatedTask) {
      console.error('Failed to update task in state');
      return;
    }

    // Move task visually in DOM immediately
    this.moveTaskInDOM(taskId, newStatus);
    
    // Add to sync queue for background update
    stateManager.addToSyncQueue({
      key: `task-${taskId}`,
      type: 'task-status',
      taskId,
      newStatus
    });

    // If task is moved to "Done", auto-complete all its subtasks
    if (newStatus === 'Done') {
      this.autoCompleteSubtasksOptimistic(taskId);
    }
    
    // Emit event for other components
    eventBus.emit(EVENTS.TASK_STATUS_CHANGED, updatedTask);
  }

  // Move task in DOM without reloading
  moveTaskInDOM(taskId, newStatus) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    const targetColumn = document.querySelector(`[data-status="${newStatus}"]`);
    if (!targetColumn) return;

    // Find the task list within the target column
    const taskList = targetColumn.querySelector('.task-list');
    if (!taskList) return;

    // Remove from current position
    taskElement.remove();
    
    // Add to new position with animation - insert at the top of the task list
    taskElement.style.opacity = '0';
    taskElement.style.transform = 'scale(0.8)';
    taskList.insertBefore(taskElement, taskList.firstChild);
    
    // Animate in
    requestAnimationFrame(() => {
      taskElement.style.transition = 'all 0.3s ease';
      taskElement.style.opacity = '1';
      taskElement.style.transform = 'scale(1)';
    });
  }

  // Legacy method for backward compatibility
  async updateTaskStatus(taskId, status) {
    this.updateTaskStatusOptimistic(taskId, status);
  }

  // Optimistic auto-complete subtasks
  autoCompleteSubtasksOptimistic(parentTaskId) {
    // Get current tasks from state manager
    const currentState = stateManager.getState();
    const tasks = currentState.tasks;
    
    // Find the parent task and its subtasks
    const parentTask = tasks.find(task => task.id === parentTaskId);
    if (!parentTask || !parentTask.subtasks || parentTask.subtasks.length === 0) {
      return;
    }
    
    // Auto-complete all subtasks that are not already completed
    const incompleteSubtasks = parentTask.subtasks.filter(subtask => !subtask.completed);
    
    // Update each incomplete subtask optimistically
    incompleteSubtasks.forEach(subtask => {
      // Update state immediately
      stateManager.optimisticUpdateSubtaskCompletion(subtask.id, true);
      
      // Add to sync queue for background update
      stateManager.addToSyncQueue({
        key: `subtask-${subtask.id}`,
        type: 'subtask-completion',
        subtaskId: subtask.id,
        completed: true
      });
    });
  }

  // Legacy method for backward compatibility
  async autoCompleteSubtasks(parentTaskId) {
    this.autoCompleteSubtasksOptimistic(parentTaskId);
  }

  addSubtask(parentTaskId) {
    this.currentParentTaskId = parentTaskId;
    this.currentEditingSubtask = null;
    this.showSubtaskModal();
  }

  editSubtask(subtask) {
    this.currentEditingSubtask = subtask;
    this.currentParentTaskId = subtask.parentTaskId;
    
    // Populate the form with existing subtask data
    $('#subtaskTitle').value = subtask.title;
    $('#subtaskDescription').value = subtask.description || '';
    $('#subtaskPriority').value = subtask.priority;
    
    // Format due date for HTML date input (YYYY-MM-DD)
    if (subtask.dueDate) {
      const date = new Date(subtask.dueDate);
      if (!isNaN(date.getTime())) {
        $('#subtaskDueDate').value = date.toISOString().split('T')[0];
      } else {
        $('#subtaskDueDate').value = '';
      }
    } else {
      $('#subtaskDueDate').value = '';
    }
    
    // Update modal title
    $('#subtaskModal h3').textContent = 'Edit Subtask';
    $('#subtaskForm button[type="submit"]').textContent = 'Update Subtask';
    
    this.showSubtaskModal();
  }

  async handleCreateSubtask(e) {
    e.preventDefault();
    
    if (!this.currentParentTaskId) {
      console.error('No parent task ID set');
      return;
    }

    const title = $('#subtaskTitle').value.trim();
    const description = $('#subtaskDescription').value.trim();
    const priority = $('#subtaskPriority').value;
    const dueDate = this.normalizeDueDate($('#subtaskDueDate').value);
    
    console.log('Creating/updating subtask with dueDate:', dueDate);

    if (!title) {
      alert('Subtask title is required');
      return;
    }

    const currentProject = stateManager.getState().currentProject;
    if (!currentProject) {
      console.error('No current project');
      return;
    }

    try {
      stateManager.setLoading(true);
      
      if (this.currentEditingSubtask) {
        // Update existing subtask
        const response = await apiService.updateTask(this.currentEditingSubtask.id, {
          title,
          description,
          priority,
          dueDate
        });
        
        this.hideSubtaskModal();
        eventBus.emit(EVENTS.TASK_UPDATED, response.task);
      } else {
        // Create new subtask
        const response = await apiService.createTask(
          currentProject.id,
          title,
          description,
          priority,
          TASK_STATUS.TO_DO,
          dueDate,
          this.currentParentTaskId,
          false // completed: false by default for new subtasks
        );
        
        this.hideSubtaskModal();
        eventBus.emit(EVENTS.TASK_CREATED, response.task);
      }
      
      // Force reload tasks to ensure subtasks appear
      setTimeout(() => {
        this.loadTasks();
        this.updateProjectProgress();
      }, 100);
    } catch (error) {
      console.error('Failed to save subtask:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  showSubtaskModal() {
    this.subtaskModal.hidden = false;
    $('#subtaskTitle').focus();
  }

  hideSubtaskModal() {
    this.subtaskModal.hidden = true;
    this.subtaskForm.reset();
    this.currentParentTaskId = null;
    this.currentEditingSubtask = null;
    
    // Reset modal title and button text
    $('#subtaskModal h3').textContent = 'Add Subtask';
    $('#subtaskForm button[type="submit"]').textContent = 'Add Subtask';
  }

  updateProjectProgress() {
    // Update the project page progress bar when tasks change
    const currentState = stateManager.getState();
    const currentProject = currentState.currentProject;
    const tasks = currentState.tasks || [];
    
    if (currentProject) {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'Done').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Update the project page progress bar
      const progressText = $('#progressText');
      const progressFill = $('#progressFill');
      const totalTasksEl = $('#totalTasks');
      const completedTasksEl = $('#completedTasks');
      
      if (progressText) progressText.textContent = `${progress}%`;
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (totalTasksEl) totalTasksEl.textContent = totalTasks;
      if (completedTasksEl) completedTasksEl.textContent = completedTasks;
    }
  }

  formatDueDate(dueDate) {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue (${Math.abs(diffDays)} days)`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  }

  normalizeDueDate(dueDate) {
    // Convert empty string to null, keep valid dates as is
    if (!dueDate || dueDate.trim() === '') {
      return null;
    }
    return dueDate;
  }

  formatRemainingTime(dueDate) {
    console.log('formatRemainingTime called with:', dueDate, 'Type:', typeof dueDate);
    if (!dueDate) {
      console.log('No dueDate provided, returning null');
      return null;
    }
    
    const date = new Date(dueDate);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('Invalid date provided:', dueDate);
      return null;
    }
    
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    console.log('Date calculation:', { date, now, diffTime, diffDays, diffHours, diffMinutes });
    
    if (diffTime < 0) {
      // Overdue
      const overdueDays = Math.abs(diffDays);
      const overdueHours = Math.abs(diffHours);
      const overdueMinutes = Math.abs(diffMinutes);
      
      if (overdueDays > 0) {
        return { text: `${overdueDays}d overdue`, urgent: true };
      } else if (overdueHours > 0) {
        return { text: `${overdueHours}h overdue`, urgent: true };
      } else {
        return { text: `${overdueMinutes}m overdue`, urgent: true };
      }
    } else if (diffTime === 0) {
      return { text: 'Due now', urgent: true };
    } else if (diffMinutes < 60) {
      return { text: `${diffMinutes}m left`, urgent: diffMinutes <= 30 };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h left`, urgent: diffHours <= 2 };
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d left`, urgent: diffDays <= 1 };
    } else {
      return { text: `${diffDays}d left`, urgent: false };
    }
  }
}
