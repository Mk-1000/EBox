class IUserRepository {
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  async findByUsername(username) {
    throw new Error('Method must be implemented');
  }

  async save(user) {
    throw new Error('Method must be implemented');
  }

  async existsByUsername(username) {
    throw new Error('Method must be implemented');
  }
}

module.exports = IUserRepository;
