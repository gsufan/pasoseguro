// TOTP (RFC 6238, HMAC-SHA1) and credential verification
function base32Decode(str) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const out = [];
  for (const c of str.replace(/=+$/, '').toUpperCase()) {
    const v = alpha.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}

function randomSecret() {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const b = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(b, x => alpha[x & 31]).join(''); // 32 chars = 160 bits
}

const keyCache = {};
async function hotp(secret, counter) {
  if (!keyCache[secret]) {
    keyCache[secret] = crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  }
  const buf = new ArrayBuffer(8), view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await keyCache[secret], buf));
  const off = sig[19] & 15;
  const bin = ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

const nowStep = () => Math.floor(Date.now() / 1000 / STEP);

function markUsed(key) {
  const used = store.get('used', {}), now = Date.now();
  for (const k in used) if (now - used[k] > USED_TTL) delete used[k];
  used[key] = now;
  store.set('used', used);
}

// QR payload: PS1|<studentId>|<step>|<code>
async function verifyPayload(text) {
  const parts = String(text).trim().split('|');
  if (parts[0] !== 'PS1' || parts.length !== 4) return { ok: false, reason: 'No es una credencial PasoSeguro' };
  const [, id, stepStr, code] = parts;
  const step = Number(stepStr), s = findStudent(id);
  if (!s) return { ok: false, reason: 'Estudiante no registrado en este celular' };
  if (!Number.isInteger(step) || Math.abs(step - nowStep()) > WINDOW) return { ok: false, student: s, reason: 'Código vencido (posible pantallazo)' };
  if (code !== await hotp(s.secret, step)) return { ok: false, student: s, reason: 'Código incorrecto' };
  const key = id + ':' + step;
  if (store.get('used', {})[key]) return { ok: false, student: s, reason: 'Código ya usado (posible pantallazo)' };
  if (!s.active) return { ok: false, student: s, reason: 'Credencial no vigente' };
  markUsed(key);
  return { ok: true, student: s };
}

// typed code: try every step inside the accepted window
async function verifyManual(id, code) {
  const s = findStudent(id), n = nowStep();
  if (s) {
    for (let d = 0; d <= WINDOW; d++) {
      for (const step of d ? [n - d, n + d] : [n]) {
        if (code === await hotp(s.secret, step)) return verifyPayload(`PS1|${id}|${step}|${code}`);
      }
    }
  }
  return verifyPayload(`PS1|${id}|${n}|${code}`);
}
