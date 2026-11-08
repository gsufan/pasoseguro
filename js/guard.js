// Guard views: scan, search by name, manage test students, test log
const GUARD_TABS = [['escanear', 'Escanear'], ['nombre', 'Por nombre'], ['estudiantes', 'Estudiantes'], ['registro', 'Registro']];

// optional stopwatch: started when a person arrives, stopped by the verdict
const timer = { start: null };
function timerMs() {
  if (timer.start == null) return null;
  const ms = Math.round(performance.now() - timer.start);
  timer.start = null;
  return ms;
}

function guardShell(tab) {
  teardown(); $tabs().hidden = false;
  $tabs().replaceChildren(...GUARD_TABS.map(([k, label]) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (k === tab) b.setAttribute('aria-current', 'page');
    b.onclick = () => go('guardia', k);
    return b;
  }));
}

function verdictHtml(r, mode, ms) {
  const s = r.student;
  const meta = `<p class="mode">${esc(mode)}${ms != null ? ' · ' + (ms / 1000).toFixed(1) + ' s' : ''} · ${new Date().toLocaleTimeString('es-CL')}</p>`;
  return r.ok
    ? `<div class="verdict ok" role="status"><div class="big">✓ Ingreso permitido</div><img class="avatar lg" alt="Foto del estudiante" src="${s.photo}"><div class="name">${esc(s.name)}</div><span class="pill ok">VIGENTE</span><p class="muted">Compara la foto con la persona</p>${meta}</div>`
    : `<div class="verdict bad" role="alert"><div class="big">✕ Ingreso rechazado</div>${s ? `<img class="avatar lg" alt="" src="${s.photo}"><div class="name">${esc(s.name)}</div>` : ''}<p><b>${esc(r.reason)}</b></p><p class="muted">Pide la credencial en vivo o búscalo por nombre</p>${meta}</div>`;
}

function timerRow() {
  return `<div class="timer" id="timer"><button class="btn" id="tBtn">Iniciar tiempo</button><output id="tOut">—</output></div>`;
}
function bindTimer() {
  const row = document.getElementById('timer'), btn = document.getElementById('tBtn'), out = document.getElementById('tOut');
  const paint = () => {
    const on = timer.start != null;
    row.classList.toggle('running', on);
    btn.textContent = on ? 'Cancelar tiempo' : 'Iniciar tiempo';
    out.textContent = on ? ((performance.now() - timer.start) / 1000).toFixed(1) + ' s' : '—';
  };
  btn.onclick = () => { timer.start = timer.start == null ? performance.now() : null; paint() };
  paint();
  const iv = setInterval(paint, 100);
  onTeardown(() => clearInterval(iv));
}

