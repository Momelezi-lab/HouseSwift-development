// Configuration for API endpoints
const config = {
    // Development URL (localhost)
    development: {
        apiBaseUrl: 'http://127.0.0.1:5001'
    },
    // Production URL (Render backend)
    production: {
        apiBaseUrl: 'https://house-hero-backend.onrender.com'
    }
};

// Determine environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const currentConfig = isProduction ? config.production : config.development;

// Export the API base URL
const API_BASE_URL = currentConfig.apiBaseUrl;

// Log the current configuration for debugging
console.log('Environment:', isProduction ? 'Production' : 'Development');
console.log('API Base URL:', API_BASE_URL); 