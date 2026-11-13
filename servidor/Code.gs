/* =====================================================================
 * FactiCuba — SERVIDOR (2026-11-12)
 * Base: hoja «FactiCuba DB» (37 pestañas) en la cuenta de negocios.
 * Seguridad (estándar de la casa):
 *  - Contraseñas SOLO como huellas SHA-256 con sal (Usuarios.hash_contrasena).
 *  - Sesiones por token: en la hoja va SOLO la huella del token
 *    (Sesiones.token_hash); vigencia 30 días; revocables.
 *  - Login con bloqueo en la propia fila del usuario
 *    (5 fallos → bloqueado_hasta = +5 min).
 *  - SIN registro público (eliminado el 2026-11-12 por orden del
 *    dueño): solo existe el usuario ya creado. Sin credenciales
 *    escritas en el código.
 *  - Cada acción relevante deja fila en Auditoria (sin datos sensibles).
 * Contrato: POST JSON {action, token, ...} → JSON {ok, ...}.
 * ===================================================================== */

var SHEET_ID = '1-y2TRQG1RjT8-5Pwl3jV-aKDT_AMcmBL6JQuEtMRLY8';
var SESION_DIAS = 30;
var MAX_FALLOS = 5;
var BLOQUEO_MIN = 5;
var CHUNK = 40000; // tope seguro por celda de Sheets (50 000)

var COLS = {
  Usuarios: ['usuario_id', 'usuario', 'hash_contrasena', 'rol', 'nombre', 'correo', 'telefono', 'estado', 'debe_cambiar_clave', 'intentos_fallidos', 'bloqueado_hasta', 'creado_en', 'actualizado_en', 'ultimo_acceso', 'creado_por', 'notas'],
  Sesiones: ['sesion_id', 'usuario_id', 'token_hash', 'creado_en', 'expira_en', 'revocado_en', 'ip_resumen', 'user_agent_resumen'],
  Estudios: ['estudio_id', 'codigo_fc', 'propietario_usuario_id', 'nombre_proyecto', 'descripcion', 'estado', 'version_actual', 'provincia', 'municipio', 'actor_codigo', 'tamano', 'sector', 'moneda_base', 'creado_en', 'actualizado_en', 'fecha_dictamen', 'dictamen_actual', 'confianza_datos_0_100', 'riesgo_total_0_100', 'inversion_total_cup', 'utilidad_neta_mensual_cup', 'margen_neto_pct', 'punto_equilibrio_unidades', 'punto_equilibrio_pct_capacidad', 'pri_meses', 'van_3_anos_cup', 'tir_3_anos_pct', 'van_6_anos_cup', 'tir_6_anos_pct', 'brecha_financiamiento_cup', 'alineacion_plan_municipal', 'archivado'],
  Entradas_JSON: ['entrada_id', 'estudio_id', 'version', 'parte', 'origen', 'payload_json', 'hash_payload', 'creado_por', 'creado_en', 'es_actual'],
  Auditoria: ['auditoria_id', 'fecha_hora', 'usuario_id', 'accion', 'entidad', 'entidad_id', 'detalle_no_sensible', 'resultado', 'origen'],
  Conocimiento: ['conocimiento_id', 'fecha', 'tipo', 'titulo', 'resumen', 'fuente', 'fuente_url', 'aplica', 'estado', 'origen', 'creado_en'],
  Parametros: ['clave', 'valor', 'descripcion', 'actualizado_en', 'actualizado_por'],
  Agentes_Log: ['log_id', 'fecha_hora', 'agente', 'accion', 'detalle', 'resultado', 'origen'],
  Autodatos: ['clave', 'provincia', 'municipio', 'sector', 'campo', 'valor', 'fuente', 'fecha'],
  Eventos: ['evento_id', 'fecha_hora', 'tipo', 'origen', 'detalle', 'procesado']
};

/* Parámetros vivos por defecto: la hoja Parametros manda cuando existe;
   estos valores solo siembran la primera vez. */
