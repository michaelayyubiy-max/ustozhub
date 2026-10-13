const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

/* THEME SUPPORT */
const root = document.documentElement;
const savedTheme = localStorage.getItem("theme") || "dark";
root.dataset.theme = savedTheme;
const themeBtn = $("#themeToggle");
const syncTheme = () => {
  if (themeBtn) themeBtn.textContent = root.dataset.theme === "dark" ? "🌙" : "☀️";
};
syncTheme();
if (themeBtn) {
  themeBtn.onclick = () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
    syncTheme();
  };
}

/* STUDENT IDENTITY SYNC */
const savedUser = JSON.parse(localStorage.getItem("uztutor_user") || "null");
if (savedUser) {
  const sName = $("#studentDisplayName");
  const sAvatar = $("#studentAvatar");
  if (sName) sName.textContent = `Siz (${savedUser.first_name})`;
  if (sAvatar) sAvatar.textContent = (savedUser.first_name || "S")[0].toUpperCase();
  const uArea = $("#userNavArea");
  if (uArea) {
    uArea.innerHTML = `
      <div class="user-chip-btn" style="cursor:default">
        <span class="user-avatar-small">${(savedUser.first_name || "U")[0].toUpperCase()}</span>
        <span class="user-name-text">${savedUser.first_name}</span>
      </div>
    `;
  }
}

/* TIMER */
let seconds = 0;
const timerEl = $("#cTimer");
setInterval(() => {
  seconds++;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  if (timerEl) timerEl.textContent = `${m}:${s}`;
}, 1000);

/* FULLSCREEN TOGGLE */
$("#fsBtn").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

