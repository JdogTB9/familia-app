/* ═══════════════════════════════════════════════════════════════
   FAMILIA APP — app.js
   ▸ Configura tu Firebase antes de arrancar:
     Busca el bloque "FIREBASE CONFIG" más abajo y pega
     el objeto de configuración de tu proyecto Firebase.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════
   FIREBASE CONFIG
   ▸ Reemplaza los valores con los de tu proyecto Firebase
   ▸ Los encuentras en: Firebase Console → Configuración del proyecto → Tus apps → SDK
═══════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAPUAJXBqk47XWMzCe-6I5TvpnB6VwVTqg",
  authDomain:        "familia-app-2175d.firebaseapp.com",
  databaseURL:       "https://familia-app-2175d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "familia-app-2175d",
  storageBucket:     "familia-app-2175d.firebasestorage.app",
  messagingSenderId: "243930804773",
  appId:             "1:243930804773:web:2958c9832270d4653045cc"
};

/* ═══════════════════════════════════════
   CONSTANTES
═══════════════════════════════════════ */
const FAMILIA = ["Papá", "Mamá", "Manuel", "Javier", "Lucía", "Ana"];

const COCHES = {
  rhodius: { nombre: "Rhodius",        emoji: "🚙", color: "#1a3a5c", texto: "#fff" },
  mitsu:   { nombre: "Mitsubishi ASX", emoji: "🚐", color: "#5a5a5a", texto: "#fff" },
  seat:    { nombre: "Seat Ibiza",     emoji: "🚗", color: "#c0392b", texto: "#fff" }
};

const DIAS_KEY  = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DIAS_ABBR = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DIAS_FULL = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const SECTION_NAMES = { home: "Inicio", comida: "Comida", coche: "Coche", eventos: "Eventos", compra: "Compra" };
const SECTION_TITLES = { home: "Inicio", comida: "Comida", coche: "Coche 🚗", eventos: "Eventos", compra: "Compra 🛒" };

const COMPRA_SUBS_DEFAULT = [
  "Frutas y verdura", "Congelados", "Pescado, Carne y Huevos", "Pan y Desayunos",
  "Arroz, Pasta y Legumbres", "Conservas", "Lácteos", "Embutidos", "Higiene y Limpieza", "Otros"
];

const EVENTO_COLORS = ["#e07b39","#5d8a5e","#2c4a6e","#9b59b6","#c0392b","#16a085","#f39c12"];

const COLORES_FAMILIA = {
  "Papá":   { bg: "#e74c3c", text: "#fff" },
  "Mamá":   { bg: "#e91e8c", text: "#fff" },
  "Manuel": { bg: "#f1c40f", text: "#2d2d2d" },
  "Javier": { bg: "#e07b39", text: "#fff" },
  "Lucía":  { bg: "#27ae60", text: "#fff" },
  "Ana":    { bg: "#3ab7f5", text: "#fff" }
};

function getUserColor(nombre) {
  return COLORES_FAMILIA[nombre] || { bg: "var(--color-primary)", text: "#fff" };
}

/* ═══════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════ */
let db;
let currentSection   = "home";
let comidaWeekOffset = 0;
let cocheWeekOffset  = 0;
let activeComidaRef  = null, activeComidaOff = null;
let activeCocheRef   = null, activeCocheOff  = null;
let activeEventosRef = null, activeEventosOff = null;
let activeHomeFeedRef = null, activeHomeFeedOff = null;
let activeComidaFeedRef = null, activeComidaFeedOff = null;
let activeCocheFeedRef  = null, activeCocheFeedOff  = null;
let activeEventosFeedRef = null, activeEventosFeedOff = null;

// Estado edición de reserva
let editingReservaId   = null;
let editingReservaCoche = null;
let editingReservaDia   = null;
let editingReservaSemana = null;
let editingReservaOffset = 0;      // offset de semana fijado al abrir el sheet
let editingReservaData   = null;   // datos originales (para localizar la serie)

// Estado edición de evento
let editingEventoId = null;
let eventoPersonas  = {};
let eventoTipo      = "evento"; // "evento" | "viaje"

// Datos en memoria del coche (para solapamiento)
let cocheWeekData = {};

// Defaults de comida por persona
let comidaDefaults = {};

// Eventos — estado semanal
let eventoWeekOffset = 0;
let eventoSelectedDia = null;
let allEventosCache = [];

// Compra — estado
let compraItemsCache = [];   // plano: { id, subseccion, texto, comprado, ts }
let compraSubsCache  = [];   // subsecciones custom: { id, nombre, ts }
let compraUIWired    = false;
let compraFocusSub   = null; // subKey a re-enfocar tras render

// Vista día / semana por sección (persistida en localStorage)
const vistaSeccion = {
  comida:  localStorage.getItem("vista_comida")  || "dia",
  coche:   localStorage.getItem("vista_coche")   || "dia",
  eventos: localStorage.getItem("vista_eventos") || "dia"
};

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch (e) {
    console.error("Error al inicializar Firebase:", e);
    showToast("⚠️ Firebase no configurado. Edita FIREBASE_CONFIG en app.js");
  }

  initUI();
  checkUser();
  registerServiceWorker();
});

function initUI() {
  // Drawer
  document.getElementById("menu-toggle").addEventListener("click", openDrawer);
  document.getElementById("drawer-overlay").addEventListener("click", closeDrawer);

  // Nav links
  document.querySelectorAll(".drawer-link").forEach(btn => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
      closeDrawer();
    });
  });

  // Change user
  document.getElementById("change-user-btn").addEventListener("click", () => {
    closeDrawer();
    showUserModal();
  });
  document.getElementById("header-user-badge").addEventListener("click", () => {
    showUserModal();
  });

  // Comida week nav
  document.getElementById("comida-prev").addEventListener("click", () => {
    comidaWeekOffset--;
    loadComidaWeek();
  });
  document.getElementById("comida-next").addEventListener("click", () => {
    comidaWeekOffset++;
    loadComidaWeek();
  });

  // Coche week nav
  document.getElementById("coche-prev").addEventListener("click", () => {
    cocheWeekOffset--;
    loadCocheWeek();
  });
  document.getElementById("coche-next").addEventListener("click", () => {
    cocheWeekOffset++;
    loadCocheWeek();
  });

  // Eventos week nav
  document.getElementById("eventos-prev").addEventListener("click", () => { eventoWeekOffset--; loadEventosWeek(); });
  document.getElementById("eventos-next").addEventListener("click", () => { eventoWeekOffset++; loadEventosWeek(); });

  // Selector de semana (calendario) al pulsar la etiqueta
  document.getElementById("comida-week-label").addEventListener("click", () => {
    openWeekPicker(getMondayOfWeek(comidaWeekOffset), (off, day) => {
      comidaWeekOffset = off; comidaSelectedDia = day; loadComidaWeek();
    });
  });
  document.getElementById("coche-week-label").addEventListener("click", () => {
    openWeekPicker(getMondayOfWeek(cocheWeekOffset), (off, day) => {
      cocheWeekOffset = off; cocheSelectedDia = day; loadCocheWeek();
    });
  });
  document.getElementById("eventos-week-label").addEventListener("click", () => {
    openWeekPicker(getMondayOfWeek(eventoWeekOffset), (off, day) => {
      eventoWeekOffset = off; eventoSelectedDia = day; loadEventosWeek();
    });
  });
  initWeekPicker();

  // Vista día / semana
  document.getElementById("comida-view-toggle").addEventListener("click", () => toggleVista("comida"));
  document.getElementById("coche-view-toggle").addEventListener("click", () => toggleVista("coche"));
  document.getElementById("eventos-view-toggle").addEventListener("click", () => toggleVista("eventos"));
  ["comida", "coche", "eventos"].forEach(updateVistaUI);

  // Sheet de alcance al borrar reserva recurrente
  document.getElementById("scope-sheet-overlay").addEventListener("click", closeScopeSheet);
  document.getElementById("scope-cancel-btn").addEventListener("click", closeScopeSheet);

  // FAB evento
  document.getElementById("add-evento-fab").addEventListener("click", () => openEventoModal());

  // Reserva sheet
  document.getElementById("sheet-overlay").addEventListener("click", closeReservaSheet);
  document.getElementById("sheet-cancel-btn").addEventListener("click", closeReservaSheet);
  document.getElementById("reserva-form").addEventListener("submit", handleReservaSubmit);

  // Evento modal
  document.getElementById("evento-modal-overlay").addEventListener("click", closeEventoModal);
  document.getElementById("evento-modal-close").addEventListener("click", closeEventoModal);
  document.getElementById("evento-cancel-btn").addEventListener("click", closeEventoModal);
  document.getElementById("evento-form").addEventListener("submit", handleEventoSubmit);
  document.querySelectorAll("#evento-tipo-row .tipo-btn").forEach(b => {
    b.addEventListener("click", () => setEventoTipo(b.dataset.tipo));
  });
  // Al mover el inicio de un viaje, el fin nunca queda antes
  document.getElementById("evento-fecha").addEventListener("change", (e) => {
    const fin = document.getElementById("evento-fecha-fin");
    if (!fin.value || fin.value < e.target.value) fin.value = e.target.value;
  });

  // User grid
  const grid = document.getElementById("user-grid");
  FAMILIA.forEach(nombre => {
    const col = getUserColor(nombre);
    const btn = document.createElement("button");
    btn.className = "user-btn";
    btn.innerHTML = `
      <div class="user-btn-avatar" style="background:${col.bg};color:${col.text}">${nombre[0]}</div>
      <span>${nombre}</span>
    `;
    btn.addEventListener("click", () => selectUser(nombre));
    grid.appendChild(btn);
  });

  // Comida defaults sheet
  document.getElementById("comida-defaults-btn").addEventListener("click", openDefaultsSheet);
  document.getElementById("defaults-cancel-btn").addEventListener("click", closeDefaultsSheet);
  document.getElementById("defaults-sheet-overlay").addEventListener("click", closeDefaultsSheet);
  document.getElementById("defaults-save-btn").addEventListener("click", saveComidaDefaults);

  // Recurrencia reserva
  document.getElementById("reserva-recurrente").addEventListener("change", (e) => {
    document.getElementById("reserva-semanas-group").classList.toggle("hidden", !e.target.checked);
  });

  // Persona selects en form de reserva
  const sel = document.getElementById("reserva-persona");
  FAMILIA.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  });
}

/* ═══════════════════════════════════════
   SERVICE WORKER
═══════════════════════════════════════ */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("OneSignalSDKWorker.js").catch(() => {});
  }
}

/* ═══════════════════════════════════════
   USUARIO
═══════════════════════════════════════ */
function getUser() {
  return localStorage.getItem("familiaUser");
}

