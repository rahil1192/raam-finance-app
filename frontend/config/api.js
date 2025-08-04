import { API_URL_DEV, API_URL_PROD } from '@env';

// Debug logging for environment variables
console.log('🔧 Environment variables loaded:');
console.log('API_URL_DEV:', API_URL_DEV);
console.log('API_URL_PROD:', API_URL_PROD);
console.log('__DEV__:', __DEV__);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Centralized server configuration
const SERVERS = {
  LOCAL: 'http://192.168.2.19:8001',
  RENDER: 'https://raam-finance-app.onrender.com'
};

// Determine the best URL to use
const determineApiUrl = () => {
  console.log('🔧 Determining API URL...');
  console.log('🔧 __DEV__ value:', __DEV__);
  console.log('🔧 NODE_ENV value:', process.env.NODE_ENV);
  console.log('🔧 API_URL_DEV value:', API_URL_DEV);
  console.log('🔧 API_URL_PROD value:', API_URL_PROD);
  
  // Check if we're in a production build (not development mode)
  const isProductionBuild = process.env.NODE_ENV === 'production';
  console.log('🔧 Is production build:', isProductionBuild);
  
  // For local development testing:

  
  // If we're in development mode (local development)
  if (__DEV__ && !isProductionBuild) {
    // Try to use API_URL_DEV if available
    if (API_URL_DEV && API_URL_DEV !== 'undefined') {
      console.log('🔧 Using development URL from env:', API_URL_DEV);
      return API_URL_DEV;
    }
    // Fallback to deployed backend (since local server might not be running)
    console.log('🔧 No DEV URL in env, using deployed backend for development');
    return SERVERS.RENDER;
  }
  
  // If we're in production mode (production build)
  if (isProductionBuild || !__DEV__) {
    if (API_URL_PROD && API_URL_PROD !== 'undefined') {
      console.log('🔧 Using production URL from env:', API_URL_PROD);
      return API_URL_PROD;
    }
    // Fallback to deployed backend
    console.log('🔧 No PROD URL in env, using deployed backend URL');
    return SERVERS.RENDER;
  }
  
  // Final fallback
  console.log('🔧 Using fallback deployed backend URL');
  return SERVERS.RENDER;
};

const API_CONFIG = {
  development: {
    baseURL: determineApiUrl(),
    timeout: 10000,
  },
  production: {
    baseURL: determineApiUrl(),
    timeout: 15000,
  }
};

const getEnvironment = () => (__DEV__ ? 'development' : 'production');
export const apiConfig = API_CONFIG[getEnvironment()];
export const getApiUrl = (endpoint) => `${apiConfig.baseURL}${endpoint}`;
export default apiConfig;

// Export server URLs for direct use
export { SERVERS }; 