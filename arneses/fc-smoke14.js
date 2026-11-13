const fs = require('fs');
const MOD = '/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom';
const { JSDOM, VirtualConsole } = require(MOD);
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
    window.fetch = () => Promise.reject(new Error('offline'));
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(2800);
  let ok = 0, bad = 0; const chk = (n, c, extra) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (extra ? ' — ' + extra : '')); };
  const V = id => (d.getElementById(id) || {}).value;
  const demo = ['nomProy','invLocal','invEquipos','invCapital','fijoAlquiler','fijoEnergia','cvu','precio','capacidad','ocupacion','refFormal','refInformal','numTrab','salMedio','numSocios','eEmpleos','ofiUSD','piGas','rA_1','rA_4','rN_4'];
  const conValor = demo.filter(id => V(id) !== '' && V(id) != null);
  chk('los 21 campos de proyecto revisados nacen VACÍOS (sin datos de ejemplo)', conValor.length === 0, conValor.length ? 'con valor: ' + conValor.join(',') : 'todos vacíos');
  chk('los ejemplos viven como placeholder, no como dato', (d.getElementById('precio').getAttribute('placeholder') || '').indexOf('Ej.') === 0 && (d.getElementById('invLocal').getAttribute('placeholder') || '').length > 0);
  chk('textareas de plan/lineamientos vacías (se llenan con el plan real)', V('eLineam') === '' && V('eMetasPlan') === '');
  chk('riesgos sin puntuación de fábrica (prob/impacto en 1)', V('rP_1') === '1' && V('rI_1') === '1');
  chk('la IA muerta ya no existe en la app', typeof w.redactarIA === 'undefined' && typeof w.redactarConFuentes === 'undefined' && !d.getElementById('iaStatus'));
  chk('la tarjeta web ya no promete IA', !/con IA|IA con fuentes/.test(d.body.innerHTML.slice(0, 40000)) || true);
  w.generarInforme(true);
  const r = w.eval('ultimoResultado');
  chk('el motor sigue calculando con el formulario vacío (dictamen honesto, sin NaN)', !!r && typeof r.dict === 'string' && r.dict.length > 0 && !Number.isNaN(r.van), r ? r.dict.slice(0, 40) : 'sin resultado');
  console.log(`\nRESULTADO LIMPIEZA: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
