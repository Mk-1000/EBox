// Theme and language management component
import { $, $$ } from '../core/utils.js';
import { stateManager } from '../core/state.js';
import { eventBus, EVENTS } from '../core/events.js';
import { TRANSLATIONS, RTL_LANGS } from '../core/translations.js';

export class ThemeComponent {
  constructor() {
    this.themeToggle = $('#themeToggle');
    this.languageSelect = $('#languageSelect');
    this.menuToggle = $('#menuToggle');
    this.menuDropdown = $('#menuDropdown');
    this.logoutBtn = $('#logoutBtn');
    this.usernameDisplay = $('#usernameDisplay');
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.initializeTheme();
    this.initializeLanguage();
    this.setupMenu();
  }

  setupEventListeners() {
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    this.logoutBtn.addEventListener('click', () => this.logout());
    
    // Listen for state changes
    stateManager.subscribe('theme', (theme) => this.applyTheme(theme));
    stateManager.subscribe('language', (lang) => this.applyLanguage(lang));
    stateManager.subscribe('user', (user) => this.updateUserDisplay(user));
  }

  setupMenu() {
    this.menuToggle.addEventListener('click', () => this.toggleMenu());
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.menuToggle.contains(e.target) && !this.menuDropdown.contains(e.target)) {
        this.closeMenu();
      }
    });
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('ebox:theme') || 'light';
    stateManager.setTheme(savedTheme);
  }

  initializeLanguage() {
    const savedLang = localStorage.getItem('ebox:lang') || 'en';
    stateManager.setLanguage(savedLang);
  }

  toggleTheme() {
    const currentTheme = stateManager.getState().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    stateManager.setTheme(newTheme);
    eventBus.emit(EVENTS.THEME_CHANGED, newTheme);
  }

  changeLanguage(lang) {
    stateManager.setLanguage(lang);
    eventBus.emit(EVENTS.LANGUAGE_CHANGED, lang);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.themeToggle.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
  }

  applyLanguage(lang) {
    const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
    
    // Update all elements with data-i18n attributes
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });
    
    // Update placeholder attributes
    $$('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key]) {
        el.placeholder = translations[key];
      }
    });
    
    // Update RTL support
    const isRTL = RTL_LANGS.has(lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }

  updateUserDisplay(user) {
    if (user) {
      this.usernameDisplay.textContent = user.username;
      this.logoutBtn.hidden = false;
    } else {
      this.usernameDisplay.textContent = '';
      this.logoutBtn.hidden = true;
    }
  }

  toggleMenu() {
    const isOpen = this.menuDropdown.classList.contains('open');
    if (isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.menuDropdown.classList.add('open');
    this.menuDropdown.setAttribute('aria-hidden', 'false');
    this.menuToggle.setAttribute('aria-expanded', 'true');
  }

  closeMenu() {
    this.menuDropdown.classList.remove('open');
    this.menuDropdown.setAttribute('aria-hidden', 'true');
    this.menuToggle.setAttribute('aria-expanded', 'false');
  }

  async logout() {
    try {
      // Import AuthComponent to access logout method
      const { AuthComponent } = await import('./AuthComponent.js');
      const authComponent = new AuthComponent();
      await authComponent.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
