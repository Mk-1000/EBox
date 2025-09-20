const express = require('express');
const { requireAuth } = require('../middleware/AuthMiddleware');
const { validateTask, validateTaskToggle, validateTaskStatus } = require('../middleware/ValidationMiddleware');
const container = require('../config/Container');

const router = express.Router();

// Get services from container
const taskController = container.get('taskController');

// All routes require authentication
router.use(requireAuth);

// Task routes
router.get('/project/:projectId', (req, res, next) => {
  taskController.getTasksByProject(req, res, next);
});

router.get('/:id', (req, res, next) => {
  taskController.getTask(req, res, next);
});

router.post('/', validateTask, (req, res, next) => {
  taskController.createTask(req, res, next);
});

router.put('/:id', validateTask, (req, res, next) => {
  taskController.updateTask(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  taskController.deleteTask(req, res, next);
});

// Special routes for task operations
router.post('/:id/toggle', validateTaskToggle, (req, res, next) => {
  taskController.toggleTaskCompletion(req, res, next);
});

router.post('/:id/status', validateTaskStatus, (req, res, next) => {
  taskController.updateTaskStatus(req, res, next);
});

module.exports = router;
