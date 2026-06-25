// gemini.js — AI Integration
// Uses Gemini API directly from browser (correct approach)

let visitorChatHistory = [];
let ownerChatHistory   = [];

const GEMINI_KEY = "AQ.Ab8RN6JRbDf0MTqiMdH6Q1jLWogSif-4HT6ANLDSWzchzZqB_g";
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b"
];

// ── Core AI call ──────────────────────────────────────────────
async function askGemini(userMessage, systemContext = "", history = []) {
  const contents = [];

  // Inject system context as first exchange (works on free tier)
  if (systemContext) {
    contents.push({ role: "user",  parts: [{ text: systemContext }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
  }

  // Add conversation history
  for (const msg of history.slice(-8)) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.text || "") }]
    });
  }

  // Add current message
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  // Try each model in order
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 800, temperature: 0.8 }
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        console.warn(`[${model}] error:`, data.error.message);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`✅ AI responded via ${model}`);
        return formatAIResponse(text);
      }
    } catch (e) {
      console.warn(`[${model}] exception:`, e.message);
      continue;
    }
  }

  // All models failed — smart context-aware fallback
  return smartFallback(userMessage);
}

// ── Format response — bold, bullets, clean ────────────────────
function formatAIResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,     "<em>$1</em>")
    .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
    .replace(/^[-•]\s+(.+)$/gm,   "• $1")
    .replace(/\n/g, "<br>")
    .replace(/(<br>){3,}/g, "<br><br>");
}

// ── Smart fallback — context-aware, not generic ───────────────
function smartFallback(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("hi") || m.includes("hello") || m.includes("hey"))
    return "👋 Hi! I'm your MyScheduler assistant. I can help you check availability, book a meeting, or answer scheduling questions. What would you like to do?";
  if (m.includes("ela") || m.includes("unnav") || m.includes("how are"))
    return "😊 I'm doing great, thank you for asking! I'm here to help you schedule meetings. Would you like to book a slot or check availability?";
  if (m.includes("today") || m.includes("schedule"))
    return "📅 Select today's date on the calendar to view available slots!";
  if (m.includes("free") || m.includes("available") || m.includes("slot"))
    return "✅ Green slots on the timeline are available to book. Yellow slots have pending requests. Red slots are booked.";
  if (m.includes("book") || m.includes("meeting") || m.includes("request"))
    return "📝 Click any <strong>green (Available)</strong> slot on the timeline. A booking form will open — fill in your name, email, and meeting purpose.";
  if (m.includes("pending"))
    return "⏳ Yellow slots show pending requests. You can still request that time — the owner will review all requests and choose one.";
  if (m.includes("cancel"))
    return "❌ Only the owner can cancel meetings. You can check your request status in the 'My Past Requests' section below the calendar.";
  if (m.includes("email") || m.includes("notification"))
    return "📧 You'll receive an email confirmation after submitting your request. The owner will also email you when they approve or reject it.";
  if (m.includes("how") || m.includes("help") || m.includes("what"))
    return "🤖 I can help you:<br>• <strong>Check availability</strong> — select any date on the calendar<br>• <strong>Book a meeting</strong> — click a green slot<br>• <strong>Track your request</strong> — use 'My Past Requests'<br>• <strong>Answer questions</strong> — just ask me!";
  return "🤖 I'm your scheduling assistant! Select a date on the calendar to see available slots, then click a green slot to book a meeting. How can I help?";
}

// ── Visitor AI ────────────────────────────────────────────────
async function askVisitorAI(userMessage, bookedSlots = [], selectedDate = "") {
  const context = `You are a warm, helpful AI scheduling assistant for MyScheduler.
Current IST time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? `User is viewing date: ${selectedDate}` : "No date selected yet."}
${bookedSlots.length ? `Booked/unavailable slots: ${bookedSlots.join(", ")}` : selectedDate ? "All slots available on this date." : ""}

IMPORTANT RULES:
- Talk like a real friendly human assistant, NOT a robot
- NEVER reveal private meeting titles, descriptions, or visitor names from booked slots
- For booked slots: only say "that slot is booked" — no other details
- Answer greetings naturally (hi, hello, how are you etc.)
- Guide visitors to click available green slots to book
- Keep responses conversational, warm and concise
- Use bullet points only when listing multiple things
- All times in IST
- If someone asks in Telugu/informal language, understand and reply in English naturally`;

  return await askGemini(userMessage, context, visitorChatHistory);
}

// ── Owner AI ──────────────────────────────────────────────────
async function askOwnerAI(userMessage, scheduleText = "", pendingText = "") {
  const context = `You are a professional AI scheduling assistant for the owner of MyScheduler.
Current IST time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.

UPCOMING SCHEDULE:
${scheduleText || "No upcoming events."}

PENDING BOOKING REQUESTS:
${pendingText || "No pending requests."}

RULES:
- Be professional, proactive and concise
- Answer greetings naturally
- Summarize schedule clearly when asked
- Identify conflicts and suggest solutions
- Help owner decide which requests to approve
- Format with bullet points for lists
- All times in IST`;

  return await askGemini(userMessage, context, ownerChatHistory);
}

// ── Save to Supabase ──────────────────────────────────────────
async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message: message.replace(/<[^>]*>/g, ""),
      role,
      user_type: userType,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.log("Chat save skipped:", e.message);
  }
}