var PARAM_SEMILLA = {
  fideicomiso_pct: 4, pdl_tope_contratados: 100, pdl_duracion_max_anios: 5,
  pdl_evaluacion_semestral: 'si', ied_evaluacion_dias: 7, ied_silencio_positivo: 'si',
  vivienda_m2_minimos: 25, certificacion_catastral_anios: 5
};

function db_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss && SHEET_ID) ss = SpreadsheetApp.openById(SHEET_ID);
  if (!ss) throw new Error('Sin hoja vinculada');
  return ss;
}
function hoja_(n) {
  var sh = db_().getSheetByName(n);
  if (!sh) { sh = db_().insertSheet(n); sh.getRange(1, 1, 1, COLS[n].length).setValues([COLS[n]]); }
  return sh;
}
function filas_(n) {
  var sh = hoja_(n), v = sh.getDataRange().getValues(), out = [], cols = COLS[n];
  for (var i = 1; i < v.length; i++) {
    var o = {}; for (var j = 0; j < cols.length; j++) o[cols[j]] = v[i][j];
    o.__fila = i + 1; out.push(o);
  }
  return out;
}
function guardar_(n, o) {
  var sh = hoja_(n), cols = COLS[n];
  var row = cols.map(function (c) { return o[c] === undefined ? '' : o[c]; });
  if (o.__fila) sh.getRange(o.__fila, 1, 1, cols.length).setValues([row]);
  else { sh.appendRow(row); o.__fila = sh.getLastRow(); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function id_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function ahora_() { return new Date().toISOString(); }
function sha_(s) { return bytesHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function bytesHex_(b) { return b.map(function (x) { var h = (x < 0 ? x + 256 : x).toString(16); return h.length === 1 ? '0' + h : h; }).join(''); }
function hashPw_(pw) { var salt = id_(); return 'sha256$' + salt + '$' + sha_(salt + '::' + pw); }
function verifyPw_(pw, stored) {
  try { var p = String(stored || '').split('$'); if (p.length !== 3) return false; return sha_(p[1] + '::' + pw) === p[2]; } catch (e) { return false; }
}
function audit_(usuarioId, accion, entidad, entidadId, detalle, resultado) {
  try { guardar_('Auditoria', { auditoria_id: id_(), fecha_hora: ahora_(), usuario_id: usuarioId || '', accion: accion, entidad: entidad || '', entidad_id: entidadId || '', detalle_no_sensible: String(detalle || '').slice(0, 200), resultado: resultado || 'ok', origen: 'servidor' }); } catch (e) {}
}

/* ---------------- usuarios y sesiones ---------------- */
function usuarioPorNombre_(u) {
  u = String(u || '').toLowerCase();
  var rows = filas_('Usuarios');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].usuario) === u) return rows[i];
  return null;
}
function usuarioPorId_(id) {
  var rows = filas_('Usuarios');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].usuario_id) === String(id)) return rows[i];
  return null;
}
function usuarioPub_(u) { return { usuario_id: String(u.usuario_id), usuario: String(u.usuario), rol: String(u.rol), nombre: String(u.nombre || '') }; }
function sesionCrear_(usuarioId) {
  var tok = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  guardar_('Sesiones', { sesion_id: id_(), usuario_id: usuarioId, token_hash: sha_(tok), creado_en: ahora_(), expira_en: new Date(Date.now() + SESION_DIAS * 86400000).toISOString(), revocado_en: '', ip_resumen: '', user_agent_resumen: '' });
  return tok;
}
function sesionUsuario_(tok) {
  if (!tok) return null;
  var th = sha_(tok), rows = filas_('Sesiones');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].token_hash) === th) {
      if (rows[i].revocado_en) return null;
      if (new Date(rows[i].expira_en).getTime() < Date.now()) return null;
      var u = usuarioPorId_(rows[i].usuario_id);
      return (u && String(u.estado || 'activo') === 'activo') ? u : null;
    }
  }
  return null;
}

