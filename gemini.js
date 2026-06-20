// gemini.js — AI Integration (Production Ready)
// Model: gemini-2.0-flash-exp (closest to Gemini 3 Flash Preview available via free API)
// Fallback chain: gemini-1.5-flash → gemini-1.5-flash-8b

const GEMINI_API_KEY = "AQ.Ab8RN6JRbDf0MTqiMdH6Q1jLWogSif-4HT6ANLDSWzchzZqB_g";
// Note: "gemini-3-flash-preview" is not yet in public API.
// Using gemini-2.0-flash-exp which is the latest experimental = closest equivalent
const GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

let visitorChatHistory = [];
let ownerChatHistory   = [];

async function askGemini(userMessage, systemContext = "", history = []) {
  const contents = [];

  if (systemContext) {
    contents.push({ role: "user",  parts: [{ text: "System Instructions:\n" + systemContext }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions accurately." }] });
  }

  for (const msg of history.slice(-8)) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.text || "") }]
    });
  }

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
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
      const data = await res.json();
      if (data.error) { console.warn(`[${model}]`, data.error.message); continue; }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { console.log(`✅ AI via ${model}`); return text; }
    } catch (e) { console.warn(`[${model}]`, e.message); continue; }
  }

  // Smart fallback
  const m = userMessage.toLowerCase();
  if (m.includes("today") || m.includes("schedule")) return "Please check today's schedule by selecting today's date on the calendar.";
  if (m.includes("free") || m.includes("available")) return "Select a date on the calendar — green slots are available to book.";
  if (m.includes("book") || m.includes("meeting")) return "Click any available (green) slot to open the booking form.";
  if (m.includes("cancel")) return "Find the slot in the day schedule and click the Cancel button.";
  if (m.includes("pending") || m.includes("request")) return "Check the Requests tab in the Owner Dashboard for pending bookings.";
  return "AI is temporarily unavailable. Please use the dashboard controls directly.";
}

async function askVisitorAI(userMessage, bookedSlots = [], selectedDate = "") {
  const context = `You are MyScheduler AI helping a visitor book a meeting with the owner.
Current IST: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? "Selected date: " + selectedDate : "No date selected yet."}
${bookedSlots.length ? "Unavailable slots: " + bookedSlots.join(", ") : "All slots available on selected date."}
RULES: Never reveal private meeting details. Only say Booked/Available. Guide users to fill booking form. All times IST. Be friendly, concise.`;
  return await askGemini(userMessage, context, visitorChatHistory);
}

async function askOwnerAI(userMessage, scheduleText = "", pendingText = "") {
  const context = `You are MyScheduler AI for the owner/admin.
Current IST: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
UPCOMING SCHEDULE:
${scheduleText || "No upcoming events"}
PENDING REQUESTS:
${pendingText || "No pending requests"}
Help owner manage schedule, approve/reject requests, suggest improvements. Be concise and professional.`;
  return await askGemini(userMessage, context, ownerChatHistory);
}

async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message, role, user_type: userType, created_at: new Date().toISOString()
    }]);
  } catch (e) { /* non-critical */ }
}
