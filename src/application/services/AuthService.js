const bcrypt = require('bcryptjs');
const User = require('../../domain/entities/User');

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async signup(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const existingUser = await this.userRepository.existsByUsername(username);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = User.create(username, passwordHash);
    
    await this.userRepository.save(user);
    
    return user.toJSON();
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return user.toJSON();
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user.toJSON();
  }
}

module.exports = AuthService;
