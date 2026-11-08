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
  estudiante: () => { const me = store.get('me', null); me ? viewStudentCred(me) : viewStudentPick() },
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
  (ROUTES[location.hash.slice(1)] || viewHome)();
}

window.addEventListener('hashchange', render);
if (!window.isSecureContext || !crypto.subtle) {
  document.getElementById('app').innerHTML = '<p style="padding:16px">Abre el prototipo desde su enlace https (GitHub Pages). El navegador no permite generar los códigos en esta dirección.</p>';
} else {
  render();
}
