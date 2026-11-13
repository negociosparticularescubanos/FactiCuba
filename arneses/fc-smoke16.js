const fs = require('fs');
const MOD = '/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom';
const { JSDOM, VirtualConsole } = require(MOD);
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
function mk(conoc) {
  return new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
      window.Blob.prototype.stream = function () { const self = this; return new ReadableStream({ async start(c) { c.enqueue(new Uint8Array(await self.arrayBuffer())); c.close(); } }); };
      window.DecompressionStream = DecompressionStream; window.Response = Response;
      window.fetch = (url) => String(url).indexOf('conocimiento.json') >= 0
        ? Promise.resolve(new Response(conoc, { status: 200, headers: { 'Content-Type': 'application/json' } }))
        : Promise.reject(new Error('offline'));
      window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
    } });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, extra) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (extra ? ' — ' + extra : '')); };
  let dom = mk(CONOC); let w = dom.window, d = w.document;
  await sleep(3200);
  chk('la tarjeta «FactiCuba aprende cada día» aparece con la base cargada', !!d.getElementById('aprendCard') && /aprende cada día/.test(d.getElementById('aprendCard').textContent));
  chk('muestra las novedades con fuente (Decreto 174 visible)', /Decreto 174\/2026: el expediente/.test(d.getElementById('aprendCard').textContent) && /Granma/.test(d.getElementById('aprendCard').textContent));
  chk('los parámetros vivos quedan disponibles para la app', !!(w._fcConocimiento && w._fcConocimiento.parametros && w._fcConocimiento.parametros.fideicomiso_pct === 4 && w._fcConocimiento.parametros.pdl_duracion_max_anios === 5));
  const S = (id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
  S('nomProy', 'PDL de prueba'); S('actorSel', 'pdl'); S('precio', 100); S('cvu', 50); S('capacidad', 100); S('ocupacion', 50); S('fCredito', 50000);
  w.generarInforme(true); w.fcRedactar();
  chk('el redactor aplica el parámetro vivo: comisión del fideicomiso 4 %', /comisión del 4 %/.test(w._propuestaHTML || ''));
  dom.window.close();
  const modificado = CONOC.replace(/"fideicomiso_pct":\s*4/, '"fideicomiso_pct": 5');
  dom = mk(modificado); w = dom.window; d = w.document;
  await sleep(3200);
  S('nomProy', 'PDL de prueba'); S('actorSel', 'pdl'); S('precio', 100); S('cvu', 50); S('capacidad', 100); S('ocupacion', 50); S('fCredito', 50000);
  w.generarInforme(true); w.fcRedactar();
  chk('si la base aprende un cambio (fideicomiso 5 %), la app lo aplica SIN tocar código', /comisión del 5 %/.test(w._propuestaHTML || ''));
  console.log(`\nRESULTADO APRENDIZAJE: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
