const Project = require('../../domain/entities/Project');
const ProjectProgressService = require('../../domain/services/ProjectProgressService');

class ProjectService {
  constructor(projectRepository, taskRepository) {
    this.projectRepository = projectRepository;
    this.taskRepository = taskRepository;
  }

  async createProject(userId, title, description, quadrant) {
    const project = Project.create(userId, title, description, quadrant);
    await this.projectRepository.save(project);
    return project.toJSON();
  }

  async getProjectsByUserId(userId) {
    const projectsWithCounts = await this.projectRepository.findWithTaskCounts(userId);
    
    return projectsWithCounts.map(({ project, totalTasks, completedTasks }) => ({
      ...project.toJSON(),
      totalTasks,
      completedTasks,
      progress: ProjectProgressService.calculateProgress(totalTasks, completedTasks)
    }));
  }

  async getProjectById(userId, projectId) {
    const result = await this.projectRepository.findWithTasks(userId, projectId);
    if (!result) {
      throw new Error('Project not found');
    }

    const { project, tasks } = result;
    
    // Get subtasks for each task
    const tasksWithSubtasks = await Promise.all(
      tasks.map(async (task) => {
        const subtasks = await this.taskRepository.findSubtasksByParentId(task.id);
        return {
          ...task,
          subtasks: subtasks.map(subtask => subtask.toJSON())
        };
      })
    );

    return {
      project: project.toJSON(),
      tasks: tasksWithSubtasks
    };
  }

  async updateProject(userId, projectId, updateData) {
    const project = await this.projectRepository.findByUserIdAndId(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.update(updateData.title, updateData.description, updateData.quadrant);
    await this.projectRepository.save(project);
    
    return project.toJSON();
  }

  async deleteProject(userId, projectId) {
    const project = await this.projectRepository.findByUserIdAndId(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const deleted = await this.projectRepository.delete(projectId);
    if (!deleted) {
      throw new Error('Failed to delete project');
    }

    return true;
  }

  async updateProjectQuadrant(userId, projectId, quadrant) {
    const project = await this.projectRepository.findByUserIdAndId(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    project.updateQuadrant(quadrant);
    await this.projectRepository.save(project);
    
    return project.toJSON();
  }
}

module.exports = ProjectService;
