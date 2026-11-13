// Arnés del servidor FactiCuba v5: lo nuevo (precios diarios) sobre Apps Script simulado
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const code = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/servidor/Code.gs', 'utf8');
function makeSheet() { return { rows: [], getRange(r, c, nr, nc) { const self = this; return { setValues(v) { for (let i = 0; i < v.length; i++) self.rows[r - 1 + i] = v[i].slice(); } }; }, appendRow(row) { this.rows.push(row.slice()); }, getDataRange() { const self = this; return { getValues() { return self.rows.map(r => r.slice()); } }; }, getLastRow() { return this.rows.length; } }; }
const wb = { sheets: {}, getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { const sh = makeSheet(); this.sheets[n] = sh; return sh; } };
let uuidN = 0;
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => wb, openById: () => wb },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput(t) { return { setMimeType() { return this; }, getContent() { return t; } }; } },
  Utilities: { Charset: { UTF_8: 'UTF-8' }, DigestAlgorithm: { SHA_256: 'sha' },
    getUuid() { return 'uuid-' + (++uuidN) + '-abcd-ef01-2345'; },
    computeDigest(alg, s) { const b = crypto.createHash('sha256').update(String(s), 'utf8').digest(); return Array.from(b).map(x => x > 127 ? x - 256 : x); },
    formatDate(d, tz, f) { return d.toISOString().slice(0, 10); },
    base64Encode: s => Buffer.from(String(s), 'utf8').toString('base64'), base64Decode: s => Buffer.from(String(s), 'base64') },
  UrlFetchApp: { fetch(url) { return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: [ { titulo: 'Pizza familiar', precio: '400', moneda: 'CUP' }, { titulo: 'Pizza queso', precio: '450', moneda: 'CUP' }, { titulo: 'Pizza especial', precio: '500', moneda: 'CUP' }, { titulo: 'Pizza en USD', precio: '10', moneda: 'USD' } ] }) }; } },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger() { return { timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; }, create() {} }; } },
  Session: { getEffectiveUser() { return { getEmail: () => 'dueno@negocio.cu' }; } },
  MailApp: { sendEmail() {} }, Logger: { log() {} }, console
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const call = (obj, param) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) }, parameter: param || {} }).getContent());
let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
ctx.setup();
ctx.guardar_('Usuarios', { usuario_id: 'u1', usuario: 'leo', hash_contrasena: ctx.hashPw_('clave123'), rol: 'administrador', nombre: 'Leo', estado: 'activo', intentos_fallidos: 0 });
const T = call({ action: 'login', username: 'leo', password: 'clave123' }).token;
chk('ping anuncia servidor v5', call({ action: 'ping' }).version === 5);
call({ action: 'autodatos_set', token: T, items: [{ provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería', campo: 'precioInformal', valor: 400, fuente: 'Revolico: mediana de «pizza»' }] });
ctx.preciosDiarios();
let r = call({ action: 'autodatos_get', token: T, provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería' });
chk('el servidor actualizó solo el precio aprendido (400 → 450, mediana real)', r.ok && r.items.some(i => i.campo === 'precioInformal' && i.valor === '450'), JSON.stringify(r.items));
r = call({ action: 'agente_log_list', token: T, limit: 10 });
chk('el cambio quedó registrado por el agente PreciosServidor', r.ok && r.logs.some(l => l.agente === 'PreciosServidor' && /400 → 450/.test(l.detalle)));
const antes = r.logs.length;
ctx.preciosDiarios();
r = call({ action: 'agente_log_list', token: T, limit: 10 });
chk('sin cambio de precio no hay ruido (solo refresca la fecha)', r.logs.filter(l => l.agente === 'PreciosServidor').length === 1);
console.log(`\nRESULTADO SERVIDOR v5: ${ok} ✔ / ${bad} ✘`);
process.exit(bad ? 1 : 0);