async function viewGuardScan() {
  guardShell('escanear');
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Validar ingreso</h1><p class="muted">Apunta la cámara al QR de la credencial.</p></div>
    ${timerRow()}
    <div class="scanwrap">
      <div class="scan" id="cam"><p style="color:#fff;padding:16px">Abriendo cámara…</p></div>
      <div id="result" class="overlay" hidden></div>
    </div>
    <button class="btn" id="photo">Tomar foto del QR</button>
    <details class="card" id="manual"><summary><b>Ingresar código manual</b></summary>
      <div class="stack" style="margin-top:12px"><label class="label" for="mId">Estudiante</label><select id="mId"></select>
      <label class="label" for="mCode">Código de 6 dígitos</label><input type="text" id="mCode" inputmode="numeric" maxlength="7" placeholder="123 456" autocomplete="off">
      <button class="btn primary" id="mGo">Validar código</button></div></details>`);
  $app().replaceChildren(frag); bindGo($app()); bindTimer();
  const sel = document.getElementById('mId');
  allStudents().forEach(s => sel.append(new Option(s.name, s.id)));
  const result = document.getElementById('result');
  let seq = 0, hideT = null;
  result.onclick = () => { clearTimeout(hideT); result.hidden = true };
  onTeardown(() => clearTimeout(hideT));
  // every validation replaces the previous verdict
  async function show(promise, mode) {
    const my = ++seq;
    const r = await promise;
    const ms = timerMs();
    logEvent({ mode, id: r.student?.id || '', name: r.student?.name || '', result: r.ok ? 'Aceptado' : 'Rechazado', reason: r.ok ? '' : r.reason, ms });
    if (my !== seq) return;
    result.replaceChildren(h(verdictHtml(r, mode, ms)));
    result.hidden = false;
    navigator.vibrate?.(r.ok ? 80 : [60, 60, 60]);
    clearTimeout(hideT);
    hideT = setTimeout(() => { result.hidden = true }, 10000); // camera view comes back
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  document.getElementById('photo').onclick = async () => {
    const f = await pickImage('environment'); if (!f) return;
    const t = await decodeFile(f);
    t ? show(verifyPayload(t), 'Foto del QR') : toast('No se encontró un QR en la foto');
  };
  const mCode = document.getElementById('mCode');
  const submitManual = () => {
    const code = mCode.value.replace(/\D/g, '');
    if (code.length !== DIGITS) { toast('El código tiene 6 dígitos'); return }
    show(verifyManual(sel.value, code), 'Código manual');
    mCode.value = '';
  };
  document.getElementById('mGo').onclick = submitManual;
  mCode.onkeydown = e => { if (e.key === 'Enter') submitManual() };
  const cam = document.getElementById('cam');
  const live = await startLiveScan(cam, t => show(verifyPayload(t), 'Cámara'));
  if (live) onTeardown(() => live.stop());
  else cam.replaceChildren(h('<p style="color:#fff;padding:16px">La cámara en vivo no está disponible. Revisa el permiso de cámara del navegador, o usa “Tomar foto del QR” o el código manual.</p>'));
}

function viewGuardName() {
  guardShell('nombre');
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Buscar por nombre</h1><p class="muted">Respaldo para quien no trae celular. Confirma con la foto.</p></div>
    ${timerRow()}
    <input type="search" id="q" placeholder="Escribe el nombre" autocomplete="off">
    <div class="stack" id="res"></div>`);
  $app().replaceChildren(frag); bindGo($app()); bindTimer();
  const q = document.getElementById('q'), res = document.getElementById('res');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  function render() {
    const term = norm(q.value.trim());
    res.replaceChildren();
    allStudents().filter(s => norm(s.name).includes(term)).forEach(s => {
      const b = h(`<button class="btn row" style="text-align:left"><img class="avatar" alt="" src="${s.photo}"><span class="grow">${esc(s.name)}</span><span class="pill ${s.active ? 'ok' : 'bad'}">${s.active ? 'VIGENTE' : 'NO VIGENTE'}</span></button>`).firstChild;
      b.onclick = () => confirmManual(s);
      res.append(b);
    });
  }
  q.oninput = render; render();
}

function confirmManual(s) {
  teardown();
  const frag = h(`${topBar(true)}
    <div class="verdict ${s.active ? 'ok' : 'bad'}"><img class="avatar lg" alt="Foto del estudiante" src="${s.photo}"><div class="name">${esc(s.name)}</div>
    <span class="pill ${s.active ? 'ok' : 'bad'}">${s.active ? 'VIGENTE' : 'NO VIGENTE'}</span><p>${s.active ? '¿La foto coincide con la persona?' : 'Esta credencial no está vigente.'}</p></div>
    <button class="btn primary" id="yes" ${s.active ? '' : 'hidden'}>Sí, permitir ingreso</button>
    <button class="btn danger" id="no">${s.active ? 'No coincide' : 'Rechazar ingreso'}</button>
    <button class="link" id="back">Volver a la búsqueda</button>`);
  $app().replaceChildren(frag); bindGo($app());
  const done = ok => {
    logEvent({ mode: 'Por nombre', id: s.id, name: s.name, result: ok ? 'Aceptado' : 'Rechazado', reason: ok ? '' : (s.active ? 'Foto no coincide' : 'Credencial no vigente'), ms: timerMs() });
    toast(ok ? 'Ingreso registrado' : 'Ingreso rechazado');
    go('guardia', 'nombre');
  };
  document.getElementById('yes').onclick = () => done(true);
  document.getElementById('no').onclick = () => done(false);
  document.getElementById('back').onclick = () => go('guardia', 'nombre');
}

