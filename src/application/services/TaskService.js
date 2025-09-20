const Task = require('../../domain/entities/Task');
const TaskHierarchyService = require('../../domain/services/TaskHierarchyService');
const ProjectProgressService = require('../../domain/services/ProjectProgressService');

class TaskService {
  constructor(taskRepository, projectRepository) {
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
  }

  async createTask(userId, projectId, title, description, priority, status, dueDate, parentTaskId) {
    console.log('TaskService.createTask received dueDate:', dueDate, 'Type:', typeof dueDate);
    
    // Verify project belongs to user
    const project = await this.projectRepository.findByUserIdAndId(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // If this is a subtask, verify parent task exists and belongs to same project
    if (parentTaskId) {
      const parentTask = await this.taskRepository.findByUserIdAndId(userId, parentTaskId);
      if (!parentTask) {
        throw new Error('Parent task not found');
      }
      
      if (!TaskHierarchyService.canCreateSubtask(parentTask, { projectId, userId })) {
        throw new Error('Invalid task hierarchy');
      }
    }

    const task = Task.create(projectId, userId, title, description, priority, status, dueDate, parentTaskId);
    await this.taskRepository.save(task);
    
    return task.toJSON();
  }

  async getTasksByProjectId(userId, projectId, filters = {}) {
    // Verify project belongs to user
    const project = await this.projectRepository.findByUserIdAndId(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await this.taskRepository.findWithFilters(projectId, filters);
    
    // Separate parent tasks and subtasks
    const parentTasks = tasks.filter(task => !task.parent_task_id);
    const subtasks = tasks.filter(task => task.parent_task_id);
    
    // Group subtasks by parent task ID
    const subtasksByParent = {};
    subtasks.forEach(subtask => {
      if (!subtasksByParent[subtask.parent_task_id]) {
        subtasksByParent[subtask.parent_task_id] = [];
      }
      subtasksByParent[subtask.parent_task_id].push(subtask);
    });
    
    // Add subtasks to their parent tasks
    const tasksWithSubtasks = parentTasks.map(task => ({
      ...task,
      subtasks: subtasksByParent[task.id] || []
    }));
    
    return tasksWithSubtasks;
  }

  async getTaskById(userId, taskId) {
    const task = await this.taskRepository.findByUserIdAndId(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    return task.toJSON();
  }

  async updateTask(userId, taskId, updateData) {
    console.log('TaskService.updateTask received updateData:', updateData);
    console.log('Due date in updateData:', updateData.dueDate, 'Type:', typeof updateData.dueDate);
    
    const task = await this.taskRepository.findByUserIdAndId(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.update(updateData.title, updateData.description, updateData.priority, updateData.status, updateData.dueDate);
    await this.taskRepository.save(task);
    
    return task.toJSON();
  }

  async deleteTask(userId, taskId) {
    const task = await this.taskRepository.findByUserIdAndId(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const deleted = await this.taskRepository.delete(taskId);
    if (!deleted) {
      throw new Error('Failed to delete task');
    }

    return true;
  }

  async toggleTaskCompletion(userId, taskId, completed) {
    const task = await this.taskRepository.findByUserIdAndId(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.setCompleted(completed);
    await this.taskRepository.save(task);

    // If this is a subtask, check if all subtasks of the parent are completed
    if (task.isSubtask) {
      const subtasks = await this.taskRepository.findSubtasksByParentId(task.parentTaskId);
      
      if (ProjectProgressService.shouldAutoCompleteParentTask(subtasks)) {
        const parentTask = await this.taskRepository.findById(task.parentTaskId);
        if (parentTask) {
          parentTask.setCompleted(true);
          await this.taskRepository.save(parentTask);
        }
      }
    }
    
    return task.toJSON();
  }

  async updateTaskStatus(userId, taskId, status) {
    console.log(`🔄 TaskService.updateTaskStatus called with userId: ${userId}, taskId: ${taskId}, status: ${status}`);
    
    const task = await this.taskRepository.findByUserIdAndId(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    console.log(`📋 Task before update:`, {
      id: task.id,
      title: task.title,
      status: task.status,
      completed: task.completed,
      parentTaskId: task.parentTaskId
    });

    task.updateStatus(status);
    console.log(`📋 Task after updateStatus:`, {
      id: task.id,
      title: task.title,
      status: task.status,
      completed: task.completed,
      parentTaskId: task.parentTaskId
    });

    await this.taskRepository.save(task);
    console.log(`💾 Task saved to database`);

    // If the task is marked as "Done", mark all its subtasks as completed
    if (status === 'Done') {
      const subtasks = await this.taskRepository.findSubtasksByParentId(taskId);
      for (const subtask of subtasks) {
        subtask.setCompleted(true);
        await this.taskRepository.save(subtask);
      }
    }
    
    const result = task.toJSON();
    console.log(`📤 TaskService returning:`, result);
    return result;
  }
}

module.exports = TaskService;
