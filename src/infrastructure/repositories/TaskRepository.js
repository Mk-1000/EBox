const ITaskRepository = require('../../domain/repositories/ITaskRepository');
const Task = require('../../domain/entities/Task');
const databaseConnection = require('../database/DatabaseConnection');

class TaskRepository extends ITaskRepository {
  async findById(id) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const taskData = rows[0];
    return new Task(
      taskData.id,
      taskData.project_id,
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.due_date,
      taskData.parent_task_id,
      taskData.completed,
      taskData.created_at,
      taskData.updated_at
    );
  }

  async findByProjectId(projectId) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    
    return rows.map(taskData => new Task(
      taskData.id,
      taskData.project_id,
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.due_date,
      taskData.parent_task_id,
      taskData.completed,
      taskData.created_at,
      taskData.updated_at
    ));
  }

  async findByUserId(userId) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    return rows.map(taskData => new Task(
      taskData.id,
      taskData.project_id,
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.due_date,
      taskData.parent_task_id,
      taskData.completed,
      taskData.created_at,
      taskData.updated_at
    ));
  }

  async findByUserIdAndId(userId, id) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (rows.length === 0) return null;
    
    const taskData = rows[0];
    return new Task(
      taskData.id,
      taskData.project_id,
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.due_date,
      taskData.parent_task_id,
      taskData.completed,
      taskData.created_at,
      taskData.updated_at
    );
  }

  async findByParentTaskId(parentTaskId) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at ASC',
      [parentTaskId]
    );
    
    return rows.map(taskData => new Task(
      taskData.id,
      taskData.project_id,
      taskData.user_id,
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.status,
      taskData.due_date,
      taskData.parent_task_id,
      taskData.completed,
      taskData.created_at,
      taskData.updated_at
    ));
  }

  async save(task) {
    console.log('TaskRepository.save called with task dueDate:', task.dueDate, 'Type:', typeof task.dueDate);
    const params = [task.id, task.projectId, task.userId, task.title, task.description, task.priority, task.status, task.dueDate, task.parentTaskId, task.completed, task.createdAt, task.updatedAt];
    console.log('TaskRepository.save params:', params);
    
    await databaseConnection.query(
      'INSERT INTO tasks (id, project_id, user_id, title, description, priority, status, due_date, parent_task_id, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), priority = VALUES(priority), status = VALUES(status), due_date = VALUES(due_date), completed = VALUES(completed), updated_at = VALUES(updated_at)',
      params
    );
    return task;
  }

  async delete(id) {
    const [result] = await databaseConnection.query(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async findWithFilters(projectId, filters = {}) {
    // First, get all tasks for the project (both parent tasks and subtasks)
    let query = 'SELECT * FROM tasks WHERE project_id = ?';
    const params = [projectId];
    
    const [allTasks] = await databaseConnection.query(query, params);
    
    // Apply filters to parent tasks only (subtasks inherit their parent's filtering)
    let filteredTasks = allTasks;
    
    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }
    
    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }
    
    // Separate parent tasks and subtasks
    const parentTasks = filteredTasks.filter(task => !task.parent_task_id);
    const subtasks = allTasks.filter(task => task.parent_task_id);
    
    // Add sorting to parent tasks
    switch (filters.sortBy) {
      case 'priority':
        parentTasks.sort((a, b) => {
          const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
          const aPriority = priorityOrder[a.priority] || 4;
          const bPriority = priorityOrder[b.priority] || 4;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return new Date(a.created_at) - new Date(b.created_at);
        });
        break;
      case 'status':
        parentTasks.sort((a, b) => {
          const statusOrder = { 'To Do': 1, 'In Progress': 2, 'Done': 3 };
          const aStatus = statusOrder[a.status] || 4;
          const bStatus = statusOrder[b.status] || 4;
          if (aStatus !== bStatus) return aStatus - bStatus;
          return new Date(a.created_at) - new Date(b.created_at);
        });
        break;
      case 'due_date':
        parentTasks.sort((a, b) => {
          if (!a.due_date && !b.due_date) return new Date(a.created_at) - new Date(b.created_at);
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        break;
      default:
        parentTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    // Return all tasks (parent tasks and subtasks) so the service can group them properly
    return [...parentTasks, ...subtasks];
  }

  async findSubtasksByParentId(parentTaskId) {
    return await this.findByParentTaskId(parentTaskId);
  }

  async findTaskWithSubtasks(projectId) {
    const [rows] = await databaseConnection.query(
      `SELECT t.*, 
       COUNT(st.id) as subtask_count,
       COUNT(CASE WHEN st.completed = 1 THEN 1 END) as completed_subtasks
       FROM tasks t
       LEFT JOIN tasks st ON t.id = st.parent_task_id
       WHERE t.project_id = ?
       GROUP BY t.id
       ORDER BY 
         CASE t.priority 
           WHEN 'High' THEN 1 
           WHEN 'Medium' THEN 2 
           WHEN 'Low' THEN 3 
         END,
         t.created_at ASC`,
      [projectId]
    );
    
    return rows;
  }
}

module.exports = TaskRepository;
