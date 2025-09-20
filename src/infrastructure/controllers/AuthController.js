class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async signup(req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await this.authService.signup(username, password);
      
      req.session.user = user;
      res.status(201).json({ ok: true, user });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const user = await this.authService.login(username, password);
      
      req.session.user = user;
      res.json({ ok: true, user });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      req.session = null;
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await this.authService.getUserById(req.session.user.id);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
