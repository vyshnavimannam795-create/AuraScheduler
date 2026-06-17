// Owner button
const ownerBtn = document.getElementById("ownerBtn");
const passwordModal = document.getElementById("passwordModal");

ownerBtn.addEventListener("click", () => {
    passwordModal.classList.remove("hidden");
});
async function loadChats(){

const {data,error} =
await supabaseClient
.from("chat_history")
.select("*");

console.log(data);

}
async function sendMessage() {

const input =
document.getElementById("userMessage");

const chatBox =
document.getElementById("chatBox");

const question = input.value;

const answer = await askGemini(question);

chatBox.innerHTML += `
<div class="bg-slate-800 p-3 rounded-xl">
<b>You:</b> ${question}
</div>

<div class="bg-indigo-700 p-3 rounded-xl">
<b>AI:</b> ${answer}
</div>
`;
saveChat(question,"visitor");
saveChat(answer,"visitor");
input.value = "";

}
// Password check button
const loginBtn = document.querySelector("#passwordModal button");

loginBtn.addEventListener("click", () => {

    const password =
        document.getElementById("ownerPassword").value;

    if (password === "Usharama@7505") {

        window.location.href = "owner.html";

    } else {

        alert("Incorrect Password");

    }

});


// Disable past dates
const dateInput = document.querySelector('input[type="date"]');

if (dateInput) {

    const today = new Date().toISOString().split("T")[0];

    dateInput.min = today;
}


// Time validation
const timeInputs = document.querySelectorAll('input[type="time"]');

if (timeInputs.length === 2) {

    const startTime = timeInputs[0];
    const endTime = timeInputs[1];

    endTime.addEventListener("change", () => {

        if (endTime.value <= startTime.value) {

            alert("End time must be greater than Start time");

            endTime.value = "";

        }

    });

}