// gemini.js — AI Integration
// Primary: gemini-1.5-flash-8b | Fallback: gemini-1.5-flash

const GEMINI_API_KEY = "AQ.Ab8RN6JRbDf0MTqiMdH6Q1jLWogSif-4HT6ANLDSWzchzZqB_g";
const GEMINI_PRIMARY = "gemini-1.5-flash-8b";
const GEMINI_FALLBACK = ["gemini-1.5-flash", "gemini-2.0-flash"];

async function askGemini(userMessage, systemContext = "", history = []) {
  try {
    const contents = [];

    if (systemContext) {
      contents.push({ role: "user", parts: [{ text: "Instructions:\n" + systemContext }] });
      contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    }

    for (const msg of history) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }]
      });
    }

    contents.push({ role: "user", parts: [{ text: userMessage }] });

    // Try primary model first
    const models = [GEMINI_PRIMARY, ...GEMINI_FALLBACK];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
            })
          }
        );

        const data = await response.json();
        if (data.error) { console.log(`${model} error:`, data.error.message); continue; }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { console.log("AI responded via:", model); return text; }
      } catch (e) { console.log(`${model} failed:`, e.message); continue; }
    }

    return "AI is temporarily unavailable. Please use the dashboard directly.";
  } catch (error) {
    console.error("askGemini error:", error);
    return "Something went wrong. Please try again.";
  }
}

// Visitor AI
async function askVisitorAI(userMessage, bookedSlots = [], selectedDate = "") {
  const context = `You are MyScheduler AI assistant helping a visitor book a meeting with the owner.
Current IST date/time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? `Selected date: ${selectedDate}` : "No date selected yet."}
${bookedSlots.length > 0 ? `Booked slots: ${bookedSlots.join(", ")}` : "No bookings on selected date."}
RULES: Never reveal private meeting details. Only say Booked or Available. Guide users to fill booking form. All times in IST. Be friendly and concise.`;
  return await askGemini(userMessage, context, visitorChatHistory);
}

// Owner AI
async function askOwnerAI(userMessage, scheduleData = "", pendingRequests = "") {
  const context = `You are MyScheduler AI assistant for the owner/admin.
Current IST date/time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
UPCOMING SCHEDULE:\n${scheduleData || "No upcoming events"}
PENDING REQUESTS:\n${pendingRequests || "No pending requests"}
RULES: Help owner manage schedule. Give scheduling suggestions. Answer accurately. Be concise and professional.`;
  return await askGemini(userMessage, context, ownerChatHistory);
}

let visitorChatHistory = [];
let ownerChatHistory = [];

async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message, role, user_type: userType, created_at: new Date().toISOString()
    }]);
  } catch (e) { console.log("Chat save skipped:", e.message); }
}
