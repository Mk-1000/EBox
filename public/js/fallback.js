// Fallback script for module loading issues
// Check if modules loaded successfully
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.EBoxAppLoaded) {
      console.error('EBox app failed to load - checking for module errors');
      
      // Check for specific module loading errors
      const moduleErrors = [];
      if (typeof require !== 'undefined') {
        moduleErrors.push('CommonJS require() detected in browser environment');
      }
      if (!window.location.protocol.includes('https') && window.location.hostname !== 'localhost') {
        moduleErrors.push('ES6 modules may require HTTPS in production');
      }
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff4444;
        color: white;
        padding: 20px;
        text-align: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      const errorDetails = moduleErrors.length > 0 ? 
        `<p><strong>Detected issues:</strong></p><ul>${moduleErrors.map(error => `<li>${error}</li>`).join('')}</ul>` : 
        '<p>Please check the browser console for detailed error messages.</p>';
        
      errorDiv.innerHTML = `
        <h3>Application Loading Error</h3>
        <p>EBox failed to load properly.</p>
        ${errorDetails}
        <p>If you see "require is not defined" errors, this may be a browser compatibility issue.</p>
        <button id="reloadButton" style="margin-top: 10px; padding: 10px 20px; background: white; color: #ff4444; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      `;
      
      // Add event listener instead of inline handler
      const reloadButton = errorDiv.querySelector('#reloadButton');
      reloadButton.addEventListener('click', () => {
        location.reload();
      });
      document.body.appendChild(errorDiv);
    }
  }, 2000);
});
