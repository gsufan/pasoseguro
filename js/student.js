// Student views: pick a credential, link a new one, show the dynamic QR
function viewStudentPick() {
  $tabs().hidden = true;
  const linked = store.get('myCreds', []);
  const list = [...DEMO.map(s => ({ id: s.id, name: s.name, secret: s.secret })), ...linked];
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Elige tu credencial</h1><p class="muted">Usa un estudiante de ejemplo o vincula la credencial que te creó el guardia.</p></div>
    <div class="card" id="list"></div>
    <button class="btn" id="link">Vincular credencial nueva</button>`);
  const box = frag.getElementById('list');
  list.forEach(s => {
    const demo = DEMO.find(d => d.id === s.id);
    const photo = demo ? demoAvatar(demo) : demoAvatar({ name: s.name, color: '#17733F' });
    const row = h(`<button class="btn row" style="text-align:left"><img class="avatar" alt="" src="${photo}"><span class="grow">${esc(s.name)}</span>${demo ? '<span class="note">Ejemplo</span>' : ''}</button>`).firstChild;
    row.onclick = () => { store.set('me', s); go('estudiante') };
    box.append(row);
  });
  frag.getElementById('link').onclick = viewStudentLink;
  $app().replaceChildren(frag); bindGo($app());
}

async function viewStudentLink() {
  teardown();
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Vincular credencial</h1><p class="muted">Escanea el QR de vinculación que aparece en el celular del guardia.</p></div>
    <div class="scan" id="cam"><p style="color:#fff;padding:16px">Abriendo cámara…</p></div>
    <button class="btn" id="photo">Tomar foto del QR</button>
    <button class="link" id="cancel">Volver</button>`);
  $app().replaceChildren(frag); bindGo($app());
  let done = false;
  const handle = text => {
    if (done) return;
    const p = String(text).split('|');
    if (p[0] !== 'PSPAIR' || p.length !== 4) { toast('Ese QR no es de vinculación'); return }
    done = true;
    const cred = { id: p[1], name: p[2], secret: p[3] };
    const mine = store.get('myCreds', []).filter(c => c.id !== cred.id);
    mine.push(cred); store.set('myCreds', mine);
    store.set('me', cred);
    toast('Credencial vinculada');
    go('estudiante');
  };
  document.getElementById('cancel').onclick = () => { store.set('me', null); go('estudiante') };
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
    <div class="card cred">
      <div class="row" style="justify-content:center">${demo ? `<img class="avatar" alt="" src="${demoAvatar(demo)}">` : ''}<div style="text-align:left"><div class="label">Credencial virtual</div><h2>${esc(me.name)}</h2></div></div>
      <div class="qrbox"><canvas id="qr" aria-label="Código QR dinámico"></canvas></div>
      <div class="bar"><i id="bar"></i></div>
      <p><span class="muted">Cambia en</span> <b id="left">0:30</b></p>
      <div><div class="label">Código manual</div><div class="code" id="code">--- ---</div></div>
    </div>
    <p class="note">El código se genera en este celular y cambia cada ${STEP} segundos. Un pantallazo deja de servir apenas cambia.</p>
    <button class="link" id="other">Usar otra credencial</button>`);
  $app().replaceChildren(frag); bindGo($app());
  document.getElementById('other').onclick = () => { store.set('me', null); go('estudiante') };
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
