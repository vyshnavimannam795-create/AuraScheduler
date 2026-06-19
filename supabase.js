// supabase.js — Database Connection
const SUPABASE_URL = "https://jcnqistogwhpaocxxolt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnFpc3RvZ3docGFvY3h4b2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM0NTIsImV4cCI6MjA5NzI0OTQ1Mn0.qqfxRf9EcnXdsAD8MTfjLZoIIpYOuOQuap3V0Q_HB5M";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
