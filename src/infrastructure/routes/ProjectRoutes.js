const express = require('express');
const { requireAuth } = require('../middleware/AuthMiddleware');
const { validateProject } = require('../middleware/ValidationMiddleware');
const container = require('../config/Container');

const router = express.Router();

// Get services from container
const projectController = container.get('projectController');

// All routes require authentication
router.use(requireAuth);

// Project routes
router.get('/', (req, res, next) => {
  projectController.getProjects(req, res, next);
});

router.get('/:id', (req, res, next) => {
  projectController.getProject(req, res, next);
});

router.post('/', validateProject, (req, res, next) => {
  projectController.createProject(req, res, next);
});

router.put('/:id', validateProject, (req, res, next) => {
  projectController.updateProject(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  projectController.deleteProject(req, res, next);
});

// Special route for updating only quadrant
router.patch('/:id/quadrant', (req, res, next) => {
  projectController.updateProjectQuadrant(req, res, next);
});

module.exports = router;
