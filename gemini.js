const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

async function askGemini(userMessage) {

try {

const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
{
method: "POST",

headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({
contents: [
{
parts: [
{
text: userMessage
}
]
}
]
})
}
);

const data = await response.json();

return data.candidates[0].content.parts[0].text;

}
catch(error){

return "Something went wrong.";

}

}