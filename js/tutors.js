/* TUTOR SEARCH PAGE */
$("#fSubject").innerHTML = `<option value="all">Barcha fanlar</option>` + SUBJECTS.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
const params = new URLSearchParams(location.search);
if (params.get("subject") && subj(params.get("subject"))) $("#fSubject").value = params.get("subject");

function slotsIn(t, p) {
  const r = { morning: [6, 12], day: [12, 17], evening: [17, 24] }[p];
  return t.slots.some(s => { const h = +s.split(":")[0]; return h >= r[0] && h < r[1]; });
}
function filtered() {
  const s = $("#fSubject").value, [lo, hi] = $("#fPrice").value.split("-").map(Number), lang = $("#fLang").value,
    tm = $("#fTime").value, fm = $("#fFormat").value, v = $("#fVerified").value, q = $("#fSearch").value.toLowerCase().trim();
  const r = TUTORS.filter(t => (s === "all" || t.subject === s) && t.price >= lo && t.price <= hi &&
    (lang === "all" || t.langs.some(l => l[0] === lang)) && (tm === "all" || slotsIn(t, tm)) &&
    (fm === "all" || t.formats.includes(fm)) && (v === "all" || (v === "super" ? t.super : t.verified)) &&
    (!q || (t.name + t.title + t.bio + t.badges.join(" ")).toLowerCase().includes(q)));
  const sorters = { top: (a, b) => b.rating * Math.log(b.reviews + 2) - a.rating * Math.log(a.reviews + 2), priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating, lessons: (a, b) => b.lessons - a.lessons };
  return r.sort(sorters[$("#fSort").value]);
}

function resetFilters() {
  $("#fSubject").value = "all";
  $("#fPrice").value = "0-999999";
  $("#fLang").value = "all";
  $("#fTime").value = "all";
  $("#fFormat").value = "all";
  $("#fVerified").value = "all";
  $("#fSort").value = "top";
  $("#fSearch").value = "";
  render();
  toast("✓ Barcha filtrlar dastlabki holatga qaytarildi");
}

function render() {
  const s = $("#fSubject").value, name = s === "all" ? "Barcha fanlar" : subj(s).name;
  const list = filtered();
  $("#listTitle").textContent = `${name} — maqsad va jadvalingizga mos ustozlar (${list.length})`;
  if (!list.find(t => t.id === state.sel)) state.sel = list[0]?.id ?? null;
  $("#list").innerHTML = list.length ? list.map((t, i) => `
    <article class="pcard ${t.id === state.sel ? "sel" : ""}" data-id="${t.id}" style="animation-delay:${i * 40}ms">
      <div class="photo" style="--a:${t.colors[0]};--b:${t.colors[1]}">${t.initials}</div>
      <div class="info">
        <h3>${t.short}${t.verified ? '<span class="shield">✓</span>' : ""}<span>🇺🇿</span></h3>
        <div class="badges">${t.super ? "◎ Super ustoz" : ""}${t.super && t.verified ? '<span class="dot">•</span>' : ""}${t.verified ? "☑ Professional" : ""}</div>
        <div class="pline"><em>🎓</em>${subj(t.subject).name}</div>
        <div class="pline"><em>文</em>Biladi: ${t.langs.map(l => `${l[0]} (${l[1]})`).join(", ")}</div>
        <div class="tag">✦ ${t.tag}</div>
        <p class="bio"><b>${t.title}.</b> — ${t.bio}</p>
        <button class="more" data-profile="${t.id}">Batafsil</button>
        <div class="pop">📈 Mashhur. So‘nggi vaqtda ${t.recent} marta band qilingan</div>
      </div>
      <div class="buy">
        <div class="buy__top">
          <div class="pprice">${fmt(t.price)}<small>so‘m · 60 daqiqalik dars</small></div>
          <button class="heart" data-fav="${t.id}" aria-label="Sevimli">${state.fav.has(t.id) ? "❤️" : "🤍"}</button>
        </div>
        <div class="pstats">
          <div><b>${t.rating} ★</b><span>${t.reviews} sharh</span></div>
          <div><b>${t.students}</b><span>o‘quvchi</span></div>
          <div><b>${fmt(t.lessons)}</b><span>dars</span></div>
        </div>
        <button class="btn btn--primary" data-book="${t.id}">Sinov darsini band qilish</button>
        <button class="btn btn--ghost" data-msg="${t.id}">Xabar yuborish</button>
      </div>
    </article>`).join("") : `
    <div class="empty glass" style="padding: 48px 24px; text-align: center; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
      <div style="font-size: 42px; margin-bottom: 12px">🔍</div>
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Mos keluvchi ustoz topilmadi</h3>
      <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto 20px; font-size: 14px; line-height: 1.5;">
        Tanlangan filtrlar yoki qidiruv so‘zi bo‘yicha natija chiqmadi. Filtrlarni tozalab ko‘ring yoki narx oralig‘ini kengaytiring.
      </p>
      <button class="btn btn--primary" id="resetFiltersBtn">Filtrlarni tozalash</button>
    </div>`;
  bindActions($("#list"));
  const resetBtn = $("#resetFiltersBtn");
  if (resetBtn) resetBtn.onclick = resetFilters;

  $$(".pcard").forEach(c => c.onclick = () => {
    state.sel = +c.dataset.id;
    $$(".pcard").forEach(x => x.classList.toggle("sel", x === c)); renderSide();
  });
  renderSide();
}

function renderSide() {
  const t = TUTORS.find(x => x.id === state.sel);
  if (!t) { $("#side").innerHTML = ""; return; }
  $("#side").innerHTML = `
    <div class="video" style="--a:${t.colors[0]};--b:${t.colors[1]}" id="vid">${t.initials}
      <div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <button class="play" id="play" aria-label="Videoni ko‘rish">▶</button></div>
    <button class="btn btn--ghost" data-book="${t.id}">To‘liq jadvalni ko‘rish</button>
    <button class="btn btn--ghost" data-profile="${t.id}">${t.name.split(" ")[0]} profilini ko‘rish</button>`;
  $("#play").onclick = e => { e.stopPropagation(); $("#vid").classList.add("playing"); setTimeout(() => $("#vid")?.classList.remove("playing"), 4000); };
  bindActions($("#side"));
}

function bindActions(r) {
  $$("[data-book]", r).forEach(b => b.onclick = e => { e.stopPropagation(); openBooking(+b.dataset.book); });
  $$("[data-profile]", r).forEach(b => b.onclick = e => { e.stopPropagation(); openProfile(+b.dataset.profile); });
  $$("[data-msg]", r).forEach(b => b.onclick = e => { e.stopPropagation(); toast("💬 Xabar yuborish tez orada ishga tushadi"); });
  $$("[data-fav]", r).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const id = +b.dataset.fav; state.fav.has(id) ? state.fav.delete(id) : state.fav.add(id);
    localStorage.setItem("fav", JSON.stringify([...state.fav]));
    b.textContent = state.fav.has(id) ? "❤️" : "🤍";
  });
}
["fSubject", "fPrice", "fLang", "fTime", "fFormat", "fVerified", "fSort", "fSearch"].forEach(id => $("#" + id).addEventListener("input", render));
render();

