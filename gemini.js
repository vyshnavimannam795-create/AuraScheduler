// ============================================================
// gemini.js — AI Integration (Fixed & Production Ready)
// Uses Claude API as primary (no quota issues)
// Clean formatted responses, proper loading, error handling
// ============================================================

let visitorChatHistory = [];
let ownerChatHistory   = [];

// ── Core AI function ─────────────────────────────────────────
async function askGemini(userMessage, systemContext = "", history = []) {
  // Build messages array (last 8 for context window)
  const messages = [];
  for (const msg of history.slice(-8)) {
    messages.push({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: String(msg.text || "")
    });
  }
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
        system: systemContext || "You are a helpful scheduling assistant for MyScheduler.",
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn("AI API error:", response.status, err?.error?.message || "");
      throw new Error("API error " + response.status);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "";
    if (!raw) throw new Error("Empty response");

    // Clean and format the response
    return formatAIResponse(raw);

  } catch (e) {
    console.warn("AI error:", e.message);
    return smartFallback(userMessage);
  }
}

// ── Format raw AI text into clean readable HTML ───────────────
function formatAIResponse(text) {
  return text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic *text*
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Bullet points starting with - or •
    .replace(/^[\-•]\s+(.+)$/gm, "• $1")
    // Newlines to <br>
    .replace(/\n/g, "<br>")
    // Clean up multiple <br>
    .replace(/(<br>){3,}/g, "<br><br>");
}

// ── Smart fallback when AI unavailable ────────────────────────
function smartFallback(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("today") || m.includes("schedule"))
    return "📅 Please select today's date on the calendar to view your schedule.";
  if (m.includes("free") || m.includes("available"))
    return "✅ Select a date on the calendar — green slots are available to book.";
  if (m.includes("book") || m.includes("meeting") || m.includes("request"))
    return "📝 Click any <strong>available (green)</strong> slot on the timeline to open the booking form.";
  if (m.includes("cancel"))
    return "✕ Find the slot in the day schedule and click the <strong>Cancel</strong> button.";
  if (m.includes("pending") || m.includes("request") || m.includes("approve"))
    return "📬 Check the <strong>Requests tab</strong> in the Owner Dashboard for pending bookings.";
  if (m.includes("help") || m.includes("what can"))
    return "👋 I can help you:<br>• Check slot availability<br>• Guide you through booking<br>• Answer scheduling questions<br><br>Try selecting a date on the calendar!";
  return "I'm here to help with scheduling! Try asking about available slots, how to book a meeting, or checking your schedule.";
}

// ── Visitor AI — knows only availability, no private details ──
async function askVisitorAI(userMessage, bookedSlots = [], selectedDate = "") {
  const context = `You are a friendly AI scheduling assistant for MyScheduler.
Current IST time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.
${selectedDate ? `Currently viewing: ${selectedDate}` : "No date selected yet."}
${bookedSlots.length
  ? `Unavailable slots on this date: ${bookedSlots.join(", ")}`
  : selectedDate ? "All slots are available on this date." : ""}

YOUR RULES (follow strictly):
1. NEVER reveal meeting titles, descriptions, visitor names, or any private details
2. For booked slots: only say "Booked" — nothing else
3. Be warm, concise, and helpful
4. Guide visitors to click available green slots
5. Always show times in IST format
6. Format responses cleanly — use bullet points when listing things
7. If asked what you can do, list your capabilities clearly`;

  return await askGemini(userMessage, context, visitorChatHistory);
}

// ── Owner AI — has full schedule context ─────────────────────
async function askOwnerAI(userMessage, scheduleText = "", pendingText = "") {
  const context = `You are a professional AI scheduling assistant for the owner of MyScheduler.
Current IST time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
Working hours: 5:00 AM to 11:00 PM IST.

UPCOMING SCHEDULE:
${scheduleText || "No upcoming events scheduled."}

PENDING BOOKING REQUESTS:
${pendingText || "No pending requests at this time."}

YOUR ROLE:
- Help the owner understand their schedule
- Summarize pending requests clearly
- Identify scheduling conflicts
- Suggest workload balancing
- Answer questions about bookings and availability
- Be concise, professional, and proactive
- Format responses with bullet points and clear structure`;

  return await askOwnerAI_call(userMessage, context);
}

async function askOwnerAI_call(userMessage, context) {
  return await askGemini(userMessage, context, ownerChatHistory);
}

// ── Save chat to Supabase ─────────────────────────────────────
async function saveChatMessage(message, role, userType) {
  try {
    await supabaseClient.from("chat_history").insert([{
      message: message.replace(/<[^>]*>/g, ""), // strip HTML before saving
      role,
      user_type: userType,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    // Non-critical — don't break the UI
    console.log("Chat history save skipped:", e.message);
  }
}
