const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are VigorFit AI, an intelligent, encouraging, and knowledgeable AI Fitness Assistant for the VigorFit fitness web application.

Your primary goal is to empower users to reach their fitness goals safely and effectively.

Key Responsibilities & Guidelines:
1. WORKOUT PLANS: Help users design structured workout routines tailored for beginner, intermediate, and advanced levels.
2. EXERCISE EXPLANATION: Clearly explain proper form, exercise execution, sets, reps, and rest periods.
3. HEALTH & RECOVERY: Provide actionable tips for warm-ups, cooldowns, active recovery, sleep, hydration, and balanced nutrition.
4. VIGORFIT FEATURES: Guide users on how to use VigorFit to log exercises, track nutrition and progress, monitor activity streaks, and stay consistent.
5. TONE & STYLE: Keep your answers friendly, supportive, clear, and easy to read. Use bullet points and clean formatting when listing exercises or steps.
6. SAFETY & MEDICAL BOUNDARIES: You are a fitness assistant, not a doctor. Do NOT diagnose medical conditions or recommend dangerous workouts. If a user asks about an injury or severe pain, advise them to consult a qualified healthcare or sports medicine professional.

Keep responses concise and direct unless the user requests an in-depth breakdown.`;

/**
 * Safely masks API keys and sensitive secrets from logs.
 */
const safeLogMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return msg;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let clean = msg;
  if (apiKey) {
    clean = clean.split(apiKey).join('[REDACTED_API_KEY]');
  }
  // Also redact standard Gemini/Google API key patterns (AIza...)
  return clean.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
};

/**
 * Checks whether the Gemini API Key is configured in environment variables.
 */
const isConfigured = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && !apiKey.startsWith('YOUR_'));
};

/**
 * Sanitize and format conversation history for Gemini API.
 * Ensures alternating user/model roles and non-empty text content.
 */
const formatConversationHistory = (history = []) => {
  const formatted = [];
  if (!Array.isArray(history) || history.length === 0) return formatted;

  let lastRole = null;

  for (const msg of history) {
    if (!msg || !msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
      continue;
    }

    const currentRole = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';

    // Prevent consecutive duplicate roles which cause 400 Bad Request in Gemini API
    if (currentRole === lastRole && formatted.length > 0) {
      const lastIndex = formatted.length - 1;
      formatted[lastIndex].parts[0].text += `\n${msg.content.trim()}`;
    } else {
      formatted.push({
        role: currentRole,
        parts: [{ text: msg.content.trim() }],
      });
      lastRole = currentRole;
    }
  }

  // Gemini API requires the first conversation turn to be 'user'
  if (formatted.length > 0 && formatted[0].role === 'model') {
    formatted.shift();
  }

  return formatted;
};

/**
 * Generate a response using Google Gemini API given a conversation array.
 * Includes automatic model fallback (gemini-3.8-flash, gemini-2.5-flash, gemini-1.5-flash).
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @returns {Promise<{reply: string, usedModel: string}>} Assistant reply text and model used
 */
const generateChatResponse = async (conversationHistory = []) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('YOUR_')) {
    const error = new Error('Gemini API Key is missing or not configured in server/.env');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }

  const configuredModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : null;

  // Build model candidate hierarchy with gemini-3.8-flash as top working model
  const candidateModels = [
    configuredModel,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-pro',
  ].filter((m, idx, self) => m && self.indexOf(m) === idx);

  const formattedContents = formatConversationHistory(conversationHistory);

  if (formattedContents.length === 0) {
    formattedContents.push({
      role: 'user',
      parts: [{ text: 'Hello FitTrack AI Assistant!' }],
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      console.log(`🤖 Attempting Gemini model: "${modelName}"...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: formattedContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const response = await result.response;
      const replyText = response.text();

      if (!replyText) {
        throw new Error('Received empty text response from Gemini API.');
      }

      console.log(`✅ Gemini response successfully generated using model "${modelName}"`);
      return {
        reply: replyText,
        usedModel: modelName,
      };
    } catch (err) {
      const status = err.status || err.statusCode || (err.message?.includes('404') ? 404 : undefined);
      const safeErrStr = safeLogMessage(err.message || 'Unknown error');
      console.warn(`⚠️ Model "${modelName}" failed [Status: ${status || 'N/A'}]: ${safeErrStr}`);

      lastError = err;

      // If model not found / deprecated / 404, try the next model candidate
      const isNotFound =
        status === 404 ||
        err.message?.includes('404') ||
        err.message?.includes('not found') ||
        err.message?.includes('no longer available') ||
        err.message?.includes('is not supported for generateContent');

      if (isNotFound) {
        continue;
      }

      // If it's a quota (429) or invalid key (401), stop fallback loop and throw immediately
      break;
    }
  }

  // Classify and throw final error
  const finalStatus = lastError.status || lastError.statusCode;
  const safeFinalMsg = safeLogMessage(lastError.message);
  console.error(`❌ All Gemini API attempts failed. Final status: ${finalStatus || 'N/A'} - ${safeFinalMsg}`);

  if (
    finalStatus === 429 ||
    lastError.message?.includes('429') ||
    lastError.message?.includes('RESOURCE_EXHAUSTED') ||
    lastError.message?.includes('Quota exceeded')
  ) {
    lastError.code = 'RATE_LIMIT_QUOTA';
  } else if (
    finalStatus === 401 ||
    lastError.message?.includes('401') ||
    lastError.message?.includes('API_KEY_INVALID') ||
    lastError.message?.includes('API key not valid')
  ) {
    lastError.code = 'INVALID_API_KEY';
  }

  throw lastError;
};

module.exports = {
  isConfigured,
  generateChatResponse,
  safeLogMessage,
};
