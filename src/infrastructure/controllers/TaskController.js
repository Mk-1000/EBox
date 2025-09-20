class TaskController {
  constructor(taskService) {
    this.taskService = taskService;
  }

  async getTasksByProject(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { projectId } = req.params;
      const { status, priority, sortBy = 'priority' } = req.query;
      
      const filters = { status, priority, sortBy };
      const tasks = await this.taskService.getTasksByProjectId(userId, projectId, filters);
      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  }

  async getTask(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      
      const task = await this.taskService.getTaskById(userId, id);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { 
        projectId, 
        title, 
        description = '', 
        priority = 'Medium', 
        status = 'To Do', 
        dueDate = null,
        parentTaskId = null 
      } = req.body;
      
      const task = await this.taskService.createTask(
        userId, 
        projectId, 
        title, 
        description, 
        priority, 
        status, 
        dueDate, 
        parentTaskId
      );
      res.status(201).json({ task });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const { 
        title, 
        description, 
        priority, 
        status, 
        dueDate 
      } = req.body;
      
      const task = await this.taskService.updateTask(userId, id, {
        title, 
        description, 
        priority, 
        status, 
        dueDate
      });
      res.json({ task });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      
      await this.taskService.deleteTask(userId, id);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async toggleTaskCompletion(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const { completed } = req.body;
      
      const task = await this.taskService.toggleTaskCompletion(userId, id, completed);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  }

  async updateTaskStatus(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const { status } = req.body;
      
      const task = await this.taskService.updateTaskStatus(userId, id, status);
      res.json({ task });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaskController;