/* ---------------- acciones ---------------- */
var ACCIONES = {
  ping: function () {
    var n = 0; try { n = filas_('Estudios').length; } catch (e) {}
    return { ok: true, version: 5, servicio: 'FactiCuba', estudios: n };
  },
  login: function (b) {
    var u = String(b.username || '').trim().toLowerCase(), usr = usuarioPorNombre_(u);
    if (!usr) return { ok: false, error: 'Usuario o contraseña incorrectos' };
    if (usr.bloqueado_hasta && new Date(usr.bloqueado_hasta).getTime() > Date.now())
      return { ok: false, error: 'Cuenta bloqueada unos minutos por intentos fallidos. Espera y reintenta.' };
    if (String(usr.estado || 'activo') !== 'activo') return { ok: false, error: 'Cuenta no activa' };
    if (!verifyPw_(String(b.password || ''), usr.hash_contrasena)) {
      usr.intentos_fallidos = (Number(usr.intentos_fallidos) || 0) + 1;
      if (usr.intentos_fallidos >= MAX_FALLOS) { usr.bloqueado_hasta = new Date(Date.now() + BLOQUEO_MIN * 60000).toISOString(); usr.intentos_fallidos = 0; }
      usr.actualizado_en = ahora_(); guardar_('Usuarios', usr);
      audit_(usr.usuario_id, 'login_fallido', 'Usuarios', usr.usuario_id, '', 'error');
      return { ok: false, error: 'Usuario o contraseña incorrectos' };
    }
    usr.intentos_fallidos = 0; usr.bloqueado_hasta = ''; usr.ultimo_acceso = ahora_(); usr.actualizado_en = ahora_();
    guardar_('Usuarios', usr);
    audit_(usr.usuario_id, 'login', 'Usuarios', usr.usuario_id, '', 'ok');
    return { ok: true, token: sesionCrear_(usr.usuario_id), user: usuarioPub_(usr) };
  },
  logout: function (b) {
    var th = sha_(String(b.token || '')), rows = filas_('Sesiones');
    for (var i = 0; i < rows.length; i++) if (String(rows[i].token_hash) === th && !rows[i].revocado_en) { rows[i].revocado_en = ahora_(); guardar_('Sesiones', rows[i]); }
    return { ok: true };
  },
  pass_change: function (b, me) {
    var nueva = String(b.nueva || '');
    if (!verifyPw_(String(b.actual || ''), me.hash_contrasena)) return { ok: false, error: 'La contraseña actual no es correcta' };
    if (nueva.length < 6) return { ok: false, error: 'La contraseña nueva necesita al menos 6 caracteres' };
    me.hash_contrasena = hashPw_(nueva); me.debe_cambiar_clave = 0; me.actualizado_en = ahora_(); guardar_('Usuarios', me);
    audit_(me.usuario_id, 'pass_change', 'Usuarios', me.usuario_id, '', 'ok');
    return { ok: true };
  },

  /* -------- estudios -------- */
  estudios_list: function (b, me) {
    var list = filas_('Estudios').filter(function (r) {
      if (Number(r.archivado) === 1) return false;
      return me.rol === 'administrador' || String(r.propietario_usuario_id) === String(me.usuario_id);
    }).map(function (r) {
      return { estudio_id: String(r.estudio_id), codigo_fc: String(r.codigo_fc), nombre: String(r.nombre_proyecto), dict: String(r.dictamen_actual), util: Number(r.utilidad_neta_mensual_cup) || 0, pri: (r.pri_meses === '' || r.pri_meses === undefined) ? null : Number(r.pri_meses), margen: Number(r.margen_neto_pct) || 0, fecha: String(r.actualizado_en), p: String(r.provincia), m: String(r.municipio) };
    });
    list.sort(function (a, c) { return String(c.fecha).localeCompare(String(a.fecha)); });
    return { ok: true, estudios: list };
  },
  estudio_get: function (b, me) {
    var r = estudioRow_(b.estudio_id);
    if (!r || Number(r.archivado) === 1) return { ok: false, error: 'Estudio no encontrado' };
    if (me.rol !== 'administrador' && String(r.propietario_usuario_id) !== String(me.usuario_id)) return { ok: false, error: 'Ese estudio no es tuyo' };
    var partes = filas_('Entradas_JSON').filter(function (e) { return String(e.estudio_id) === String(r.estudio_id) && Number(e.es_actual) === 1; });
    partes.sort(function (a, c) { return Number(a.parte) - Number(c.parte); });
    var payload = null;
    try { payload = JSON.parse(partes.map(function (e) { return String(e.payload_json); }).join('')); } catch (e) {}
    if (!payload) return { ok: false, error: 'El estudio no tiene datos guardados' };
    return { ok: true, estudio_id: String(r.estudio_id), codigo_fc: String(r.codigo_fc), version: Number(r.version_actual) || 1, payload: payload };
  },
  estudio_save: function (b, me) {
    var payload = b.payload || {};
    var inputs = payload.inputs || {}, res = payload.resumen || {};
    var r = b.estudio_id ? estudioRow_(b.estudio_id) : null;
    if (r && me.rol !== 'administrador' && String(r.propietario_usuario_id) !== String(me.usuario_id)) return { ok: false, error: 'Ese estudio no es tuyo' };
    var inv = (Number(inputs.invLocal) || 0) + (Number(inputs.invEquipos) || 0) + (Number(inputs.invCapital) || 0);
    if (!r) {
      var total = filas_('Estudios').length + 1;
      r = { estudio_id: id_(), codigo_fc: 'FC-' + new Date().getFullYear() + '-' + ('000' + total).slice(-4), propietario_usuario_id: String(me.usuario_id), creado_en: ahora_(), estado: 'dictaminado', version_actual: 0, archivado: 0, moneda_base: 'CUP' };
    }
    r.nombre_proyecto = String(res.nombre || inputs.nomProy || 'Estudio');
    r.descripcion = String(inputs.descProy || '').slice(0, 500);
    r.version_actual = (Number(r.version_actual) || 0) + 1;
    r.provincia = String(res.p || inputs.provSel || ''); r.municipio = String(res.m || inputs.muniSel || '');
    r.actor_codigo = String(inputs.actorSel || ''); r.tamano = String(inputs.tamanoSel || ''); r.sector = String(inputs.sectorSel || '');
    r.actualizado_en = ahora_(); r.fecha_dictamen = ahora_();
    r.dictamen_actual = String(res.dict || ''); r.utilidad_neta_mensual_cup = Number(res.util) || 0;
    r.margen_neto_pct = Number(res.margen) || 0; r.pri_meses = (res.pri === null || res.pri === undefined) ? '' : Number(res.pri);
    r.inversion_total_cup = inv;
    guardar_('Estudios', r);
    /* payload en Entradas_JSON por partes; la versión anterior deja de ser actual */
    var previas = filas_('Entradas_JSON').filter(function (e) { return String(e.estudio_id) === String(r.estudio_id) && Number(e.es_actual) === 1; });
    previas.forEach(function (e) { e.es_actual = 0; guardar_('Entradas_JSON', e); });
    var texto = JSON.stringify(payload), hash = sha_(texto);
    for (var i = 0; i < texto.length; i += CHUNK) {
      guardar_('Entradas_JSON', { entrada_id: id_(), estudio_id: String(r.estudio_id), version: r.version_actual, parte: (i / CHUNK) + 1, origen: 'app', payload_json: texto.slice(i, i + CHUNK), hash_payload: hash, creado_por: String(me.usuario_id), creado_en: ahora_(), es_actual: 1 });
    }
    audit_(me.usuario_id, 'estudio_save', 'Estudios', r.estudio_id, r.codigo_fc + ' v' + r.version_actual, 'ok');
    try { flujoEstudioGuardado_(r, payload, me); } catch (e) {}
    return { ok: true, estudio_id: String(r.estudio_id), codigo_fc: String(r.codigo_fc), version: r.version_actual };
  },
  /* -------- conocimiento (lo que la app aprende vive en la hoja) -------- */
  conocimiento_list: function (b, me) {
    var rows = filas_('Conocimiento');
    if (b.estado) rows = rows.filter(function (r) { return String(r.estado) === String(b.estado); });
    rows.sort(function (a, c) { return String(c.fecha).localeCompare(String(a.fecha)); });
    return { ok: true, entradas: rows.slice(0, 300).map(conocimientoPub_) };
  },
  conocimiento_add: function (b, me) {
    var lista = Array.isArray(b.entradas) ? b.entradas.slice(0, 20) : [];
    var ya = {}; filas_('Conocimiento').forEach(function (r) { ya[claveConocimiento_(r.titulo)] = 1; });
    var n = 0;
    lista.forEach(function (e) {
      var titulo = String(e.titulo || '').slice(0, 200); if (!titulo) return;
      var k = claveConocimiento_(titulo); if (ya[k]) return; ya[k] = 1;
      guardar_('Conocimiento', { conocimiento_id: id_(), fecha: String(e.fecha || ahora_().slice(0, 10)), tipo: String(e.tipo || 'norma').slice(0, 30), titulo: titulo, resumen: String(e.resumen || '').slice(0, 900), fuente: String(e.fuente || '').slice(0, 200), fuente_url: String(e.fuenteUrl || e.fuente_url || '').slice(0, 300), aplica: String(e.aplica || '').slice(0, 400), estado: (e.estado === 'verificada') ? 'verificada' : 'candidata', origen: String(e.origen || b.origen || 'app').slice(0, 30), creado_en: ahora_() });
      n++;
    });
    if (n) audit_(me.usuario_id, 'conocimiento_add', 'Conocimiento', '', n + ' entrada(s)', 'ok');
    return { ok: true, agregadas: n };
  },
  conocimiento_estado: function (b, me) {
    if (me.rol !== 'administrador') return { ok: false, error: 'Solo el administrador confirma el conocimiento' };
    var rows = filas_('Conocimiento'), hecho = false;
    for (var i = 0; i < rows.length; i++) if (String(rows[i].conocimiento_id) === String(b.id)) { rows[i].estado = (b.estado === 'verificada') ? 'verificada' : (b.estado === 'descartada' ? 'descartada' : rows[i].estado); guardar_('Conocimiento', rows[i]); hecho = true; }
    if (hecho) audit_(me.usuario_id, 'conocimiento_estado', 'Conocimiento', String(b.id), String(b.estado), 'ok');
    return { ok: hecho, error: hecho ? undefined : 'Entrada no encontrada' };
  },

  /* -------- parámetros vivos -------- */
  parametros_get: function (b, me) { return { ok: true, parametros: parametros_() }; },
  parametros_set: function (b, me) {
    if (me.rol !== 'administrador') return { ok: false, error: 'Solo el administrador cambia parámetros' };
    var clave = String(b.clave || '').slice(0, 60); if (!clave) return { ok: false, error: 'Falta la clave' };
    parametroSet_(clave, b.valor, String(me.usuario));
    audit_(me.usuario_id, 'parametros_set', 'Parametros', clave, '', 'ok');
    return { ok: true, parametros: parametros_() };
  },

  /* -------- registro compartido de agentes (pizarra multi-agente) -------- */
  agente_log_add: function (b, me) {
    guardar_('Agentes_Log', { log_id: id_(), fecha_hora: ahora_(), agente: String(b.agente || 'app').slice(0, 40), accion: String(b.accion || '').slice(0, 60), detalle: String(b.detalle || '').slice(0, 300), resultado: String(b.resultado || 'ok').slice(0, 40), origen: String(b.origen || 'app').slice(0, 20) });
    return { ok: true };
  },
  agente_log_list: function (b, me) {
    var rows = filas_('Agentes_Log'); rows.reverse();
    return { ok: true, logs: rows.slice(0, Math.min(Number(b.limit) || 30, 100)).map(function (r) { return { fecha: String(r.fecha_hora), agente: String(r.agente), accion: String(r.accion), detalle: String(r.detalle), resultado: String(r.resultado), origen: String(r.origen) }; }) };
  },

  /* -------- autodatos aprendidos (compartidos entre equipos) -------- */
  autodatos_get: function (b, me) {
    var rows = filas_('Autodatos').filter(function (r) { return String(r.provincia) === String(b.provincia || '') && String(r.municipio) === String(b.municipio || '') && String(r.sector) === String(b.sector || ''); });
    return { ok: true, items: rows.map(function (r) { return { campo: String(r.campo), valor: String(r.valor), fuente: String(r.fuente), fecha: String(r.fecha) }; }) };
  },
  autodatos_set: function (b, me) {
    var items = Array.isArray(b.items) ? b.items.slice(0, 30) : [], n = 0;
    var rows = filas_('Autodatos');
    items.forEach(function (it) {
      var clave = [it.provincia, it.municipio, it.sector, it.campo].join('|');
      var fila = null; for (var i = 0; i < rows.length; i++) if (String(rows[i].clave) === clave) { fila = rows[i]; break; }
      var o = fila || { clave: clave };
      o.provincia = String(it.provincia || ''); o.municipio = String(it.municipio || ''); o.sector = String(it.sector || ''); o.campo = String(it.campo || ''); o.valor = String(it.valor == null ? '' : it.valor).slice(0, 120); o.fuente = String(it.fuente || '').slice(0, 120); o.fecha = ahora_().slice(0, 10);
      guardar_('Autodatos', o); if (!fila) rows.push(o); n++;
    });
    return { ok: true, guardados: n };
  },

  /* -------- eventos y flujos -------- */
  eventos_list: function (b, me) {
    var rows = filas_('Eventos'); rows.reverse();
    return { ok: true, eventos: rows.slice(0, Math.min(Number(b.limit) || 30, 100)).map(function (r) { return { fecha: String(r.fecha_hora), tipo: String(r.tipo), origen: String(r.origen), detalle: String(r.detalle), procesado: Number(r.procesado) || 0 }; }) };
  },
  webhook: function (b, me, e) {
    var clave = String((e && e.parameter && e.parameter.clave) || b.clave || '');
    var buena = parametroCrudo_('webhook_clave');
    if (!buena || clave !== buena) return { ok: false, error: 'Webhook sin clave válida (define webhook_clave en Parámetros)' };
    var tipo = String(b.tipo || (b.commits ? 'github_push' : 'externo')).slice(0, 40);
    var detalle = '';
    if (b.commits) { try { detalle = 'push de ' + (b.pusher && b.pusher.name || '?') + ': ' + b.commits.map(function (c) { return c.message; }).join(' · ').slice(0, 250); } catch (err) {} }
    if (!detalle) detalle = String(b.detalle || '').slice(0, 250);
    guardar_('Eventos', { evento_id: id_(), fecha_hora: ahora_(), tipo: tipo, origen: String(b.origen || 'webhook').slice(0, 30), detalle: detalle, procesado: 1 });
    guardar_('Agentes_Log', { log_id: id_(), fecha_hora: ahora_(), agente: 'GestorFlujos', accion: 'webhook_' + tipo, detalle: detalle, resultado: 'ok', origen: 'webhook' });
    if (b.candidata && b.candidata.titulo) {
      var ya = {}; filas_('Conocimiento').forEach(function (r) { ya[claveConocimiento_(r.titulo)] = 1; });
      if (!ya[claveConocimiento_(b.candidata.titulo)]) guardar_('Conocimiento', { conocimiento_id: id_(), fecha: String(b.candidata.fecha || ahora_().slice(0, 10)), tipo: 'norma', titulo: String(b.candidata.titulo).slice(0, 200), resumen: String(b.candidata.resumen || '').slice(0, 900), fuente: String(b.candidata.fuente || 'webhook').slice(0, 200), fuente_url: String(b.candidata.fuenteUrl || '').slice(0, 300), aplica: String(b.candidata.aplica || '').slice(0, 400), estado: 'candidata', origen: String(b.origen || 'webhook').slice(0, 30), creado_en: ahora_() });
    }
    return { ok: true, registrado: tipo };
  },

  estudio_delete: function (b, me) {
    var r = estudioRow_(b.estudio_id);
    if (!r) return { ok: false, error: 'Estudio no encontrado' };
    if (me.rol !== 'administrador' && String(r.propietario_usuario_id) !== String(me.usuario_id)) return { ok: false, error: 'Ese estudio no es tuyo' };
    r.archivado = 1; r.estado = 'archivado'; r.actualizado_en = ahora_(); guardar_('Estudios', r);
    audit_(me.usuario_id, 'estudio_delete', 'Estudios', r.estudio_id, String(r.codigo_fc), 'ok');
    return { ok: true };
  }
};
function estudioRow_(id) {
  if (!id) return null;
  var rows = filas_('Estudios');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].estudio_id) === String(id)) return rows[i];
  return null;
}

