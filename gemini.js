// gemini.js — AI Integration (Fixed)
// Uses Gemini 1.5 Flash (most reliable free tier model)

const GEMINI_API_KEY = "AQ.Ab8RN6JRbDf0MTqiMdH6Q1jLWogSif-4HT6ANLDSWzchzZqB_g";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Ask Gemini AI
 * @param {string} userMessage - The user's question
 * @param {string} systemContext - System prompt / context
 * @param {Array} history - Previous messages [{role:'user'|'model', text:'...'}]
 * @returns {string} AI response text
 */
async function askGemini(userMessage, systemContext = "", history = []) {
  try {
    // Build conversation contents
    const contents = [];

    // Add system context as first exchange if provided
    if (systemContext) {
      contents.push({
        role: "user",
        parts: [{ text: "Instructions:\n" + systemContext }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I will follow these instructions." }]
      });
    }

    // Add conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 800,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Gemini error:", err);
      // Try fallback model
      return await askGeminiFallback(contents);
    }

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error);
      return await askGeminiFallback(contents);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return "I didn't receive a response. Please try again.";

    return text;

  } catch (error) {
    console.error("askGemini error:", error);
    return "Something went wrong connecting to AI. Please try again.";
  }
}

// Fallback to alternative model if primary fails
async function askGeminiFallback(contents) {
  const fallbackModels = [
    "gemini-2.0-flash",
    "gemini-1.5-pro"
  ];

  for (const model of fallbackModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 800 } })
        }
      );
      const d = await res.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      continue;
    }
  }
  return "AI is temporarily unavailable. Please use the booking form directly.";
}

// ── VISITOR AI ──────────────────────────────────────────────────────────────
// Call this from visitor dashboard
async function askVisitorAI(userMessage, availableSlots = [], selectedDate = "") {
  const context = `You are MyScheduler AI assistant helping a visitor book a meeting with the owner.
Current IST date/time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? `Selected date: ${selectedDate}` : "No date selected yet."}
${availableSlots.length > 0 ? `Available slots on selected date: ${availableSlots.join(", ")}` : ""}

RULES:
- Help visitors check availability and book meetings
- Never reveal private meeting details or owner's schedule details
- Only show available vs booked (no titles/descriptions)
- Guide users to fill the booking form
- All times in IST
- Be friendly and concise`;

  return await askGemini(userMessage, context, visitorChatHistory);
}

// ── OWNER AI ────────────────────────────────────────────────────────────────
// Call this from owner dashboard
async function askOwnerAI(userMessage, scheduleData = "", pendingRequests = "") {
  const context = `You are MyScheduler AI assistant for the owner/admin.
Current IST date/time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.

UPCOMING SCHEDULE:
${scheduleData || "No upcoming events"}

PENDING REQUESTS:
${pendingRequests || "No pending requests"}

RULES:
- Help owner manage their schedule and requests
- Suggest scheduling improvements
- Recommend workload balancing
- Answer questions about the schedule accurately
- Be concise and professional`;

  return await askGemini(userMessage, context, ownerChatHistory);
}

// Chat history arrays (session-based)
let visitorChatHistory = [];
let ownerChatHistory = [];

// Save chat message to Supabase
async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message,
      role,        // 'user' or 'assistant'
      user_type: userType,  // 'visitor' or 'owner'
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.log("Chat save skipped:", e.message);
  }
}
