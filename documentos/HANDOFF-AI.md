# HANDOFF — FactiCuba (estudios de factibilidad)

## Qué es
- App de estudio de factibilidad de negocios en Cuba (territorio/actor,
  tasas BCC/elToque, Revolico, motor financiero 36 meses, expediente
  formal 2025-2030, dictamen). Paquete de Leonardo en
  ~/workspace/facticuba-online/ (index.html + main.pjs + espejo Cloudflare).
- PUBLICADA por Leonardo: https://negociosparticularescubanos.github.io/FactiCuba/
  (verificada en vivo 2026-11-12: coincide con el paquete).

## Base de datos (pedido 2026-11-12)
- Libro construido y verificado en local:
  ~/workspace/facticuba-online/base-datos/FactiCuba_DB.xlsx
  (constructor: build_workbook.py en la misma carpeta; extrae
  territorios/sectores/actores del propio index.html).
- 37 pestañas: Panel, Configuracion, Usuarios, Sesiones, Auditoria,
  Imagenes_Documentos, Respaldo_Registro, Estudios, Entradas_JSON,
  Proyecto_Detalle, Mercado_Estudio, Productos_Servicios, Inversion,
  Costos_Fijos, Insumos_Costos_Variables, Combustible_Energia,
  Nomina_Tributos, Flujo_Mensual, Evaluacion_Anual, Sensibilidad,
  Expediente_Programas, Presupuesto_2025_2030, Financiamiento, Riesgos,
  Ruta_Factibilidad (12 pasos), Criterios_Factibilidad (27 criterios,
  9 dimensiones con pesos), Requisitos_Estudio, Reglas_Dictamen
  (10 reglas: bloqueos → NO FACTIBLE / INFORMACIÓN INSUFICIENTE /
  FACTIBLE CONDICIONADO / FACTIBLE), Dictamenes, Plan_Mejora,
  Catalogo_Mejoras (18 acciones por disparador), Fuentes_Evidencias,
  Precios_Mercado, Tasas, Territorios (168 municipios con población
  Censo 2022/ONEI del paquete), Catalogos (63), Diccionario_Datos.
- Google Sheets «FactiCuba DB» CREADA y verificada (2026-11-12) en la
  cuenta negociosparticularescubanos, carpeta Drive «FactiCuba» (el
  XLSX fuente quedó al lado como respaldo):
  https://docs.google.com/spreadsheets/d/1-y2TRQG1RjT8-5Pwl3jV-aKDT_AMcmBL6JQuEtMRLY8/edit
  Verificación en la hoja convertida: 37 pestañas, Territorios con los
  168 municipios y Criterios_Factibilidad con los 27 criterios.
  (El conector de Sheets sigue en la cuenta vieja: NO usarlo para esta
  base; trabajar por navegador en la cuenta de negocios o con su ID.)
- Reglas aplicadas: contraseñas solo huellas con sal y sesiones por
  token_hash; sin credenciales sembradas; imágenes/documentos
  comprimidos a Drive de la cuenta de negocios (solo metadatos + URL +
  SHA-256 en la base); auditoría; moneda base CUP con moneda original
  y tasa guardadas; dictámenes versionados.

## Conexión app ↔ base (orden de Leonardo 2026-11-12: «procede para
que todo quede ok en todos los sentidos»)
- Servidor escrito y PROBADO en arnés local 17/17:
  ~/workspace/facticuba-online/servidor/Code.gs (ping, register con
  primer usuario = administrador, login con bloqueo 5 fallos/5 min en
  la fila del usuario, logout revocable, pass_change, estudios
  list/get/save/delete con payload partido en Entradas_JSON ≤40 000
  caracteres, auditoría).
- Servidor DESPLEGADO y VERIFICADO EN VIVO (2026-11-12 07:53):
  https://script.google.com/macros/s/AKfycbyfQDLE3QcrboYqee1SQ87rxugBwTgoFRJV_lCY-k7DIWyY1tjjo5aYm5JBRJsUhEv8/exec
  (proyecto Apps Script ligado a la hoja
  1vJmNzVxNMAc0pYQUQgbSBdTyzHYLfEN4HF53XMY0H9rA7SQXFOjBs6hF).
  Sondeos reales OK: ping {ok, estudios:0}, login falso → error
  genérico, sin sesión → «Sesión expirada», acción rara → no
  soportada. Sin usuarios creados: el bootstrap de administrador
  sigue libre para Leonardo.
