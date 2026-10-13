const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => n.toLocaleString("ru-RU").replace(/\u00a0/g, " ");
const subj = id => SUBJECTS.find(s => s.id === id);
const state = { fav: new Set(JSON.parse(localStorage.getItem("fav") || "[]")), sel: null };

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* THEME */
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.dataset.theme = saved;
const themeBtn = $("#themeToggle");
const syncTheme = () => themeBtn.textContent = root.dataset.theme === "dark" ? "🌙" : "☀️";
syncTheme();
themeBtn.onclick = () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme); syncTheme();
};
$("#burger").onclick = () => $("#navLinks").classList.toggle("open");
$$("#navLinks a").forEach(a => a.onclick = () => $("#navLinks").classList.remove("open"));

/* DERIVED TUTOR DATA */
const LANGS = { ielts: [["O‘zbek", "Native"], ["Ingliz", "Advanced"]], rus: [["Rus", "Native"], ["O‘zbek", "Intermediate"]], arab: [["O‘zbek", "Native"], ["Arab", "Advanced"]] };
const TAGS = ["Sabrli", "Ilhomlantiruvchi", "Do‘stona", "Talabchan", "Tushunarli"];
TUTORS.forEach((t, i) => {
  const p = t.name.split(" ");
  t.short = p[0] + " " + (p[1] || "")[0] + ".";
  t.langs = LANGS[t.subject] || [["O‘zbek", "Native"], ["Rus", "Advanced"]];
  t.lessons = t.students * 8 + t.reviews * 3;
  t.super = t.rating >= 4.8;
  t.tag = TAGS[i % TAGS.length];
  t.recent = 6 + (t.id * 3) % 14;
});

/* MODALS */
let authPollInterval = null;
const overlay = $("#overlay"), body = $("#modalBody");
const closeModal = () => {
  if (authPollInterval) clearInterval(authPollInterval);
  overlay.hidden = true;
};
$("#modalX").onclick = closeModal;
overlay.onclick = e => { if (e.target === overlay) closeModal(); };
document.addEventListener("keydown", e => e.key === "Escape" && closeModal());

/* ==========================================================================
   TELEGRAM AUTHENTICATION ENGINE (@Ustozhubuzbot)
   ========================================================================== */
const auth = {
  user: JSON.parse(localStorage.getItem("uztutor_user") || "null"),
  token: localStorage.getItem("uztutor_token") || null
};

function renderUserNav() {
  const area = $("#userNavArea");
  if (!area) return;

  if (auth.user) {
    const initials = (auth.user.first_name || "U")[0].toUpperCase();
    const displayName = auth.user.first_name || "Foydalanuvchi";
    const usernameDisplay = auth.user.username ? "@" + auth.user.username : "ID: " + auth.user.id;

    area.innerHTML = `
      <div class="user-menu-wrap">
        <button class="user-chip-btn" id="userChipBtn" aria-label="Foydalanuvchi menyusi" aria-expanded="false">
          <span class="user-avatar-small">${initials}</span>
          <span class="user-name-text">${displayName}</span>
          <span class="chevron-down">▾</span>
        </button>
        <div class="user-dropdown glass" id="userDropdown" hidden>
          <div class="dropdown-header">
            <b>${displayName} ${auth.user.last_name || ""}</b>
            <small>${usernameDisplay}</small>
          </div>
          <div class="dropdown-divider"></div>
          <a href="classroom.html" class="dropdown-item">🎓 Mening dars xonam</a>
          <a href="tutors.html" class="dropdown-item">🔍 Ustoz qidirish</a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item danger" id="logoutBtn">🚪 Chiqish</button>
        </div>
      </div>
    `;

    const chip = $("#userChipBtn");
    const drop = $("#userDropdown");
    if (chip && drop) {
      chip.onclick = (e) => {
        e.stopPropagation();
        const isOpen = !drop.hidden;
        drop.hidden = isOpen;
        chip.setAttribute("aria-expanded", String(!isOpen));
      };
      document.addEventListener("click", () => {
        if (drop) drop.hidden = true;
        if (chip) chip.setAttribute("aria-expanded", "false");
      });
    }

    const logout = $("#logoutBtn");
    if (logout) {
      logout.onclick = () => {
        if (auth.token) {
          fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: auth.token })
          }).catch(() => {});
        }
        localStorage.removeItem("uztutor_user");
        localStorage.removeItem("uztutor_token");
        auth.user = null;
        auth.token = null;
        renderUserNav();
        toast("👋 Tizimdan chiqdingiz");
      };
    }
  } else {
    area.innerHTML = `
      <button class="btn btn--primary btn--sm" id="openAuthBtn" aria-label="Telegram orqali kirish">
        <span>✈️</span> Kirish
      </button>
    `;
    const btn = $("#openAuthBtn");
    if (btn) btn.onclick = openTelegramAuthModal;
  }
}