function checkUser() {
  if (!getUser()) {
    showUserModal();
  } else {
    hideUserModal();
    updateUserUI();
    navigateTo("home");
    initNotificationListener();
    requestNotificationPermission();
  }
}

function selectUser(nombre) {
  localStorage.setItem("familiaUser", nombre);
  hideUserModal();
  updateUserUI();
  navigateTo("home");
  applyPushIdentity();
}

function updateUserUI() {
  const nombre = getUser() || "?";
  const inicial = nombre[0];
  const col = getUserColor(nombre);

  const badge = document.getElementById("header-user-badge");
  badge.textContent = inicial;
  badge.title = nombre;
  badge.style.background = col.bg;
  badge.style.color = col.text;

  const avatar = document.getElementById("drawer-user-avatar");
  avatar.textContent = inicial;
  avatar.style.background = col.bg;
  avatar.style.color = col.text;

  document.getElementById("drawer-user-name").textContent = nombre;
  const sel = document.getElementById("reserva-persona");
  sel.value = nombre;
}

function showUserModal() {
  document.getElementById("user-modal").classList.remove("hidden");
}

function hideUserModal() {
  document.getElementById("user-modal").classList.add("hidden");
}

/* ═══════════════════════════════════════
   DRAWER
═══════════════════════════════════════ */
function openDrawer() {
  document.getElementById("drawer").classList.add("open");
  document.getElementById("drawer-overlay").classList.add("open");
}

function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer-overlay").classList.remove("open");
}

/* ═══════════════════════════════════════
   ROUTING
═══════════════════════════════════════ */
function navigateTo(section) {
  if (!SECTION_NAMES[section]) section = "home";
  currentSection = section;

  document.querySelectorAll(".section").forEach(el => el.classList.remove("active"));
  document.getElementById(`sec-${section}`).classList.add("active");

  document.querySelectorAll(".drawer-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  document.getElementById("section-title").textContent = SECTION_TITLES[section];

  const fab = document.getElementById("add-evento-fab");
  fab.classList.toggle("visible", section === "eventos");

  // Load section data
  if (section === "home")    initHome();
  if (section === "comida")  initComida();
  if (section === "coche")   initCoche();
  if (section === "eventos") initEventos();
  if (section === "compra")  initCompra();
}

/* ═══════════════════════════════════════
   ACTIVIDAD / LOG
═══════════════════════════════════════ */
function logActivity(seccion, descripcion) {
  if (!db) return;
  const persona = getUser() || "Alguien";
  db.ref("actividad").push({ persona, seccion, descripcion, timestamp: Date.now() });
  sendPush(seccion, descripcion, persona);
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (h < 24)   return `hace ${h}h`;
  if (d === 1)  return "ayer";
  return `hace ${d} días`;
}

function sectionBadgeHTML(seccion) {
  const cls = seccion?.toLowerCase();
  const clsMap = { comida: "badge-comida", coche: "badge-coche", eventos: "badge-eventos" };
  return `<span class="activity-section-badge ${clsMap[cls] || ''}">${seccion}</span>`;
}

function renderActivityFeed(containerEl, items) {
  if (!items || items.length === 0) {
    containerEl.innerHTML = '<li class="activity-empty">Sin cambios recientes</li>';
    return;
  }
  containerEl.innerHTML = items.map(item => {
    const col = getUserColor(item.persona || "");
    return `
    <li class="activity-item">
      <div class="activity-avatar" style="background:${col.bg};color:${col.text}">${item.persona?.[0] || "?"}</div>
      <div class="activity-body">
        <div class="activity-text">
          ${sectionBadgeHTML(item.seccion)}
          <strong>${escapeHTML(item.persona)}</strong> ${escapeHTML(item.descripcion)}
        </div>
        <div class="activity-meta">${relativeTime(item.timestamp)}</div>
      </div>
    </li>`;
  }).join("");
}

function listenActivityFeed(containerEl, seccion = null, limit = 20) {
  if (!db) return;
  const ref = db.ref("actividad").limitToLast(limit);
  const off = ref.on("value", snap => {
    const items = [];
    snap.forEach(child => {
      const v = child.val();
      if (!seccion || v.seccion === seccion) items.push(v);
    });
    renderActivityFeed(containerEl, items.reverse());
  });
  return { ref, off };
}

/* ═══════════════════════════════════════
   HOME SECTION
═══════════════════════════════════════ */
function initHome() {
  if (!db) return;
  detachListener(activeHomeFeedRef, activeHomeFeedOff);
  const feed = document.getElementById("home-feed");
  const { ref, off } = listenActivityFeed(feed, null, 20);
  activeHomeFeedRef = ref;
  activeHomeFeedOff = off;
}

/* ═══════════════════════════════════════
   UTILIDADES DE SEMANA
═══════════════════════════════════════ */
function getMondayOfWeek(offset = 0) {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getISOWeekKey(monday) {
  const d = new Date(monday);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  const year = d.getFullYear();
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function formatDate(date) {
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatFechaCorta(fechaStr) {
  const [y, m, d] = fechaStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDate(monday)} – ${formatDate(sunday)}`;
}

function isToday(date) {
  const now = new Date();
  return date.getDate() === now.getDate() &&
         date.getMonth() === now.getMonth() &&
         date.getFullYear() === now.getFullYear();
}

function getTodayDayIndex() {
  // 0=Mon, 6=Sun. Returns index in DIAS_KEY array for today.
  const now = new Date();
  return (now.getDay() + 6) % 7;
}

function getTodayDayKey() {
  return DIAS_KEY[getTodayDayIndex()];
}

/* ═══════════════════════════════════════
   SELECTOR DE SEMANA (CALENDARIO)
═══════════════════════════════════════ */
const MESES_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
let wpYear = 0, wpMonth = 0;      // mes mostrado en el calendario
let wpSelectedMonday = null;      // semana que se está viendo en la sección
let wpOnPick = null;

function initWeekPicker() {
  const monthSel = document.getElementById("wp-month");
  MESES_FULL.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m;
    monthSel.appendChild(opt);
  });
  monthSel.addEventListener("change", () => { wpMonth = Number(monthSel.value); renderWeekPickerGrid(); });
  document.getElementById("wp-year").addEventListener("change", (e) => { wpYear = Number(e.target.value); renderWeekPickerGrid(); });
  document.getElementById("wp-prev").addEventListener("click", () => shiftWeekPickerMonth(-1));
  document.getElementById("wp-next").addEventListener("click", () => shiftWeekPickerMonth(1));
  document.getElementById("wp-today").addEventListener("click", () => pickWeekPickerDate(new Date()));
  document.getElementById("wp-cancel").addEventListener("click", closeWeekPicker);
  document.getElementById("week-picker-close").addEventListener("click", closeWeekPicker);
  document.getElementById("week-picker-overlay").addEventListener("click", closeWeekPicker);
  document.getElementById("week-picker").addEventListener("click", (e) => {
    if (e.target.id === "week-picker") closeWeekPicker();
  });
}

function openWeekPicker(currentMonday, onPick) {
  wpSelectedMonday = new Date(currentMonday);
  wpOnPick = onPick;
  wpYear  = currentMonday.getFullYear();
  wpMonth = currentMonday.getMonth();
  document.getElementById("week-picker-overlay").classList.add("open");
  document.getElementById("week-picker").classList.add("open");
  renderWeekPickerGrid();
}

function closeWeekPicker() {
  document.getElementById("week-picker-overlay").classList.remove("open");
  document.getElementById("week-picker").classList.remove("open");
}

function shiftWeekPickerMonth(delta) {
  const d = new Date(wpYear, wpMonth + delta, 1);
  wpYear = d.getFullYear();
  wpMonth = d.getMonth();
  renderWeekPickerGrid();
}

function pickWeekPickerDate(date) {
  const fecha = toLocalDateStr(date);
  closeWeekPicker();
  if (wpOnPick) wpOnPick(fechaToWeekOffset(fecha), fechaToDayKey(fecha));
}

function renderWeekPickerGrid() {
  // Selector de año: rango alrededor del año actual (y siempre incluye el mostrado)
  const yearSel = document.getElementById("wp-year");
  const thisYear = new Date().getFullYear();
  const from = Math.min(thisYear - 3, wpYear), to = Math.max(thisYear + 5, wpYear);
  yearSel.innerHTML = "";
  for (let y = from; y <= to; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }
  yearSel.value = wpYear;
  document.getElementById("wp-month").value = wpMonth;

  const grid = document.getElementById("wp-grid");
  grid.innerHTML = "";
  ["L", "M", "X", "J", "V", "S", "D"].forEach(d => {
    const h = document.createElement("div");
    h.className = "wp-head";
    h.textContent = d;
    grid.appendChild(h);
  });

  // Empieza en el lunes de la semana que contiene el día 1 y pinta 6 semanas
  const first = new Date(wpYear, wpMonth, 1);
  const start = new Date(first);
  start.setDate(1 - (first.getDay() + 6) % 7);
  const selStart = wpSelectedMonday ? wpSelectedMonday.getTime() : -1;
  let selEnd = -1;
  if (wpSelectedMonday) {
    const e = new Date(wpSelectedMonday);
    e.setDate(e.getDate() + 7);
    selEnd = e.getTime();
  }

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wp-day" +
      (d.getMonth() !== wpMonth ? " other-month" : "") +
      (isToday(d) ? " today" : "") +
      (d.getTime() >= selStart && d.getTime() < selEnd ? " in-week" : "");
    btn.textContent = d.getDate();
    btn.addEventListener("click", () => pickWeekPickerDate(d));
    grid.appendChild(btn);
  }
}

/* ═══════════════════════════════════════
   VISTA DÍA / SEMANA
═══════════════════════════════════════ */
function toggleVista(seccion) {
  vistaSeccion[seccion] = vistaSeccion[seccion] === "semana" ? "dia" : "semana";
  localStorage.setItem(`vista_${seccion}`, vistaSeccion[seccion]);
  updateVistaUI(seccion);
  reloadSeccionWeek(seccion);
}

// Desde la vista semanal: abrir un día concreto en vista día
function openDiaDesdeSemana(seccion, dayKey) {
  if (seccion === "comida")  comidaSelectedDia = dayKey;
  if (seccion === "coche")   cocheSelectedDia  = dayKey;
  if (seccion === "eventos") eventoSelectedDia = dayKey;
  vistaSeccion[seccion] = "dia";
  localStorage.setItem(`vista_${seccion}`, "dia");
  updateVistaUI(seccion);
  reloadSeccionWeek(seccion);
}

function reloadSeccionWeek(seccion) {
  if (seccion === "comida")  loadComidaWeek();
  if (seccion === "coche")   loadCocheWeek();
  if (seccion === "eventos") loadEventosWeek();
}

function updateVistaUI(seccion) {
  const semana = vistaSeccion[seccion] === "semana";
  const btn = document.getElementById(`${seccion}-view-toggle`);
  btn.textContent = semana ? "📆" : "📋";
  btn.title = semana ? "Vista por día" : "Vista semanal";
  btn.setAttribute("aria-label", btn.title);
  btn.classList.toggle("active", semana);
  document.getElementById(`${seccion}-day-tabs`).parentElement.classList.toggle("hidden", semana);
}

function weekViewDayCard(container, seccion, monday, i, bodyHTML) {
  const dayDate = new Date(monday);
  dayDate.setDate(monday.getDate() + i);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "week-view-day" + (isToday(dayDate) ? " today" : "");
  card.innerHTML = `
    <div class="week-view-day-title">${DIAS_FULL[i]} ${dayDate.getDate()}</div>
    <div class="week-view-day-body">${bodyHTML}</div>
  `;
  card.addEventListener("click", () => openDiaDesdeSemana(seccion, DIAS_KEY[i]));
  container.appendChild(card);
}

function detachListener(ref, off) {
  if (ref && off) ref.off("value", off);
}

// Dado "YYYY-MM-DD", devuelve la clave de día (lunes…domingo) correspondiente
function fechaToDayKey(fecha) {
  const d = new Date(fecha + "T00:00:00");
  return DIAS_KEY[(d.getDay() + 6) % 7];
}

// Dado "YYYY-MM-DD", calcula cuántas semanas (offset) dista de la semana actual
function fechaToWeekOffset(fecha) {
  const eventMonday = new Date(fecha + "T00:00:00");
  const idx = (eventMonday.getDay() + 6) % 7;
  eventMonday.setDate(eventMonday.getDate() - idx); // retrocede al lunes de esa semana
  const currentMonday = getMondayOfWeek(0);
  return Math.round((eventMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/* ═══════════════════════════════════════
   COMIDA SECTION
═══════════════════════════════════════ */
let comidaSelectedDia = null;
let comidaWeekDataCache = {};

function initComida() {
  if (!db) return;
  comidaSelectedDia = getTodayDayKey();
  db.ref("defaults/comida").on("value", snap => {
    comidaDefaults = snap.val() || {};
    if (currentSection === "comida") renderComidaView();
  });
  loadComidaWeek();
  detachListener(activeComidaFeedRef, activeComidaFeedOff);
  const feed = document.getElementById("comida-feed");
  const { ref, off } = listenActivityFeed(feed, "Comida", 10);
  activeComidaFeedRef = ref;
  activeComidaFeedOff = off;
}

function loadComidaWeek() {
  if (!db) return;
  const monday  = getMondayOfWeek(comidaWeekOffset);
  const weekKey = getISOWeekKey(monday);

  document.getElementById("comida-week-label").textContent = formatWeekLabel(monday);
  renderComidaDayTabs(monday);
  renderComidaView();

  detachListener(activeComidaRef, activeComidaOff);
  const ref = db.ref(`comida/${weekKey}`);
  const off = ref.on("value", snap => {
    comidaWeekDataCache = snap.val() || {};
    renderComidaView();
  });
  activeComidaRef = ref;
  activeComidaOff = off;
}

// Pinta la vista activa (día o semana) de la semana mostrada
function renderComidaView() {
  const monday = getMondayOfWeek(comidaWeekOffset);
  if (vistaSeccion.comida === "semana") renderComidaWeekView(monday);
  else renderComidaDayContent(comidaSelectedDia, getISOWeekKey(monday));
}

function renderComidaWeekView(monday) {
  const container = document.getElementById("comida-day-content");
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "week-view";
  for (let i = 0; i < 7; i++) {
    const dayKey  = DIAS_KEY[i];
    const dayData = comidaWeekDataCache[dayKey] || {};
    const body = ["comida", "cena"].map(tipo => {
      const meal = dayData[tipo] || {};
      const platos = Object.entries(meal.platos || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, t]) => escapeHTML(t));
      const personas = meal.personas || {};
      const comen = FAMILIA.filter(p => {
        const explicit = personas[p];
        return (explicit !== undefined && explicit !== null)
          ? !!explicit
          : !!(comidaDefaults[p]?.[dayKey]?.[tipo]);
      }).length;
      return `
        <div class="week-view-line">
          <span class="week-view-icon">${tipo === "comida" ? "🍽️" : "🌙"}</span>
          <span class="week-view-text${platos.length ? "" : " muted"}">${platos.length ? platos.join(" · ") : "—"}</span>
          <span class="week-view-meta">👥 ${comen}</span>
        </div>`;
    }).join("");
    weekViewDayCard(list, "comida", monday, i, body);
  }
  container.appendChild(list);
}

function renderComidaDayTabs(monday) {
  const tabs = document.getElementById("comida-day-tabs");
  tabs.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayKey = DIAS_KEY[i];
    const btn = document.createElement("button");
    btn.className = "day-tab" +
      (isToday(dayDate) ? " today" : "") +
      (dayKey === comidaSelectedDia ? " active" : "");
    btn.setAttribute("role", "tab");
    btn.dataset.day = dayKey;
    btn.innerHTML = `
      <span class="day-abbr">${DIAS_ABBR[i]}</span>
      <span class="day-num">${dayDate.getDate()}</span>
    `;
    btn.addEventListener("click", () => {
      comidaSelectedDia = dayKey;
      document.querySelectorAll("#comida-day-tabs .day-tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      const monday2 = getMondayOfWeek(comidaWeekOffset);
      renderComidaDayContent(dayKey, getISOWeekKey(monday2));
    });
    tabs.appendChild(btn);
  }
}

function renderComidaDayContent(dayKey, weekKey) {
  const container = document.getElementById("comida-day-content");
  const dayData   = comidaWeekDataCache[dayKey] || {};
  container.innerHTML = "";

  ["comida", "cena"].forEach(tipo => {
    const icon  = tipo === "comida" ? "🍽️" : "🌙";
    const label = tipo === "comida" ? "Comida" : "Cena";
    const mealData = dayData[tipo] || { platos: {}, personas: {} };
    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <div class="meal-card-header">
        <div class="meal-card-title">${icon} ${label}</div>
      </div>
      <div class="meal-card-body">
        <div>
          <div class="meal-section-label">🍴 Platos</div>
          <div class="platos-list" id="platos-${tipo}"></div>
          <button class="add-plato-btn" id="add-plato-${tipo}">+ Añadir plato</button>
        </div>
        <div>
          <div class="meal-section-label">👥 ¿Quién come?</div>
          <div class="persona-chips" id="personas-${tipo}"></div>
        </div>
      </div>
    `;
    container.appendChild(card);
    renderPlatos(dayKey, weekKey, tipo, mealData.platos || {});
    renderPersonaChips(`personas-${tipo}`, mealData.personas || {}, (persona, selected) => {
      handlePersonaToggleComida(weekKey, dayKey, tipo, persona, selected);
    }, (persona) => !!(comidaDefaults[persona]?.[dayKey]?.[tipo]));
    document.getElementById(`add-plato-${tipo}`).addEventListener("click", () => {
      addPlatoInput(dayKey, weekKey, tipo);
    });
  });
}

function renderPlatos(dayKey, weekKey, tipo, platos) {
  const container = document.getElementById(`platos-${tipo}`);
  container.innerHTML = "";
  const platosArray = Object.entries(platos).sort((a, b) => Number(a[0]) - Number(b[0]));
  platosArray.forEach(([idx, texto]) => {
    container.appendChild(createPlatoItem(weekKey, dayKey, tipo, idx, texto));
  });
}

function createPlatoItem(weekKey, dayKey, tipo, idx, texto) {
  const row = document.createElement("div");
  row.className = "plato-item";
  row.dataset.idx = idx;

  const bullet = document.createElement("div");
  bullet.className = "plato-bullet";

  const span = document.createElement("span");
  span.className = "plato-text";
  span.textContent = texto;
  span.addEventListener("click", () => convertPlatoToInput(span, weekKey, dayKey, tipo, idx));

  const del = document.createElement("button");
  del.className = "plato-delete";
  del.textContent = "✕";
  del.setAttribute("aria-label", "Eliminar plato");
  del.addEventListener("click", () => deletePlato(weekKey, dayKey, tipo, idx));

  row.appendChild(bullet);
  row.appendChild(span);
  row.appendChild(del);
  return row;
}

function convertPlatoToInput(span, weekKey, dayKey, tipo, idx) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "plato-input";
  input.value = span.textContent;
  span.replaceWith(input);
  input.focus();
  input.select();

  const save = () => {
    const val = input.value.trim();
    if (val) {
      savePlato(weekKey, dayKey, tipo, idx, val);
    } else {
      deletePlato(weekKey, dayKey, tipo, idx);
    }
  };
  input.addEventListener("blur", save);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.replaceWith(span); }
  });
}

