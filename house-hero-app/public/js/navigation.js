// Navigation utility for tracking previous page and back button functionality

// Store current page as previous before navigating
function storePreviousPage() {
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const fullPath = currentPath + currentHash;
  sessionStorage.setItem('previousPage', fullPath);
}

// Get previous page or default to index
function getPreviousPage() {
  const previous = sessionStorage.getItem('previousPage');
  if (previous) {
    // Convert absolute path to relative if needed
    let path = previous;
    
    // Remove leading slash if present
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    // Get current path
    const currentPath = window.location.pathname;
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
    
    // If path is absolute (starts with /), convert to relative
    if (previous.startsWith('/')) {
      const pathParts = path.split('/').filter(p => p);
      const currentParts = currentPath.split('/').filter(p => p);
      
      // Find common ancestor
      let commonLength = 0;
      for (let i = 0; i < Math.min(pathParts.length, currentParts.length); i++) {
        if (pathParts[i] === currentParts[i]) {
          commonLength++;
        } else {
          break;
        }
      }
      
      // Calculate relative path
      const upLevels = currentParts.length - commonLength - 1;
      const downPath = pathParts.slice(commonLength);
      const relative = (upLevels > 0 ? '../'.repeat(upLevels) : '') + downPath.join('/');
      return relative || 'index.html';
    }
    
    // If it's already a relative path, try to make it work from current location
    // Simple approach: if it doesn't start with ../, assume it needs adjustment
    if (!path.startsWith('../') && !path.startsWith('./') && path !== 'index.html') {
      // Try to construct relative path
      const pathParts = path.split('/').filter(p => p);
      const currentParts = currentPath.split('/').filter(p => p);
      
      // Remove filename from current
      currentParts.pop();
      
      // Find common ancestor
      let commonLength = 0;
      for (let i = 0; i < Math.min(pathParts.length, currentParts.length); i++) {
        if (pathParts[i] === currentParts[i]) {
          commonLength++;
        } else {
          break;
        }
      }
      
      // Calculate relative path
      const upLevels = currentParts.length - commonLength;
      const downPath = pathParts.slice(commonLength);
      const relative = (upLevels > 0 ? '../'.repeat(upLevels) : '') + downPath.join('/');
      return relative || 'index.html';
    }
    
    return path;
  }
  
  // Default fallback based on current location
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('/dashboard/')) {
    return '../index.html';
  } else if (currentPath.includes('/services/')) {
    return '../index.html';
  } else if (currentPath.includes('/info/')) {
    return '../../public/index.html';
  } else if (currentPath.includes('/bookings/')) {
    return '../../index.html';
  } else if (currentPath.includes('/pages/')) {
    return '../index.html';
  }
  return 'index.html';
}

// Initialize back button on page load
function initBackButton() {
  // Only handle buttons with data-back-button attribute (and not data-direct-link)
  const backButtons = document.querySelectorAll('[data-back-button]:not([data-direct-link])');
  backButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const previousPage = getPreviousPage();
      window.location.href = previousPage;
    });
  });
  
  // Only intercept links that have href="#" or href="", not actual paths, and not data-direct-link
  const backLinks = document.querySelectorAll('a[href="#"]:not([data-direct-link]), a[href=""]:not([data-direct-link])');
  backLinks.forEach(link => {
    if (link.textContent.includes('Back') || link.textContent.includes('←')) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const previousPage = getPreviousPage();
        window.location.href = previousPage;
      });
    }
  });
}

// Auto-store previous page when clicking navigation links
document.addEventListener('DOMContentLoaded', function() {
  // Store current page as previous when clicking nav links
  const navLinks = document.querySelectorAll('nav a, aside a, .sidebar a, .nav-link');
  navLinks.forEach(link => {
    if (link.href && !link.href.includes('#') && !link.classList.contains('logout-link') && !link.hasAttribute('data-direct-link')) {
      link.addEventListener('click', function(e) {
        // Only store if it's a navigation link (not back button)
        if (!this.id.includes('back') && !this.textContent.includes('Back') && !this.textContent.includes('←')) {
          storePreviousPage();
        }
      });
    }
  });
  
  // Initialize back buttons (only for buttons with data-back-button, not direct links)
  initBackButton();
});

