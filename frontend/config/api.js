// API Configuration
const API_CONFIG = {
  development: {
    baseURL: 'http://192.168.2.19:8001',
    timeout: 10000,
  },
  production: {
    baseURL: 'https://your-app-name.herokuapp.com', // Replace with your actual deployed URL
    timeout: 15000,
  }
};

// Get current environment
const getEnvironment = () => {
  // In Expo, __DEV__ is true for development builds
  return __DEV__ ? 'development' : 'production';
};

// Export current config
export const apiConfig = API_CONFIG[getEnvironment()];

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  return `${apiConfig.baseURL}${endpoint}`;
};

export default apiConfig; 