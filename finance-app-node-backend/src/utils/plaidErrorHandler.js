/**
 * Utility functions for handling Plaid API errors consistently
 */

/**
 * Handle Plaid API errors and return appropriate error response
 * @param {Error} error - The error object from Plaid API
 * @param {Object} plaidItem - The Plaid item object (optional)
 * @param {Object} res - Express response object
 * @returns {Object|null} - Error response object or null if not a Plaid error
 */
const handlePlaidError = async (error, plaidItem = null, res = null) => {
  // Check if this is a Plaid-specific error
  if (error.response?.data) {
    const plaidError = error.response.data;
    console.log('🔍 Plaid error detected:', plaidError);
    
    // Update Plaid item status if provided
    if (plaidItem && plaidError.error_code) {
      try {
        await plaidItem.update({ 
          status: plaidError.error_code,
          needs_update: true 
        });
        console.log(`✅ Updated Plaid item status to ${plaidError.error_code}`);
      } catch (updateError) {
        console.error('❌ Failed to update Plaid item status:', updateError);
      }
    }
    
    // Handle specific Plaid error codes
    switch (plaidError.error_code) {
      case 'ITEM_LOGIN_REQUIRED':
        return {
          success: false,
          error: 'ITEM_LOGIN_REQUIRED',
          message: 'Your bank connection has expired and needs to be re-authenticated. Please reconnect your account.',
          requires_reconnection: true,
          plaid_error: plaidError
        };
        
      case 'INVALID_ACCESS_TOKEN':
        return {
          success: false,
          error: 'INVALID_ACCESS_TOKEN',
          message: 'Your bank connection token has expired. Please reconnect your account.',
          requires_reconnection: true,
          plaid_error: plaidError
        };
        
      case 'ITEM_ERROR':
        return {
          success: false,
          error: 'ITEM_ERROR',
          message: 'There was an issue with your bank connection. Please reconnect your account.',
          requires_reconnection: true,
          plaid_error: plaidError
        };
        
      case 'RATE_LIMIT_EXCEEDED':
        return {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests to your bank. Please wait a moment and try again.',
          retry_after: plaidError.retry_after || 60,
          plaid_error: plaidError
        };
        
      case 'INVALID_REQUEST':
        return {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Invalid request to your bank. Please check your account settings.',
          plaid_error: plaidError
        };
        
      default:
        return {
          success: false,
          error: 'PLAID_API_ERROR',
          message: `Plaid API error: ${plaidError.error_message || plaidError.error_code}`,
          plaid_error: plaidError
        };
    }
  }
  
  // Not a Plaid error
  return null;
};

/**
 * Send error response with proper status code
 * @param {Object} res - Express response object
 * @param {Object} errorResponse - Error response object
 * @param {number} statusCode - HTTP status code (default: 400)
 */
const sendPlaidErrorResponse = (res, errorResponse, statusCode = 400) => {
  if (errorResponse.requires_reconnection) {
    // Use 400 for errors that require user action
    res.status(400).json(errorResponse);
  } else if (errorResponse.error === 'RATE_LIMIT_EXCEEDED') {
    // Use 429 for rate limiting
    res.status(429).json(errorResponse);
  } else {
    // Use provided status code or default to 400
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Check if error requires reconnection
 * @param {Error} error - The error object
 * @returns {boolean} - True if reconnection is required
 */
const requiresReconnection = (error) => {
  if (error.response?.data?.error_code) {
    const errorCode = error.response.data.error_code;
    return ['ITEM_LOGIN_REQUIRED', 'INVALID_ACCESS_TOKEN', 'ITEM_ERROR'].includes(errorCode);
  }
  return false;
};

module.exports = {
  handlePlaidError,
  sendPlaidErrorResponse,
  requiresReconnection
}; 