function addPlatoInput(dayKey, weekKey, tipo) {
  const container = document.getElementById(`platos-${tipo}`);
  const existing  = container.querySelectorAll(".plato-item");
  const nextIdx   = existing.length;

  const row = document.createElement("div");
  row.className = "plato-item";

  const bullet = document.createElement("div");
  bullet.className = "plato-bullet";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "plato-input";
  input.placeholder = "Nombre del plato...";

  const del = document.createElement("button");
  del.className = "plato-delete";
  del.textContent = "✕";
  del.addEventListener("click", () => row.remove());

  row.appendChild(bullet);
  row.appendChild(input);
  row.appendChild(del);
  container.appendChild(row);
  input.focus();

  const save = () => {
    const val = input.value.trim();
    if (val) {
      savePlato(weekKey, dayKey, tipo, nextIdx, val);
    } else {
      row.remove();
    }
  };
  input.addEventListener("blur", save);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { row.remove(); }
  });
}

function savePlato(weekKey, dayKey, tipo, idx, valor) {
  if (!db) return;
  db.ref(`comida/${weekKey}/${dayKey}/${tipo}/platos/${idx}`).set(valor);
  logActivity("Comida", `ha modificado la ${tipo} del ${DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey}: "${valor}"`);
}

function deletePlato(weekKey, dayKey, tipo, idx) {
  if (!db) return;
  db.ref(`comida/${weekKey}/${dayKey}/${tipo}/platos/${idx}`).remove();
  logActivity("Comida", `ha eliminado un plato de la ${tipo} del ${DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey}`);
}

function handlePersonaToggleComida(weekKey, dayKey, tipo, persona, selected) {
  if (!db) return;
  const val = selected ? true : false;
  db.ref(`comida/${weekKey}/${dayKey}/${tipo}/personas/${persona}`).set(val);
  const diaLabel = DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey;
  if (persona === getUser()) {
    const accion = selected ? "se ha apuntado a" : "se ha quitado de";
    logActivity("Comida", `${accion} la ${tipo} del ${diaLabel}`);
  } else {
    const accion = selected ? "ha apuntado a" : "ha quitado a";
    logActivity("Comida", `${accion} ${persona} de la ${tipo} del ${diaLabel}`);
  }
}