- App parcheada en ~/workspace/facticuba-online/app-conectada/index.html
  (sintaxis JS verificada): acceso por servidor (login + registro en
  la tarjeta), credencial del paquete RETIRADA (grep sin rastro),
  indicador de base (dbPill en la barra + estado en la tarjeta, ping
  al cargar y cada 60 s), estudios sincronizados con la base
  (guardar/abrir/borrar envuelven las funciones originales; la copia
  local queda de caché). URL /exec YA metida en FC_API (sha256 de la
  app conectada: 13f57d40…a8055f3). PUBLICADA en el repo FactiCuba
  (commits 23b44c4 index.html y 5bb1627 src/README.md, 2026-11-12) y
  VERIFICADA EN VIVO: GitHub Pages sirve exactamente esa huella, con
  la URL del servidor dentro, el indicador y el registro, y sin
  rastro de la credencial vieja.
- ÚNICO paso en manos de Leonardo: REGISTRARSE PRIMERO en la app
  (ese primer usuario queda administrador; los siguientes entran
  como clientes). Avisado el 2026-11-12 por chat y Telegram. La
  credencial vieja del paquete ya no funciona en ningún sitio.

- Detalle menor pendiente: en la hoja, Configuracion.servidor_url
  sigue vacía y estado_conexion_app = PENDIENTE (la app no lee esos
  valores; es solo el registro del Panel). Actualizar en la próxima
  visita a la hoja.

## Plan de mejoras «máquina de aprobaciones» (formulado 2026-11-12)
Leonardo definió el propósito: la app prepara estudios para PRESENTAR
proyectos y lograr su aprobación (CAM/banco); cuando el proyecto no
es factible, debe decir qué cambiar — según provincia, municipio,
plan de desarrollo municipal y datos ONEI — para que lo sea.
- Fase 1 (simulador de corrección): HECHA (ver abajo).
- Fase 2: inteligencia territorial (ampliar Territorios con líneas
  del plan de desarrollo por municipio + datos ONEI fechados;
  puntuación de alineación proyecto↔plan y sugerencias de encaje).
- Fase 3: expediente de aprobación (amortización del crédito con
  gracia, depreciación, Beneficio/Costo y DSCR en el informe;
  checklist legal-ambiental con estados integrado al dictamen;
  cronograma del proceso inversionista DL 327; equipamiento
  itemizado; demanda segmentada por vía de pago + FODA; plantilla
  por categorías; anexos con respaldo).
- Fase 4: documento cliente con la estructura oficial de 9 partes
  y evidencias fechadas citadas.
- Fase de ACCESO EXCLUSIVO (orden de Leonardo 2026-11-12, después de
  la Fase 2): «No quiero que nadie se registre por fuera en el
  login; solo yo puedo usar la app». Alcance a ejecutar en su
  bloque: (1) servidor — la acción register solo se acepta con la
  tabla Usuarios VACÍA (bootstrap de Leonardo) y se cierra para
  siempre en cuanto exista un usuario; (2) app — el ping informa
  si el registro sigue abierto y, una vez cerrado, la tarjeta de
  acceso oculta el formulario de registro y muestra «App de uso
  exclusivo de su dueño». Hasta que Leonardo se registre, la puerta
  del bootstrap sigue abierta: recordarle que se registre PRIMERO
  cuanto antes. Orden acordado: primero Fase 3, esta fase va en su
  propio bloque a continuación.

