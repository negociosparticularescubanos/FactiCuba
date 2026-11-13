const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom');
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const CAPT = { conocimiento_add: [], agente_log_add: [], autodatos_set: [] };
const NUBE = { id: 'n1', fecha: '2026-11-13', tipo: 'norma', titulo: 'Resolución 999/2026 sobre fideicomiso para PDL', resumen: 'La comisión del fideicomiso para proyectos de desarrollo local es del 4 %.', fuente: 'BCC — hoja Sheets', fuenteUrl: '', aplica: 'Crédito y fideicomiso PDL', estado: 'verificada', origen: 'nube' };
const ITEMS = { items: [ { titulo: 'Aprueba el MEP la Resolución 231/2026 sobre desarrollo local', extracto: 'La Resolución 231/2026 actualiza los métodos de elaboración de proyectos de desarrollo local.', fuente: 'MEP', url: 'https://www.mep.gob.cu/n' } ] };
function srv(body) {
  const a = body.action;
  if (a === 'ping') return { ok: true, version: 4 };
  if (a === 'conocimiento_list') return { ok: true, entradas: [NUBE] };
  if (a === 'parametros_get') return { ok: true, parametros: { fideicomiso_pct: 7 } };
  if (a === 'conocimiento_add') { CAPT.conocimiento_add.push(body); return { ok: true, agregadas: (body.entradas || []).length }; }
  if (a === 'agente_log_add') { CAPT.agente_log_add.push(body); return { ok: true }; }
  if (a === 'agente_log_list') return { ok: true, logs: [{ fecha: '2026-11-13T11:00:00Z', agente: 'GestorFlujos', accion: 'estudio_guardado', detalle: 'FC-2026-0001', resultado: 'ok', origen: 'servidor' }] };
  if (a === 'eventos_list') return { ok: true, eventos: [] };
  if (a === 'autodatos_get') return { ok: true, items: [] };
  if (a === 'autodatos_set') { CAPT.autodatos_set.push(body); return { ok: true, guardados: 1 }; }
  if (a === 'estudios_list') return { ok: true, estudios: [] };
  return { ok: false, error: 'acción no simulada: ' + a };
}
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.fetch = (url, opts) => {
      const u = String(url);
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response(CONOC, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (u.indexOf('script.google.com') >= 0) { let body = {}; try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) {} return Promise.resolve(new Response(JSON.stringify(srv(body)), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
      if (u.indexOf('buscar') >= 0) return Promise.resolve(new Response(JSON.stringify(ITEMS), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.reject(new Error('offline'));
    };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(500); } return fn(); };
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
  chk('la Consola de agentes aparece en la app', await hasta(() => !!d.getElementById('consolaCard'), 15000));
  chk('la hoja manda: el parámetro vivo pasa a ser el de Sheets (fideicomiso 7)', await hasta(() => w._fcConocimiento && w._fcConocimiento.parametros && w._fcConocimiento.parametros.fideicomiso_pct === 7, 15000));
  chk('el conocimiento de la hoja se fusiona con el local', w._fcConocimiento.entradas.some(e => /999\/2026/.test(e.titulo || '')));
  chk('sin re-siembra: la hoja ya tenía datos y no se le empuja la semilla', !CAPT.conocimiento_add.some(c => c.origen === 'semilla'));
  const rag = w.fcRAG('fideicomiso comisión');
  chk('RAG: recupera el pasaje del fideicomiso con su fuente', rag.length >= 1 && /fideicomiso/i.test(rag[0].titulo + ' ' + rag[0].texto) && !!rag[0].fuente, rag.length ? rag[0].fuente : 'sin resultados');
  d.getElementById('ragQ').value = 'licencia ambiental';
  d.getElementById('btnRag').click();
  await sleep(400);
  chk('RAG en pantalla: responde sobre licencia ambiental desde la base', /ambiental/i.test(d.getElementById('ragBox').textContent));
  const addBtn = d.querySelector('#ragBox [data-rag]');
  if (addBtn) addBtn.click();
  chk('lo elegido por el RAG queda apartado para la propuesta', (w._ragNotas || []).length >= 1);
  chk('el Vigía envió su candidata a la hoja (conocimiento_add, origen vigía)', await hasta(() => CAPT.conocimiento_add.some(c => c.origen === 'vigia'), 25000), CAPT.conocimiento_add.map(c => c.origen).join(','));
  const antes = CAPT.agente_log_add.length;
  const cadenaP = w.fcConsolaPreparar();
  const fin = await hasta(() => /Cadena terminada/.test(d.getElementById('consolaBox').textContent), 90000);
  chk('el Orquestador ejecutó la cadena multi-agente hasta el final', fin);
  await cadenaP.catch(() => {});
  chk('cada paso quedó registrado en la hoja (Agentes_Log)', CAPT.agente_log_add.length >= antes + 3, CAPT.agente_log_add.length + ' trazas');
  chk('la actividad muestra la traza del Gestor de Flujos del servidor', /GestorFlujos/.test(d.getElementById('actividadBox').textContent));
  console.log(`\nRESULTADO CONSOLA DE AGENTES: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
