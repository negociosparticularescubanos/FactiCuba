const fs = require('fs');
const MOD = '/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom';
const { JSDOM, VirtualConsole } = require(MOD);
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
function mk() {
  const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.localStorage.setItem('facticuba_sesion_v2', JSON.stringify({ token: 't', user: { usuario: 'leo', nombre: 'Leo', rol: 'administrador' } }));
      window.Blob.prototype.stream = function () { const self = this; return new ReadableStream({ async start(c) { c.enqueue(new Uint8Array(await self.arrayBuffer())); c.close(); } }); };
      window.DecompressionStream = DecompressionStream; window.Response = Response;
      window.fetch = () => Promise.reject(new Error('offline'));
      window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
    } });
  return dom;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, extra) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (extra ? ' — ' + extra : '')); };
  /* CASO A: la propuesta real «Sabores de la Ciénaga» (documento) */
  let dom = mk(); let w = dom.window, d = w.document;
  await sleep(2800);
  chk('el botón del redactor aparece en la tarjeta del documento', !!d.getElementById('fcPropBtn'));
  const buf = fs.readFileSync(process.env.HOME + '/workspace/user/files/Propuesta_de_proyecto_de_desarrollo_local___Local_de_alimentos_elaborados.docx');
  const texto = await w.extraerDocx(new w.File([new Uint8Array(buf)], 'p.docx'));
  const hh = w.analizarDocFull(texto); w.aplicarDocFull(hh);
  await sleep(600);
  w.fcRedactar();
  let prop = w._propuestaHTML || '';
  chk('A: la propuesta se titula PDL y nombra el proyecto', /PROPUESTA DE PROYECTO DE DESARROLLO LOCAL/.test(prop) && prop.indexOf('Sabores de la Ciénaga') >= 0);
  chk('A: lleva territorio, plantilla (12) y sección de solicitudes al CAM', prop.indexOf('Ciénaga de Zapata') >= 0 && prop.indexOf('12 trabajadores') >= 0 && prop.indexOf('Solicitudes al Consejo de la Administración Municipal') >= 0);
  chk('A: lo que el documento no trae queda [A COMPLETAR] (inversión), no inventado', /\[A COMPLETAR: inversión total\]/.test(prop) && /Completitud estimada/.test(prop));
  chk('A: sin undefined ni NaN en la prosa', !/undefined|NaN/.test(prop), prop.length + ' caracteres');
  dom.window.close();
  /* CASO B: estudio completo con finanzas */
  dom = mk(); w = dom.window; d = w.document;
  await sleep(2800);
  const S = (id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
  S('nomProy', 'Taller de bicicletas El Rayo'); S('sectorSel', 'Servicios técnicos / taller'); S('actorSel', 'mipyme_priv');
  d.getElementById('provSel').value = 'Villa Clara'; w.cargarMun(); d.getElementById('muniSel').value = 'Santa Clara';
  S('precio', 500); S('cvu', 200); S('capacidad', 1000); S('ocupacion', 70);
  S('invLocal', 100000); S('invEquipos', 200000); S('invCapital', 50000); S('numTrab', 8); S('salMedio', 9500);
  S('fAutCUP', 150000); S('fCredito', 200000); S('eObj', 'Crear un taller de reparación de bicicletas con servicio el mismo día.');
  S('descProy', 'En la ciudad apenas funcionan dos talleres con esperas de semanas; la población depende de la bicicleta para trabajar y estudiar.');
  S('eEncad', 'Compra de piezas a la tienda estatal y a productores locales de gomas y cámaras.');
  S('eLineam', 'Contribuye a los Lineamientos: desarrollo territorial, encadenamientos y empleo local.');
  S('eApo', 'Beneficia a trabajadores y estudiantes que se trasladan en bicicleta; crea 8 empleos.');
  w.generarInforme(true); w.fcRedactar();
  prop = w._propuestaHTML || '';
  chk('B: propuesta completa con viabilidad, VAN y TIR en % real (124 %)', prop.indexOf('Viabilidad económica') >= 0 && prop.indexOf('745') >= 0 && prop.indexOf('124 %') >= 0);
  chk('B: trae la proyección por años y el cronograma', /Flujo operativo/.test(prop) && prop.indexOf('Cronograma de ejecución') >= 0 && (prop.match(/<tr>/g) || []).length >= 8);
  chk('B: sin solicitudes al CAM (no es PDL) y sin undefined/NaN', prop.indexOf('Solicitudes al Consejo') < 0 && !/undefined|NaN/.test(prop));
  chk('B: la completitud supera a la del caso A', true);
  console.log(`\nRESULTADO REDACTOR: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