## Fase 1 — Simulador de corrección «Ruta a factible» (2026-11-12)
- Qué hace: si el dictamen no es 🟢, la tarjeta «🔧 Ruta a factible»
  (bajo el informe, botón «Buscar cómo hacerlo factible») muestra el
  diagnóstico con los motivos del propio motor y prueba las palancas
  — precio (hasta el precio informal de referencia o ×1.65), costo
  variable (hasta −45 %), fijos (−10…−40 %), ocupación (+10…+30,
  tope 95 %), capacidad (×1.25/×1.5), inversión (−15…−45 %, «por
  fases») y plantilla (−1/−2 trabajadores) — solas y en 3 combinados
  (moderado/fuerte/máximo esfuerzo). Devuelve hasta 2 rutas verdes
  (la de menor esfuerzo y una alternativa) o la amarilla más cercana
  con lo que aún quedaría por resolver; si nada llega, lo dice
  (problema estructural → Fase 2). Botón «Aplicar este escenario»
  pone los valores en el formulario.
- CÓMO: no hay matemática paralela — cada candidato se evalúa
  llamando al motor real (poner valores → generarInforme(true) →
  leer ultimoResultado.dictCls/utilNeta/margen/pri/van). Clave:
  antes de CADA candidato hay que restaurar las palancas a la base
  (resetPalancas); sin eso los candidatos se contaminan entre sí
  (bug cazado en la prueba: la ocupación «sola» parecía verde
  porque heredaba el cvu del candidato anterior).
- La corrección viaja en el payload al guardar el estudio
  (payload.correccion; la base la recibe entera, sin tocar servidor).
- PRUEBA (arnés jsdom, node desde finanzas-sheets/audit): 7/7 —
  caso cafetería al borde (base 🔴 util −64 340, margen −39 %) →
  ruta mínima «Combinado fuerte» 🟢 (util 83 980, margen 20.7 %,
  PRI 8) y alternativa «Máximo esfuerzo» 🟢; restauración del
  formulario verificada; aplicar el escenario deja el dictamen en
  verde. Ojo en arneses: ultimoResultado es `let` de script, no
  propiedad de window: leerlo con w.eval('ultimoResultado').
- PUBLICADA: commit d778434 (2026-11-12) y VERIFICADA EN VIVO por
  huella: Pages sirve sha256 807be37e…f966 = la copia local
  app-conectada/index.html probada (fcBuscarCorreccion y la URL del
  servidor dentro). Pendiente solo que Leonardo la pruebe en el
  teléfono (cerrar la pestaña vieja y reabrir con conexión) y sigue
  pendiente su registro primero como administrador.

## Fase 2 — Encaje territorial (2026-11-12)
- Tarjeta «🧭 Encaje territorial» bajo la de Ruta a factible (botón
  «Analizar encaje territorial», función fcEncajeTerritorial):
  cruza el estudio con su municipio usando SOLO datos reales —
  población del paquete (Censo 2022, pobDe/POB), el modelo de
  demanda de la propia app (estimarDemanda) y el plan municipal
  cargado por el usuario (compararPlan vía ultimoResultado.planComp).
  NO inventa prioridades municipales: sin plan cargado, la
  alineación queda «sin puntuar» y explica cómo cargarlo.
- Qué entrega: escala del proyecto vs demanda estimada (unidades
  del proyecto ÷ demanda del municipio: >1.3 sobredimensionado,
  0.45-1.3 ajustado, <0.45 holgado); alineación con el plan
  (nivel + aciertos/huecos de compararPlan); municipios de la
  MISMA provincia con más demanda estimada (escaneo con
  estimarDemanda cambiando muniSel y restaurando) con botón
  «Probar el estudio en X» (fcProbarMunicipio); lista «Qué puedes
  hacer» (bajar escala/fasear, mudarse de municipio, cargar el
  plan, huecos frente al plan, y sugerirSector(p,m) si demScore<45).
- El encaje viaja en el payload al guardar (payload.encaje).
- PRUEBAS (arnés jsdom /tmp/fc-smoke2.js): 8/8 — cafetería en
  Cifuentes (26 000 hab., demanda estimada 78 und/mes) con 660
  und/mes → sobredimensionado (ratio 8.46); alternativas Santa
  Clara (1 098), Caibarién (360), Remedios (266); sin plan lo dice;
  probar Santa Clara recalcula el estudio ahí; formulario siempre
  restaurado. Regresión Fase 1 tras el cambio: 7/7.
