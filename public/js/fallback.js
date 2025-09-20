// Fallback script for module loading issues
// Check if modules loaded successfully
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.EBoxAppLoaded) {
      console.error('EBox app failed to load - checking for module errors');
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
      errorDiv.innerHTML = `
        <h3>Application Loading Error</h3>
        <p>EBox failed to load properly. Please check the browser console for errors.</p>
        <p>If you see "require is not defined" errors, this may be a browser compatibility issue.</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: white; color: #ff4444; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
      `;
      document.body.appendChild(errorDiv);
    }
  }, 2000);
});