/* DEFAULTS SHEET */
function openDefaultsSheet() {
  const persona = getUser();
  if (!persona) return;
  const grid = document.getElementById("defaults-grid");
  grid.innerHTML = "";

  // Header
  ["", "Comida", "Cena"].forEach(label => {
    const h = document.createElement("div");
    h.className = "defaults-grid-header";
    h.textContent = label;
    grid.appendChild(h);
  });

  DIAS_KEY.forEach((dayKey, i) => {
    const dayDef = (comidaDefaults[persona] || {})[dayKey] || {};

    const label = document.createElement("div");
    label.className = "defaults-grid-label";
    label.textContent = DIAS_FULL[i];
    grid.appendChild(label);

    ["comida", "cena"].forEach(tipo => {
      const toggle = document.createElement("button");
      toggle.type = "button";
      const isActive = !!dayDef[tipo];
      toggle.className = "defaults-toggle" + (isActive ? " active" : "");
      toggle.dataset.day = dayKey;
      toggle.dataset.tipo = tipo;
      toggle.textContent = isActive ? "✓" : "–";
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("active");
        toggle.textContent = toggle.classList.contains("active") ? "✓" : "–";
      });
      grid.appendChild(toggle);
    });
  });

  document.getElementById("defaults-sheet").classList.add("open");
  document.getElementById("defaults-sheet-overlay").classList.add("open");
}

function closeDefaultsSheet() {
  document.getElementById("defaults-sheet").classList.remove("open");
  document.getElementById("defaults-sheet-overlay").classList.remove("open");
}

function saveComidaDefaults() {
  const persona = getUser();
  if (!persona || !db) return;
  const newDefaults = {};
  document.querySelectorAll("#defaults-grid .defaults-toggle").forEach(toggle => {
    const day  = toggle.dataset.day;
    const tipo = toggle.dataset.tipo;
    if (!newDefaults[day]) newDefaults[day] = {};
    newDefaults[day][tipo] = toggle.classList.contains("active");
  });
  db.ref(`defaults/comida/${persona}`).set(newDefaults);
  closeDefaultsSheet();
  showToast("✓ Preferencias guardadas");
}

/* ═══════════════════════════════════════
   PERSONA CHIPS (reutilizable)
═══════════════════════════════════════ */
function renderPersonaChips(containerId, personasData, onToggle, getDefaultFn = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  FAMILIA.forEach(persona => {
    const explicit = personasData ? personasData[persona] : undefined;
    const selected = (explicit !== undefined && explicit !== null)
      ? !!explicit
      : (getDefaultFn ? getDefaultFn(persona) : false);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (selected ? " selected" : "");
    chip.textContent = persona;
    chip.addEventListener("click", () => {
      const nowSelected = chip.classList.toggle("selected");
      onToggle(persona, nowSelected);
    });
    container.appendChild(chip);
  });
}

/* ═══════════════════════════════════════
   COCHE SECTION
═══════════════════════════════════════ */
let cocheSelectedDia = null;

function initCoche() {
  if (!db) return;
  cocheSelectedDia = getTodayDayKey();
  loadCocheWeek();
  detachListener(activeCocheFeedRef, activeCocheFeedOff);
  const feed = document.getElementById("coche-feed");
  const { ref, off } = listenActivityFeed(feed, "Coche", 10);
  activeCocheFeedRef = ref;
  activeCocheFeedOff = off;
}

function loadCocheWeek() {
  if (!db) return;
  const monday  = getMondayOfWeek(cocheWeekOffset);
  const weekKey = getISOWeekKey(monday);

  document.getElementById("coche-week-label").textContent = formatWeekLabel(monday);
  renderCocheDayTabs(monday, weekKey);
  renderCocheView();

  detachListener(activeCocheRef, activeCocheOff);
  const ref = db.ref(`coche/${weekKey}`);
  const off = ref.on("value", snap => {
    cocheWeekData = snap.val() || {};
    renderCocheView();
  });
  activeCocheRef = ref;
  activeCocheOff = off;
}

// Pinta la vista activa (día o semana) de la semana mostrada
function renderCocheView() {
  const monday = getMondayOfWeek(cocheWeekOffset);
  if (vistaSeccion.coche === "semana") renderCocheWeekView(monday);
  else renderCocheDayContent(cocheSelectedDia, getISOWeekKey(monday));
}

function renderCocheWeekView(monday) {
  const container = document.getElementById("coche-day-content");
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "week-view";
  for (let i = 0; i < 7; i++) {
    const reservas = Object.values((cocheWeekData[DIAS_KEY[i]] || {}).reservas || {})
      .filter(r => COCHES[r.coche])
      .sort((a, b) => (a.horaInicio > b.horaInicio ? 1 : -1));
    const body = reservas.length === 0
      ? '<div class="week-view-line"><span class="week-view-text muted">Sin reservas</span></div>'
      : reservas.map(r => `
        <div class="week-view-line">
          <span class="car-color-dot" style="background:${COCHES[r.coche].color}" title="${escapeHTML(COCHES[r.coche].nombre)}"></span>
          <span class="week-view-time">${r.horaInicio}–${r.horaFin}</span>
          <span class="week-view-text">${escapeHTML(r.persona)} · ${escapeHTML(COCHES[r.coche].nombre)}${r.recurrente ? " 🔁" : ""}</span>
        </div>`).join("");
    weekViewDayCard(list, "coche", monday, i, body);
  }
  container.appendChild(list);
}

function renderCocheDayTabs(monday, weekKey) {
  const tabs = document.getElementById("coche-day-tabs");
  tabs.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayKey = DIAS_KEY[i];
    const btn = document.createElement("button");
    btn.className = "day-tab" +
      (isToday(dayDate) ? " today" : "") +
      (dayKey === cocheSelectedDia ? " active" : "");
    btn.setAttribute("role", "tab");
    btn.dataset.day = dayKey;
    btn.innerHTML = `
      <span class="day-abbr">${DIAS_ABBR[i]}</span>
      <span class="day-num">${dayDate.getDate()}</span>
    `;
    btn.addEventListener("click", () => {
      cocheSelectedDia = dayKey;
      document.querySelectorAll("#coche-day-tabs .day-tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      renderCocheDayContent(dayKey, weekKey);
    });
    tabs.appendChild(btn);
  }
}

function renderCocheDayContent(dayKey, weekKey) {
  const container = document.getElementById("coche-day-content");
  container.innerHTML = "";
  const dayData   = cocheWeekData[dayKey] || {};
  const reservas  = dayData.reservas || {};

  Object.entries(COCHES).forEach(([cocheId, coche]) => {
    const cocheReservas = Object.entries(reservas)
      .filter(([, r]) => r.coche === cocheId)
      .sort((a, b) => (a[1].horaInicio > b[1].horaInicio ? 1 : -1));

    const block = document.createElement("div");
    block.className = "car-block";
    block.innerHTML = `
      <div class="car-block-header">
        <div class="car-block-title">
          <div class="car-color-dot" style="background:${coche.color}"></div>
          ${coche.emoji} ${coche.nombre}
        </div>
      </div>
      <div class="car-block-body" id="car-body-${cocheId}">
        ${cocheReservas.length === 0 ? '<div class="car-empty">Sin reservas</div>' : ""}
        ${cocheReservas.map(([rId, r]) => carReservaHTML(rId, r, cocheId, dayKey, weekKey)).join("")}
        <button class="add-reserva-btn" data-coche="${cocheId}">+ Añadir reserva</button>
      </div>
    `;
    container.appendChild(block);

    block.querySelector(`[data-coche="${cocheId}"]`).addEventListener("click", () => {
      openReservaSheet(cocheId, dayKey, weekKey);
    });

    cocheReservas.forEach(([rId]) => {
      const editBtn = block.querySelector(`[data-edit="${rId}"]`);
      const delBtn  = block.querySelector(`[data-del="${rId}"]`);
      if (editBtn) editBtn.addEventListener("click", () => openReservaSheet(cocheId, dayKey, weekKey, rId, reservas[rId]));
      if (delBtn)  delBtn.addEventListener("click", () => deleteReserva(weekKey, dayKey, rId, coche.nombre, reservas[rId]));
    });
  });
}

function carReservaHTML(rId, r, cocheId, dayKey, weekKey) {
  return `
    <div class="car-reserva-item">
      <span class="car-reserva-time">${r.horaInicio} – ${r.horaFin}</span>
      <span class="car-reserva-persona">${escapeHTML(r.persona)}${r.recurrente ? " 🔁" : ""}</span>
      <div class="car-reserva-actions">
        <button class="car-reserva-action" data-edit="${rId}" aria-label="Editar">✏️</button>
        <button class="car-reserva-action delete" data-del="${rId}" aria-label="Eliminar">🗑️</button>
      </div>
    </div>
  `;
}

/* RESERVA SHEET */
function openReservaSheet(cocheId, dayKey, weekKey, rId = null, reservaData = null) {
  const coche = COCHES[cocheId];
  editingReservaId    = rId;
  editingReservaCoche = cocheId;
  editingReservaDia   = dayKey;
  editingReservaSemana = weekKey;
  editingReservaOffset = cocheWeekOffset;
  editingReservaData   = reservaData ? { ...reservaData } : null;

  document.getElementById("sheet-title").textContent = rId ? `Editar reserva — ${coche.nombre}` : `Reservar ${coche.nombre}`;
  const badge = document.getElementById("reserva-coche-display");
  badge.textContent  = `${coche.emoji} ${coche.nombre}`;
  badge.style.background = coche.color;
  badge.style.color      = coche.texto;

  document.getElementById("reserva-persona").value  = reservaData?.persona || getUser() || FAMILIA[0];
  document.getElementById("reserva-inicio").value   = reservaData?.horaInicio || "";
  document.getElementById("reserva-fin").value      = reservaData?.horaFin    || "";
  document.getElementById("reserva-overlap-warning").classList.add("hidden");
  document.getElementById("reserva-recurrente").checked = false;
  document.getElementById("reserva-semanas-group").classList.add("hidden");
  document.getElementById("reserva-recurrente-row").classList.toggle("hidden", !!rId);
  // Al editar una recurrente: elegir si el cambio afecta a esta o a esta y las siguientes
  document.getElementById("reserva-scope-row").classList.toggle("hidden", !(rId && reservaData?.recurrente));
  document.querySelector('input[name="reserva-scope"][value="serie"]').checked = true;

  document.getElementById("reserva-sheet").classList.add("open");
  document.getElementById("sheet-overlay").classList.add("open");
}