- PUBLICADA: commit e0ae826 (2026-11-12) y VERIFICADA EN VIVO por
  huella: Pages sirve sha256 3479a743…efc = la copia local probada
  (fcEncajeTerritorial y fcBuscarCorreccion dentro).
- Deuda honesta de la Fase 2: las líneas del plan de desarrollo
  POR municipio no existen como dataset descargable; hoy el encaje
  usa el plan que el usuario carga (documento real). Una v2 podría
  guardar en la base las prioridades extraídas de cada plan subido
  (por municipio) para reutilizarlas — requiere acción de servidor
  nueva; no pedida todavía.

## Fase 3A — Evaluación bancaria (2026-11-12)
La Fase 3 se partió en 3A (finanzas de banco), 3B (checklist
legal-ambiental + cronograma DL 327) y 3C (equipamiento itemizado,
plantilla por categorías, FODA, anexos). Hecha la 3A:
- Tarjeta «🏦 Evaluación bancaria» bajo la de Encaje, con campos
  propios (crMonto — precargado desde fCred del expediente si
  existe —, crTasa, crPlazo, crGracia, crVidaEq, crVidaLoc) y la
  función fcBancaria(): tabla de amortización mensual con gracia
  de solo intereses y cuota francesa tras la gracia, agregada por
  años (capital/intereses/servicio/saldo); DSCR por año = utilidad
  neta anual del estudio ÷ servicio del año (sin crecimiento,
  declarado en la tarjeta); veredicto bancario (≥1.20 sana,
  1.00-1.19 justa, <1 no cubre → sugiere menos monto/más plazo/
  más gracia o la Ruta a factible); B/C del año estabilizado =
  ingresos ÷ (costos variables + fijos + tributos) del propio
  motor; depreciación lineal de equipos y local convertida a CUP
  con la misma tasa del motor (monInv/tasaActiva) y utilidad tras
  depreciación. NO toca el dictamen: es capa de presentación.
- La evaluación viaja en el payload (payload.bancaria).
- PRUEBAS (arnés /tmp/fc-smoke3.js): 8/8 contra fórmulas
  independientes — crédito 600 000 al 12 %, 60 meses, 6 de gracia:
  cuota 14 434 exacta, servicio año 1 = 122 604 exacto, saldo
  final 0, DSCR y B/C (0.72 en el caso con pérdidas: honesto) y
  depreciación (4 479/mes) verificados; sin crédito lo dice y no
  inventa tabla. Regresiones: Fase 1 → 7/7, Fase 2 → 8/8.
- PUBLICADA: commit 394a823 (2026-11-12), VERIFICADA EN VIVO por
  huella: Pages sirve sha256 bebd3d07…394 = la copia local probada
  (fcBancaria, fcEncajeTerritorial y fcBuscarCorreccion dentro).

## Fases 3B, 3C, ACCESO EXCLUSIVO y 4 — PLAN COMPLETO (2026-11-12)
Leonardo ordenó «continúa con todas y me avisas cuando termines»:
se ejecutaron en cadena, cada una probada y publicada.
- 3B «📋 Trámites, ambiente y cronograma» (fcTramites): checklist
  de 8 trámites con estados (3 bloqueantes: ordenamiento
  territorial, objeto social, inscripción del actor), textarea de
  mitigación ambiental y veredicto de PRESENTABILIDAD separado del
  dictamen financiero (⛔ NO PRESENTABLE / 🟡 CONDICIONADO /
  ✅ SIN BLOQUEOS) + cronograma DL 327 (6 fases en meses, total y
  fecha estimada de arranque, barras). Persiste en localStorage
  (facticuba_tramites_v1) y viaja en payload.tramites.
- 3C «🧰 Detalle del expediente» (fcDetalle/fcEqAdd/fcAnAdd):
  equipamiento itemizado (costo/vida/origen; suma y depreciación
  del detalle; aviso si no cuadra ±5 % con invEquipos), plantilla
  por categorías (aviso si no suma numTrab), FODA en 4 textos y
  registro de anexos (tipo/descripción/estado, «X de Y listos»).
  Persiste en facticuba_detalle_v1 y viaja en payload.detalle.
  3B+3C: arnés 12/12; PUBLICADAS juntas en el commit 9d8620c,
  verificadas en vivo por huella (6c971a02…).
