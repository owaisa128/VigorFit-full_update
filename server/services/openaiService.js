const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are FitTrack AI, an intelligent, encouraging, and knowledgeable AI Fitness Assistant for FitTrack Pro website.

Your primary goal is to empower users to reach their fitness goals safely and effectively.

Key Responsibilities & Guidelines:
1. WORKOUT PLANS: Help users design structured workout routines tailored for beginner, intermediate, and advanced levels.
2. EXERCISE EXPLANATION: Clearly explain proper form, exercise execution, sets, reps, and rest periods.
3. HEALTH & RECOVERY: Provide actionable tips for warm-ups, cooldowns, active recovery, sleep, hydration, and balanced nutrition.
4. FITTRACK PRO FEATURES: Guide users on how to use FitTrack Pro to log exercises, track progress, edit workout routines, and stay consistent.
5. TONE & STYLE: Keep your answers friendly, supportive, clear, and easy to read. Use bullet points and clean formatting when listing exercises or steps.
6. SAFETY & MEDICAL BOUNDARIES: You are a fitness assistant, not a doctor. Do NOT diagnose medical conditions or recommend dangerous workouts. If a user asks about an injury or severe pain, advise them to consult a qualified healthcare or sports medicine professional.

Keep responses concise and direct unless the user requests an in-depth breakdown.`;

/**
 * Checks whether the OpenAI API Key is configured in environment variables.
 */
const isConfigured = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  return Boolean(apiKey && apiKey.trim() !== '' && !apiKey.startsWith('YOUR_'));
};

/**
 * Generate a response from OpenAI given a conversation array or single prompt.
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @returns {Promise<string>} Assistant reply string
 */
const generateChatResponse = async (conversationHistory = []) => {
  if (!isConfigured()) {
    const error = new Error('OpenAI API Key is missing or not configured in server/.env');
    error.code = 'NOT_CONFIGURED';
    throw error;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const openai = new OpenAI({ apiKey });

  // Format messages with system prompt first
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const reply = completion.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error('Received empty response from OpenAI API.');
    }

    return reply;
  } catch (err) {
    console.error('❌ OpenAI API Error:', err.message);
    throw err;
  }
};

module.exports = {
  isConfigured,
  generateChatResponse,
};
