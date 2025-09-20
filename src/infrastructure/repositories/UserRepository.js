const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');
const databaseConnection = require('../database/DatabaseConnection');

class UserRepository extends IUserRepository {
  async findById(id) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const userData = rows[0];
    return new User(
      userData.id,
      userData.username,
      userData.password_hash,
      userData.created_at
    );
  }

  async findByUsername(username) {
    const [rows] = await databaseConnection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) return null;
    
    const userData = rows[0];
    return new User(
      userData.id,
      userData.username,
      userData.password_hash,
      userData.created_at
    );
  }

  async save(user) {
    await databaseConnection.query(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [user.id, user.username, user.passwordHash, user.createdAt]
    );
    return user;
  }

  async existsByUsername(username) {
    const [rows] = await databaseConnection.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0;
  }
}

module.exports = UserRepository;
