import { API_URL_DEV, API_URL_PROD } from '@env';

// Debug logging for environment variables
console.log('🔧 Environment variables loaded:');
console.log('API_URL_DEV:', API_URL_DEV);
console.log('API_URL_PROD:', API_URL_PROD);
console.log('__DEV__:', __DEV__);

// Determine the best URL to use
const determineApiUrl = () => {
  console.log('🔧 Determining API URL...');
  console.log('🔧 __DEV__ value:', __DEV__);
  console.log('🔧 API_URL_DEV value:', API_URL_DEV);
  console.log('🔧 API_URL_PROD value:', API_URL_PROD);
  
  // Force use deployed backend for now
  console.log('🔧 FORCING use of deployed backend');
  return 'https://raam-finance-app.onrender.com';
  
  // If we're in development mode
  if (__DEV__) {
    // Try to use API_URL_DEV if available
    if (API_URL_DEV) {
      console.log('🔧 Using development URL from env:', API_URL_DEV);
      return API_URL_DEV;
    }
    // Fallback to deployed backend (since local server might not be running)
    console.log('🔧 Using deployed backend for development');
    return 'https://raam-finance-app.onrender.com';
  }
  
  // If we're in production mode
  if (API_URL_PROD) {
    console.log('🔧 Using production URL from env:', API_URL_PROD);
    return API_URL_PROD;
  }
  
  // Fallback to deployed backend
  console.log('🔧 Using deployed backend URL');
  return 'https://raam-finance-app.onrender.com';
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