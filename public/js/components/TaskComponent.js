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
    
    // Listen for events
    eventBus.on(EVENTS.PROJECT_SELECTED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_CREATED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_UPDATED, () => this.loadTasks());
    eventBus.on(EVENTS.TASK_DELETED, () => this.loadTasks());
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
      
      console.log('Loading tasks for project:', currentProject.id, 'with filters:', filters);
      const response = await apiService.getTasksByProject(currentProject.id, filters);
      console.log('API Response:', response);
      console.log('Tasks received:', response.tasks);
      
      // Debug: Log each task and its subtasks
      response.tasks.forEach((task, index) => {
        console.log(`Task ${index + 1}:`, {
          id: task.id,
          title: task.title,
          parent_task_id: task.parent_task_id,
          status: task.status,
          subtasks: task.subtasks || [],
          subtaskCount: (task.subtasks || []).length
        });
        
        // Debug subtasks in detail
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask, subIndex) => {
            console.log(`  Subtask ${subIndex + 1}:`, {
              id: subtask.id,
              title: subtask.title,
              status: subtask.status,
              completed: subtask.completed,
              parent_task_id: subtask.parent_task_id,
              checked: subtask.completed,
              completedType: typeof subtask.completed
            });
          });
        }
      });
      
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
    console.log('renderTasks called with:', tasks);
    
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
    const parentTasks = tasks.filter(task => !task.parent_task_id);
    console.log(`Found ${parentTasks.length} parent tasks to render`);

    // Render each parent task with its subtasks
    parentTasks.forEach(task => {
      const taskSubtasks = task.subtasks || [];
      console.log(`Rendering task ${task.id} with ${taskSubtasks.length} subtasks:`, taskSubtasks);
      const taskElement = this.createTaskElement(task, taskSubtasks);
      const column = columns[task.status];
      if (column) {
        column.appendChild(taskElement);
      }
    });
  }

  createTaskElement(task, subtasks = []) {
    const isSubtask = task.parent_task_id !== null;
    console.log(`Creating task element for task ${task.id} with ${subtasks.length} subtasks:`, subtasks);
    console.log(`Task parent_task_id: ${task.parent_task_id}, isSubtask: ${isSubtask}`);
    const children = [
      el('div', { className: 'task-header' }, [
        el('div', { className: 'task-main' }, [
          el('div', { className: 'task-title-row' }, [
            el('h4', { 
              className: 'task-title',
              textContent: task.title 
            }),
            el('div', { className: 'task-meta-inline' }, [
              task.dueDate ? el('span', { 
                className: 'due-date-inline',
                textContent: this.formatDueDate(task.dueDate)
              }) : null,
              el('span', { 
                className: `priority-dot priority-${task.priority.toLowerCase()}`,
                title: task.priority
              })
            ])
          ]),
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
            el('span', { className: 'icon-text', textContent: '✏' })
          ]),
          el('button', {
            className: 'btn-icon add-subtask',
            title: 'Add subtask',
            onclick: () => {
              console.log('Add subtask clicked for task:', task.id);
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

    // Add subtasks section for parent tasks
    if (!isSubtask) {
      console.log(`Adding subtasks section for parent task ${task.id} with ${subtasks.length} subtasks`);
      console.log(`Subtasks data:`, subtasks);
      
      // Calculate subtask completion stats
      const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
      const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
      console.log(`Subtask stats: ${completedSubtasks}/${subtasks.length} completed (${subtaskProgress}%)`);
      
      const subtaskElements = subtasks.map(subtask => {
        console.log(`Creating subtask element for:`, subtask);
        console.log(`Subtask ${subtask.id} completed: ${subtask.completed}, checked: ${subtask.completed}`);
        
        const checkbox = el('input', {
          type: 'checkbox',
          className: 'subtask-checkbox',
          checked: subtask.completed || false,
          'data-subtask-id': subtask.id,
          'data-subtask-title': subtask.title,
          'data-subtask-completed': subtask.completed
        });

        console.log(`🔍 CHECKBOX CREATED - ID: ${subtask.id}`);
        console.log(`   Completed: ${subtask.completed}`);
        console.log(`   Checked attribute: ${subtask.completed}`);
        console.log(`   Checkbox element:`, checkbox);
        console.log(`   Checkbox.checked property: ${checkbox.checked}`);

        const subtaskElement = el('div', { className: 'subtask-item' }, [
          checkbox,
          el('span', { 
            className: `subtask-title ${subtask.completed ? 'completed' : ''}`,
            textContent: subtask.title 
          }),
          el('div', { className: 'subtask-meta' }, [
            subtask.dueDate ? el('span', { 
              className: 'subtask-due-date',
              textContent: this.formatDueDate(subtask.dueDate)
            }) : null,
            el('span', { 
              className: `priority-dot priority-${subtask.priority.toLowerCase()}`,
              title: subtask.priority
            })
          ])
        ]);

        // Add event listeners after element creation
        checkbox.addEventListener('click', (e) => {
          console.log(`🔘 CHECKBOX CLICKED - ID: ${subtask.id}, Title: ${subtask.title}`);
          console.log(`Before change - Checked: ${e.target.checked}, Completed: ${subtask.completed}`);
        });

        checkbox.addEventListener('change', (e) => {
          console.log(`=== SUBTASK CHECKBOX CHANGED ===`);
          console.log(`Subtask ID: ${subtask.id}`);
          console.log(`Subtask Title: ${subtask.title}`);
          console.log(`Current Completed: ${subtask.completed}`);
          console.log(`Checkbox Checked: ${e.target.checked}`);
          console.log(`New Completed Will Be: ${e.target.checked}`);
          console.log(`Event Target:`, e.target);
          console.log(`Event Type: ${e.type}`);
          
          // Prevent multiple rapid clicks
          if (e.target.disabled) {
            console.log(`❌ Checkbox is disabled, ignoring change`);
            return;
          }
          
          console.log(`✅ Processing checkbox change...`);
          e.target.disabled = true;
          
          this.toggleSubtaskCompletion(subtask.id, e.target.checked).finally(() => {
            console.log(`✅ Checkbox operation completed, re-enabling`);
            e.target.disabled = false;
            console.log(`🔍 CHECKBOX RE-ENABLED - ID: ${subtask.id}, checked: ${e.target.checked}`);
          });
        });

        console.log(`🔍 AFTER EVENT LISTENERS - ID: ${subtask.id}`);
        console.log(`   Checkbox.checked property: ${checkbox.checked}`);
        console.log(`   Checkbox element:`, checkbox);
        
        console.log(`Created subtask element for ${subtask.id}:`, subtaskElement);
        return subtaskElement;
      });
      
      console.log(`Created ${subtaskElements.length} subtask elements`);
      
      const subtasksSection = el('div', { className: 'subtasks-section' }, [
        el('div', { className: 'subtasks-header' }, [
          el('div', { className: 'subtasks-info' }, [
            el('span', { className: 'subtasks-count', textContent: `${completedSubtasks}/${subtasks.length} completed` }),
            subtasks.length > 0 ? el('div', { className: 'subtask-progress-bar' }, [
              el('div', { 
                className: 'subtask-progress-fill',
                style: `width: ${subtaskProgress}%`
              })
            ]) : null
          ]),
          el('button', {
            className: 'btn-icon small',
            title: 'Add subtask',
            onclick: () => this.addSubtask(task.id)
          }, [
            el('span', { className: 'icon-text', textContent: '+' })
          ])
        ]),
        subtasks.length > 0 ? el('div', { className: 'subtasks-list' }, subtaskElements) : el('div', { className: 'subtasks-list empty', textContent: 'No subtasks yet - click + to add one' })
      ]);
      
      console.log(`Created subtasks section:`, subtasksSection);
      children.push(subtasksSection);
    }

    const taskEl = el('li', {
      className: 'task-item',
      'data-task-id': task.id,
      'data-parent-id': task.parent_task_id,
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
    const dueDate = $('#newTaskDueDate').value || null;

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
    const dueDate = $('#taskDueDate').value || null;

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
      
      this.hideTaskModal();
      eventBus.emit(EVENTS.TASK_UPDATED, response.task);
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
    $('#taskDueDate').value = task.dueDate || '';
    
    this.showTaskModal();
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      stateManager.setLoading(true);
      await apiService.deleteTask(taskId);
      eventBus.emit(EVENTS.TASK_DELETED, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }


  updateSubtaskInLocalState(subtaskId, newCompleted) {
    console.log(`🔄 Updating local state for subtask ${subtaskId} to completed: ${newCompleted}`);
    
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
              console.log(`Found subtask ${subtaskId} in task ${task.id}, updating completed from ${subtask.completed} to ${newCompleted}`);
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
        console.log(`✅ Updated state manager with modified tasks`);
      }
      
      // Update the checkbox in the DOM directly
      const checkbox = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
      if (checkbox) {
        console.log(`Updating checkbox for subtask ${subtaskId}, setting checked to: ${newCompleted}`);
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
    
    console.log(`✅ Local state updated for subtask ${subtaskId}`);
  }

  // Optimistic subtask completion toggle
  toggleSubtaskCompletionOptimistic(subtaskId, completed) {
    console.log(`=== OPTIMISTIC SUBTASK UPDATE START ===`);
    console.log(`Subtask ID: ${subtaskId}`);
    console.log(`New completed: ${completed}`);
    
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
    
    console.log(`✅ Optimistic subtask update completed`);
    console.log(`=== OPTIMISTIC SUBTASK UPDATE END ===`);
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

  setupTaskDragAndDrop(taskEl, task) {
    let draggedTask = null;
    let dragOverColumn = null;

    // Drag start
    taskEl.addEventListener('dragstart', (e) => {
      draggedTask = task;
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

    // Drag end
    taskEl.addEventListener('dragend', (e) => {
      taskEl.classList.remove('dragging');
      taskEl.style.opacity = '';
      taskEl.style.transform = '';
      draggedTask = null;
      dragOverColumn = null;
      
      // Remove dragover class from all columns
      $$('.kanban-column').forEach(column => {
        column.classList.remove('dragover');
      });
    });

    // Setup drop zones (kanban columns)
    $$('.kanban-column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Remove previous dragover
        $$('.kanban-column').forEach(col => col.classList.remove('dragover'));
        
        // Add dragover to current column
        column.classList.add('dragover');
        dragOverColumn = column;
        
        // Add visual feedback
        column.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        column.style.border = '2px dashed #007bff';
      });

      column.addEventListener('dragleave', (e) => {
        // Only remove if we're actually leaving the column
        if (!column.contains(e.relatedTarget)) {
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
        
        if (draggedTask) {
          const newStatus = column.getAttribute('data-status');
          if (newStatus && newStatus !== task.status) {
            // Optimistic update - immediate UI feedback
            this.updateTaskStatusOptimistic(task.id, newStatus);
          }
        }
      });
    });
  }

  // Optimistic update for task status
  updateTaskStatusOptimistic(taskId, newStatus) {
    console.log(`Optimistic update: Moving task ${taskId} to ${newStatus}`);
    
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
      console.log(`Task ${taskId} moved to Done, auto-completing all subtasks...`);
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

    // Remove from current position
    taskElement.remove();
    
    // Add to new position with animation
    taskElement.style.opacity = '0';
    taskElement.style.transform = 'scale(0.8)';
    targetColumn.appendChild(taskElement);
    
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
    console.log(`Optimistic auto-completing subtasks for parent task ${parentTaskId}...`);
    
    // Get current tasks from state manager
    const currentState = stateManager.getState();
    const tasks = currentState.tasks;
    
    // Find the parent task and its subtasks
    const parentTask = tasks.find(task => task.id === parentTaskId);
    if (!parentTask || !parentTask.subtasks || parentTask.subtasks.length === 0) {
      console.log(`No subtasks found for parent task ${parentTaskId}`);
      return;
    }
    
    console.log(`Found ${parentTask.subtasks.length} subtasks to auto-complete`);
    
    // Auto-complete all subtasks that are not already completed
    const incompleteSubtasks = parentTask.subtasks.filter(subtask => !subtask.completed);
    console.log(`Found ${incompleteSubtasks.length} incomplete subtasks to complete`);
    
    // Update each incomplete subtask optimistically
    incompleteSubtasks.forEach(subtask => {
      console.log(`Auto-completing subtask ${subtask.id}: ${subtask.title}`);
      
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
    
    console.log(`✅ Auto-completed ${incompleteSubtasks.length} subtasks for parent task ${parentTaskId}`);
  }

  // Legacy method for backward compatibility
  async autoCompleteSubtasks(parentTaskId) {
    this.autoCompleteSubtasksOptimistic(parentTaskId);
  }

  addSubtask(parentTaskId) {
    console.log('addSubtask called with parentTaskId:', parentTaskId);
    this.currentParentTaskId = parentTaskId;
    this.showSubtaskModal();
  }

  async handleCreateSubtask(e) {
    e.preventDefault();
    
    console.log('handleCreateSubtask called with parentTaskId:', this.currentParentTaskId);
    
    if (!this.currentParentTaskId) {
      console.error('No parent task ID set');
      return;
    }

    const title = $('#subtaskTitle').value.trim();
    const description = $('#subtaskDescription').value.trim();
    const priority = $('#subtaskPriority').value;
    const dueDate = $('#subtaskDueDate').value || null;

    console.log('Subtask data:', { title, description, priority, dueDate, parentTaskId: this.currentParentTaskId });

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
      console.log('Calling API to create subtask...');
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
      
      console.log('API response:', response);
      console.log('Created subtask:', response.task);
      this.hideSubtaskModal();
      eventBus.emit(EVENTS.TASK_CREATED, response.task);
      // Force reload tasks to ensure subtasks appear
      setTimeout(() => {
        console.log('Force reloading tasks...');
        this.loadTasks();
      }, 100);
    } catch (error) {
      console.error('Failed to create subtask:', error);
      eventBus.emit(EVENTS.ERROR_OCCURRED, error);
    } finally {
      stateManager.setLoading(false);
    }
  }

  showSubtaskModal() {
    console.log('showSubtaskModal called');
    console.log('subtaskModal element:', this.subtaskModal);
    this.subtaskModal.hidden = false;
    $('#subtaskTitle').focus();
  }

  hideSubtaskModal() {
    this.subtaskModal.hidden = true;
    this.subtaskForm.reset();
    this.currentParentTaskId = null;
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
}
