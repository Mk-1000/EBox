class ProjectController {
  constructor(projectService) {
    this.projectService = projectService;
  }

  async getProjects(req, res, next) {
    try {
      const userId = req.session.user.id;
      const projects = await this.projectService.getProjectsByUserId(userId);
      res.json({ projects });
    } catch (error) {
      next(error);
    }
  }

  async getProject(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const result = await this.projectService.getProjectById(userId, id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createProject(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { title, description = '', quadrant = 'not-urgent-not-important' } = req.body;
      
      const project = await this.projectService.createProject(userId, title, description, quadrant);
      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const { title, description, quadrant } = req.body;
      
      const project = await this.projectService.updateProject(userId, id, { title, description, quadrant });
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      
      await this.projectService.deleteProject(userId, id);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async updateProjectQuadrant(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;
      const { quadrant } = req.body;
      
      const project = await this.projectService.updateProjectQuadrant(userId, id, quadrant);
      res.json({ project });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProjectController;
