// Core constants and configuration
export const STORAGE_KEYS = { 
  theme: 'ebox:theme', 
  lang: 'ebox:lang' 
};

export const THEMES = { 
  dark: 'dark', 
  light: 'light' 
};

export const API_BASE = window.API_BASE || (window.location.origin.includes('localhost') ? '' : (window.API_BASE_URL || ''));

export const QUADRANTS = {
  URGENT_IMPORTANT: 'urgent-important',
  NOT_URGENT_IMPORTANT: 'not-urgent-important',
  URGENT_NOT_IMPORTANT: 'urgent-not-important',
  NOT_URGENT_NOT_IMPORTANT: 'not-urgent-not-important'
};

export const PRIORITIES = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const TASK_STATUS = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done'
};