function conocimientoPub_(r) { return { id: String(r.conocimiento_id), fecha: String(r.fecha), tipo: String(r.tipo), titulo: String(r.titulo), resumen: String(r.resumen), fuente: String(r.fuente), fuenteUrl: String(r.fuente_url), aplica: String(r.aplica), estado: String(r.estado), origen: String(r.origen) }; }
function claveConocimiento_(t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 120); }
function parametroCrudo_(clave) {
  var rows = filas_('Parametros');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].clave) === clave) return String(rows[i].valor);
  return '';
}
function parametroSet_(clave, valor, quien) {
  var rows = filas_('Parametros');
  for (var i = 0; i < rows.length; i++) if (String(rows[i].clave) === clave) { rows[i].valor = String(valor); rows[i].actualizado_en = ahora_(); rows[i].actualizado_por = quien || ''; guardar_('Parametros', rows[i]); return; }
  guardar_('Parametros', { clave: clave, valor: String(valor), descripcion: '', actualizado_en: ahora_(), actualizado_por: quien || '' });
}
function parametros_() {
  var out = {}; Object.keys(PARAM_SEMILLA).forEach(function (k) { out[k] = PARAM_SEMILLA[k]; });
  filas_('Parametros').forEach(function (r) { var v = String(r.valor); out[String(r.clave)] = isNaN(Number(v)) || v === '' ? v : Number(v); });
  delete out.webhook_clave;
  return out;
}

