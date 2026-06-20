// gemini.js — AI Integration using Claude API (via Anthropic)
// No quota issues, no API key needed from user

let visitorChatHistory = [];
let ownerChatHistory   = [];

async function askGemini(userMessage, systemContext = "", history = []) {
  const messages = [];

  // Add history (last 8 messages)
  for (const msg of history.slice(-8)) {
    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: String(msg.text || "")
    });
  }

  // Add current message
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemContext || "You are a helpful scheduling assistant.",
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn("Claude API error:", response.status, err);
      return getSmartFallback(userMessage);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (text) { console.log("✅ AI responded via Claude"); return text; }

  } catch (e) {
    console.warn("Claude API exception:", e.message);
  }

  return getSmartFallback(userMessage);
}

function getSmartFallback(msg) {
  const m = msg.toLowerCase();
  if (m.includes("today") || m.includes("schedule"))
    return "Please select today's date on the calendar to view your schedule.";
  if (m.includes("free") || m.includes("available"))
    return "Select a date on the calendar — green slots are available to book.";
  if (m.includes("book") || m.includes("meeting"))
    return "Click any available (green) slot on the timeline to open the booking form.";
  if (m.includes("cancel"))
    return "Find the slot in the day schedule and click the Cancel button.";
  if (m.includes("pending") || m.includes("request"))
    return "Check the Requests tab in the Owner Dashboard for pending bookings.";
  return "Please use the dashboard controls directly to manage your schedule.";
}

async function askVisitorAI(userMessage, bookedSlots = [], selectedDate = "") {
  const context = `You are MyScheduler AI helping a visitor book a meeting with the owner.
Current IST: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? "Selected date: " + selectedDate : "No date selected yet."}
${bookedSlots.length ? "Unavailable/booked slots: " + bookedSlots.join(", ") : "All slots available on selected date."}

RULES:
- NEVER reveal private meeting titles, descriptions, or visitor names
- For booked slots: only say "Booked" — no other details
- Guide visitors to click available slots and fill the booking form
- Keep responses short, friendly, and helpful
- All times must be shown in IST`;
  return await askGemini(userMessage, context, visitorChatHistory);
}

async function askOwnerAI(userMessage, scheduleText = "", pendingText = "") {
  const context = `You are MyScheduler AI assistant for the owner/admin.
Current IST: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.

UPCOMING SCHEDULE:
${scheduleText || "No upcoming events"}

PENDING REQUESTS:
${pendingText || "No pending requests"}

Help the owner manage their schedule, understand pending requests, and make scheduling decisions. Be concise and professional.`;
  return await askGemini(userMessage, context, ownerChatHistory);
}

async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message, role, user_type: userType,
      created_at: new Date().toISOString()
    }]);
  } catch (e) { /* non-critical */ }
}
