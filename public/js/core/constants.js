// Core constants and configuration
export const STORAGE_KEYS = { 
  theme: 'ebox:theme', 
  lang: 'ebox:lang' 
};

export const THEMES = { 
  dark: 'dark', 
  light: 'light' 
};

// Determine API base URL based on environment
export const API_BASE = (() => {
  // Check if we're in development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  
  // For production, use the current origin
  const baseUrl = window.location.origin;
  console.log('API_BASE determined as:', baseUrl);
  return baseUrl;
})();

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