/* ===== GESTOR DE FLUJOS (autónomo, en el servidor) =====
   Flujo 1: al guardarse un estudio → traza en Agentes_Log + evento +
   aprende los autodatos del territorio (salario medio y otros valores
   con fuente) en la hoja Autodatos, compartidos entre equipos. */
function flujoEstudioGuardado_(r, payload, me) {
  guardar_('Agentes_Log', { log_id: id_(), fecha_hora: ahora_(), agente: 'GestorFlujos', accion: 'estudio_guardado', detalle: (r.codigo_fc + ' · ' + r.nombre_proyecto + ' · ' + r.dictamen_actual).slice(0, 300), resultado: 'ok', origen: 'servidor' });
  guardar_('Eventos', { evento_id: id_(), fecha_hora: ahora_(), tipo: 'estudio_guardado', origen: 'servidor', detalle: String(r.codigo_fc), procesado: 1 });
  var inp = (payload && payload.inputs) || {};
  var campos = ['salMedio', 'eSalMedio', 'alquiler', 'precio', 'costoUnit'];
  var prov = r.provincia, mun = r.municipio, sec = r.sector;
  if (prov && mun) campos.forEach(function (c) {
    var v = inp[c]; if (v === undefined || v === null || v === '') return;
    ACCIONES.autodatos_set({ items: [{ provincia: prov, municipio: mun, sector: sec, campo: c, valor: v, fuente: 'estudio ' + r.codigo_fc }] }, me);
  });
}
/* Flujo 2: resumen diario por correo al dueño (MailApp de su cuenta).
   Flujo 3: precios informales SIEMPRE actuales — cada día el servidor
   vuelve a buscar la mediana real de cada producto aprendido en
   Autodatos (Revolico vía el espejo propio) y actualiza el valor;
   la app lo recoge sola al abrir. Ambos se encienden ejecutando
   UNA vez instalarFlujos() en el editor. */