async function openTelegramAuthModal() {
  if (authPollInterval) clearInterval(authPollInterval);
  overlay.hidden = false;
  body.innerHTML = `
    <div class="tg-auth-modal">
      <div class="tg-icon-badge">✈️</div>
      <h3>Telegram orqali kirish</h3>
      <p class="msub">Parolsiz va xavfsiz. Telegram botimiz bir martalik tasdiqlash kodini yuboradi.</p>
      <div style="padding: 20px; text-align: center;"><span class="spin"></span> Bot ma’lumotlari yuklanmoqda...</div>
    </div>
  `;

  try {
    const res = await fetch("/api/auth/session").then(r => r.json());
    if (!res.ok) throw new Error("Sessiya yaratib bo‘lmadi");

    const deepLink = res.deepLink;
    const botUser = res.botUsername || "Ustozhubuzbot";
    const sessionId = res.sessionId;

    body.innerHTML = `
      <div class="tg-auth-modal">
        <div class="tg-icon-badge">✈️</div>
        <h3>Telegram orqali kirish</h3>
        <p class="msub">Parolsiz va xavfsiz. Telegram botimiz bir martalik tasdiqlash kodini yuboradi.</p>

        <div class="tg-steps">
          <div class="tg-step">
            <span class="tg-num">1</span>
            <div style="flex:1">
              <b>Telegram botga kiring</b>
              <p>Tugmani bosing yoki Telegramda <code>@${botUser}</code> ni ochib <code>/start</code> yuboring.</p>
              <a href="${deepLink}" target="_blank" rel="noopener" class="btn--tg" id="openBotBtn">
                <span>✈️</span> Telegramda botni ochish
              </a>
            </div>
          </div>

          <div class="tg-step">
            <span class="tg-num">2</span>
            <div style="flex:1">
              <b>Bot bergan 6 xonali kodni kiriting</b>
              <div class="otp-inputs" id="otpInputs">
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" autocomplete="one-time-code" autofocus />
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" />
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" />
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" />
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" />
                <input type="text" maxlength="1" inputmode="numeric" class="otp-box" />
              </div>
              <div class="otp-status" id="otpStatus"></div>
            </div>
          </div>
        </div>

        <div class="tg-actions">
          <button class="btn btn--primary" id="verifyOtpBtn" disabled>Tasdiqlash va kirish</button>
        </div>

        <div class="tg-footer-note">
          <small>🔒 Telegram akkauntingiz ma’lumotlari himoyalangan va xavfsiz saqlanadi.</small>
        </div>
      </div>
    `;

    const boxes = $$(".otp-box", body);
    const status = $("#otpStatus");
    const verifyBtn = $("#verifyOtpBtn");

    if (boxes[0]) boxes[0].focus();

    const getCode = () => boxes.map(b => b.value).join("");

    const checkFilled = () => {
      const code = getCode();
      if (code.length === 6) {
        verifyBtn.disabled = false;
        triggerVerification(code);
      } else {
        verifyBtn.disabled = true;
        status.textContent = "";
        status.className = "otp-status";
      }
    };

    boxes.forEach((box, idx) => {
      box.addEventListener("input", e => {
        const val = e.target.value.replace(/\D/g, "");
        box.value = val ? val[0] : "";
        box.classList.toggle("filled", !!box.value);
        if (box.value && idx < 5) boxes[idx + 1].focus();
        checkFilled();
      });

      box.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !box.value && idx > 0) {
          boxes[idx - 1].focus();
          boxes[idx - 1].value = "";
          boxes[idx - 1].classList.remove("filled");
          checkFilled();
        }
      });

      box.addEventListener("paste", e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        if (pasted.length >= 6) {
          pasted.slice(0, 6).split("").forEach((ch, i) => {
            if (boxes[i]) {
              boxes[i].value = ch;
              boxes[i].classList.add("filled");
            }
          });
          checkFilled();
        }
      });
    });

    async function triggerVerification(code) {
      status.textContent = "Tekshirilmoqda...";
      status.className = "otp-status";
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span class="spin"></span> Kirilmoqda...`;

      try {
        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code })
        }).then(r => r.json());

        if (verifyRes.ok) {
          onAuthSuccess(verifyRes.user, verifyRes.token);
        } else {
          status.textContent = verifyRes.error || "Kod noto‘g‘ri yoki muddati o‘tgan";
          status.className = "otp-status error";
          verifyBtn.disabled = false;
          verifyBtn.textContent = "Tasdiqlash va kirish";
          boxes.forEach(b => { b.value = ""; b.classList.remove("filled"); });
          if (boxes[0]) boxes[0].focus();
        }
      } catch (err) {
        status.textContent = "Tarmoq xatosi, qaytadan urinib ko‘ring";
        status.className = "otp-status error";
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Tasdiqlash va kirish";
      }
    }

    verifyBtn.onclick = () => triggerVerification(getCode());

    function onAuthSuccess(user, token) {
      if (authPollInterval) clearInterval(authPollInterval);
      auth.user = user;
      auth.token = token;
      localStorage.setItem("uztutor_user", JSON.stringify(user));
      localStorage.setItem("uztutor_token", token);
      renderUserNav();

      body.innerHTML = `
        <div class="success" style="padding: 30px 10px;">
          <div class="tick">✓</div>
          <h3>Xush kelibsiz, ${user.first_name}!</h3>
          <p class="msub">Telegram akkauntingiz (@${user.username || user.first_name}) orqali muvaffaqiyatli tizimga kirdingiz.</p>
          <button class="btn btn--primary" id="continueBtn" style="margin-top:14px; width:100%;">Davom etish</button>
        </div>
      `;
      $("#continueBtn").onclick = closeModal;
      toast(`🎉 Xush kelibsiz, ${user.first_name}!`);
    }

    // Auto-poll in case user clicked "Telegramda botni ochish" on the same device
    authPollInterval = setInterval(async () => {
      try {
        const poll = await fetch(`/api/auth/poll?sessionId=${sessionId}`).then(r => r.json());
        if (poll.ok && poll.status === "authenticated" && poll.user) {
          onAuthSuccess(poll.user, poll.token);
        }
      } catch (e) {}
    }, 1500);

  } catch (err) {
    body.innerHTML = `
      <div style="padding:30px; text-align:center;">
        <h4 style="color:var(--color-danger)">Ulanishda xatolik</h4>
        <p class="msub">Bot bilan aloqa o‘rnatilmadi. Qaytadan urinib ko‘ring.</p>
        <button class="btn btn--primary" onclick="openTelegramAuthModal()">Qayta urinish</button>
      </div>
    `;
  }
}

// Initial nav render
renderUserNav();

function openProfile(id) {
  const t = TUTORS.find(x => x.id === id); overlay.hidden = false;
  body.innerHTML = `<div class="profile-head"><div class="photo" style="--a:${t.colors[0]};--b:${t.colors[1]}">${t.initials}</div>
    <div><h3>${t.name}</h3><p class="msub" style="margin:2px 0">${t.title}</p><b>${t.rating} ★</b> · ${t.reviews} sharh</div></div>
    <p>${t.bio}</p>
    <div class="label">Yutuqlar</div><div class="opts">${t.badges.map(b => `<div class="opt">${b}</div>`).join("")}</div>
    <div class="label">Sharhlar</div>
    <div class="rev"><b>Aziza M. ★★★★★</b>Juda tushunarli tushuntiradi, natijani 2 oyda ko‘rdim.</div>
    <div class="rev"><b>Rustam T. ★★★★★</b>Darslar qiziqarli, jadval moslashuvchan.</div>
    <button class="btn btn--primary" id="pBook" style="margin-top:14px">Sinov darsini band qilish</button>`;
  $("#pBook").onclick = () => openBooking(id);
}

function openBooking(id) {
  const t = TUTORS.find(x => x.id === id);
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; });
  const dn = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
  const b = { step: 1, day: 0, time: null, format: t.formats[0], pay: "click", lessons: 1 };
  overlay.hidden = false;
  const prog = () => `<div class="prog">${[1, 2, 3].map(i => `<i class="${i <= b.step ? "on" : ""}"></i>`).join("")}</div>`;
  const unit = () => b.format === "group" ? t.groupPrice : t.price;
  const total = () => { const s = unit() * b.lessons; return b.lessons >= 8 ? Math.round(s * .85) : s; };
  const ds = d => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;

  function draw() {
    if (b.step === 1) {
      body.innerHTML = `<h3>${t.name}</h3><p class="msub">${t.title}</p>${prog()}
        <div class="label">Kunni tanlang</div>
        <div class="opts">${days.map((d, i) => `<div class="opt ${b.day === i ? "sel" : ""}" data-day="${i}">${dn[d.getDay()]}<small>${ds(d)}</small></div>`).join("")}</div>
        <div class="label">Vaqtni tanlang</div>
        <div class="opts">${t.slots.map(s => `<div class="opt ${b.time === s ? "sel" : ""}" data-time="${s}">${s}</div>`).join("")}</div>
        <button class="btn btn--primary" id="next">Davom etish</button>`;
      $$("[data-day]").forEach(e => e.onclick = () => { b.day = +e.dataset.day; draw(); });
      $$("[data-time]").forEach(e => e.onclick = () => { b.time = e.dataset.time; draw(); });
      $("#next").onclick = () => b.time ? (b.step = 2, draw()) : toast("Iltimos, vaqtni tanlang");
    } else if (b.step === 2) {
      body.innerHTML = `<h3>Format va paket</h3><p class="msub">Sizga mos variantni tanlang</p>${prog()}
        ${t.formats.map(f => `<div class="opt wide ${b.format === f ? "sel" : ""}" data-f="${f}"><b>${f === "solo" ? "Yakka (1-ga-1)" : "Mini-guruh (3–5 kishi)"}</b><small>${fmt(f === "solo" ? t.price : t.groupPrice)} so‘m / soat</small></div>`).join("")}
        <div class="label">Darslar soni</div>
        <div class="opts">${[1, 4, 8, 12].map(n => `<div class="opt ${b.lessons === n ? "sel" : ""}" data-n="${n}">${n} ta${n >= 8 ? "<small>−15%</small>" : ""}</div>`).join("")}</div>
        <div class="sum"><div class="tot"><span>Jami</span><span>${fmt(total())} so‘m</span></div></div>
        <button class="btn btn--primary" id="next">To‘lovga o‘tish</button>`;
      $$("[data-f]").forEach(e => e.onclick = () => { b.format = e.dataset.f; draw(); });
      $$("[data-n]").forEach(e => e.onclick = () => { b.lessons = +e.dataset.n; draw(); });
      $("#next").onclick = () => { b.step = 3; draw(); };
    } else if (b.step === 3) {
      body.innerHTML = `<h3>To‘lov</h3><p class="msub">Mahalliy to‘lov tizimini tanlang</p>${prog()}
        <div class="sum">
          <div><span>Ustoz</span><span>${t.name}</span></div>
          <div><span>Sana</span><span>${ds(days[b.day])} · ${b.time}</span></div>
          <div><span>Format</span><span>${b.format === "solo" ? "1-ga-1" : "Mini-guruh"} × ${b.lessons}</span></div>
          <div class="tot"><span>To‘lov</span><span>${fmt(total())} so‘m</span></div>
        </div>
        <div class="opts">${["click", "payme", "uzum"].map(p => `<div class="opt ${b.pay === p ? "sel" : ""}" data-p="${p}">${p[0].toUpperCase() + p.slice(1)}</div>`).join("")}</div>
        <input class="field" id="phone" placeholder="+998 90 123 45 67" value="+998 " inputmode="tel" />
        <div class="escrow">🔒 Pul dars o‘tguncha platformada saqlanadi. Ustoz kelmasa — to‘liq qaytariladi.</div>
        <button class="btn btn--primary" id="pay">${fmt(total())} so‘m to‘lash</button>`;
      $$("[data-p]").forEach(e => e.onclick = () => { b.pay = e.dataset.p; const v = $("#phone").value; draw(); $("#phone").value = v; });
      $("#pay").onclick = () => {
        if ($("#phone").value.replace(/\D/g, "").length < 12) return toast("Telefon raqamni to‘liq kiriting");
        $("#pay").innerHTML = `<span class="spin"></span> Tekshirilmoqda...`;
        setTimeout(() => { b.step = 4; draw(); }, 1500);
      };
    } else {
      body.innerHTML = `<div class="success"><div class="tick">✓</div><h3>Dars band qilindi!</h3>
        <p class="msub">${t.name} bilan ${ds(days[b.day])} kuni soat ${b.time} da uchrashasiz.<br/>To‘lov: ${b.pay.toUpperCase()} · ${fmt(total())} so‘m</p>
        <a href="classroom.html" class="btn btn--primary" id="goRoom">Dars xonasiga kirish</a></div>`;
      $("#goRoom").onclick = closeModal;
      setTimeout(() => toast("✈️ Telegram: “Dars 15 daqiqadan so‘ng boshlanadi” eslatmasi yoqildi"), 800);
    }
  }
  draw();
}
