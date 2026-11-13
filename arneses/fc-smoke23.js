const fs = require('fs');
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/finanzas-sheets/audit/node_modules/jsdom');
const html = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/app-conectada/index.html', 'utf8');
const CONOC = fs.readFileSync(process.env.HOME + '/workspace/facticuba-online/conocimiento.json', 'utf8');
const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
const REV = (arr) => JSON.stringify({ items: arr.map(p => ({ titulo: 'anuncio', precio: p, moneda: 'CUP' })), url: 'x' });
const BUS = (items) => JSON.stringify({ items });
const dom = new JSDOM(html, { url: 'https://negociosparticularescubanos.github.io/FactiCuba/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.Response = Response; window.DecompressionStream = DecompressionStream;
    window.fetch = (url) => { const u = decodeURIComponent(String(url));
      if (u.indexOf('conocimiento.json') >= 0) return Promise.resolve(new Response(CONOC, { status: 200 }));
      if (u.indexOf('/revolico') >= 0) {
        if (u.indexOf('gasolina') >= 0) return Promise.resolve(new Response(REV([600, 650, 700])));
        if (u.indexOf('diesel') >= 0) return Promise.resolve(new Response(REV([550, 580, 610])));
        if (u.indexOf('balita') >= 0 || u.indexOf('gas licuado') >= 0) return Promise.resolve(new Response(REV([4500, 5000, 5500])));
        if (u.toLowerCase().indexOf('horno') >= 0) return Promise.resolve(new Response(REV([80000, 90000, 100000])));
        if (u.indexOf('pizza') >= 0) return Promise.resolve(new Response(REV([400, 450, 500])));
        return Promise.resolve(new Response(REV([])));
      }
      if (u.indexOf('/buscar') >= 0) {
        if (/CUPET|combustible/i.test(u)) return Promise.resolve(new Response(BUS([{ titulo: 'Precios CUPET', extracto: 'La gasolina especial cuesta 30 CUP por litro, el diésel 25 CUP por litro y la balita de gas licuado 213 CUP en la red estatal.', fuente: 'Ejemplo.cu', url: 'x' }])));
        if (u.indexOf('pizza') >= 0) return Promise.resolve(new Response(BUS([{ titulo: 'Pizza en la red estatal', extracto: 'En las tiendas estatales el precio minorista de la pizza napolitana es de 180 CUP.', fuente: 'Ejemplo.cu', url: 'x' }])));
        return Promise.resolve(new Response(BUS([])));
      }
      return Promise.reject(new Error('offline')); };
    window.prompt = () => '123456'; window.scrollTo = () => {}; window.alert = () => {}; window.print = () => {};
    window.HTMLElement.prototype.scrollIntoView = function () {};
  } });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(400); } return fn(); };
(async () => {
  let ok = 0, bad = 0; const chk = (n, c, x) => { c ? ok++ : bad++; console.log((c ? '✔ ' : '✘ ') + n + (x ? ' — ' + x : '')); };
  chk('la línea de Precios vivos existe (para colgar la de Datos vivos)', await hasta(() => !!d.getElementById('pvLinea'), 15000));
  d.getElementById('sectorSel').value = 'Gastronomía / cafetería';
  d.getElementById('precioQuery').value = 'pizza';
  const die = d.getElementById('piDie'); die.value = 999; die.dataset.fcManual = '1';
  w.fcEqAdd();
  const fila = d.querySelector('#eqBody tr');
  chk('hay fila de equipo para preciar', !!fila);
  fila.querySelector('.eqNom').value = 'Horno industrial';
  const res = await w.fcDatosVivos(true);
  const V = id => d.getElementById(id).value;
  chk('combustible ESTATAL llenado de la web (CUPET)', V('peGas') === '30' && V('peDie') === '25' && V('peBal') === '213', `gas=${V('peGas')} die=${V('peDie')} bal=${V('peBal')}`);
  chk('combustible INFORMAL llenado con la mediana de Revolico', V('piGas') === '650' && V('piBal') === '5000', `gas=${V('piGas')} bal=${V('piBal')}`);
  chk('lo editado a mano (diésel informal 999) NO se tocó', V('piDie') === '999');
  chk('precio FORMAL del producto llenado de la web (estatal)', V('refFormal') === '180', 'refFormal=' + V('refFormal'));
  chk('el equipo sin precio recibió la mediana de mercado', fila.querySelector('.eqCosto').value === '90000', 'eqCosto=' + fila.querySelector('.eqCosto').value);
  chk('la inversión en equipos se actualizó desde el detalle', V('invEquipos') === '90000', 'invEquipos=' + V('invEquipos'));
  chk('la línea de Datos vivos resume el barrido', !!d.getElementById('dvLinea') && /Datos vivos/.test(d.getElementById('dvLinea').innerHTML) && /combustible informal ✔/.test(d.getElementById('dvLinea').innerHTML));
  chk('el resumen del barrido es coherente', res && res.combEst === 3 && res.combInf === 2 && res.formal === 1 && res.equipos === 1, JSON.stringify(res));
  console.log(`\nRESULTADO DATOS VIVOS: ${ok} ✔ / ${bad} ✘`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('FALLO DEL ARNÉS:', e.message); process.exit(2); });
