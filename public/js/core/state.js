// State management system
class StateManager {
  constructor() {
    this.state = {
      user: null,
      projects: [],
      currentProject: null,
      tasks: [],
      theme: 'light',
      language: 'en',
      isLoading: false,
      error: null
    };
    this.listeners = new Map();
  }

  getState() {
    return { ...this.state };
  }

  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.notifyListeners(prevState, this.state);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  notifyListeners(prevState, newState) {
    this.listeners.forEach((callbacks, key) => {
      if (prevState[key] !== newState[key]) {
        callbacks.forEach(callback => {
          try {
            callback(newState[key], prevState[key]);
          } catch (error) {
            console.error('State listener error:', error);
          }
        });
      }
    });
  }

  // Specific state setters
  setUser(user) {
    this.setState({ user });
  }

  setProjects(projects) {
    this.setState({ projects });
  }

  setCurrentProject(project) {
    this.setState({ currentProject: project });
  }

  setTasks(tasks) {
    this.setState({ tasks });
  }

  setTheme(theme) {
    this.setState({ theme });
    localStorage.setItem('ebox:theme', theme);
  }

  setLanguage(language) {
    this.setState({ language });
    localStorage.setItem('ebox:lang', language);
  }

  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  setError(error) {
    this.setState({ error });
  }

  clearError() {
    this.setState({ error: null });
  }

  // Initialize state from localStorage
  initialize() {
    const savedTheme = localStorage.getItem('ebox:theme') || 'light';
    const savedLang = localStorage.getItem('ebox:lang') || 'en';
    
    this.setState({
      theme: savedTheme,
      language: savedLang
    });
  }
}

export const stateManager = new StateManager();