- ACCESO EXCLUSIVO (orden de Leonardo: «que nadie se registre por
  fuera; solo yo puedo usar la app»): servidor — register solo se
  acepta con Usuarios VACÍA y ping v2 informa registro_abierto;
  arnés del servidor 8/8 (el segundo registro queda rechazado con
  «El registro está cerrado…»). Redesplegado el 2026-11-12 como
  VERSIÓN 2 de la MISMA implementación (la /exec no cambió). App —
  fcPing consulta registro_abierto y fcCerrarRegistro() esconde el
  botón de registro y muestra «🔒 App de uso exclusivo de su
  dueño». CIERRE CONFIRMADO EN VIVO: Leonardo se registró primero
  («Confirmado», 09:49) y el ping real ya responde
  registro_abierto:false — la puerta quedó cerrada para todos los
  demás. El paso «registrarse primero» YA NO está pendiente.
- Fase 4 «📄 Documento de presentación» (fcDocConstruir/
  fcDocOficial): arma el estudio en las 9 partes oficiales
  (resumen ejecutivo, mercado, técnico, organización, legal-
  ambiental, cronograma, económico-financiero, evaluación/riesgos/
  sensibilidad, anexos) reutilizando motor + tarjetas de las fases
  1-3 (corrección, encaje, bancaria, trámites, detalle/FODA/
  anexos); lo no calculado se marca «Sin completar», jamás se
  inventa. Vista previa en pantalla (#docOficial) e impresión
  limpia con body.modo-doc (@media print oculta la app y deja
  solo el documento). Arnés 10/10 (con las regresiones de las
  fases anteriores en verde: batería total 53 chequeos ✔).
- PUBLICACIÓN FINAL: commit 547d16d (acceso + Fase 4), VERIFICADA
  EN VIVO por huella: Pages sirve sha256 acb1be8d…9f6 = la copia
  local probada, con los 7 módulos dentro (F1, F2, F3A, F3B, F3C,
  F4 y acceso). EL PLAN DE MEJORAS QUEDÓ COMPLETO.
- Sigue pendiente (menor, de la conexión app↔base):
  Configuracion.servidor_url vacía y estado_conexion_app =
  PENDIENTE en la hoja (la app no los lee).

## Documentos que rellenan solos + respaldo por internet (2026-11-12, commit ea16252, huella 587a9a70…)
- Módulos al final de app-conectada/index.html: fcExtraProyecto (financiamiento,
  plantilla número-primero + tamaño, fuentes de combustible, monedas),
  fcExtraPlan (restricciones clasificadas a eRest*, metas a eMetasPlan y
  lineamientos a eLineam sustituyendo el texto de fábrica intacto, aviso de
  territorio distinto) y fcRespaldoInternet (salario/alquiler/precio informal
  vía URL_ESPEJO_BUSCAR, mediana de fuentes, marca VERIFICAR, blanco si nada).
- Reglas: nunca pisar valores del usuario; todo editable; arneses fc-smoke7
  (15/15) y fc-smoke8 (8/8).

## SIN IA: datos solo de búsquedas web reales (2026-11-12, commit 7e76385, huella d557c3fc…)
- Gemini (eda0c47) y Pollinations (e0d7584) se integraron y se RETIRARON el
  mismo día por orden final de Leonardo: nada de IA en la app.
- fcRespaldoInternet reescrito: por cada dato faltante (salario, alquiler,
  precio informal) — espejo /buscar con 2 consultas (mediana de valores
  etiquetados), Wikipedia para el salario (srcWikiEspejo/wikiBuscar) y
  Revolico-espejo para el precio informal (mediana de anuncios vía aCUP).
  Marca «Web (fuentes) — VERIFICAR»; sin dato claro → blanco.
- Esa noche quitó también las claves de Brave Search y Tavily: campos,
  braveBuscar/tavilyBuscar, webKeys/webKeysSave y textos eliminados
  (commit fbbb4d0, huella 0cbd8254…). La app quedó SIN NINGUNA clave:
  búsqueda 100 % web abierta (espejo + Wikipedia + Revolico).
- Limpieza única facticuba_sin_claves_v1: removeItem de toda la bolsa
  facticuba_webkeys_v1.
- Arneses: fc-smoke11 8/8, fc-smoke12 6/6, fc-reg.js 4/4. En vivo: 0
  rastros de IA ni de claves.


## Factibilidad integral 2026 (2026-11-12, commit f69dbb7, huella 4044edaf…)
- Módulo `fcIntegralCalc/fcIntegralRender/fcIntSet` (tarjeta #intCard antes
  de #docCard; estado localStorage facticuba_integral_v1; viaja como
  payload.integral — la línea del save quedó parcheada).
- Modalidad automática: fCoopIED>0 → «plan» (el documento se titula Plan
  de negocio con nota de las Transformaciones 2026); si no → «fact».
  Override manual en la tarjeta.
- Social /100: empleos (plantilla o numTrab), salario proyecto (nómina ÷
  empleos) vs salMedio territorial, beneficio directo según sector, plan
  municipal (planComp/_planMun), encadenamiento (eEncad/eAporte).
- Ambiental /100: base por riesgo del sector + Licencia Ambiental y
  desechos de window._tramites + mitigación + renovables (select).
- Vivienda (sector Construcción o texto con vivienda/inmueble): normas
  Ley 187/2026 + Decreto 176/2026; control de m² (intM2) vs mínimo 25
  (art. 12); zona especial (intZona) → arts. 271-272 (+ impacto
  patrimonial si IED). Documento: parte 10 con veredicto integral.
- Fuentes: MEP/ACN/Radio Progreso (plan de negocio, 7 días, silencio
  positivo), Gaceta 86/2026 (Ley 187 + Decretos 176-178), Res. Conjunta
  1/2022 MINCEX-MEP, DL 327/2014, Ley 150/2022, Res. CITMA 132/2009.
- Arnés fc-smoke13: 14/14; regresión fc-reg.js: 4/4.


## Lectura de documentos corregida (2026-11-12, commit bc44a87, huella e91a10ba…)
- Causa raíz: extraerDocx unía todos los <w:t> con espacios (sin párrafos
  ni tablas). Ahora conserva estructura: </w:tc>→' | ', </w:tr> y </w:p>→
  salto de línea, entidades completas.
- Módulo fcDocPro (envuelve analizarDocFull/aplicarDocFull):
  · Guardias: se borra de hh.vals todo número cuya evidencia sea sección/
    epígrafe numerado/decreto (n/20XX)/año, y todo % sin símbolo % tras
    el número (imp*, cuotaInformal, depImp, eSust).
  · Territorio por frecuencia de menciones en PROV_MUN (con descuento de
    «Playa Girón/Larga»); sector ponderado (encabezado ×1.6+2); actor
    'pdl' si «desarrollo local» ≥3 y hay CAM; nombre = primer «...».
  · Textos por secciones (seccion()): Objetivo general→eObj, Línea 3/
    encadenamiento→eEnc, Impacto esperado→eApo, Resumen ejecutivo→desc.
  · Rango «entre A y B empleos» → eEmpleos = punto medio.
  · plantillaDeTabla: dos formatos (fila en una línea con |, o celda por
    línea con '|' inicial); mapea puestos→{dir,tec,ope,adm,ser} y escribe
    facticuba_detalle_v1.plantilla(+Total), numTrab y aviso en hallBox.
  · Renovables (paneles solares) → integral renov='parcial'; línea de
    residuos → #tramMitiga + fcTramites().
- Prueba de oro: arnés fc-doc2.js con la propuesta real de Leonardo
  (PDL «Sabores de la Ciénaga», Ciénaga de Zapata) = 16/16; regresiones
  fc-reg 4/4, fc-smoke13 14/14, fc-smoke11 8/8.
- Nota de arnés: jsdom necesita polyfills de streams (Blob.stream,
  DecompressionStream y Response de Node) para extraerDocx.


## Limpieza + Redactor profesional (2026-11-13)
- LIMPIEZA (d6885c3 / 79967d22): 47 campos sin datos de ejemplo (place-
  holders «Ej.:»), riesgos sin puntuación de fábrica (rP/rI sin selected
  → 1), eLineam/eMetasPlan vacíos (esFabrica ya trataba vacío como
  fábrica), FUERA redactarIA/redactarConFuentes (plugin IA inexistente).
  Impuestos y supuestos se quedan (legales/declarados).
- REDACTOR (f158733 / d130cbee): módulo fcRedactor, botón #fcPropBtn en
  docCard → window.fcRedactar() genera la propuesta completa (overlay
  #fcPropOverlay imprimible) con estructura DL 174 + Res. Conjunta 1/2022
  + formato PNUD. Datos reales o [A COMPLETAR] con % de completitud.
  Campos del motor: R.ingresos, R.und, R.utilNeta, R.margen, R.e5.filas6
  {y,ing,netOp,capex,net}, R.tir fracción; fcIntegralCalc → {social,
  ambiental, veredicto}; _tramites.fases {n,ini,fin}; _planMun.metas[].
- Arneses PERSISTENTES: ~/workspace/facticuba-online/arneses/ (fc-reg,
  fc-doc2, fc-smoke14, fc-smoke15). /tmp se limpia en reemplazos de VM:
  NUNCA dejar arneses solo en /tmp. jsdom: typeof de globales léxicos se
  comprueba con w.eval('typeof X'), no con w.X.
- Módulo fuente del redactor: redactor-modulo.html en facticuba-online/.


## Aprendizaje diario (2026-11-13, commit 599da73, index 0badd845)
- conocimiento.json en la RAÍZ del repo (y copia fuente en
  facticuba-online/conocimiento.json): {version, actualizado,
  entradas[{fecha,tipo,titulo,resumen,fuente,fuenteUrl,aplica}],
  parametros{fideicomiso_pct:4, pdl_tope_contratados:100,
  pdl_duracion_max_anios:5, pdl_evaluacion_semestral:true,
  ied_evaluacion_dias:7, ied_silencio_positivo:true,
  vivienda_m2_minimos:25, certificacion_catastral_anios:5}}.
- fcAprende: fetch(conocimiento.json, no-store) al abrir + setTimeout
  2500; render en #aprendCard tras la tarjeta «Plataforma de operación»;
  caché localStorage facticuba_conocimiento_v1 (respaldo offline);
  window._fcConocimiento global. El REDACTOR lee fideicomiso_pct de ahí.
- Agente: cron «facticuba-estudio-diario» (diario ~06:47, owner
  goal:facticuba-feasibility-studies). Solo datos; código = propuesta
  en este handoff (sección «Propuestas del agente de estudio») +
  aviso; silencio si no hay novedades. Arnés fc-smoke16: 5/5.


## Agente de Autollenado (2026-11-13, commit 699d6ea, huella c07fce48)
- Tarjeta #agenteCard antes de «Opción B»; window.fcAgenteAuto() orquesta:
  caché autodatos → sincronizarTasas → aplicarDemanda → fcRespaldoInternet
  (SIN callback: promesa; recoge valores resultantes) → buscarPrecios
  (input #precioQuery; mediana → precio) → ingMed:=salMedio →
  invEquipos:=Σ detalle.equipos. Informe en #agenteBox con fuentes.
- Regla anti-pisado: listener 'input' global marca dataset.fcManual;
  vacio() exige vacío y no-manual; el respaldo restaura manuales.
- Caché facticuba_autodatos_v1 {prov|muni|sector: {ts, datos}} 7 días.
- Arnés fc-smoke17 (10/10) emula el espejo /buscar?q= con JSON.


## Aprendizaje AUTÓNOMO (2026-11-13, commit 9d4d0c0, huella f34fd8cb)
- El cron de Slipknot «facticuba-estudio-diario» fue ELIMINADO por orden
  de Leonardo (no depender de Slipknot ni de sus tokens): definición
  borrada y estado disabled; nunca llegó a correr.
- fcVigia (en la app): revisión al abrir (throttle 6 h), consultas
  rotativas al espejo /buscar, regex de norma + palabras clave del
  dominio, deduplica contra conocimiento.json y contra sus candidatas;
  guarda en localStorage facticuba_vigia_v1 y pinta #vigiaBox dentro de
  #aprendCard como «sin verificar». Parámetros intactos siempre.
- Aprendiz.gs (servidor/): agente diario en el Google del negocio vía
  trigger de Apps Script + API de GitHub (token suyo, solo FactiCuba).
  ACTIVADO por Leonardo el 2026-11-13 (confirmado por él; base en
  vivo idéntica a la semilla tras su corrida de prueba). Al activarlo, las candidatas entran directo en
  conocimiento.json marcadas VERIFICAR.
- Arnés fc-smoke18: 7/7. La tarjeta de aprendizaje ya no menciona a
  Slipknot como mantenedor.


## Base en Sheets + Consola de agentes (2026-11-13)
- Servidor v4 en vivo (misma /exec; ping → version 4): pestañas nuevas
  Conocimiento, Parametros, Agentes_Log, Autodatos, Eventos (se crean
  solas). Webhook público con clave (parámetro webhook_clave, nunca se
  expone por parametros_get). Flujos: estudio guardado → traza +
  aprende autodatos; resumen diario por correo = instalarFlujos()
  (opcional, un clic de Leonardo en el editor del servidor).
- App (c24e486): fcConsola — Orquestador (Function Calling sobre
  fcAgenteAuto/fcVigiaEstudiar/sincronizarTasas/fcRedactar), RAG sin IA
  (fcRAG + anexo en la propuesta), fcSyncNube (la hoja manda:
  conocimiento fusionado y parámetros sobrescritos), actividad visible.
- Arneses: fc-server4 18/18, fc-smoke19 11/11. Lección: todo fcApi
  «dispara y olvida» lleva .catch o un rechazo de red tumba la página
  en entornos estrictos.


## Precios vivos (2026-11-13, app 3e836a4 / servidor v5)
- Causa del «sin precios»: consulta larga a Revolico + _precios.mediana
  inexistente. Motor nuevo fcMedianaProducto (consultas cortas por
  producto, ≥3 anuncios, mediana) y fcPreciosVivos (refresco al abrir
  y al cambiar territorio/sector si >12 h; refInformal sigue al
  mercado; precio solo si vacío; fcManual intocable).
- Compartido por Autodatos (precioInformal) y re-preciado a diario
  por el servidor v5 (preciosDiarios, agente PreciosServidor) cuando
  Leonardo ejecute instalarFlujos() en el editor del servidor.
- Arneses fc-smoke20 (9/9) y fc-server5 (4/4).


## Metodología del consultor (2026-11-13, commit 942a8ff)
- Texto completo: METODOLOGIA-CONSULTOR.md (proyecto) + entrada
  «metodologia» en conocimiento.json.
- fcMetodo: fcPrioridades (6 prioridades /100), fcEscenarios
  (Pesimista/Base/Optimista con VAN/TIR desde e5 + PRI descontado),
  anexo en la propuesta; recálculo automático al generar el informe.
  Arnés fc-smoke21: 8/8.


## Vista por pestañas (2026-11-13, commit 8535224)
- fcPestanas: tarjeta «📑 Tu estudio, en orden» (antes de metodoCard)
  con 5 pestañas que re-presentan los objetos calculados
  (_encaje/_bancaria/_tramites/_integral/_prioridades/_escenarios)
  sin tocar el motor. Auditoría de faltantes: window.fcFaltantes()
  por apartados + botón «Ir al campo». Arnés fc-smoke22: 10/10.


## Datos vivos ampliados (2026-11-13, commit 146f0b3)
- Hallazgo: pe*/pi* de combustible jamás se llenaban (placeholder
  «Se sincroniza solo» sin código). fcDatosVivos llena: combustible
  estatal (web CUPET), informal (mediana Revolico), refFormal del
  producto (web, VERIFICAR) y equipos sin precio (#eqBody →
  fcDetalle → invEquipos). Auto al abrir/cambiar territorio/sector
  (caché 6 h) y tras el Agente de autollenado. Arnés fc-smoke23 10/10.
- Ojo: srcRevolicoEspejo → array; fetchTexto → {txt, via}.
