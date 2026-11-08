// QR drawing and reading (live camera or a photo)
function drawQR(canvas, text) {
  const qr = qrcode(0, 'M');
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), quiet = 4, scale = 8, size = (n + quiet * 2) * scale;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
  }
}

function pickImage(capture) {
  return new Promise(res => {
    const inp = document.getElementById('filePick');
    inp.value = '';
    capture ? inp.setAttribute('capture', capture) : inp.removeAttribute('capture');
    inp.onchange = () => res(inp.files[0] || null);
    inp.click();
  });
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img) };
    img.onerror = e => { URL.revokeObjectURL(url); rej(e) };
    img.src = url;
  });
}

async function decodeFile(file) {
  try {
    const img = await loadImage(file), c = document.createElement('canvas');
    const k = Math.min(1, 1200 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    return jsQR(d.data, d.width, d.height)?.data || null;
  } catch { return null }
}

// live scanner: calls onText for each new code; returns {stop} or null when no camera
async function startLiveScan(container, onText) {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }) }
  catch { return null }
  const video = document.createElement('video');
  video.playsInline = true; video.muted = true; video.srcObject = stream;
  container.replaceChildren(video, h('<div class="frame"></div>'));
  await video.play().catch(() => {});
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  let alive = true, last = 0, lastText = '', lastAt = 0;
  function tick(ts) {
    if (!alive) return;
    if (video.readyState >= 2 && ts - last > 120) {
      last = ts;
      const w = 480, hgt = Math.round(480 * video.videoHeight / video.videoWidth) || 480;
      c.width = w; c.height = hgt;
      ctx.drawImage(video, 0, 0, w, hgt);
      const r = jsQR(ctx.getImageData(0, 0, w, hgt).data, w, hgt, { inversionAttempts: 'dontInvert' });
      // ignore the same code while it stays in front of the camera
      if (r?.data && (r.data !== lastText || Date.now() - lastAt > 4000)) {
        lastText = r.data; lastAt = Date.now();
        onText(r.data);
      } else if (r?.data) lastAt = Date.now();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { stop() { alive = false; stream.getTracks().forEach(t => t.stop()) } };
}
