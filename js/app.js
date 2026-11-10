// Home view and hash router
function viewHome() {
  $tabs().hidden = true;
  $app().replaceChildren(h(`${topBar(false)}
    <div class="stack"><h1>Prototipo de validación de credenciales</h1>
    <p class="muted">INACAP sede Chillán. Abre este enlace en dos celulares: uno como estudiante y otro como guardia.</p></div>
    <div class="role">
      <button class="btn" data-go="estudiante">Soy estudiante<span>Muestra tu credencial con QR dinámico</span></button>
      <button class="btn" data-go="guardia">Soy guardia<span>Escanea y valida el ingreso</span></button>
    </div>
    <p class="note">Prototipo académico. Los estudiantes de ejemplo son ficticios. Ambos celulares deben tener la hora automática activada.</p>`));
  bindGo($app());
}

const ROUTES = {
  estudiante: () => { const me = store.get('me', null); me ? viewStudentCred(me) : viewStudentStart() },
  guardia: viewGuardScan,
  nombre: viewGuardName,
  estudiantes: viewGuardStudents,
  registro: viewGuardLog,
};

function go(role, tab) {
  const hash = role === 'guardia' && tab && tab !== 'escanear' ? tab : (role || '');
  if (location.hash.slice(1) !== hash) history.replaceState(null, '', hash ? '#' + hash : location.pathname);
  render();
}
function render() {
  teardown();
  const hash = location.hash.slice(1);
  // pairing link opened from the phone camera
  if (hash.startsWith('vincular=')) {
    const cred = parsePair('#' + hash);
    history.replaceState(null, '', location.pathname + location.search + '#estudiante');
    if (cred) linkCredential(cred); else toast('El enlace de vinculación no es válido');
    return ROUTES.estudiante();
  }
  (ROUTES[hash] || viewHome)();
}

window.addEventListener('hashchange', render);

// GitHub Pages lets browsers cache files for ~10 min; detect a newer build and reload
async function latestBuild() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    return r.ok ? (await r.json()).build : null;
  } catch { return null }
}
function reloadTo(build) {
  const url = new URL(location.href);
  url.searchParams.set('b', build);
  location.replace(url.toString());
}
async function checkUpdate(silent) {
  const b = await latestBuild();
  if (!b || b === BUILD) return;
  // just opened: nothing to lose; reload once per build to avoid loops
  const key = 'ps_reloaded_' + b;
  let tried = false;
  try { tried = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1') } catch {}
  if (silent && !tried) return reloadTo(b);
  const bar = document.getElementById('update');
  bar.hidden = false;
  bar.querySelector('button').onclick = () => reloadTo(b);
}
checkUpdate(true);
setInterval(() => checkUpdate(false), 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(false) });
if (!window.isSecureContext || !crypto.subtle) {
  document.getElementById('app').innerHTML = '<p style="padding:16px">Abre el prototipo desde su enlace https (GitHub Pages). El navegador no permite generar los códigos en esta dirección.</p>';
} else {
  render();
}
