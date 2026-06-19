# MyScheduler — Fix Documentation

## Files Changed
| File | What Changed |
|------|-------------|
| `gemini.js` | Fixed API key, correct model, system prompts, fallback models, chat history |
| `supabase.js` | Added real credentials |
| `index.html` | Working calendar, slots, booking form, visitor AI chat, past requests |
| `owner.html` | Working AI chat, request approve/reject/cancel, stats, email setup |
| `chat_history_table.sql` | New table for chat persistence |

---

## Root Cause — AI Issue
1. `GEMINI_API_KEY` was placeholder `"YOUR_GEMINI_API_KEY"`
2. Model `gemini-2.0-flash` was failing on free tier
3. No system prompt — AI had no context about scheduling
4. No conversation history — each message was standalone
5. No fallback model if primary fails

**Fix:** Real key + `gemini-1.5-flash` as primary + system prompts + history array + fallback models

---

## Root Cause — Email Issue
Email was never integrated — no email service was set up.

**Fix Options (choose one):**

### Option A: EmailJS (FREE — Recommended, 200 emails/month)
1. Go to [emailjs.com](https://emailjs.com) → Sign up free
2. Add Email Service (Gmail works)
3. Create Email Template with these variables:
   - `{{to_email}}`, `{{to_name}}`, `{{subject}}`, `{{message}}`
   - `{{meeting_date}}`, `{{start_time}}`, `{{end_time}}`, `{{status}}`
4. In `owner.html`, uncomment the EmailJS section and fill in:
   ```js
   const EMAILJS_SERVICE_ID = "service_xxxxx";
   const EMAILJS_TEMPLATE_ID = "template_xxxxx";
   const EMAILJS_PUBLIC_KEY = "xxxxxxxxxxxxxx";
   ```
5. Add EmailJS script to `owner.html` `<head>`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
   ```

### Option B: Supabase Edge Function (Advanced)
- Requires Supabase Pro or free tier Edge Functions
- More complex but fully server-side

---

## Supabase SQL — Run This
```sql
-- In Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  user_type TEXT CHECK (user_type IN ('visitor', 'owner')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
```

---

## Upload to GitHub
Upload these 5 files (replace existing):
1. `index.html` → root
2. `owner.html` → root
3. `gemini.js` → root
4. `supabase.js` → root
5. `api/gemini.js` → api folder (for Vercel proxy — keep existing)

---

## Testing Checklist
- [ ] Open site → Visitor Dashboard loads
- [ ] Click "Owner Dashboard" → Password modal appears
- [ ] Wrong password → Error shows
- [ ] Correct password `Usharama@7505` → Owner Dashboard opens
- [ ] "Return to Visitor Dashboard" → Goes back
- [ ] Select future date → Slots appear
- [ ] Past dates → Not clickable
- [ ] Click slot → Booking form appears
- [ ] Submit booking → Appears in Supabase
- [ ] Owner approves → Status changes to accepted
- [ ] Visitor checks "My Past Requests" → Shows accepted status
- [ ] AI chat (visitor) → Responds correctly
- [ ] AI chat (owner) → Shows schedule context