function closeReservaSheet() {
  document.getElementById("reserva-sheet").classList.remove("open");
  document.getElementById("sheet-overlay").classList.remove("open");
}

function handleReservaSubmit(e) {
  e.preventDefault();
  if (!db) return;

  const persona    = document.getElementById("reserva-persona").value;
  const horaInicio = document.getElementById("reserva-inicio").value;
  const horaFin    = document.getElementById("reserva-fin").value;

  if (!horaInicio || !horaFin || horaFin <= horaInicio) {
    showToast("⚠️ La hora de fin debe ser posterior a la de inicio");
    return;
  }

  // Solapamiento
  const dayData = cocheWeekData[editingReservaDia] || {};
  const reservas = dayData.reservas || {};
  const overlap  = Object.entries(reservas).some(([rId, r]) => {
    if (r.coche !== editingReservaCoche) return false;
    if (rId === editingReservaId) return false;
    return horaInicio < r.horaFin && horaFin > r.horaInicio;
  });

  if (overlap) {
    document.getElementById("reserva-overlap-warning").classList.remove("hidden");
  }

  const esRecurrente = !editingReservaId && document.getElementById("reserva-recurrente").checked;
  const numSemanas   = esRecurrente ? parseInt(document.getElementById("reserva-semanas").value, 10) : 1;
  const data = { persona, coche: editingReservaCoche, horaInicio, horaFin, timestamp: Date.now() };
  const coche = COCHES[editingReservaCoche];

  const diaLabelCoche = DIAS_FULL[DIAS_KEY.indexOf(editingReservaDia)] || editingReservaDia;
  const paraQuien = persona !== getUser() ? ` para ${persona}` : "";
  const onError = err => {
    console.error("[coche] guardar reserva:", err);
    showToast("⚠️ No se pudo guardar la reserva");
  };

  if (editingReservaId) {
    const original = editingReservaData;
    const scope = document.querySelector('input[name="reserva-scope"]:checked')?.value;
    if (original?.recurrente && scope === "serie") {
      // Editar esta y las siguientes de la serie
      const semana = editingReservaSemana, dia = editingReservaDia, rIdActual = editingReservaId;
      const serieId = original.serieId || db.ref("coche").push().key;
      findSerieReservas(editingReservaOffset, dia, original).then(matches => {
        if (!matches.some(m => m.weekKey === semana && m.rId === rIdActual)) {
          matches.push({ weekKey: semana, rId: rIdActual });
        }
        const updates = {};
        matches.forEach(m => {
          const base = `coche/${m.weekKey}/${dia}/reservas/${m.rId}`;
          updates[`${base}/persona`]    = persona;
          updates[`${base}/horaInicio`] = horaInicio;
          updates[`${base}/horaFin`]    = horaFin;
          updates[`${base}/timestamp`]  = data.timestamp;
          updates[`${base}/recurrente`] = true;
          updates[`${base}/serieId`]    = serieId;
        });
        db.ref().update(updates).catch(onError);
        // Optimista: semana mostrada
        const shownWeek = getISOWeekKey(getMondayOfWeek(cocheWeekOffset));
        matches.filter(m => m.weekKey === shownWeek).forEach(m => {
          const r = cocheWeekData[dia]?.reservas?.[m.rId];
          if (r) Object.assign(r, { persona, horaInicio, horaFin, recurrente: true, serieId });
        });
        renderCocheView();
        logActivity("Coche", `ha modificado su reserva recurrente del ${coche.nombre}${paraQuien} los ${diaLabelCoche.toLowerCase()} (${horaInicio}–${horaFin}) 🔁 ${matches.length} semanas`);
        showToast(`✓ ${matches.length} reservas actualizadas`);
      }).catch(onError);
      closeReservaSheet();
      return;
    }
    // Solo esta: si era recurrente, la sacamos de la serie
    const upd = { ...data };
    if (original?.recurrente) { upd.recurrente = null; upd.serieId = null; }
    db.ref(`coche/${editingReservaSemana}/${editingReservaDia}/reservas/${editingReservaId}`).update(upd).catch(onError);
    logActivity("Coche", `ha modificado su reserva del ${coche.nombre}${paraQuien} el ${diaLabelCoche} (${horaInicio}–${horaFin})`);
  } else {
    const updates = {};
    if (esRecurrente) {
      data.recurrente = true;
      data.serieId = db.ref("coche").push().key;
    }
    for (let i = 0; i < numSemanas; i++) {
      const semKey = getISOWeekKey(getMondayOfWeek(editingReservaOffset + i));
      const key = db.ref(`coche/${semKey}/${editingReservaDia}/reservas`).push().key;
      updates[`coche/${semKey}/${editingReservaDia}/reservas/${key}`] = data;
    }
    db.ref().update(updates).catch(onError);
    const label = numSemanas > 1 ? ` 🔁 ${numSemanas} semanas` : "";
    logActivity("Coche", `ha reservado el ${coche.nombre}${paraQuien} el ${diaLabelCoche} (${horaInicio}–${horaFin})${label}`);
  }

  closeReservaSheet();
  showToast("✓ Reserva guardada");
}

// ¿Pertenece r a la misma serie recurrente que ref?
// Las reservas antiguas no tienen serieId: se reconocen por coche/persona/horario.
function esMismaSerie(r, ref) {
  if (!r || !ref || !r.recurrente) return false;
  if (ref.serieId) return r.serieId === ref.serieId;
  return !r.serieId &&
    r.coche === ref.coche && r.persona === ref.persona &&
    r.horaInicio === ref.horaInicio && r.horaFin === ref.horaFin;
}

// Busca la reserva y sus repeticiones desde la semana weekOffset hasta 52 semanas después
function findSerieReservas(weekOffset, dayKey, ref) {
  const reads = [];
  for (let i = 0; i <= 52; i++) {
    const weekKey = getISOWeekKey(getMondayOfWeek(weekOffset + i));
    reads.push(db.ref(`coche/${weekKey}/${dayKey}/reservas`).once("value").then(snap => {
      const out = [];
      snap.forEach(child => {
        if (esMismaSerie(child.val(), ref)) out.push({ weekKey, rId: child.key });
      });
      return out;
    }));
  }
  return Promise.all(reads).then(res => res.flat());
}

let pendingDeleteReserva = null;

function deleteReserva(weekKey, dayKey, rId, nombreCoche, reserva = null) {
  if (!db) return;
  if (reserva?.recurrente) {
    pendingDeleteReserva = { weekKey, dayKey, rId, nombreCoche, reserva, offset: cocheWeekOffset };
    document.getElementById("scope-sheet-subtitle").textContent =
      `${nombreCoche} · ${reserva.persona} · ${DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey} ${reserva.horaInicio}–${reserva.horaFin}`;
    document.getElementById("scope-serie-btn").onclick = () => { closeScopeSheet(); deleteReservaSerie(pendingDeleteReserva); };
    document.getElementById("scope-una-btn").onclick   = () => { closeScopeSheet(); removeReserva(weekKey, dayKey, rId, nombreCoche); };
    document.getElementById("scope-sheet").classList.add("open");
    document.getElementById("scope-sheet-overlay").classList.add("open");
    return;
  }
  if (!confirm(`¿Eliminar esta reserva del ${nombreCoche}?`)) return;
  removeReserva(weekKey, dayKey, rId, nombreCoche);
}

function closeScopeSheet() {
  document.getElementById("scope-sheet").classList.remove("open");
  document.getElementById("scope-sheet-overlay").classList.remove("open");
}

function removeReserva(weekKey, dayKey, rId, nombreCoche) {
  db.ref(`coche/${weekKey}/${dayKey}/reservas/${rId}`).remove();
  logActivity("Coche", `ha eliminado su reserva del ${nombreCoche} el ${DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey}`);
  showToast("Reserva eliminada");
}

function deleteReservaSerie({ weekKey, dayKey, rId, nombreCoche, reserva, offset }) {
  findSerieReservas(offset, dayKey, reserva).then(matches => {
    if (!matches.some(m => m.weekKey === weekKey && m.rId === rId)) matches.push({ weekKey, rId });
    const updates = {};
    matches.forEach(m => { updates[`coche/${m.weekKey}/${dayKey}/reservas/${m.rId}`] = null; });
    db.ref().update(updates).catch(err => {
      console.error("[coche] borrar serie:", err);
      showToast("⚠️ No se pudieron eliminar las reservas");
    });
    // Optimista: semana mostrada
    const shownWeek = getISOWeekKey(getMondayOfWeek(cocheWeekOffset));
    matches.filter(m => m.weekKey === shownWeek).forEach(m => {
      if (cocheWeekData[dayKey]?.reservas) delete cocheWeekData[dayKey].reservas[m.rId];
    });
    renderCocheView();
    const dia = (DIAS_FULL[DIAS_KEY.indexOf(dayKey)] || dayKey).toLowerCase();
    logActivity("Coche", `ha eliminado su reserva recurrente del ${nombreCoche} los ${dia} 🔁 ${matches.length} semanas`);
    showToast(`${matches.length} reservas eliminadas`);
  }).catch(err => {
    console.error("[coche] buscar serie:", err);
    showToast("⚠️ No se pudieron cargar las reservas de la serie");
  });
}

/* ═══════════════════════════════════════
   RECURRENCIA HELPERS
═══════════════════════════════════════ */
function generarInstancias(evento, horizonte = 730) {
  if (!evento.recurrencia) return [evento];
  const instancias = [];
  const base = new Date(evento.fecha + "T00:00:00");
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + horizonte);
  let cur = new Date(base);
  while (cur <= hasta) {
    instancias.push({
      ...evento,
      fecha: toLocalDateStr(cur),
      esVirtual: cur.getTime() !== base.getTime()
    });
    switch (evento.recurrencia) {
      case "daily":   cur.setDate(cur.getDate() + 1); break;
      case "weekly":  cur.setDate(cur.getDate() + 7); break;
      case "monthly": cur.setMonth(cur.getMonth() + 1); break;
      case "yearly":  cur.setFullYear(cur.getFullYear() + 1); break;
      default:        cur = new Date(hasta.getTime() + 1);
    }
  }
  return instancias;
}

// Solo eventos puntuales (los viajes se tratan aparte con getViajesEnFecha)
function getEventosExpanded(horizonte = 730) {
  const result = [];
  allEventosCache.forEach(e => { if (!esViaje(e)) result.push(...generarInstancias(e, horizonte)); });
  return result;
}

/* ═══════════════════════════════════════
   VIAJES (eventos con tipo "viaje": fecha = inicio, fechaFin = fin)
═══════════════════════════════════════ */
function esViaje(e) {
  return !!e && e.tipo === "viaje";
}

