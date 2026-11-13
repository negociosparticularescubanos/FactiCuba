const fs = require('fs');
const MOD = '/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom';
const { JSDOM, VirtualConsole } = require(MOD);
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const ITEMS = { items: [
  { titulo: 'Aprueba el MEP la Resolución 231/2026 sobre desarrollo local', extracto: 'La Resolución 231/2026 actualiza los métodos de elaboración de proyectos de desarrollo local y su evaluación.', fuente: 'MEP', url: 'https://www.mep.gob.cu/nota' },
  { titulo: 'Decreto 174/2026: nuevas reglas del desarrollo local', extracto: 'El Decreto 174/2026 regula los proyectos de desarrollo local.', fuente: 'Granma', url: '' },
  { titulo: 'Resolución 500/2026 de tránsito y vialidad', extracto: 'Nuevas normas de tránsito para vehículos.', fuente: 'MITRANS', url: '' }
] };
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.fetch = (url) => {
      const u = String(url);
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response(CONOC, { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (u.indexOf('buscar') >= 0) return Promise.resolve(new Response(JSON.stringify(ITEMS), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.reject(new Error('offline'));
    };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(11000);
  let ok = 0, bad = 0; const chk = (n, c, extra) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (extra ? ' — ' + extra : '')); };
  const vb = d.getElementById('vigiaBox');
  chk('el Vigía autónomo vive dentro de la tarjeta de aprendizaje', !!vb && /Vigía autónomo de la app/.test(vb.textContent));
  chk('detectó la norma NUEVA (Resolución 231/2026) como candidata sin verificar', !!vb && /Resolución 231\/2026/.test(vb.textContent) && /Sin verificar/.test(vb.textContent));
  chk('NO repite la que ya está en la base (Decreto 174/2026)', !!vb && !/Decreto 174\/2026/.test(vb.textContent));
  chk('filtra lo ajeno al tema (tránsito fuera)', !!vb && !/tránsito/.test(vb.textContent));
  const vig = JSON.parse(w.localStorage.getItem('facticuba_vigia_v1') || '{}');
  chk('las candidatas quedan guardadas en el equipo (aprende entre aperturas)', (vig.candidatos || []).length === 1 && vig.candidatos[0].norma === 'Resolución 231/2026');
  chk('la tarjeta ya no dice que depende del agente de Slipknot', /agentes autónomos de la propia app/.test(d.getElementById('aprendCard').textContent) && !/agente de estudio \(revisa/.test(d.getElementById('aprendCard').textContent));
  chk('los parámetros NO se tocaron (fideicomiso sigue 4)', w._fcConocimiento && w._fcConocimiento.parametros.fideicomiso_pct === 4);
  console.log(`\nRESULTADO VIGÍA AUTÓNOMO: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
