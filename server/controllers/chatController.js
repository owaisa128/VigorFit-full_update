const geminiService = require('../services/geminiService');

/**
 * @desc    Handle chat request with FitTrack AI Assistant powered by Google Gemini API
 * @route   POST /api/chat
 * @access  Public / Optional Auth
 */
const handleChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    // 1. Input Validation
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        errorType: 'BAD_REQUEST',
        message: 'Please provide a valid message.',
      });
    }

    const trimmedMessage = message.trim();

    // 2. Length Validation
    if (trimmedMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        errorType: 'MESSAGE_TOO_LONG',
        message: 'Message is too long. Please keep your question under 1000 characters.',
      });
    }

    // 3. Check Configuration Status
    if (!geminiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        errorType: 'NOT_CONFIGURED',
        message: 'FitTrack AI Assistant is currently unconfigured. Please set GEMINI_API_KEY in server/.env file.',
      });
    }

    // 4. Format Conversation History (limit to last 8 turns for efficiency)
    let formattedHistory = [];
    if (Array.isArray(history)) {
      formattedHistory = history
        .slice(-8)
        .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
        .map((msg) => ({
          role: msg.role,
          content: msg.content.trim().slice(0, 1000),
        }));
    }

    formattedHistory.push({ role: 'user', content: trimmedMessage });

    // 5. Generate AI Response via Gemini Service with fallback support
    const { reply, usedModel } = await geminiService.generateChatResponse(formattedHistory);

    return res.status(200).json({
      success: true,
      reply: reply,
      model: usedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const safeErrorMsg = geminiService.safeLogMessage(error.message);
    const status = error.status || error.statusCode || 500;
    console.error(`❌ Chat Controller Error [HTTP ${status}]: ${safeErrorMsg}`);

    if (error.code === 'NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        errorType: 'NOT_CONFIGURED',
        message: 'FitTrack AI Assistant is unconfigured. Please set GEMINI_API_KEY in server/.env.',
      });
    }

    if (
      error.code === 'RATE_LIMIT_QUOTA' ||
      status === 429 ||
      error.message?.includes('429') ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('Quota exceeded')
    ) {
      return res.status(429).json({
        success: false,
        errorType: 'RATE_LIMIT_QUOTA',
        message: 'Gemini API free-tier quota or rate limit exceeded. Please wait a moment and try again.',
      });
    }

    if (
      error.code === 'INVALID_API_KEY' ||
      status === 401 ||
      error.message?.includes('401') ||
      error.message?.includes('API_KEY_INVALID') ||
      error.message?.includes('API key not valid')
    ) {
      return res.status(401).json({
        success: false,
        errorType: 'INVALID_API_KEY',
        message: 'Invalid GEMINI_API_KEY configured in server/.env.',
      });
    }

    return res.status(500).json({
      success: false,
      errorType: 'SERVER_ERROR',
      message: 'Failed to generate response from Gemini AI Assistant. Please try again later.',
    });
  }
};

/**
 * @desc    Get AI Assistant configuration status
 * @route   GET /api/chat/status
 * @access  Public
 */
const getChatStatus = async (req, res) => {
  const configured = geminiService.isConfigured();
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  return res.status(200).json({
    success: true,
    configured: configured,
    model: modelName,
    message: configured
      ? 'Gemini AI Assistant is ready.'
      : 'FitTrack AI Assistant is not configured. GEMINI_API_KEY is missing.',
  });
};

module.exports = {
  handleChat,
  getChatStatus,
};