function getViajesEnFecha(dayISO) {
  return allEventosCache
    .filter(v => esViaje(v) && v.fecha <= dayISO && dayISO <= (v.fechaFin || v.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Días naturales entre dos "YYYY-MM-DD" (desde → hasta)
function diasEntre(desde, hasta) {
  const a = new Date(desde + "T00:00:00"), b = new Date(hasta + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

function formatRangoViaje(v) {
  const ini = new Date(v.fecha + "T00:00:00");
  const fin = new Date((v.fechaFin || v.fecha) + "T00:00:00");
  const dias = diasEntre(v.fecha, v.fechaFin || v.fecha) + 1;
  return `${formatDate(ini)} – ${formatDate(fin)} (${dias} ${dias === 1 ? "día" : "días"})`;
}

// Lectura puntual (once) para refrescar la vista sin depender del listener en tiempo real
function refreshEventos() {
  if (!db) return;
  db.ref("eventos").once("value").then(snap => {
    // En redes con proxy la lectura del nodo entero a veces llega incompleta.
    // Unimos con la caché actual (por id): nunca quitamos eventos por una lectura
    // parcial, solo añadimos/actualizamos. Los borrados se gestionan de forma optimista.
    const byId = {};
    allEventosCache.forEach(e => { if (e && e.id) byId[e.id] = e; });
    snap.forEach(child => { byId[child.key] = { id: child.key, ...child.val() }; });
    allEventosCache = Object.values(byId);
    renderEventos(allEventosCache);
  }).catch(err => {
    console.error("[eventos] refresh:", err);
    showToast("⚠️ No se pudieron cargar los eventos — revisa las reglas de Firebase");
  });
}

/* ═══════════════════════════════════════
   EVENTOS SECTION
═══════════════════════════════════════ */
function initEventos() {
  if (!db) return;

  eventoSelectedDia = getTodayDayKey();
  loadEventosWeek();

  // Sin listener on() persistente: la sincronización en vivo del nodo /eventos no es
  // fiable en este entorno y además pisaba las actualizaciones optimistas (borraba de la
  // vista eventos ya creados). Cargamos con once() (lectura fresca del servidor) y
  // mantenemos la vista al día de forma optimista al crear/editar/borrar.
  detachListener(activeEventosRef, activeEventosOff);
  activeEventosRef = null;
  activeEventosOff = null;

  // Carga con reintentos: en redes que entregan la lectura a trozos, cada relectura
  // une los eventos que falten (refreshEventos hace unión, nunca quita).
  refreshEventos();
  setTimeout(() => { if (currentSection === "eventos") refreshEventos(); }, 1500);
  setTimeout(() => { if (currentSection === "eventos") refreshEventos(); }, 4000);

  detachListener(activeEventosFeedRef, activeEventosFeedOff);
  const feed = document.getElementById("eventos-feed");
  const { ref: feedRef, off: feedOff } = listenActivityFeed(feed, "Eventos", 10);
  activeEventosFeedRef = feedRef;
  activeEventosFeedOff = feedOff;
}

function loadEventosWeek() {
  const monday = getMondayOfWeek(eventoWeekOffset);
  document.getElementById("eventos-week-label").textContent = formatWeekLabel(monday);
  renderEventosDayTabs(monday);
  renderEventosView(monday);
}

// Pinta la vista activa (día o semana) de la semana mostrada
function renderEventosView(monday) {
  if (vistaSeccion.eventos === "semana") renderEventosWeekView(monday);
  else renderEventosDayContent(eventoSelectedDia, monday);
}

function renderEventosWeekView(monday) {
  const container = document.getElementById("eventos-day-content");
  if (!container) return;
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "week-view";
  const expanded = getEventosExpanded();
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayISO = toLocalDateStr(dayDate);
    const eventos = expanded
      .filter(e => e.fecha === dayISO)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    const viajesHTML = getViajesEnFecha(dayISO).map(v => `
        <div class="week-view-line">
          <span class="week-view-icon">✈️</span>
          <span class="week-view-text">${escapeHTML(v.nombre)}</span>
          <span class="week-view-meta">${formatDate(new Date(v.fecha + "T00:00:00"))} – ${formatDate(new Date(v.fechaFin + "T00:00:00"))}</span>
        </div>`).join("");
    const body = (eventos.length === 0 && !viajesHTML)
      ? '<div class="week-view-line"><span class="week-view-text muted">—</span></div>'
      : viajesHTML + eventos.map(e => {
          const personas = Object.keys(e.personas || {}).filter(p => e.personas[p]);
          return `
        <div class="week-view-line">
          <span class="week-view-icon">📅</span>
          <span class="week-view-text">${escapeHTML(e.nombre)}${e.recurrencia ? " 🔁" : ""}</span>
          ${personas.length ? `<span class="week-view-meta">👥 ${personas.length}</span>` : ""}
        </div>`;
        }).join("");
    weekViewDayCard(list, "eventos", monday, i, body);
  }
  container.appendChild(list);
}

function renderEventosDayTabs(monday) {
  const tabs = document.getElementById("eventos-day-tabs");
  tabs.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayKey  = DIAS_KEY[i];
    const dayISO  = toLocalDateStr(dayDate);
    const hasEvento = getEventosExpanded().some(e => e.fecha === dayISO);
    const hasViaje  = getViajesEnFecha(dayISO).length > 0;

    const btn = document.createElement("button");
    btn.className = "day-tab" +
      (isToday(dayDate) ? " today" : "") +
      (dayKey === eventoSelectedDia ? " active" : "");
    btn.setAttribute("role", "tab");
    btn.dataset.day = dayKey;
    btn.innerHTML = `
      <span class="day-trip-bar${hasViaje ? "" : " empty"}"></span>
      <span class="day-abbr">${DIAS_ABBR[i]}</span>
      <span class="day-num">${dayDate.getDate()}</span>
      ${hasEvento ? '<span class="day-event-dot"></span>' : ''}
    `;
    if (hasViaje) btn.title = getViajesEnFecha(dayISO).map(v => `✈️ ${v.nombre}`).join("\n");
    btn.addEventListener("click", () => {
      eventoSelectedDia = dayKey;
      document.querySelectorAll("#eventos-day-tabs .day-tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      renderEventosDayContent(dayKey, monday);
    });
    tabs.appendChild(btn);
  }
}

function renderEventosDayContent(dayKey, monday) {
  const container = document.getElementById("eventos-day-content");
  if (!container) return;

  const dayIdx  = DIAS_KEY.indexOf(dayKey);
  const dayDate = new Date(monday);
  dayDate.setDate(monday.getDate() + (dayIdx >= 0 ? dayIdx : 0));
  const dayISO  = toLocalDateStr(dayDate);
  const dayLabel = DIAS_FULL[dayIdx >= 0 ? dayIdx : 0];

  const eventosDelDia = getEventosExpanded()
    .filter(e => e.fecha === dayISO)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const viajesDelDia = getViajesEnFecha(dayISO);

  container.innerHTML = "";
  const card = document.createElement("div");
  card.className = "section-card";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;";
  header.innerHTML = `
    <h2 class="section-card-title" style="margin-bottom:0">
      <span class="section-card-icon">📅</span> ${escapeHTML(dayLabel)} ${dayDate.getDate()}
    </h2>
    <button class="btn btn-primary" id="add-evento-dia-btn" style="font-size:.8rem;padding:.4rem .9rem;">+ Añadir</button>
  `;
  card.appendChild(header);

  container.appendChild(card);

  card.appendChild(eventosSubtitle("📅 Eventos"));
  if (eventosDelDia.length === 0) {
    const empty = document.createElement("div");
    empty.className = "activity-empty";
    empty.textContent = "Sin eventos este día";
    card.appendChild(empty);
  } else {
    eventosDelDia.forEach((evento, i) => card.appendChild(eventoCardEl(evento, { colorIdx: i })));
  }

  if (viajesDelDia.length > 0) {
    card.appendChild(eventosSubtitle("✈️ Viajes"));
    viajesDelDia.forEach(v => card.appendChild(eventoCardEl(v, { diaISO: dayISO })));
  }

  document.getElementById("add-evento-dia-btn").addEventListener("click", () => {
    openEventoModal(dayISO);
  });
}

function eventosSubtitle(texto) {
  const h = document.createElement("div");
  h.className = "eventos-subtitle";
  h.textContent = texto;
  return h;
}

// Tarjeta de evento o viaje.
// opts.colorIdx: color del acento (eventos) · opts.conFecha: mostrar fecha (lista de próximos)
// opts.diaISO: en viajes, día concreto para mostrar "Día N de M"
function eventoCardEl(evento, opts = {}) {
  const viaje = esViaje(evento);
  const card = document.createElement("div");
  card.className = "evento-card" + (viaje ? " viaje" : "");
  const accent = viaje ? "var(--color-info)" : EVENTO_COLORS[(opts.colorIdx || 0) % EVENTO_COLORS.length];
  const recurrente = !viaje && (evento.esVirtual || (opts.conFecha && evento.recurrencia));

  let fechaHTML = "";
  if (viaje) {
    const hoy = toLocalDateStr(new Date());
    const enCurso = opts.conFecha && evento.fecha <= hoy && hoy <= evento.fechaFin;
    const diaN = opts.diaISO ? ` · Día ${diasEntre(evento.fecha, opts.diaISO) + 1} de ${diasEntre(evento.fecha, evento.fechaFin) + 1}` : "";
    fechaHTML = `<div class="evento-card-fecha">${formatRangoViaje(evento)}${diaN}${enCurso ? ' <span class="viaje-en-curso">En curso</span>' : ""}</div>`;
  } else if (opts.conFecha) {
    fechaHTML = `<div class="evento-card-fecha">${formatEventoFecha(evento.fecha)}</div>`;
  }

  card.innerHTML = `
    <div class="evento-card-accent" style="background:${accent}"></div>
    <div class="evento-card-body">
      <div class="evento-card-top">
        <div>
          <div class="evento-card-nombre">${viaje ? "✈️ " : ""}${escapeHTML(evento.nombre)}${recurrente ? ' <span class="recurrence-badge">🔁</span>' : ''}</div>
          ${fechaHTML}
        </div>
        <div class="evento-card-actions">
          <button class="evento-action-btn edit" aria-label="Editar">✏️</button>
          <button class="evento-action-btn delete" aria-label="Eliminar">🗑️</button>
        </div>
      </div>
      ${evento.descripcion ? `<div class="evento-card-desc">${escapeHTML(evento.descripcion)}</div>` : ""}
      <div class="persona-chips evento-personas"></div>
    </div>
  `;
  renderEventoPersonaChips(card.querySelector(".evento-personas"), evento.personas || {}, evento.id);
  card.querySelector(".edit").addEventListener("click", () => openEventoModal(evento));
  card.querySelector(".delete").addEventListener("click", () => deleteEvento(evento.id, evento.nombre));
  return card;
}

function renderEventos(eventos) {
  allEventosCache = eventos;

  // Refrescar tabs (con dots actualizados) y contenido del día
  const monday = getMondayOfWeek(eventoWeekOffset);
  renderEventosDayTabs(monday);
  renderEventosView(monday);

  // Próximos: eventos de los 30 días siguientes y viajes que empiezan en los próximos 90 (o en curso)
  const container = document.getElementById("eventos-list");
  const today     = toLocalDateStr(new Date());
  const limit     = new Date(); limit.setDate(limit.getDate() + 30);
  const maxDate   = toLocalDateStr(limit);
  const limitV    = new Date(); limitV.setDate(limitV.getDate() + 90);
  const maxDateV  = toLocalDateStr(limitV);
  const proximos  = getEventosExpanded(30)
    .filter(e => e.fecha >= today && e.fecha <= maxDate)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const viajes = allEventosCache
    .filter(v => esViaje(v) && v.fechaFin >= today && v.fecha <= maxDateV)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (proximos.length === 0 && viajes.length === 0) {
    container.innerHTML = '<div class="eventos-empty">No hay eventos en los próximos 30 días</div>';
    return;
  }

  container.innerHTML = "";
  container.appendChild(eventosSubtitle("📅 Eventos"));
  if (proximos.length === 0) {
    container.insertAdjacentHTML("beforeend", '<div class="eventos-empty">No hay eventos en los próximos 30 días</div>');
  }
  proximos.forEach((evento, i) => container.appendChild(eventoCardEl(evento, { colorIdx: i, conFecha: true })));

  if (viajes.length > 0) {
    container.appendChild(eventosSubtitle("✈️ Viajes"));
    viajes.forEach(v => container.appendChild(eventoCardEl(v, { conFecha: true })));
  }
}

function renderEventoPersonaChips(containerOrId, personasData, eventoId) {
  const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;
  container.innerHTML = "";
  FAMILIA.forEach(persona => {
    const selected = !!(personasData && personasData[persona]);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip evento-persona-chip" + (selected ? " selected" : "");
    chip.textContent = persona;
    chip.addEventListener("click", () => {
      const nowSelected = chip.classList.toggle("selected");
      handleEventoPersonaToggle(eventoId, persona, nowSelected);
    });
    container.appendChild(chip);
  });
}

function handleEventoPersonaToggle(eventoId, persona, selected) {
  if (!db) return;
  db.ref(`eventos/${eventoId}/personas/${persona}`).set(selected ? true : null);
  if (persona === getUser()) {
    const accion = selected ? "se ha apuntado a" : "se ha quitado de";
    logActivity("Eventos", `${accion} un evento`);
  } else {
    const accion = selected ? "ha apuntado a" : "ha quitado a";
    logActivity("Eventos", `${accion} ${persona} de un evento`);
  }
}

function formatEventoFecha(fechaStr) {
  const [year, month, day] = fechaStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* EVENTO MODAL */
function openEventoModal(eventoOrFecha = null) {
  // Acepta un objeto evento (editar) o un string "YYYY-MM-DD" (nuevo con fecha pre-rellenada)
  const esFecha  = typeof eventoOrFecha === "string";
  const evento   = esFecha ? null : eventoOrFecha;
  const fechaPre = esFecha ? eventoOrFecha : null;

  editingEventoId = evento ? evento.id : null;
  eventoPersonas  = evento ? { ...(evento.personas || {}) } : {};

  const fechaIni = evento?.fecha || fechaPre || toLocalDateStr(new Date());
  document.getElementById("evento-modal-title").textContent = evento ? (esViaje(evento) ? "Editar viaje" : "Editar evento") : "Añadir evento";
  document.getElementById("evento-nombre").value     = evento?.nombre || "";
  document.getElementById("evento-fecha").value      = fechaIni;
  document.getElementById("evento-fecha-fin").value  = evento?.fechaFin || fechaIni;
  setEventoTipo(esViaje(evento) ? "viaje" : "evento");
  document.getElementById("evento-desc").value       = evento?.descripcion || "";
  document.getElementById("evento-recurrencia").value = evento?.recurrencia || "";

  // Persona chips en modal
  const chips = document.getElementById("evento-personas-chips");
  chips.innerHTML = "";
  FAMILIA.forEach(persona => {
    const selected = !!(eventoPersonas[persona]);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (selected ? " selected" : "");
    chip.textContent = persona;
    chip.addEventListener("click", () => {
      const nowSelected = chip.classList.toggle("selected");
      eventoPersonas[persona] = nowSelected ? true : null;
    });
    chips.appendChild(chip);
  });

  document.getElementById("evento-modal-overlay").classList.add("open");
  document.getElementById("evento-modal").classList.add("open");
  document.getElementById("evento-nombre").focus();
}

// Cambia el formulario entre evento puntual y viaje (inicio + fin, sin repetición)
function setEventoTipo(tipo) {
  eventoTipo = tipo;
  const viaje = tipo === "viaje";
  document.querySelectorAll("#evento-tipo-row .tipo-btn").forEach(b => b.classList.toggle("active", b.dataset.tipo === tipo));
  document.getElementById("evento-fecha-label").textContent = viaje ? "Fecha de inicio" : "Fecha";
  document.getElementById("evento-fecha-fin-group").classList.toggle("hidden", !viaje);
  document.getElementById("evento-recurrencia-group").classList.toggle("hidden", viaje);
  document.getElementById("evento-nombre").placeholder = viaje ? "Ej: Viaje a Asturias" : "Ej: Cumpleaños de Mamá";
}

function closeEventoModal() {
  document.getElementById("evento-modal-overlay").classList.remove("open");
  document.getElementById("evento-modal").classList.remove("open");
}

function handleEventoSubmit(e) {
  e.preventDefault();
  if (!db) return;

  const nombre = document.getElementById("evento-nombre").value.trim();
  const fecha  = document.getElementById("evento-fecha").value;
  const desc   = document.getElementById("evento-desc").value.trim();

  if (!nombre || !fecha) {
    showToast("⚠️ El nombre y la fecha son obligatorios");
    return;
  }

  const viaje    = eventoTipo === "viaje";
  const fechaFin = viaje ? document.getElementById("evento-fecha-fin").value : null;
  if (viaje && (!fechaFin || fechaFin < fecha)) {
    showToast("⚠️ La fecha de fin debe ser igual o posterior a la de inicio");
    return;
  }
  const tipoTxt  = viaje ? "viaje" : "evento";
  const rangoTxt = viaje ? `${formatFechaCorta(fecha)} – ${formatFechaCorta(fechaFin)}` : formatFechaCorta(fecha);

  // Limpiar nulls
  const personas = {};
  Object.entries(eventoPersonas).forEach(([k, v]) => { if (v) personas[k] = true; });

  const recurrencia = viaje ? null : (document.getElementById("evento-recurrencia").value || null);
  const data = {
    nombre,
    tipo: viaje ? "viaje" : null,
    fecha,
    fechaFin,
    descripcion: desc || null,
    recurrencia,
    personas,
    creadoPor: getUser() || "Alguien",
    timestamp: Date.now()
  };

  if (editingEventoId) {
    const idEditado = editingEventoId;
    db.ref(`eventos/${idEditado}`).update(data)
      .then(() => {
        logActivity("Eventos", `ha modificado el ${tipoTxt} "${nombre}"`);
        showToast(viaje ? "✓ Viaje actualizado" : "✓ Evento actualizado");
        // Actualización optimista: reflejar el cambio en la caché y repintar
        allEventosCache = allEventosCache.map(e => e.id === idEditado ? { id: idEditado, ...data } : e);
        eventoWeekOffset = fechaToWeekOffset(fecha);
        eventoSelectedDia = fechaToDayKey(fecha);
        renderEventos(allEventosCache);
      })
      .catch(err => {
        console.error("[eventos] guardado denegado:", err);
        showToast("⚠️ No se pudo guardar el evento — revisa las reglas de Firebase");
      });
  } else {
    const nuevoRef = db.ref("eventos").push(data);
    nuevoRef
      .then(() => {
        logActivity("Eventos", `ha añadido el ${tipoTxt} "${nombre}" (${rangoTxt})`);
        showToast(viaje ? "✓ Viaje añadido" : "✓ Evento añadido");
        eventoWeekOffset = fechaToWeekOffset(fecha);
        eventoSelectedDia = fechaToDayKey(fecha);
        // Actualización optimista: meter el evento recién creado en la caché y repintar
        // (no dependemos del listener en vivo, que puede no sincronizar)
        allEventosCache = allEventosCache.filter(e => e.id !== nuevoRef.key);
        allEventosCache.push({ id: nuevoRef.key, ...data });
        renderEventos(allEventosCache);
      })
      .catch(err => {
        console.error("[eventos] guardado denegado:", err);
        showToast("⚠️ No se pudo guardar el evento — revisa las reglas de Firebase");
      });
  }

  closeEventoModal();
}

function deleteEvento(eventoId, nombre) {
  if (!db) return;
  const tipoTxt = esViaje(allEventosCache.find(e => e.id === eventoId)) ? "viaje" : "evento";
  if (!confirm(`¿Eliminar el ${tipoTxt} "${nombre}"?`)) return;
  db.ref(`eventos/${eventoId}`).remove()
    .then(() => {
      logActivity("Eventos", `ha eliminado el ${tipoTxt} "${nombre}"`);
      showToast("Evento eliminado");
      // Actualización optimista: quitar de la caché y repintar
      allEventosCache = allEventosCache.filter(e => e.id !== eventoId);
      renderEventos(allEventosCache);
    })
    .catch(err => {
      console.error("[eventos] borrado denegado:", err);
      showToast("⚠️ No se pudo eliminar el evento — revisa las reglas de Firebase");
    });
}

/* ═══════════════════════════════════════
   COMPRA SECTION (lista de la compra)
   ▸ Lista compartida. Sin listener on() (red inestable): carga con
     once()+reintentos+unión y actualización optimista al escribir.
═══════════════════════════════════════ */
function compraSlug(nombre) {
  return (nombre || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "otros";
}

function compraSubList() {
  const subs = COMPRA_SUBS_DEFAULT.map(nombre => ({ key: compraSlug(nombre), nombre, custom: false }));
  compraSubsCache.slice()
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .forEach(s => subs.push({ key: s.id, nombre: s.nombre, custom: true }));
  return subs;
}

function initCompra() {
  if (!db) return;
  if (!compraUIWired) {
    compraUIWired = true;
    document.getElementById("compra-nueva-sub").addEventListener("click", addCompraSubseccion);
    document.getElementById("compra-borrar-comprados").addEventListener("click", () => clearCompra("comprados"));
    document.getElementById("compra-dejar-marcado").addEventListener("click", () => clearCompra("no-marcados"));
    document.getElementById("compra-vaciar-todo").addEventListener("click", () => clearCompra("todo"));
    document.getElementById("compra-desmarcar").addEventListener("click", resetComprados);
  }
  refreshCompra();
  setTimeout(() => { if (currentSection === "compra") refreshCompra(); }, 1500);
  setTimeout(() => { if (currentSection === "compra") refreshCompra(); }, 4000);
}

function refreshCompra() {
  if (!db) return;
  db.ref("compra").once("value").then(snap => {
    const val = snap.val() || {};
    const itemsById = {};
    compraItemsCache.forEach(it => { if (it && it.id) itemsById[it.id] = it; });
    const items = val.items || {};
    Object.keys(items).forEach(id => { itemsById[id] = { id, ...items[id] }; });
    compraItemsCache = Object.values(itemsById);
    const subsById = {};
    compraSubsCache.forEach(s => { if (s && s.id) subsById[s.id] = s; });
    const subs = val.subsecciones || {};
    Object.keys(subs).forEach(id => { subsById[id] = { id, ...subs[id] }; });
    compraSubsCache = Object.values(subsById);
    renderCompra();
  }).catch(err => {
    console.error("[compra] refresh:", err);
    showToast("⚠️ No se pudo cargar la compra — revisa las reglas de Firebase");
  });
}

function renderCompra() {
  const container = document.getElementById("compra-list");
  if (!container) return;
  container.innerHTML = "";

  compraSubList().forEach(sub => {
    const items = compraItemsCache
      .filter(it => it.subseccion === sub.key)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const pend = items.filter(it => !it.comprado).length;

    const card = document.createElement("div");
    card.className = "section-card compra-sub";

    const header = document.createElement("div");
    header.className = "compra-sub-header";
    header.innerHTML = `
      <h2 class="section-card-title compra-sub-title">
        ${escapeHTML(sub.nombre)}${items.length ? ` <span class="compra-count">${pend}</span>` : ""}
      </h2>
      <div class="compra-sub-actions"></div>
    `;
    const acts = header.querySelector(".compra-sub-actions");
    const btnVaciar = document.createElement("button");
    btnVaciar.className = "compra-mini-btn";
    btnVaciar.textContent = "vaciar";
    btnVaciar.addEventListener("click", () => clearCompra("sub", sub.key, sub.nombre));
    acts.appendChild(btnVaciar);
    if (sub.custom) {
      const btnDel = document.createElement("button");
      btnDel.className = "compra-mini-btn danger";
      btnDel.textContent = "🗑";
      btnDel.title = "Borrar subsección";
      btnDel.addEventListener("click", () => deleteCompraSubseccion(sub.key, sub.nombre));
      acts.appendChild(btnDel);
    }
    card.appendChild(header);

    const itemsBox = document.createElement("div");
    itemsBox.className = "compra-items";
    items.forEach(it => itemsBox.appendChild(compraItemRow(it)));
    card.appendChild(itemsBox);

    const addRow = document.createElement("div");
    addRow.className = "compra-add-row";
    const input = document.createElement("input");
    input.className = "compra-add-input";
    input.type = "text";
    input.placeholder = "Añadir artículo…";
    input.dataset.sub = sub.key;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const texto = input.value.trim();
        if (texto) addCompraItem(sub.key, sub.nombre, texto);
      }
    });
    addRow.appendChild(input);
    card.appendChild(addRow);

    container.appendChild(card);
  });

  if (compraFocusSub) {
    const sel = (window.CSS && CSS.escape) ? CSS.escape(compraFocusSub) : compraFocusSub;
    const inp = container.querySelector(`.compra-add-input[data-sub="${sel}"]`);
    if (inp) inp.focus();
    compraFocusSub = null;
  }
}

function compraItemRow(it) {
  const row = document.createElement("div");
  row.className = "compra-item";

  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.className = "compra-check";
  chk.checked = !!it.comprado;
  chk.addEventListener("change", () => toggleCompraItem(it.id, chk.checked));

  const txt = document.createElement("span");
  txt.className = "compra-item-text" + (it.comprado ? " done" : "");
  txt.textContent = it.texto;
  txt.title = "Toca para editar";
  txt.addEventListener("click", () => convertCompraItemToInput(txt, it));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "compra-del";
  del.textContent = "🗑";
  del.setAttribute("aria-label", "Borrar");
  del.addEventListener("click", (e) => { e.preventDefault(); deleteCompraItem(it.id); });

  row.appendChild(chk);
  row.appendChild(txt);
  row.appendChild(del);
  return row;
}

function convertCompraItemToInput(span, it) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "compra-edit-input";
  input.value = it.texto;
  span.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const save = () => {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (!val) deleteCompraItem(it.id);
    else if (val !== it.texto) editCompraItem(it.id, val);
    else input.replaceWith(span);
  };
  input.addEventListener("blur", save);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { done = true; input.replaceWith(span); }
  });
}

