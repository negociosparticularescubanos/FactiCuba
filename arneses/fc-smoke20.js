const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom');
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const CAPT = { autodatos_set: [], agente_log_add: [] };
function srv(body) {
  const a = body.action;
  if (a === 'ping') return { ok: true, version: 4 };
  if (a === 'autodatos_get') return { ok: true, items: [] };
  if (a === 'autodatos_set') { CAPT.autodatos_set.push(body); return { ok: true, guardados: 1 }; }
  if (a === 'conocimiento_list') return { ok: true, entradas: [] };
  if (a === 'parametros_get') return { ok: true, parametros: {} };
  if (a === 'agente_log_add') { CAPT.agente_log_add.push(body); return { ok: true }; }
  if (a === 'agente_log_list') return { ok: true, logs: [] };
  if (a === 'eventos_list') return { ok: true, eventos: [] };
  if (a === 'estudios_list') return { ok: true, estudios: [] };
  return { ok: false };
}
const REV = (q) => {
  if (/pizza/i.test(q)) return { items: [ { titulo: 'Pizza familiar napolitana', precio: '400', moneda: 'CUP' }, { titulo: 'Pizza de queso', precio: '450', moneda: 'CUP' }, { titulo: 'Pizza especial de la casa', precio: '500', moneda: 'CUP' } ], url: 'https://www.revolico.com/search/?q=pizza' };
  if (/hamburguesa/i.test(q)) return { items: [ { titulo: 'Hamburguesa', precio: '300', moneda: 'CUP' }, { titulo: 'Hamburguesa doble', precio: '380', moneda: 'CUP' } ], url: '' };
  return { items: [] };
};
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.fetch = (url, opts) => {
      const u = String(url);
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response(CONOC, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (u.indexOf('script.google.com') >= 0) { let body = {}; try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) {} return Promise.resolve(new Response(JSON.stringify(srv(body)), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
      if (u.indexOf('/revolico') >= 0) { const q = decodeURIComponent((u.split('q=')[1] || '')); return Promise.resolve(new Response(JSON.stringify(REV(q)), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
      if (u.indexOf('/buscar') >= 0) return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.reject(new Error('offline'));
    };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(500); } return fn(); };
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
  await hasta(() => d.getElementById('provSel').options.length > 3, 10000);
  const prov = d.getElementById('provSel'); prov.value = 'Matanzas'; prov.dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(400);
  const mun = d.getElementById('muniSel'); mun.value = 'Ciénaga de Zapata'; mun.dispatchEvent(new w.Event('change', { bubbles: true }));
  d.getElementById('sectorSel').value = 'Gastronomía / cafetería';
  chk('la barra de Precios vivos aparece en la tarjeta de precios', await hasta(() => !!d.getElementById('pvLinea'), 15000));
  chk('el precio informal se llenó SOLO con la mediana real (450)', await hasta(() => d.getElementById('refInformal').value === '450', 60000), 'refInformal=' + d.getElementById('refInformal').value);
  chk('marcado como automático (se mantendrá actualizado)', d.getElementById('refInformal').dataset.fcAuto === 'precios');
  chk('el precio de venta vacío recibió la sugerencia de la mediana', d.getElementById('precio').value === '450');
  chk('la búsqueda quedó en la palabra corta que sí funciona («pizza»)', d.getElementById('precioQuery').value === 'pizza', d.getElementById('precioQuery').value);
  chk('la tabla de precios reales se pintó con los anuncios', /Pizza familiar/.test(d.getElementById('preciosBox').innerHTML));
  chk('lo aprendido se compartió a la hoja Autodatos', CAPT.autodatos_set.some(c => (c.items || []).some(i => i.campo === 'precioInformal' && Number(i.valor) === 450)));
  const cache = JSON.parse(w.localStorage.getItem('facticuba_precios_vivos_v1') || '{}');
  chk('la frescura quedó registrada (para no buscar de más)', cache.mediana === 450 && !!cache.fecha);
  const ep = d.getElementById('precio'); ep.value = '999'; ep.dispatchEvent(new w.Event('input', { bubbles: true }));
  const ei = d.getElementById('refInformal'); ei.value = '777'; ei.dispatchEvent(new w.Event('input', { bubbles: true }));
  w.fcPreciosVivos(true);
  await sleep(5000);
  chk('lo editado a mano NO se toca jamás (precio 999, informal 777)', ep.value === '999' && ei.value === '777', 'precio=' + ep.value + ' informal=' + ei.value);
  console.log(`\nRESULTADO PRECIOS VIVOS: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
