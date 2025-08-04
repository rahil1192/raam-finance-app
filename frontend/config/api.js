import { API_URL_DEV, API_URL_PROD } from '@env';

// Debug logging for environment variables
console.log('🔧 Environment variables loaded:');
console.log('API_URL_DEV:', API_URL_DEV);
console.log('API_URL_PROD:', API_URL_PROD);
console.log('__DEV__:', __DEV__);

const API_CONFIG = {
  development: {
    baseURL: API_URL_DEV || 'http://192.168.2.19:8001', // Fallback if env var is undefined
    timeout: 10000,
  },
  production: {
    baseURL: API_URL_PROD,
    timeout: 15000,
  }
};

const getEnvironment = () => (__DEV__ ? 'development' : 'production');
export const apiConfig = API_CONFIG[getEnvironment()];
export const getApiUrl = (endpoint) => `${apiConfig.baseURL}${endpoint}`;
export default apiConfig; 