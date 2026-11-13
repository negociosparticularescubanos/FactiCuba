const fs = require('fs');
const MOD = '/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom';
const { JSDOM, VirtualConsole } = require(MOD);
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const SAL = 'El salario medio mensual en Santa Clara alcanzó 5 840 CUP en el trimestre, según datos de la ONEI. El salario medio provincial se mantiene estable.';
const ALQ = 'Se alquila local comercial en el centro de Santa Clara. Alquiler mensual: 45 000 CUP. Local amplio con escaparate.';
const REV = 'Anuncios en Santa Clara: servicios de taller de bicicletas — precio 500 CUP; servicios de reparación urgente 450 CUP; servicios de mantenimiento completo 550 CUP. Otros servicios desde 300 CUP.';
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.Blob.prototype.stream = function () { const self = this; return new ReadableStream({ async start(c) { c.enqueue(new Uint8Array(await self.arrayBuffer())); c.close(); } }); };
    window.fetch = (url) => {
      const u = decodeURIComponent(String(url));
      const J = (items) => Promise.resolve(new Response(JSON.stringify({ items: items }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response('{"version":1,"actualizado":"2026-11-13","entradas":[],"parametros":{}}', { status: 200 }));
      if (/salario/i.test(u) && u.indexOf('q=') >= 0) return J([{ titulo: 'ONEI', extracto: 'El salario medio mensual en Santa Clara es de 5 840 CUP.', fuente: 'web' }, { titulo: 'ONEI', extracto: 'El salario medio mensual provincial: 5 840 CUP.', fuente: 'web' }]);
      if (/alquiler/i.test(u) && u.indexOf('q=') >= 0) return J([{ titulo: 'Anuncio', extracto: 'Alquiler de local comercial en Santa Clara: 45 000 CUP al mes.', fuente: 'web' }, { titulo: 'Anuncio', extracto: 'Alquiler de local en Santa Clara por 45 000 CUP mensuales.', fuente: 'web' }]);
      if (/q=precio\s/i.test(u)) return J([{ titulo: 'Mercado', extracto: 'Precio de servicios de taller en Santa Clara: 500 CUP.', fuente: 'web' }, { titulo: 'Mercado', extracto: 'El precio de los servicios de reparación es 500 CUP.', fuente: 'web' }]);
      if (u.indexOf('revolico') >= 0 || /servicios/i.test(u)) return Promise.resolve(new Response(REV, { status: 200 }));
      return Promise.reject(new Error('offline'));
    };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(3000);
  let ok = 0, bad = 0; const chk = (n, c, extra) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (extra ? ' — ' + extra : '')); };
  const V = id => (d.getElementById(id) || {}).value;
  chk('el texto de la tarjeta web quedó limpio (sin el resto de la IA)', !/apoyándose/.test(d.body.textContent) && /las fuentes quedan citadas en el informe/.test(d.body.textContent));
  chk('la tarjeta del Agente de Autollenado existe antes del formulario', !!d.getElementById('agenteCard') && !!d.getElementById('agenteBtn'));
  const S = (id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
  S('nomProy', 'Taller El Rayo'); S('sectorSel', 'Energía / servicios técnicos'); S('actorSel', 'mipyme_priv');
  d.getElementById('provSel').value = 'Villa Clara'; w.cargarMun(); d.getElementById('muniSel').value = 'Santa Clara';
  /* el usuario escribe su precio y lo deja; y toca salMedio y lo borra (queda marcado manual) */
  S('precio', '999');
  d.getElementById('precio').dispatchEvent(new w.Event('input', { bubbles: true }));
  const sm = d.getElementById('salMedio'); sm.value = '7000'; sm.dispatchEvent(new w.Event('input', { bubbles: true })); sm.value = '';
  await w.fcAgenteAuto();
  chk('capacidad y ocupación estimadas desde la demanda del territorio', Number(V('capacidad')) > 0 && Number(V('ocupacion')) === 65, 'cap=' + V('capacidad'));
  chk('alquiler rellenado desde la web (45 000)', Number(V('fijoAlquiler')) === 45000, 'fijoAlquiler=' + V('fijoAlquiler'));
  chk('precio informal desde el mercado (mediana 500)', Number(V('refInformal')) === 500, 'refInformal=' + V('refInformal'));
  chk('REGLA SAGRADA 1: el precio del usuario (999) NO se pisa con la mediana', V('precio') === '999');
  chk('REGLA SAGRADA 2: salMedio tocado a mano queda vacío (el agente no lo rellena)', V('salMedio') === '');
  chk('todo lo rellenado sigue editable (sin disabled ni readonly)', !d.getElementById('fijoAlquiler').disabled && !d.getElementById('fijoAlquiler').readOnly && !d.getElementById('capacidad').disabled);
  chk('el informe del agente cita las fuentes', /Autollenado terminado/.test(d.getElementById('agenteBox').textContent) && /ONEI/.test(d.getElementById('agenteBox').textContent));
  const cache = JSON.parse(w.localStorage.getItem('facticuba_autodatos_v1') || '{}');
  chk('el agente APRENDIÓ: guardó lo hallado por municipio+sector', Object.keys(cache).some(k => k.indexOf('Santa Clara') >= 0), Object.keys(cache).join(' '));
  console.log(`\nRESULTADO AGENTE AUTOLLENADO: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
