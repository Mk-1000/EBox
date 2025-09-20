const express = require('express');
const { requireAuth } = require('../middleware/AuthMiddleware');
const { validateSignup, validateLogin } = require('../middleware/ValidationMiddleware');
const container = require('../config/Container');

const router = express.Router();

// Get services from container
const authController = container.get('authController');

// Public routes
router.post('/signup', validateSignup, (req, res, next) => {
  authController.signup(req, res, next);
});

router.post('/login', validateLogin, (req, res, next) => {
  authController.login(req, res, next);
});

// Protected routes
router.post('/logout', requireAuth, (req, res, next) => {
  authController.logout(req, res, next);
});

router.get('/me', requireAuth, (req, res, next) => {
  authController.getCurrentUser(req, res, next);
});

module.exports = router;
