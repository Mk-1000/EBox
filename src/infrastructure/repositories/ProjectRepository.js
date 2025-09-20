const IProjectRepository = require('../../domain/repositories/IProjectRepository');
const Project = require('../../domain/entities/Project');
const databaseConnection = require('../database/DatabaseConnection');

class ProjectRepository extends IProjectRepository {
  async findById(id) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const projectData = rows[0];
    return new Project(
      projectData.id,
      projectData.user_id,
      projectData.title,
      projectData.description,
      projectData.quadrant,
      projectData.created_at,
      projectData.updated_at
    );
  }

  async findByUserId(userId) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    
    return rows.map(projectData => new Project(
      projectData.id,
      projectData.user_id,
      projectData.title,
      projectData.description,
      projectData.quadrant,
      projectData.created_at,
      projectData.updated_at
    ));
  }

  async findByUserIdAndId(userId, id) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (rows.length === 0) return null;
    
    const projectData = rows[0];
    return new Project(
      projectData.id,
      projectData.user_id,
      projectData.title,
      projectData.description,
      projectData.quadrant,
      projectData.created_at,
      projectData.updated_at
    );
  }

  async save(project) {
    await databaseConnection.query(
      'INSERT INTO projects (id, user_id, title, description, quadrant, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), quadrant = VALUES(quadrant), updated_at = VALUES(updated_at)',
      [project.id, project.userId, project.title, project.description, project.quadrant, project.createdAt, project.updatedAt]
    );
    return project;
  }

  async delete(id) {
    const [result] = await databaseConnection.query(
      'DELETE FROM projects WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  async findWithTaskCounts(userId) {
    const [rows] = await databaseConnection.query(
      `SELECT p.*, 
       COUNT(t.id) as total_tasks,
       COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_tasks
       FROM projects p
       LEFT JOIN tasks t ON p.id = t.project_id AND t.parent_task_id IS NULL
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [userId]
    );
    
    return rows.map(projectData => ({
      project: new Project(
        projectData.id,
        projectData.user_id,
        projectData.title,
        projectData.description,
        projectData.quadrant,
        projectData.created_at,
        projectData.updated_at
      ),
      totalTasks: projectData.total_tasks,
      completedTasks: projectData.completed_tasks
    }));
  }

  async findWithTasks(userId, projectId) {
    // Get project details
    const [projectRows] = await databaseConnection.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    
    if (projectRows.length === 0) return null;
    
    const projectData = projectRows[0];
    const project = new Project(
      projectData.id,
      projectData.user_id,
      projectData.title,
      projectData.description,
      projectData.quadrant,
      projectData.created_at,
      projectData.updated_at
    );

    // Get tasks for this project
    const [taskRows] = await databaseConnection.query(
      `SELECT t.*, 
       COUNT(st.id) as subtask_count,
       COUNT(CASE WHEN st.completed = 1 THEN 1 END) as completed_subtasks
       FROM tasks t
       LEFT JOIN tasks st ON t.id = st.parent_task_id
       WHERE t.project_id = ? AND t.parent_task_id IS NULL
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
    
    return {
      project,
      tasks: taskRows
    };
  }
}

module.exports = ProjectRepository;