function instalarFlujos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'flujoResumenDiario' || t.getHandlerFunction() === 'preciosDiarios') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('flujoResumenDiario').timeBased().everyDays(1).atHour(7).create();
  ScriptApp.newTrigger('preciosDiarios').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Flujos instalados: precios diarios ~6:00 y resumen diario ~7:00, en la cuenta dueña del script.');
}
var ESPEJO_REV = 'https://facticuba-tasas.magisequipo5.workers.dev/revolico?q=';
function medianaRevolico_(producto) {
  var r = UrlFetchApp.fetch(ESPEJO_REV + encodeURIComponent(producto), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return 0;
  var j = JSON.parse(r.getContentText());
  var cups = [];
  (j.items || []).forEach(function (x) {
    var mon = String(x.moneda || 'CUP').toUpperCase();
    if (mon !== 'CUP' && mon !== 'PESOS' && mon !== 'MN' && mon !== '') return;
    var v = Number(String(x.precio || '').replace(/[^\d.]/g, ''));
    if (v >= 20 && v <= 5000000) cups.push(v);
  });
  if (cups.length < 3) return 0;
  cups.sort(function (a, b) { return a - b; });
  return Math.round(cups[Math.floor(cups.length / 2)]);
}
function preciosDiarios() {
  var hoy = Utilities.formatDate(new Date(), 'America/Havana', 'yyyy-MM-dd');
  var rows = filas_('Autodatos').filter(function (r) { return String(r.campo) === 'precioInformal'; });
  var cambios = 0;
  rows.forEach(function (r) {
    var m = String(r.fuente || '').match(/«([^»]+)»/);
    if (!m) return;
    var med = 0;
    try { med = medianaRevolico_(m[1]); } catch (e) {}
    if (!(med > 0)) return;
    var viejo = Number(r.valor) || 0;
    r.fecha = hoy;
    if (med !== viejo) {
      r.valor = med;
      guardar_('Agentes_Log', { log_id: id_(), fecha_hora: ahora_(), agente: 'PreciosServidor', accion: 'precio_actualizado', detalle: (r.provincia + '/' + r.municipio + ' «' + m[1] + '»: ' + viejo + ' → ' + med + ' CUP').slice(0, 300), resultado: 'ok', origen: 'servidor' });
      cambios++;
    }
    guardar_('Autodatos', r);
  });
  Logger.log('Precios diarios: ' + rows.length + ' territorio(s) revisados, ' + cambios + ' precio(s) actualizados.');
}
function flujoResumenDiario() {
  var cand = filas_('Conocimiento').filter(function (r) { return String(r.estado) === 'candidata'; }).length;
  var est = filas_('Estudios').filter(function (r) { return Number(r.archivado) !== 1; }).length;
  var logs = filas_('Agentes_Log').slice(-8).map(function (r) { return '· ' + r.fecha_hora + ' — ' + r.agente + ': ' + r.accion + ' (' + r.resultado + ')'; }).join('\n');
  var cuerpo = 'FactiCuba — resumen de tus agentes\n\nEstudios guardados: ' + est + '\nCandidatas de conocimiento por confirmar: ' + cand + '\n\nÚltimos movimientos de los agentes:\n' + (logs || '—');
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'FactiCuba: resumen diario de agentes', cuerpo); } catch (e) { Logger.log('Sin correo: ' + e); }
}

var PUBLICAS = ['ping', 'login', 'webhook'];
function doPost(e) {
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  var a = String(b.action || ''), fn = ACCIONES[a];
  if (!fn) return out_({ ok: false, error: 'Acción no soportada: ' + a });
  try {
    if (PUBLICAS.indexOf(a) >= 0) return out_(fn(b, null, e));
    var me = sesionUsuario_(b.token);
    if (!me) return out_({ ok: false, error: 'Sesión expirada' });
    return out_(fn(b, me, e));
  } catch (err) { return out_({ ok: false, error: 'Error del servidor: ' + (err && err.message ? err.message : err) }); }
}
function doGet() { return out_({ ok: true, ping: true, servicio: 'FactiCuba' }); }

/* Ejecutar una vez para comprobar que todas las pestañas núcleo existen. */
function setup() {
  Object.keys(COLS).forEach(function (n) { hoja_(n); });
  Logger.log('FactiCuba: pestañas núcleo listas en «FactiCuba DB».');
}
