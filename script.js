function trackDistraction() {
  const output = document.getElementById("tracker-output");
  const randomTime = Math.floor(Math.random() * 60) + 1;
  output.textContent = `You spent ${randomTime} minutes on Instagram today. Be mindful!`;
}

function logDiary() {
  const input = document.getElementById("diaryInput");
  const list = document.getElementById("diaryEntries");

  if (input.value.trim() !== "") {
    const entry = document.createElement("li");
    entry.textContent = input.value;
    list.appendChild(entry);
    input.value = "";
  }
}

let timer;
function startTimer() {
  const display = document.getElementById("timerDisplay");
  let time = 25 * 60;

  clearInterval(timer);
  timer = setInterval(() => {
    let minutes = Math.floor(time / 60);
    let seconds = time % 60;
    display.textContent = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    time--;

    if (time < 0) {
      clearInterval(timer);
      display.textContent = "Focus session complete!";
    }
  }, 1000);
}

function showTip() {
  const tips = [
    "Leave your phone in another room for 1 hour.",
    "Turn off non-essential notifications.",
    "Take a walk without any devices.",
    "Don't check your phone first thing in the morning.",
    "Use apps like Forest or Freedom to block distractions."
  ];
  const randomIndex = Math.floor(Math.random() * tips.length);
  document.getElementById("tipText").textContent = tips[randomIndex];
}
function toggleMenu() {
  document.querySelector("nav ul").classList.toggle("show");
  document.querySelector(".menu-toggle").classList.toggle("active");
}