function viewGuardStudents() {
  guardShell('estudiantes');
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Estudiantes</h1><p class="muted">Registra a un estudiante de prueba con su foto y vincula su celular.</p></div>
    <div class="card"><h2>Nuevo estudiante</h2>
      <label class="label" for="nName">Nombre y apellido</label>
      <input type="text" id="nName" maxlength="40" autocomplete="off">
      <div class="row"><img class="avatar" id="nPrev" alt="" hidden><button class="btn grow" id="nPhoto">Tomar foto</button></div>
      <button class="btn primary" id="nSave">Registrar y mostrar QR de vinculación</button></div>
    <div id="pair"></div>
    <div class="stack" id="list"></div>
    <button class="btn danger" id="reset">Borrar datos de prueba de este celular</button>
    <div id="confirmReset"></div>`);
  $app().replaceChildren(frag); bindGo($app());
  let photo = null;
  document.getElementById('nPhoto').onclick = async () => {
    const f = await pickImage('user'); if (!f) return;
    try {
      const img = await loadImage(f), c = document.createElement('canvas'), side = Math.min(img.width, img.height);
      c.width = c.height = 240;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 240, 240);
      photo = c.toDataURL('image/jpeg', 0.75);
      const p = document.getElementById('nPrev'); p.src = photo; p.hidden = false;
    } catch { toast('No se pudo leer la foto') }
  };
  document.getElementById('nSave').onclick = () => {
    const name = document.getElementById('nName').value.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.length < 3) { toast('Escribe el nombre'); return }
    if (!photo) { toast('Toma la foto del estudiante'); return }
    const s = { id: 'E' + Date.now().toString(36).toUpperCase(), name, active: true, secret: randomSecret(), photo };
    const list = store.get('enrolled', []); list.push(s); store.set('enrolled', list);
    showPair(s); renderList();
    document.getElementById('nName').value = ''; photo = null; document.getElementById('nPrev').hidden = true;
  };
  function showPair(s) {
    const box = document.getElementById('pair');
    box.replaceChildren(h(`<div class="card cred"><h2>Vincular a ${esc(s.name)}</h2><p class="muted">El estudiante abre “Soy estudiante → Vincular credencial nueva” y escanea este QR.</p><div class="qrbox"><canvas id="pq"></canvas></div><button class="btn" id="pClose">Listo</button></div>`));
    drawQR(document.getElementById('pq'), `PSPAIR|${s.id}|${s.name}|${s.secret}`);
    document.getElementById('pClose').onclick = () => box.replaceChildren();
    box.scrollIntoView({ behavior: 'smooth' });
  }
  function renderList() {
    const box = document.getElementById('list'); box.replaceChildren();
    allStudents().forEach(s => {
      const row = h(`<div class="card row"><img class="avatar" alt="" src="${s.photo}"><div class="grow"><b>${esc(s.name)}</b><div class="note">${s.demo ? 'Ejemplo' : 'Registrado en este celular'}</div></div>
        <button class="btn" data-act="toggle">${s.active ? 'Vigente' : 'No vigente'}</button>${s.demo ? '' : '<button class="btn" data-act="pair">QR</button>'}</div>`).firstChild;
      row.querySelector('[data-act=toggle]').onclick = () => { const o = store.get('active', {}); o[s.id] = !s.active; store.set('active', o); renderList() };
      row.querySelector('[data-act=pair]')?.addEventListener('click', () => showPair(s));
      box.append(row);
    });
  }
  renderList();
  document.getElementById('reset').onclick = () => {
    const c = document.getElementById('confirmReset');
    c.replaceChildren(h(`<div class="card"><p>Se borran los estudiantes registrados, el registro de validaciones y los códigos usados de este celular.</p><div class="row"><button class="btn danger grow" id="rYes">Borrar</button><button class="btn grow" id="rNo">Cancelar</button></div></div>`));
    document.getElementById('rYes').onclick = () => {
      store.set('enrolled', []); store.set('log', []); store.set('active', {}); store.set('used', {});
      toast('Datos borrados'); viewGuardStudents();
    };
    document.getElementById('rNo').onclick = () => c.replaceChildren();
  };
}

function viewGuardLog() {
  guardShell('registro');
  const log = store.get('log', []);
  const ok = log.filter(e => e.result === 'Aceptado'), bad = log.filter(e => e.result !== 'Aceptado');
  const avg = mode => {
    const xs = ok.filter(e => e.mode === mode && e.ms != null);
    return xs.length ? (xs.reduce((a, e) => a + e.ms, 0) / xs.length / 1000).toFixed(1) + ' s (' + xs.length + ')' : '—';
  };
  const reasons = {}; bad.forEach(e => reasons[e.reason] = (reasons[e.reason] || 0) + 1);
  const secs = ms => ms == null ? '' : (ms / 1000).toFixed(1);
  const frag = h(`${topBar(true)}
    <div class="stack"><h1>Registro del testeo</h1><p class="muted">Cada validación queda anotada en este celular. El tiempo se mide solo cuando se inició el cronómetro al llegar la persona.</p></div>
    <div class="stats"><div class="stat"><span class="label">Total</span><b>${log.length}</b></div><div class="stat"><span class="label">Aceptados</span><b>${ok.length}</b></div><div class="stat"><span class="label">Rechazados</span><b>${bad.length}</b></div></div>
    <div class="card">
      <div class="row"><span class="grow">Tiempo promedio con cámara</span><b>${avg('Cámara')}</b></div>
      <div class="row"><span class="grow">Tiempo promedio por nombre</span><b>${avg('Por nombre')}</b></div>
      ${Object.entries(reasons).map(([r, n]) => `<div class="row"><span class="grow muted">${esc(r)}</span><b>${n}</b></div>`).join('')}
    </div>
    <div class="tablewrap"><table><thead><tr><th>Hora</th><th>Modo</th><th>Estudiante</th><th>Resultado</th><th>Motivo</th><th>Tiempo (s)</th></tr></thead><tbody>
    ${log.slice().reverse().map(e => `<tr><td>${new Date(e.t).toLocaleTimeString('es-CL')}</td><td>${esc(e.mode)}</td><td>${esc(e.name)}</td><td>${esc(e.result)}</td><td>${esc(e.reason)}</td><td>${secs(e.ms)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Aún no hay validaciones.</td></tr>'}
    </tbody></table></div>
    <div class="row"><button class="btn grow" id="copy">Copiar CSV</button><button class="btn primary grow" id="dl">Descargar CSV</button></div>`);
  $app().replaceChildren(frag); bindGo($app());
  const csv = () => 'fecha_hora;version;modo;id;estudiante;resultado;motivo;tiempo_s\n' +
    log.map(e => [e.t, e.v, e.mode, e.id, e.name, e.result, e.reason, secs(e.ms).replace('.', ',')]
      .map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  document.getElementById('copy').onclick = () => navigator.clipboard.writeText(csv()).then(() => toast('CSV copiado'), () => toast('No se pudo copiar'));
  document.getElementById('dl').onclick = () => saveCsv(`registro_pasoseguro_${APP_VERSION}.csv`, csv());
}
