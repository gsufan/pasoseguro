// Student views: one credential per phone, linked by opening the guard's QR link
const b64url = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

// link opened by the phone camera; the hash never reaches the server
function pairLink(s) {
  const payload = b64url(JSON.stringify({ i: s.id, n: s.name, s: s.secret }));
  return `${location.origin}${location.pathname}#vincular=${payload}`;
}
function parsePair(text) {
  const t = String(text);
  const m = t.match(/#vincular=([A-Za-z0-9_-]+)/);
  try {
    if (m) { const o = JSON.parse(unb64url(m[1])); if (o.i && o.n && o.s) return { id: o.i, name: o.n, secret: o.s } }
    const p = t.split('|'); // v1 format
    if (p[0] === 'PSPAIR' && p.length === 4) return { id: p[1], name: p[2], secret: p[3] };
  } catch {}
  return null;
}
function linkCredential(cred) {
  store.set('me', cred);
  toast('Credencial vinculada');
}

function viewStudentStart() {
  $tabs().hidden = true;
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Vincula tu credencial</h1>
    <p class="muted">Pídele al guardia tu QR de vinculación y escanéalo con la cámara de tu celular. Se abrirá esta página con tu credencial lista.</p></div>
    <button class="btn" id="link">Escanear desde aquí</button>
    <button class="link" id="demo">Modo demostración: usar un estudiante de ejemplo</button>`);
  frag.getElementById('link').onclick = viewStudentLink;
  frag.getElementById('demo').onclick = viewStudentDemo;
  $app().replaceChildren(frag); bindGo($app());
}

function viewStudentDemo() {
  teardown();
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Modo demostración</h1><p class="muted">Estudiantes ficticios para probar el prototipo sin registrarse.</p></div>
    <div class="card" id="list"></div>
    <button class="link" id="back">Volver</button>`);
  const box = frag.getElementById('list');
  DEMO.forEach(d => {
    const row = h(`<button class="btn row" style="text-align:left"><img class="avatar" alt="" src="${demoAvatar(d)}"><span class="grow">${esc(d.name)}</span><span class="note">Ejemplo</span></button>`).firstChild;
    row.onclick = () => { store.set('me', { id: d.id, name: d.name, secret: d.secret, demo: true }); go('estudiante') };
    box.append(row);
  });
  frag.getElementById('back').onclick = () => go('estudiante');
  $app().replaceChildren(frag); bindGo($app());
}

async function viewStudentLink() {
  teardown();
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Escanear QR de vinculación</h1><p class="muted">Apunta al QR que aparece en el celular del guardia.</p></div>
    <div class="scan" id="cam"><p style="color:#fff;padding:16px">Abriendo cámara…</p></div>
    <button class="btn" id="photo">Tomar foto del QR</button>
    <button class="link" id="cancel">Volver</button>`);
  $app().replaceChildren(frag); bindGo($app());
  let done = false;
  const handle = text => {
    if (done) return;
    const cred = parsePair(text);
    if (!cred) { toast('Ese QR no es de vinculación'); return }
    done = true;
    linkCredential(cred);
    go('estudiante');
  };
  document.getElementById('cancel').onclick = () => go('estudiante');
  document.getElementById('photo').onclick = async () => {
    const f = await pickImage('environment'); if (!f) return;
    const t = await decodeFile(f);
    t ? handle(t) : toast('No se encontró un QR en la foto');
  };
  const cam = document.getElementById('cam');
  const live = await startLiveScan(cam, handle);
  if (live) onTeardown(() => live.stop());
  else cam.replaceChildren(h('<p style="color:#fff;padding:16px">La cámara en vivo no está disponible aquí. Usa “Tomar foto del QR”.</p>'));
}

function viewStudentCred(me) {
  teardown(); $tabs().hidden = true;
  const demo = DEMO.find(d => d.id === me.id);
  const frag = h(`${topBar(true)}
    ${demo ? '<p class="pill ok" style="align-self:center">MODO DEMOSTRACIÓN</p>' : ''}
    <div class="card cred">
      <div class="row" style="justify-content:center">${demo ? `<img class="avatar" alt="" src="${demoAvatar(demo)}">` : ''}<div style="text-align:left"><div class="label">Credencial virtual</div><h2>${esc(me.name)}</h2></div></div>
      <div class="qrbox"><canvas id="qr" aria-label="Código QR dinámico"></canvas></div>
      <div class="bar"><i id="bar"></i></div>
      <p><span class="muted">Cambia en</span> <b id="left">0:30</b></p>
      <div><div class="label">Código manual</div><div class="code" id="code">--- ---</div></div>
    </div>
    <p class="note">El código se genera en este celular y cambia cada ${STEP} segundos. Un pantallazo deja de servir apenas cambia.</p>
    <button class="link" id="unlink">${demo ? 'Salir del modo demostración' : 'Desvincular este celular'}</button>
    <div id="confirmUnlink"></div>`);
  $app().replaceChildren(frag); bindGo($app());
  document.getElementById('unlink').onclick = () => {
    if (demo) { store.set('me', null); go('estudiante'); return }
    const c = document.getElementById('confirmUnlink');
    c.replaceChildren(h(`<div class="card"><p>Tu credencial se quitará de este celular. Para volver a usarla, pide otro QR de vinculación al guardia.</p><div class="row"><button class="btn danger grow" id="uYes">Desvincular</button><button class="btn grow" id="uNo">Cancelar</button></div></div>`));
    document.getElementById('uYes').onclick = () => { store.set('me', null); go('estudiante') };
    document.getElementById('uNo').onclick = () => c.replaceChildren();
  };
  let shown = -1, alive = true;
  async function tick() {
    if (!alive) return;
    const step = nowStep(), left = STEP - Math.floor(Date.now() / 1000) % STEP;
    document.getElementById('left').textContent = '0:' + String(left).padStart(2, '0');
    document.getElementById('bar').style.width = (left / STEP * 100) + '%';
    if (step !== shown) {
      shown = step;
      const code = await hotp(me.secret, step);
      if (!alive) return;
      drawQR(document.getElementById('qr'), `PS1|${me.id}|${step}|${code}`);
      document.getElementById('code').textContent = code.slice(0, 3) + ' ' + code.slice(3);
    }
  }
  tick();
  const iv = setInterval(tick, 1000);
  onTeardown(() => { alive = false; clearInterval(iv) });
  // keep the screen on while the credential is shown
  let lock = null;
  navigator.wakeLock?.request('screen').then(l => { if (alive) lock = l; else l.release() }).catch(() => {});
  onTeardown(() => lock?.release());
}
