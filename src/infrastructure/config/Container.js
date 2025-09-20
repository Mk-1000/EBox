// Dependency Injection Container
class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    return service.factory(this);
  }

  has(name) {
    return this.services.has(name);
  }
}

// Create and configure the container
const container = new Container();

// Register repositories
container.register('userRepository', () => {
  const UserRepository = require('../repositories/UserRepository');
  return new UserRepository();
}, true);

container.register('projectRepository', () => {
  const ProjectRepository = require('../repositories/ProjectRepository');
  return new ProjectRepository();
}, true);

container.register('taskRepository', () => {
  const TaskRepository = require('../repositories/TaskRepository');
  return new TaskRepository();
}, true);

// Register application services
container.register('authService', (c) => {
  const AuthService = require('../../application/services/AuthService');
  return new AuthService(c.get('userRepository'));
}, true);

container.register('projectService', (c) => {
  const ProjectService = require('../../application/services/ProjectService');
  return new ProjectService(c.get('projectRepository'), c.get('taskRepository'));
}, true);

container.register('taskService', (c) => {
  const TaskService = require('../../application/services/TaskService');
  return new TaskService(c.get('taskRepository'), c.get('projectRepository'));
}, true);

// Register controllers
container.register('authController', (c) => {
  const AuthController = require('../controllers/AuthController');
  return new AuthController(c.get('authService'));
}, true);

container.register('projectController', (c) => {
  const ProjectController = require('../controllers/ProjectController');
  return new ProjectController(c.get('projectService'));
}, true);

container.register('taskController', (c) => {
  const TaskController = require('../controllers/TaskController');
  return new TaskController(c.get('taskService'));
}, true);

// Register database connection
container.register('databaseConnection', () => {
  const databaseConnection = require('../database/DatabaseConnection');
  return databaseConnection;
}, true);

module.exports = container;
