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
  let ok = 0, bad = 0; const chk = (n, c) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n); };
  chk('módulos F1-F4 + integral + respaldo + docPro presentes', ['fcBuscarCorreccion', 'fcPintarCorreccion', 'fcEncajeTerritorial', 'fcPintarEncaje', 'fcBancaria', 'fcTramites', 'fcDetalle', 'fcDocConstruir', 'fcIntegralCalc', 'fcRespaldoInternet', 'analizarDocFull', 'extraerDocx'].every(f => w.eval('typeof ' + f) === 'function'));
  chk('tarjetas en su sitio', ['corrCard', 'encCard', 'banCard', 'tramCard', 'detCard', 'docCard', 'intCard'].every(id => !!d.getElementById(id)));
  d.getElementById('provSel').value = 'Villa Clara'; w.cargarMun(); d.getElementById('muniSel').value = 'Santa Clara';
  w.generarInforme(true);
  chk('el motor genera informe y documento', !!w.eval('ultimoResultado') && w.fcDocConstruir().indexOf('Dictamen') >= 0);
  chk('indicador de base presente', !!d.getElementById('dbDot') || !!d.querySelector('[id*=db]'));
  console.log(`\nREGRESIÓN GENERAL: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO:', e.message); process.exit(2); });