function editCompraItem(id, texto) {
  if (!db) return;
  db.ref(`compra/items/${id}/texto`).set(texto).catch(err => {
    console.error("[compra] edición denegada:", err);
    showToast("⚠️ No se pudo guardar — revisa las reglas de Firebase");
  });
  const it = compraItemsCache.find(x => x.id === id);
  if (it) it.texto = texto;
  renderCompra();
}

function addCompraItem(subKey, subNombre, texto) {
  if (!db) return;
  const data = { subseccion: subKey, texto, comprado: false, ts: Date.now() };
  const ref = db.ref("compra/items").push(data);
  compraItemsCache.push({ id: ref.key, ...data });
  compraFocusSub = subKey;
  renderCompra();
  ref.catch(err => {
    console.error("[compra] alta denegada:", err);
    showToast("⚠️ No se pudo guardar — revisa las reglas de Firebase");
  });
}

function toggleCompraItem(id, comprado) {
  if (!db) return;
  db.ref(`compra/items/${id}/comprado`).set(comprado);
  const it = compraItemsCache.find(x => x.id === id);
  if (it) it.comprado = comprado;
  renderCompra();
}

function deleteCompraItem(id) {
  if (!db) return;
  db.ref(`compra/items/${id}`).remove();
  compraItemsCache = compraItemsCache.filter(x => x.id !== id);
  renderCompra();
}

