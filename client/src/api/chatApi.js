import api from './axios';

/**
 * Send a chat message to the backend AI Assistant endpoint
 * @param {string} message 
 * @param {Array<{role: string, content: string}>} history 
 * @returns {Promise<{success: boolean, reply?: string, errorType?: string, message?: string}>}
 */
export const sendChatMessage = async (message, history = []) => {
  const response = await api.post('/chat', { message, history }, { timeout: 35000 });
  return response.data;
};

/**
 * Check configuration status of the AI Assistant backend
 * @returns {Promise<{success: boolean, configured: boolean, model?: string, message?: string}>}
 */
export const fetchChatStatus = async () => {
  const response = await api.get('/chat/status');
  return response.data;
};
