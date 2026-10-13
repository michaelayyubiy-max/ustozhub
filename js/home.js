/* COUNTERS */
$$("[data-count]").forEach(el => {
  const end = +el.dataset.count, dec = +(el.dataset.dec || 0);
  const t0 = performance.now();
  const tick = t => {
    const p = Math.min((t - t0) / 1600, 1), e = 1 - Math.pow(1 - p, 3);
    el.textContent = dec ? (end * e).toFixed(dec) : fmt(Math.round(end * e)) + (p === 1 ? "+" : "");
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/* CATEGORIES + HERO SEARCH (redirect to tutors page) */
$("#cats").innerHTML = SUBJECTS.map(s => `<a class="cat glass" href="tutors.html?subject=${s.id}"><span>${s.icon}</span><small>${s.name}</small></a>`).join("");
$("#quickTags").innerHTML = ["IELTS", "DTM", "Prezident maktabi", "Python"].map(t => `<button data-q="${t}">${t}</button>`).join("");
const queryMap = { ielts: "ielts", ingliz: "ielts", dtm: "math", matem: "math", prezident: "president", ona: "ona", rus: "rus", arab: "arab", python: "it", it: "it", dastur: "it", bio: "bio", kimyo: "bio" };
function heroSearch(q) {
  q = q.toLowerCase().trim();
  const key = Object.keys(queryMap).find(k => q.includes(k));
  location.href = "tutors.html" + (key ? "?subject=" + queryMap[key] : "");
}
$("#heroSearch").onsubmit = e => { e.preventDefault(); heroSearch($("#heroQuery").value); };
$$("#quickTags button").forEach(b => b.onclick = () => heroSearch(b.dataset.q));

$("#ctaTutor").onclick = () => toast("Ustozlar uchun ro‘yxatdan o‘tish tez kunda ochiladi 🚀");

/* PARENT DASHBOARD */
const bars = $("#bars"), BV = [55, 62, 70, 68, 82, 90, 94];
bars.innerHTML = BV.map(() => "<i></i>").join("");
new IntersectionObserver((es, o) => es.forEach(e => {
  if (e.isIntersecting) { $$("i", bars).forEach((i, k) => i.style.height = BV[k] + "%"); o.disconnect(); }
}), { threshold: .4 }).observe(bars);
$("#tgDemo").onclick = () => $("#tgToggle").checked
  ? toast("✈️ <b>UstozHub bot</b><br/>Aziza darsi 15 daqiqadan so‘ng boshlanadi. Ustoz: Jasur R.")
  : toast("Avval Telegram eslatmalarini yoqing");