function clearCompra(modo, subKey, subNombre) {
  if (!db) return;
  let idsToRemove = [];
  if (modo === "sub") {
    if (!confirm(`¿Vaciar "${subNombre}"?`)) return;
    idsToRemove = compraItemsCache.filter(it => it.subseccion === subKey).map(it => it.id);
  } else if (modo === "todo") {
    if (!confirm("¿Vaciar TODA la lista de la compra?")) return;
    idsToRemove = compraItemsCache.map(it => it.id);
  } else if (modo === "comprados") {
    idsToRemove = compraItemsCache.filter(it => it.comprado).map(it => it.id);
    if (idsToRemove.length === 0) { showToast("No hay nada marcado como comprado"); return; }
  } else if (modo === "no-marcados") {
    if (compraItemsCache.filter(it => it.comprado).length === 0) { showToast("No hay nada marcado"); return; }
    if (!confirm("¿Borrar todo lo NO marcado y dejar solo lo marcado?")) return;
    idsToRemove = compraItemsCache.filter(it => !it.comprado).map(it => it.id);
  }
  if (idsToRemove.length === 0) { showToast("La lista ya está vacía"); return; }
  const updates = {};
  idsToRemove.forEach(id => { updates[`compra/items/${id}`] = null; });
  db.ref().update(updates);
  const removeSet = new Set(idsToRemove);
  compraItemsCache = compraItemsCache.filter(it => !removeSet.has(it.id));
  renderCompra();
}

function resetComprados() {
  if (!db) return;
  const marcados = compraItemsCache.filter(it => it.comprado);
  if (marcados.length === 0) { showToast("No hay nada marcado como comprado"); return; }
  const updates = {};
  marcados.forEach(it => { updates[`compra/items/${it.id}/comprado`] = false; });
  db.ref().update(updates);
  compraItemsCache = compraItemsCache.map(it => it.comprado ? { ...it, comprado: false } : it);
  renderCompra();
}

function addCompraSubseccion() {
  if (!db) return;
  const nombre = (prompt("Nombre de la nueva subsección:") || "").trim();
  if (!nombre) return;
  const data = { nombre, ts: Date.now() };
  const ref = db.ref("compra/subsecciones").push(data);
  compraSubsCache.push({ id: ref.key, ...data });
  renderCompra();
  ref.catch(err => {
    console.error("[compra] subsección denegada:", err);
    showToast("⚠️ No se pudo crear la subsección");
  });
}

function deleteCompraSubseccion(subId, subNombre) {
  if (!db) return;
  if (!confirm(`¿Borrar la subsección "${subNombre}" y sus artículos?`)) return;
  const updates = { [`compra/subsecciones/${subId}`]: null };
  compraItemsCache.filter(it => it.subseccion === subId).forEach(it => { updates[`compra/items/${it.id}`] = null; });
  db.ref().update(updates);
  compraSubsCache = compraSubsCache.filter(s => s.id !== subId);
  compraItemsCache = compraItemsCache.filter(it => it.subseccion !== subId);
  renderCompra();
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration = 2800) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

/* ═══════════════════════════════════════
   NOTIFICACIONES (OneSignal Web Push)
   ▸ El SDK se inicializa en index.html y llama a onPushReady().
   ▸ El envío con la app cerrada lo hace la función serverless /api/notify,
     que guarda la REST API key en Vercel (no en el cliente).
═══════════════════════════════════════ */
let oneSignalInstance = null;

// index.html llama aquí cuando OneSignal termina de inicializar
function onPushReady(OneSignal) {
  oneSignalInstance = OneSignal;
  applyPushIdentity();
}

// Identifica el dispositivo con el nombre del miembro
function applyPushIdentity() {
  if (!oneSignalInstance) return;
  const nombre = getUser();
  if (!nombre) return;
  try {
    oneSignalInstance.login(nombre);
    if (oneSignalInstance.User && oneSignalInstance.User.addTag) {
      oneSignalInstance.User.addTag("miembro", nombre);
    }
  } catch (e) {}
}

// Envía un aviso a los demás vía la función serverless (oculta la REST API key).
// Silencioso: en local (sin /api) o si falla, no rompe nada.
function sendPush(seccion, descripcion, persona) {
  try {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${persona} — ${seccion}`, body: descripcion, sender: persona })
    }).catch(() => {});
  } catch (e) {}
}

/* ═══════════════════════════════════════
   ESCAPE HTML
═══════════════════════════════════════ */
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