/* VIEW TABS (Board / Slides / Vocab) */
$$(".cview-btn").forEach(btn => {
  btn.onclick = () => {
    $$(".cview-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    $$(".cview-content").forEach(c => c.classList.remove("active"));
    if (target === "board") $("#tabBoard").classList.add("active");
    if (target === "slides") $("#tabSlides").classList.add("active");
    if (target === "vocab") $("#tabVocab").classList.add("active");
  };
});

/* WHITEBOARD ENGINE */
const cv = $("#cBoard");
const ctx = cv.getContext("2d");
let currentTool = "pen";
let currentColor = "#22d3a6";
let currentSize = 5;
let isDrawing = false;
let gridActive = false;

// Setup canvas scale
function resizeCanvas() {
  const rect = cv.getBoundingClientRect();
  if (rect.width > 0) {
    // Keep internal coordinate space consistent
    cv.width = 1000;
    cv.height = 560;
    drawGrid();
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function drawGrid() {
  if (!gridActive) return;
  ctx.save();
  ctx.strokeStyle = root.dataset.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  const step = 30;
  for (let x = 0; x < cv.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); ctx.stroke();
  }
  for (let y = 0; y < cv.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke();
  }
  ctx.restore();
}

$("#gridToggleBtn").onclick = () => {
  gridActive = !gridActive;
  $("#gridToggleBtn").classList.toggle("active", gridActive);
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawGrid();
  toast(gridActive ? "📐 Katakli fon yoqildi" : "📐 Oddiy toza fon");
};

$("#downloadBoardBtn").onclick = () => {
  const link = document.createElement("a");
  link.download = `ustozhub-doska-${Date.now()}.png`;
  link.href = cv.toDataURL("image/png");
  link.click();
  toast("💾 Doska rasmi kompyuteringizga yuklandi!");
};

// Tool selection
$$(".wb-btn[data-tool]").forEach(b => {
  b.onclick = () => {
    $$(".wb-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    currentTool = b.dataset.tool;
  };
});

// Color selection
$$(".wb-color").forEach(c => {
  c.onclick = () => {
    $$(".wb-color").forEach(x => x.classList.remove("active"));
    c.classList.add("active");
    currentColor = c.dataset.color;
    if (currentTool === "eraser") {
      currentTool = "pen";
      $$(".wb-btn").forEach(x => x.classList.toggle("active", x.dataset.tool === "pen"));
    }
  };
});

// Size selection
$$(".wb-size").forEach(s => {
  s.onclick = () => {
    $$(".wb-size").forEach(x => x.classList.remove("active"));
    s.classList.add("active");
    currentSize = +s.dataset.size;
  };
});

// Clear canvas
$("#wbClearBtn").onclick = () => {
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawGrid();
  toast("🧽 Doska tozalandi");
};

// Canvas drawing events
const getPos = e => {
  const rect = cv.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return [
    (clientX - rect.left) * (cv.width / rect.width),
    (clientY - rect.top) * (cv.height / rect.height)
  ];
};

cv.addEventListener("pointerdown", e => {
  isDrawing = true;
  const [x, y] = getPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
});

cv.addEventListener("pointermove", e => {
  if (!isDrawing) return;
  const [x, y] = getPos(e);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (currentTool === "eraser") {
    ctx.strokeStyle = root.dataset.theme === "dark" ? "#0d1020" : "#ffffff";
    ctx.lineWidth = currentSize * 4;
  } else if (currentTool === "highlighter") {
    ctx.strokeStyle = currentColor + "66"; // with transparency
    ctx.lineWidth = currentSize * 3;
  } else {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentSize;
  }
  ctx.lineTo(x, y);
  ctx.stroke();
});

const stopDrawing = () => { isDrawing = false; };
cv.addEventListener("pointerup", stopDrawing);
cv.addEventListener("pointerleave", stopDrawing);

/* DEVICE DOCK CONTROLS */
let micOn = true;
let camOn = true;
let screenOn = false;
let handRaised = false;

$("#toggleMic").onclick = () => {
  micOn = !micOn;
  $("#toggleMic").classList.toggle("off", !micOn);
  $("#toggleMic .cdock-ic").textContent = micOn ? "🎙️" : "🔇";
  $("#stMicBadge").textContent = micOn ? "🎙️" : "🔇";
  toast(micOn ? "🎙️ Mikrofoningiz yoqildi" : "🔇 Mikrofoningiz o‘chirildi");
};

$("#toggleCam").onclick = () => {
  camOn = !camOn;
  $("#toggleCam").classList.toggle("off", !camOn);
  $("#toggleCam .cdock-ic").textContent = camOn ? "📹" : "📷🚫";
  $("#stCamBadge").textContent = camOn ? "📹" : "📷🚫";
  $("#studentAvatar").classList.toggle("cam-off", !camOn);
  toast(camOn ? "📹 Kamerangiz yoqildi" : "📷 Kamerangiz o‘chirildi");
};

$("#toggleScreen").onclick = () => {
  screenOn = !screenOn;
  $("#toggleScreen").classList.toggle("active-screen", screenOn);
  $("#studentScreenShare").hidden = !screenOn;
  $("#studentAvatar").hidden = screenOn;
  toast(screenOn ? "🖥️ Ekraningiz barcha qatnashuvchilarga ko‘rinmoqda" : "🖥️ Ekran ulashish to‘xtatildi");
};

$("#toggleHand").onclick = () => {
  handRaised = !handRaised;
  $("#toggleHand").classList.toggle("active-hand", handRaised);
  $("#studentHand").hidden = !handRaised;
  toast(handRaised ? "✋ Siz qo‘l ko‘tardingiz. Ustozga bildirishnoma yuborildi!" : "✋ Qo‘l tushirildi");
};

$("#toggleSidebar").onclick = () => {
  $("#cSidebar").classList.toggle("collapsed");
};

/* END CLASS CONFIRMATION */
const endModal = $("#endModal");
const showEndModal = () => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  $("#finalTime").textContent = `${m}:${s}`;
  endModal.hidden = false;
};
$("#endClassBtn").onclick = showEndModal;
$("#exitBtn").onclick = e => {
  e.preventDefault();
  showEndModal();
};
$("#cancelEndBtn").onclick = () => {
  endModal.hidden = true;
};
$("#confirmEndBtn").onclick = () => {
  endModal.hidden = true;
  toast("Dars yakunlandi! Ustozga baho qo‘yishingiz mumkin.");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1200);
};

/* SIDEBAR TABS */
$$(".cside-tab").forEach(tab => {
  tab.onclick = () => {
    $$(".cside-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.side;
    $$(".cside-view").forEach(v => v.classList.remove("active"));
    if (target === "chat") $("#sideChat").classList.add("active");
    if (target === "plan") $("#sidePlan").classList.add("active");
    if (target === "notes") $("#sideNotes").classList.add("active");
  };
});

/* CHAT LOGIC */
const chatLog = $("#cChatLog");
const chatForm = $("#cChatForm");
const chatInput = $("#cChatInput");

function addChatMessage(sender, text, isMe = false) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const msg = document.createElement("div");
  msg.className = `cmsg ${isMe ? "cmsg--me" : "cmsg--tutor"}`;
  msg.innerHTML = `
    <span class="cmsg__sender">${sender}</span>
    <div class="cmsg__bubble">${text}</div>
    <span class="cmsg__time">${time}</span>
  `;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

chatForm.onsubmit = e => {
  e.preventDefault();
  const val = chatInput.value.trim();
  if (!val) return;
  addChatMessage("Siz", val, true);
  chatInput.value = "";

  // Tutor automated intelligent response
  setTimeout(() => {
    const replies = [
      "Juda yaxshi fikr! Doskaga qarang, buni yana bir bor ta’kidlab o‘taman.",
      "Aynan shunday! Qoidani to‘g‘ri tushundingiz 👍",
      "Savolingiz o‘rinli. Keling, slayd bo‘yicha keyingi misolni ko‘raylik.",
      "Boshqa misol tuzib ko‘ra olasizmi? Masalan 'already' so‘zi bilan.",
      "Ajoyib! Speaking mashqiga o‘tamiz."
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    addChatMessage("Dilnoza Karimova (Ustoz)", reply, false);
  }, 900);
};

// Quick Reply Chips
$$(".chip-btn").forEach(chip => {
  chip.onclick = () => {
    const text = chip.dataset.reply;
    addChatMessage("Siz", text, true);
    setTimeout(() => {
      addChatMessage("Dilnoza Karimova (Ustoz)", "Tushunarli, davom etamiz! 🎯", false);
    }, 700);
  };
});

/* LESSON PLAN PROGRESS */
function updatePlanProgress() {
  const items = $$(".cplan-item input[type=checkbox]");
  const checked = items.filter(i => i.checked).length;
  const pct = Math.round((checked / items.length) * 100);
  $("#planPct").textContent = `${pct}%`;
  $("#planBarFill").style.width = `${pct}%`;
  items.forEach(input => {
    input.closest(".cplan-item").classList.toggle("done", input.checked);
  });
}
$$(".cplan-item input[type=checkbox]").forEach(cb => {
  cb.onchange = updatePlanProgress;
});
updatePlanProgress();

/* STUDENT NOTES */
const notesArea = $("#studentNotes");
const savedNotes = localStorage.getItem("ustozhub_notes");
if (savedNotes) notesArea.value = savedNotes;

notesArea.addEventListener("input", () => {
  localStorage.setItem("ustozhub_notes", notesArea.value);
});

$("#copyNotesBtn").onclick = () => {
  navigator.clipboard.writeText(notesArea.value).then(() => {
    toast("📋 Qaydlar nusxalandi!");
  }).catch(() => {
    toast("Qaydlarni nusxalashda xatolik");
  });
};

/* QUIZ LOGIC IN SLIDES */
$$(".q-opt").forEach(btn => {
  btn.onclick = () => {
    $$(".q-opt").forEach(b => b.classList.remove("selected-correct", "selected-wrong"));
    const isCorrect = btn.dataset.correct === "true";
    const feedback = $("#quizFeedback");
    if (isCorrect) {
      btn.classList.add("selected-correct");
      feedback.innerHTML = `<span style="color:var(--g)">✅ Barakalla! To‘g‘ri javob: She has already finished.</span>`;
    } else {
      btn.classList.add("selected-wrong");
      feedback.innerHTML = `<span style="color:#ff5470">❌ Noto‘g‘ri. Eslatma: "She" uchun "has" va fe’lning 3-shakli (finished) ishlatiladi.</span>`;
    }
  };
});
