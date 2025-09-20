// Utility functions
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));

export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  // Boolean attributes that should be handled specially
  const booleanAttributes = ['checked', 'disabled', 'readonly', 'required', 'selected', 'multiple', 'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'defer', 'async', 'hidden'];
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else if (key === 'onclick') {
      element.onclick = value;
    } else if (booleanAttributes.includes(key)) {
      // Handle boolean attributes properly
      if (value) {
        element.setAttribute(key, '');
        element[key] = true;
      } else {
        element.removeAttribute(key);
        element[key] = false;
      }
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Filter out null/undefined values before appending
  children.filter(child => child != null).forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  
  return date.toLocaleDateString();
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
