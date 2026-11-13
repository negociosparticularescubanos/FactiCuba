// Arnés del servidor FactiCuba v4: Apps Script simulado en Node (persistente)
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
    base64Encode: s => Buffer.from(String(s), 'utf8').toString('base64'), base64Decode: s => Buffer.from(String(s), 'base64') },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger() { return { timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; }, create() {} }; } },
  Session: { getEffectiveUser() { return { getEmail: () => 'dueno@negocio.cu' }; } },
  MailApp: { sendEmail() {} },
  Logger: { log() {} },
  console
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const call = (obj, param) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) }, parameter: param || {} }).getContent());

let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
ctx.setup();
chk('setup crea las 11 pestañas (5 núcleo + 6 nuevas)', ['Usuarios','Sesiones','Estudios','Entradas_JSON','Auditoria','Conocimiento','Parametros','Agentes_Log','Autodatos','Eventos'].every(n => wb.sheets[n]), Object.keys(wb.sheets).length + ' hojas');
ctx.guardar_('Usuarios', { usuario_id: 'u1', usuario: 'leo', hash_contrasena: ctx.hashPw_('clave123'), rol: 'administrador', nombre: 'Leo', estado: 'activo', intentos_fallidos: 0 });
const ping = call({ action: 'ping' });
chk('ping anuncia servidor v4', ping.ok && ping.version === 4);
const lg = call({ action: 'login', username: 'leo', password: 'clave123' });
chk('login del dueño funciona', lg.ok && !!lg.token);
const T = lg.token;
let r = call({ action: 'parametros_get', token: T });
chk('parámetros semilla servidos (fideicomiso 4 %)', r.ok && r.parametros.fideicomiso_pct === 4 && r.parametros.pdl_tope_contratados === 100);
r = call({ action: 'parametros_set', token: T, clave: 'webhook_clave', valor: 'secreto123' });
chk('admin define la clave del webhook', r.ok);
r = call({ action: 'parametros_get', token: T });
chk('la clave del webhook NUNCA sale en parametros_get', r.ok && !('webhook_clave' in r.parametros));
r = call({ action: 'conocimiento_add', token: T, origen: 'vigia', entradas: [
  { titulo: 'Resolución 231/2026 — detectada automáticamente', resumen: 'Métodos de desarrollo local.', fuente: 'MEP', estado: 'candidata' },
  { titulo: 'Resolución 231/2026 — detectada automáticamente', resumen: 'duplicada', fuente: 'MEP' },
  { titulo: 'Ley 150/2022 del medio ambiente', resumen: 'Sistema de recursos naturales.', fuente: 'Gaceta', estado: 'verificada' } ] });
chk('conocimiento_add deduplica por título', r.ok && r.agregadas === 2, 'agregadas=' + r.agregadas);
r = call({ action: 'conocimiento_list', token: T });
chk('conocimiento_list devuelve lo aprendido', r.ok && r.entradas.length === 2);
const cand = r.entradas.find(e => e.estado === 'candidata');
r = call({ action: 'conocimiento_estado', token: T, id: cand.id, estado: 'verificada' });
chk('el administrador confirma una candidata', r.ok === true);
r = call({ action: 'autodatos_set', token: T, items: [{ provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería', campo: 'salMedio', valor: 6000, fuente: 'ONEI' }] });
call({ action: 'autodatos_set', token: T, items: [{ provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería', campo: 'salMedio', valor: 6500, fuente: 'ONEI 2026' }] });
r = call({ action: 'autodatos_get', token: T, provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería' });
chk('autodatos: se aprende una vez y se actualiza (sin duplicar)', r.ok && r.items.length === 1 && r.items[0].valor === '6500');
r = call({ action: 'estudio_save', token: T, payload: { inputs: { nomProy: 'Prueba Flujo', provSel: 'Matanzas', muniSel: 'Ciénaga de Zapata', sectorSel: 'Gastronomía / cafetería', salMedio: 6200, invLocal: 1000 }, resumen: { nombre: 'Prueba Flujo', dict: 'FACTIBLE', util: 500, margen: 30, pri: 12 } } });
chk('estudio_save sigue funcionando en v4', r.ok && !!r.estudio_id);
r = call({ action: 'agente_log_list', token: T, limit: 50 });
chk('FLUJO: guardar el estudio dejó traza automática en Agentes_Log', r.ok && r.logs.some(l => l.agente === 'GestorFlujos' && l.accion === 'estudio_guardado'));
r = call({ action: 'autodatos_get', token: T, provincia: 'Matanzas', municipio: 'Ciénaga de Zapata', sector: 'Gastronomía / cafetería' });
chk('FLUJO: el salario del estudio se aprendió en Autodatos', r.ok && r.items.some(i => i.campo === 'salMedio' && i.valor === '6200'));
r = call({ action: 'webhook', detalle: 'sin clave' });
chk('webhook sin clave: rechazado', r.ok === false);
r = call({ action: 'webhook', clave: 'secreto123', tipo: 'github_push', origen: 'aprendiz', candidata: { titulo: 'Decreto 88/2026 — detectada automáticamente', resumen: 'Nueva norma.', fuente: 'Aprendiz' } });
chk('webhook con clave: registra evento y candidata', r.ok === true);
r = call({ action: 'conocimiento_list', token: T, estado: 'candidata' });
chk('la candidata del webhook quedó en la hoja', r.ok && r.entradas.some(e => /Decreto 88\/2026/.test(e.titulo)));
r = call({ action: 'eventos_list', token: T });
chk('eventos_list muestra el flujo del webhook', r.ok && r.eventos.some(e => e.tipo === 'github_push'));
r = call({ action: 'estudios_list', token: T });
chk('los estudios previos siguen listándose', r.ok && r.estudios.length === 1);
console.log(`\nRESULTADO SERVIDOR v4: ${ok} ✔ / ${bad} ✘`);
process.exit(bad ? 1 : 0);
