// Shared config, storage, demo data and DOM helpers
const APP_VERSION = 'v2';
const BUILD = '2.0.0';   // must match version.json; set by tools/bump.py
const STEP = 30;       // seconds per code
const DIGITS = 6;
const WINDOW = 1;      // accepted clock drift, in steps
const USED_TTL = 5 * 60 * 1000;

// ---------- storage (falls back to memory when blocked) ----------
const mem = {};
const store = {
  get(k, d) {
    try { const v = localStorage.getItem('ps_' + k); if (v != null) return JSON.parse(v) } catch {}
    return k in mem ? mem[k] : d;
  },
  set(k, v) { mem[k] = v; try { localStorage.setItem('ps_' + k, JSON.stringify(v)) } catch {} },
};

// ---------- demo data (fictional students, same on every device) ----------
const DEMO = [
  { id: 'D01', name: 'Camila Rojas',   active: true,  secret: 'KRSXG5CTMVRXEZLUMFZG2YLJNQ2DAMBT', color: '#2F6F8F' },
  { id: 'D02', name: 'Matías Fuentes', active: true,  secret: 'MZXW6YTBOI2DCMBSGQZDGNBVGY3TQOJQ', color: '#8F5A2F' },
  { id: 'D03', name: 'Valentina Soto', active: true,  secret: 'NBSWY3DPEB3W64TMMQ2DQNZXGEYTGMRR', color: '#6B3F8F' },
  { id: 'D04', name: 'Benjamín Muñoz', active: false, secret: 'ORSXG5BAMNXWIZJAGEZDGNBVGYZTANBS', color: '#3F7A4A' },
];

function initials(n) { return n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() }
function demoAvatar(s) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${s.color}"/><circle cx="50" cy="40" r="18" fill="rgba(255,255,255,.35)"/><path d="M16 100c4-24 18-32 34-32s30 8 34 32z" fill="rgba(255,255,255,.35)"/><text x="50" y="47" text-anchor="middle" font-family="Arial" font-weight="700" font-size="20" fill="#fff">${initials(s.name)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function allStudents() {
  const overrides = store.get('active', {});
  const enrolled = store.get('enrolled', []);
  return [...DEMO.map(s => ({ ...s, photo: demoAvatar(s), demo: true })), ...enrolled]
    .map(s => ({ ...s, active: s.id in overrides ? overrides[s.id] : s.active }));
}
const findStudent = id => allStudents().find(s => s.id === id);

// ---------- DOM helpers ----------
const $app = () => document.getElementById('app');
const $tabs = () => document.getElementById('tabs');
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200);
}
function logEvent(e) {
  const log = store.get('log', []);
  const eid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  log.push({ eid, t: new Date().toISOString(), v: APP_VERSION, ...e });
  store.set('log', log);
  return eid;
}
function updateEvent(eid, patch) {
  const log = store.get('log', []), e = log.find(x => x.eid === eid);
  if (e) { Object.assign(e, patch); store.set('log', log) }
}

// cleanup callbacks for the current view (camera, timers, wake lock)
let cleanup = [];
function teardown() { cleanup.forEach(f => { try { f() } catch {} }); cleanup = [] }
function onTeardown(f) { cleanup.push(f) }

function topBar(back) {
  return `<header class="top"><div class="brand">PasoSeguro<small>${APP_VERSION}</small></div>${back ? '<button class="link" data-go="">Cambiar rol</button>' : ''}</header>`;
}
function bindGo(root) { root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go)) }

async function saveCsv(filename, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }); // BOM so Excel reads accents
  try {
    const dl = await window.claude?.use?.('downloads');
    if (dl) { await dl.save({ filename, data: blob }); return }
  } catch (e) { if (e?.code) { toast('Descarga cancelada'); return } }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
