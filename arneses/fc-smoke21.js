const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom');
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.fetch = (url) => {
      const u = String(url);
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response(CONOC, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.reject(new Error('offline'));
    };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(400); } return fn(); };
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
  chk('la tarjeta de Metodología aparece', await hasta(() => !!d.getElementById('metodoCard'), 15000));
  const S = (id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
  S('nomProy', 'Taller de bicicletas El Rayo'); S('sectorSel', 'Servicios técnicos / taller'); S('actorSel', 'mipyme_priv');
  d.getElementById('provSel').value = 'Villa Clara'; w.cargarMun(); d.getElementById('muniSel').value = 'Santa Clara';
  S('precio', 500); S('cvu', 200); S('capacidad', 1000); S('ocupacion', 70);
  S('invLocal', 100000); S('invEquipos', 200000); S('invCapital', 50000); S('numTrab', 8); S('salMedio', 9500);
  S('fAutCUP', 150000); S('fCredito', 200000); S('eObj', 'Crear un taller de reparación de bicicletas con servicio el mismo día.');
  S('descProy', 'En la ciudad apenas funcionan dos talleres con esperas de semanas; la población depende de la bicicleta para trabajar y estudiar.');
  S('eEncad', 'Compra de piezas a la tienda estatal y a productores locales de gomas y cámaras.');
  S('eAporte', 'Beneficia a trabajadores y estudiantes que se trasladan en bicicleta; crea 8 empleos directos en el municipio.');
  w.generarInforme(true);
  chk('las prioridades se calcularon solas al generar el informe', await hasta(() => !!w._prioridades, 8000));
  chk('son las 6 prioridades del país, con promedio', w._prioridades.items.length === 6 && w._prioridades.promedio >= 0 && w._prioridades.promedio <= 100, 'promedio=' + w._prioridades.promedio);
  chk('la tarjeta muestra la soberanía alimentaria y el encadenamiento', /Soberanía alimentaria/.test(d.getElementById('prioBox').innerHTML) && /Encadenamientos/.test(d.getElementById('prioBox').innerHTML));
  chk('los escenarios se calcularon solos (pesimista < base)', await hasta(() => !!w._escenarios, 8000) && w._escenarios.pesimista.van < w._escenarios.base.van, 'VAN pes=' + Math.round(w._escenarios.pesimista.van) + ' base=' + Math.round(w._escenarios.base.van));
  chk('el PRI descontado salió (mayor que el simple, como debe ser)', w._escenarios.priDescontadoAnios > 0, w._escenarios.priDescontadoAnios && w._escenarios.priDescontadoAnios.toFixed(2) + ' años');
  const rag = w.fcRAG('prioridades estratégicas del país');
  chk('la metodología quedó en la base y el RAG la recupera', rag.length >= 1 && /Metodología del consultor/.test(rag[0].titulo), rag.length ? rag[0].titulo.slice(0, 50) : 'nada');
  w.fcRedactar();
  chk('la propuesta incluye el anexo de prioridades y escenarios', await hasta(() => /PRIORIDADES ESTRATÉGICAS/.test(d.getElementById('fcPropOverlay').textContent) && /Pesimista/.test(d.getElementById('fcPropOverlay').textContent), 8000));
  console.log(`\nRESULTADO METODOLOGÍA: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
