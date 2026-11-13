/*************************************************
 * APRENDIZ AUTÓNOMO DE FACTICUBA (Apps Script)
 * ------------------------------------------------
 * Qué es: un agente que vive en TU cuenta de Google
 * (negociosparticularescubanos@gmail.com) y trabaja
 * SOLO, todos los días, sin Slipknot y sin tokens de
 * nadie más: revisa las fuentes oficiales cubanas a
 * través del buscador de FactiCuba, detecta normas
 * nuevas del tema y las añade como CANDIDATAS a la
 * base de conocimiento (conocimiento.json) del repo.
 *
 * Qué NO hace nunca: no cambia parámetros legales,
 * no edita el código de la app, no afirma nada sin
 * fuente. Las candidatas entran marcadas
 * «VERIFICAR» hasta que tú las confirmes.
 *
 * ACTIVACIÓN (una sola vez, 3 minutos, todo tuyo):
 * 1. Entra a https://script.google.com con la cuenta
 *    del negocio y crea un proyecto nuevo.
 * 2. Pega TODO este archivo en el editor y guarda.
 * 3. En GitHub (cuenta negociosparticularescubanos)
 *    crea un token de grano fino SOLO para el repo
 *    FactiCuba con permiso Contents: lectura y
 *    escritura, y pégalo abajo en TOKEN_GITHUB.
 *    (El token vive solo en TU script: no lo mandes
 *    por ningún chat.)
 * 4. Ejecuta una vez la función instalarAprendiz()
 *    y acepta los permisos: crea el reloj diario.
 * 5. Ejecuta aprendizDiario() una vez a mano para
 *    verlo funcionar. Desde ahí, trabaja solo.
 *************************************************/

var TOKEN_GITHUB = ''; // ← pega aquí tu token (solo repo FactiCuba, Contents RW)
var REPO = 'negociosparticularescubanos/FactiCuba';
var ARCHIVO = 'conocimiento.json';
var BUSCAR = 'https://facticuba-tasas.magisequipo5.workers.dev/buscar?q=';

var CONSULTAS = [
  'Gaceta Oficial Cuba decreto resolución desarrollo local',
  'MEP Cuba resolución proyectos de desarrollo local',
  'Banco Central de Cuba resolución crédito mipymes',
  'ONAT MFP Cuba resolución tributos mipymes',
  'CITMA Cuba licencia ambiental resolución',
  'MINCEX inversión extranjera plan de negocio Cuba'
];
var CLAVES = /desarrollo local|factibilidad|inversi|mipyme|pdl|vivienda|ambiental|tribut|onat|crédit|fideicomiso|territorial|licencia/i;
var NORMA = /(Decreto[- ]Ley|Decreto|Resolución(?: Conjunta)?|Ley|Acuerdo)\s+(?:No\.?\s*)?(\d{1,3})\s*\/(20\d{2})/i;

function instalarAprendiz() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'aprendizDiario') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aprendizDiario').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Aprendiz instalado: revisará las fuentes cada día sobre las 6:00.');
}

function aprendizDiario() {
  if (!TOKEN_GITHUB) { Logger.log('Falta TOKEN_GITHUB: pégalo en el código y vuelve a correr.'); return; }
  var base = leerConocimiento_();
  if (!base) { Logger.log('No pude leer conocimiento.json del repo.'); return; }
  var conocidas = {};
  (base.entradas || []).forEach(function (e) {
    var m = (String(e.titulo || '') + ' ' + String(e.resumen || '')).match(NORMA);
    if (m) conocidas[(m[1].replace(/\s+/g, ' ') + ' ' + m[2] + '/' + m[3]).toLowerCase()] = 1;
  });
  var hoy = Utilities.formatDate(new Date(), 'America/Havana', 'yyyy-MM-dd');
  var nuevas = [];
  var dia = Math.floor(Date.now() / 86400000);
  var qs = [CONSULTAS[dia % CONSULTAS.length], CONSULTAS[(dia + 2) % CONSULTAS.length], CONSULTAS[(dia + 4) % CONSULTAS.length]];
  qs.forEach(function (q) {
    try {
      var r = UrlFetchApp.fetch(BUSCAR + encodeURIComponent(q), { muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) return;
      var j = JSON.parse(r.getContentText());
      (j.items || []).slice(0, 8).forEach(function (it) {
        var tx = String(it.titulo || '') + ' ' + String(it.extracto || '');
        var m = tx.match(NORMA);
        if (!m || !CLAVES.test(tx)) return;
        var norma = m[1].replace(/\s+/g, ' ') + ' ' + m[2] + '/' + m[3];
        var k = norma.toLowerCase();
        if (conocidas[k]) return; conocidas[k] = 1;
        nuevas.push({
          fecha: hoy, tipo: 'norma',
          titulo: norma + ' — detectada automáticamente',
          resumen: String(it.extracto || it.titulo || '').slice(0, 400),
          fuente: 'Detección automática del Aprendiz de FactiCuba (Apps Script) — VERIFICAR en la fuente: ' + (it.fuente || 'web oficial'),
          fuenteUrl: it.url || '',
          aplica: 'Pendiente de revisión: si se confirma, valorar su efecto en FactiCuba'
        });
      });
    } catch (e) { Logger.log('Consulta fallida: ' + q + ' — ' + e); }
  });
  if (!nuevas.length) { Logger.log('Sin novedades hoy: la base queda como está.'); return; }
  base.entradas = nuevas.concat(base.entradas || []);
  base.actualizado = hoy;
  base.version = (base.version || 1) + 1;
  guardarConocimiento_(base, 'Aprendiz: ' + nuevas.length + ' candidata(s) detectada(s) el ' + hoy);
  Logger.log('Aprendidas ' + nuevas.length + ' candidata(s): ' + nuevas.map(function (n) { return n.titulo; }).join(' · '));
}

function leerConocimiento_() {
  var url = 'https://api.github.com/repos/' + REPO + '/contents/' + ARCHIVO;
  var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN_GITHUB, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var j = JSON.parse(r.getContentText());
  var txt = Utilities.newBlob(Utilities.base64Decode(j.content)).getDataAsString('UTF-8');
  var obj = JSON.parse(txt);
  obj.__sha = j.sha;
  return obj;
}

function guardarConocimiento_(obj, mensaje) {
  var sha = obj.__sha; delete obj.__sha;
  var url = 'https://api.github.com/repos/' + REPO + '/contents/' + ARCHIVO;
  var cuerpo = { message: mensaje, sha: sha, content: Utilities.base64Encode(JSON.stringify(obj, null, 1), Utilities.Charset.UTF_8) };
  var r = UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', payload: JSON.stringify(cuerpo), headers: { Authorization: 'Bearer ' + TOKEN_GITHUB, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  Logger.log('Guardado en GitHub: HTTP ' + r.getResponseCode());
}
