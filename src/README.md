# FactiCuba — Estudio de Factibilidad de Negocios en Cuba (En vivo)

SPA de página única (`index.html` + `main.pjs`), datos 100% en vivo (BCC, elToque, Revolico, Wikipedia) + espejo propio en Cloudflare.

## Estructura
- `index.html`: toda la app (CSS + HTML + JS). Estilo dashboard, responsivo (móvil 390px verificado sin overflow).
- `main.pjs`: solo `$meta` (título, descripción, tags).

## Flujo
1. **Territorio y actor**: 16 territorios (15 provincias + Isla de la Juventud) → 168 municipios en cascada. Ficha con demanda, conectividad ETECSA/pagos, déficit energético, transporte, densidad + criterio local (polos turísticos, puertos, rural/montaña, Isla). Actor: PDL (vigencia 5 años), MIPYME privada/estatal (micro/pequeña/mediana), TCP, CNA. Monedas CUP/USD/MLC/EUR (base de cálculo: CUP).
2. **Divisas formal vs. informal**: tasa formal BCC Segmento III, informal elToque y manual; selector por divisa. **Sincronización en línea**: al detectar internet (carga, evento `online`, botón 📡, throttle 6 h) actualiza informal desde la **API oficial elToque con token** (`tasas.eltoque.com/v1/trmi`, token gratuito guardado solo en el navegador) con fallback a scraping web, formal desde `api.bc.gob.cu`, y **turismo ONEI** (visitantes internacionales/mes) en segundo plano. **«Pegar texto»** alternativo con parsers de tasas + ONEI. Los valores quedan editables a mano como respaldo.
3. **Asistente automático por municipio**: población estimada de los 168 municipios (Censo 2022/ONEI) + visitantes mensuales por polo/cabecera. Readout en vivo (vecinos + turismo → ventas/mes), sector sugerido por tipo de territorio, botón "Aplicar demanda" y "Generar ejemplo realista" (precio, plantilla, salarios, alquiler, combustible y formato pleno/reducido/hogar según escala).
3. **Precio del producto formal vs. informal**: precio estatal de referencia + precio de la calle + comparador en vivo (ingresos, utilidad, margen en cada escenario) y aviso de posicionamiento. El informe muestra su precio como % del informal.
3-bis. **Lector total de documento (Opción A)**: al subir PDF/TXT/DOCX, `analizarDocFull` extrae ~35 campos (inversión desglosada o total, precio, cvu, capacidad, ocupación, plantilla, salarios, socios, fijos, precios formal/informal, tributos ONAT, crecimiento, inflación, combustibles, competencia, energía, pagos, moneda de inversión, sector por palabras clave, territorio entre los 168 municipios, actor, nombre y objetivos) y `aplicarDocFull` los rellena automáticamente con tabla de evidencias (campo → valor → fragmento del documento). Todo editable.
3-ter. **Plan municipal (comparador)**: suba el plan de la economía del municipio (misma lectura PDF/TXT/DOCX) o pulse «Buscar plan en línea» (búsqueda web real por provincia + municipio, o Wikipedia si el espejo aún es v1). `compararPlan` cruza sector priorizado, empleo, restricción energética, sustitución de importaciones y turismo, y dictamina ALINEADO / CON AJUSTES / DESALINEADO con evidencias. El informe técnico y el cliente incluyen la sección «Plan municipal: coherencia». Guardados, nube y enlace conservan el plan compacto.
4. **Datos**: Opción A archivo local (.txt directo, .docx con parser ZIP propio + `DecompressionStream`, .pdf best-effort por literales Tj; escaneados sin texto avisan) que prerrellena el formulario; Opción B formulario guiado (inversión, fijos, cvu, precio, capacidad, ocupación, nómina, tributos editables, supuestos, energía, pagos).
5. **Combustible formal vs. informal**: gasolina, diésel, gas licuado y kWh de planta, cada uno con cantidad/mes, precio estatal, precio informal y selector de fuente; el total se suma solo a los fijos del informe.
6. **Informe técnico**: 4 bloques + tributos ONAT, punto de equilibrio, **serie mensual a 36 meses con arranque gradual 40/60/80%** (checkbox), PRI por serie mensual, VAN 12%, **TIR**, **sensibilidad** (precio ±10%, ocupación −15pp, costos +10%), **confianza de datos 0-100** (documento, tasas sync, demanda auto, precio en rango, ocupación prudente), matriz de riesgos y dictamen (🟢/🟡/🔴).
7. **Informe cliente (PDF formal)**: botón 📄 genera documento entregable con portada (código FC + confidencial), resumen ejecutivo, metodología, supuestos y fuentes, flujo mensual del año 1, proyección 3 años con gráfico de barras, sensibilidad, riesgos, condiciones, limitaciones y firmas. Vista previa en pantalla e impresión limpia (solo el documento).
8. **Guardados**: `localStorage` (`facticuba_estudios_v1`), abrir/borrar; **Imprimir/PDF** vía `window.print()` con hoja limpia (`@media print`).
9. **Fusión app adjunta (2026, online-first)**: API token elToque + fallback scraping/pegar, ONEI en segundo plano, escenarios turísticos ×1/×2.5/×5, brecha informal/oficial, ajuste territorial manual por municipio, frecuencia/ingreso medio/dependencia importada/insumos informales+ sobreprecio/reposición en divisas, escala progresiva ONAT, comparación oficial-vs-informal del modelo completo, auto-recálculo en vivo, pdf.js lazy (CDN) para PDFs, redacción con IA y compartir por enlace. Geo propia (la del adjunto tenía errores).
10. **Investigación web real + IA fundamentada (2026)**: paso 2, sección «🔎 Investigación web real». Wikipedia ES (sin clave, vía `superFetch`), Brave Search y Tavily (claves opcionales guardadas solo en el navegador, LS `facticuba_webkeys_v1`) + «Traer URL» (ONEI/BCC/elToque/prensa) con extracción de texto local. Resultados con fuente + título + extracto + enlace + fecha (`window._web`, persistido en `facticuba_research_v1`); «🧠 Redactar con fuentes» genera la descripción con `generateText` usando SOLO esos textos como contexto, con citas [1],[2] y sin inventar cifras (los números los calcula el motor). El informe técnico añade la sección «🌐 5 · Fuentes web reales» y el documento cliente la lista en «Supuestos y fuentes»; guardados y enlace compartido (payload v2) conservan las fuentes. Los cálculos del motor nunca se interrumpen.
11. **Precios reales de mercado + rentabilidad (2026)**: paso 2, «🔎 Precios reales de la calle (Revolico + web)». Anuncios reales de Revolico (título + precio + moneda, vía `superFetch`) más precios extraídos de la investigación web, convertidos a CUP con las tasas activas, filtrados por banda de relevancia (0,15×–12× su precio, ordenados por cercanía) y con utilidad/margen por fila calculados con SUS costos. «Usar» / «Usar mediana» lleva el valor al precio informal y recalcula comparador e informe. El ejemplo automático lanza la búsqueda con la palabra de tu sector; el informe añade «🏷️ Precios de mercado vs. su precio» y el cliente la mediana + % vs. su precio (LS `facticuba_precios_v1`, guardados y payload v3).
12. **Conexión y diagnóstico (2026)**: «📡 Actualizar tasas en línea» usa acceso directo + proxy `superFetch` (BCC Seg. III, elToque web o API con token, ONEI en 2º plano). Si todo falla, el error explica la causa y «Pegar texto» sirve de respaldo manual. Botón «🔧 Probar conexión» en Fuentes avanzadas: informa internet, proxy cargado sí/no, acceso directo y prueba proxy→BCC y proxy→elToque paso a paso. OJO: el enlace público ejecuta la última versión GUARDADA; si el diagnóstico dice «proxy NO cargado», guarda el generador en el editor para publicar el código actual y recarga.
13. **Espejo propio de tasas y mercado (2026, vía primaria)**: Worker Cloudflare `facticuba-tasas` (`src/espejo/worker.js`, verificado en vivo) que lee BCC + elToque + Revolico + Wikipedia en el servidor y sirve `/tasas`, `/revolico?q=` y `/wiki?q=` con CORS abierto y caché de 5 min. La app lo consulta primero (petición directa, sin proxy ni token); si falla, usa token/scraping/BCC y vías directas. Parsers endurecidos (Plan B sobre tabla visible, validación de errores de la API token, fechas con fallback) y caché local con tope de 7 días. Despliegue: Cloudflare Dashboard → Workers y Pages → Crear → pegar `src/espejo/worker.js` → Implementar; la URL base va en `URL_ESPEJO`.
14. **GitHub Pages / hosting estático (2026)**: `web-standalone/index.html` (+ `.nojekyll`) es la misma app en documento HTML completo, sin `root` ni plugins: `ES_PAGES` activa el modo autónomo (tasas y precios por el espejo, Wikipedia directa, IA con aviso, compartir por enlace `#e=` con los datos en el hash y restauración al abrir). Suba el contenido de `web-standalone/` a la raíz del repo y active Pages. Tras republicar el worker con `/revolico` y `/wiki`, la versión estática conserva búsqueda de precios e investigación; sin republicar, esas dos vías usan el fallback directo.

## Reglas de dictamen (resumen)
- 🔴 si utilidad neta ≤ 0, margen contribución ≤ 0, equilibrio > capacidad, PRI > 60 meses o infinito, margen < −3%.
- 🟡 si margen < 12%, PRI > 30, equilibrio > 85% capacidad, riesgo ≥ 60 o sin respaldo con déficit ≥ 4.
- 🟢 en otro caso con margen ≥ 15% y PRI ≤ 30.

## Paso 5 · Expediente formal 2025-2030 (6 secciones)

Nueva pestaña «5 · Expediente 2025-2030» con las 6 secciones obligatorias del estudio hasta 2030.
Todo editable y en vivo, y se integra solo al informe técnico y al documento cliente:

1. **Resumen y alineación nacional**: objetivo general, aporte territorial, empleos, % sustitución
   de importaciones, encadenamientos y texto editable de alineación con los Lineamientos 2021-2026
   y el Plan de la Economía 2025-2026.
2. **Marco de referencia y diagnóstico**: metas del Plan 2025-2026 (editable), crecimiento e
   inflación de referencia, turismo ONEI (0 = automático) y 4 restricciones sectoriales
   (divisas, energía, logística, regulatoria).
3. **Programas (4 ejes)**: P1 Infraestructura, P2 Operaciones, P3 Capital humano, P4 Tecnología —
   descripción, responsable e hito por programa.
4. **Presupuesto y financiamiento 2025-2030 (CUP)**: matriz 4 programas × 6 años + 5 fuentes
   (autofin CUP, autofin divisas, crédito BANDEC/BPA, territorial/PDL-CAM, cooperación/IED).
   Botón «Repartir» copia la inversión inicial del paso 2 en 2025 (40/30/10/20).
   Brecha = plan − fuentes (debe quedar en 0 antes de firmar).
5. **Evaluación 2025-2030 (automática)**: serie mensual a 72 meses con el mismo motor del paso 2,
   CAPEX anual de la matriz, VAN con tasa editable, TIR a 6 años y PRI. Nota: el flujo 2025 ya
   descuenta el CAPEX; si se usó «Repartir», ese CAPEX contiene la inversión inicial.
6. **Riesgos y mitigación**: 5 filas (monetario, logístico, energético + 2 libres) con
   probabilidad × impacto, nivel, costo de mitigación y responsable. La reserva total se suma al colchón.

Guardados y enlace compartido incluyen los 78 campos del paso 5 (`snapInputs` extendido).

## Espejo propio (worker v2) — Cloudflare

`src/espejo/worker.js` (v2): `/tasas` (BCC Seg. III **todas las divisas** + elToque con fecha),
`/revolico?q=` (anuncios reales con título, precio, moneda, **URL del anuncio y fecha**,
3 patrones de parseo), `/wiki?q=`, **`/buscar?q=`** (búsqueda web sin claves:
Wikipedia + DuckDuckGo) y **`/turismo`** (puntos históricos reales de turismo en Cuba,
Wikipedia EN, con URL y fecha de consulta). CORS abierto, caché 5 min, sin claves.

**Despliegue:** Cloudflare Dashboard → Workers y Pages → Crear → pegar
`src/espejo/worker.js` → Implementar. La app detecta sola si el worker publicado aún es
v1 y usa los fallbacks (scraping directo, Wikipedia) sin romperse.

## Notas
- Estimaciones de prefactibilidad: validar con contador, ONAT municipal y Dirección de Economía y Planificación (objeto social, licencias sanitarias).
- Sin `alert`/`confirm` nativos (bloquean el preview); borrado total con doble clic.
- Tablas del informe envueltas en `.tblwrap` (scroll horizontal en móvil); grid con `min-width:0` anti-blowout.
- **Moneda de la inversión**: el bloque de inversión inicial tiene el desplegable `Moneda en que tiene la inversión` (CUP/USD/EUR/MLC). Si elige divisa, el motor convierte a CUP con la tasa activa del paso 1 (`invInicialCUP()`) y lo muestra en el aviso bajo el bloque; los ejemplos automáticos trabajan en CUP.

## Acceso (login) — ACTUALIZADO 2026-11-12

El acceso ya NO vive en el código: la app se autentica contra el servidor
Apps Script de la base «FactiCuba DB» (huellas SHA-256 con sal en la
pestaña Usuarios, sesiones por token con solo su huella en Sesiones,
bloqueo tras 5 intentos fallidos). El primer usuario que se registra
desde la propia app queda como administrador; el resto, como cliente.
La tarjeta de acceso y la barra superior muestran el indicador de la
base (verde = servidor alcanzado, rojo = sin conexión, ping real al
/exec y cada 60 s). Los estudios se guardan también en la base
(Estudios + Entradas_JSON por partes) y la copia local queda de caché.
La credencial que traía el paquete quedó RETIRADA del código.

## Financiamiento con préstamo (2026-11-13)
- Sin estudios de precios: eliminados el bloque formal-vs-informal, el comparador
  de escenarios de precio, la búsqueda de precios (Revolico + web) y sus secciones
  en el informe técnico y el documento cliente.
- Paso 2, «Financiamiento: préstamo necesario y otorgado»: recursos propios (CUP),
  préstamo necesario auto = inversión inicial total en CUP − propios (mín. 0),
  y préstamo otorgado por el banco (editable). Aviso en vivo: cubierto / faltante.
- La confianza de datos usa la cobertura del préstamo en vez del rango de precios.
- Informe técnico (💰) y documento cliente incluyen la tabla del préstamo.

## Palanca formal/informal (2026-11-13)
- Paso 2: interruptor Formal/Informal + precios de referencia. La palanca fija
  el precio de venta del estudio (editable a mano después). El informe y el
  documento cliente declaran el escenario usado.

## Correcciones 2026-11-13 (territorio, formato, origen)
- detectarTerritorio por puntos: "Playa Girón" ya no se confunde con el municipio
  Playa (gana mención explícita de municipio, nombre compuesto y provincia citada).
- Si el usuario ya eligió provincia/municipio, el documento no lo sobrescribe.
- Informe técnico con formato de documento formal (portada, secciones, firmas),
  igual que el informe cliente.
- Trazabilidad: el informe declara origen (documento / estimación automática /
  manual) y la ficha municipal lleva etiqueta de estimación automática.

## Informe ONEI (2026-11-13)
- Paso 2, como el Plan municipal: zona para subir el informe/anuario ONEI
  (PDF/TXT/DOCX). Extrae población, visitantes (anual→mensual), ocupados,
  salario medio y producción (con miles/millones).
- Solo se aplica si el informe es del municipio seleccionado; si no, avisa.
- Alimenta la demanda estimada, el informe técnico (sección ONEI), el cliente
  (fila ONEI en supuestos) y se guarda en guardados/enlace.

## Plan de mejora (2026-11-14)
- Paso 3, tarjeta «🛠️ Plan para hacerlo factible y mejorar lo flojo».
- Diagnostica aspectos con puntaje bajo (mercado, operativa, financiera,
  riesgos, confianza, equilibrio, préstamo, plan municipal, ONEI).
- Si el dictamen no es 🟢, calcula con el motor real la ruta mínima a verde
  (precio hasta el referente de calle, cvu, fijos, ocupación, capacidad,
  inversión por fases, plantilla) + alternativa; si es 🟢, propone
  optimización para subir margen y corregir lo flojo.
- Plan de acción 90 días (0–30 / 30–60 / 60–90) con responsable, costo e
  indicador; botón «Aplicar este escenario» lleva los valores al formulario.
- Viaja con el informe técnico, el documento cliente (sección 9), guardados,
  nube, compartido y enlace local.

## Presentación para funcionarios (2026-11-14)
- Paso 3, botón «Presentación funcionarios»: documento de 7 láminas para
  defender el proyecto ante quienes lo aprueban (CAM/banco).
- Portada con dictamen, KPIs y código; 1) lo que gana la comunidad (empleos,
  masa salarial, aporte fiscal, sustitución de importaciones, oferta local);
  2) factibilidad con números (equilibrio, utilidad, VAN/TIR/PRI, 3 años);
  3) alineación país/municipio/ONEI; 4) operativa que no se para;
  5) riesgos bajo control + plan de mejora; 6) qué se solicita y compromisos
  con firmas; todo con datos del estudio y tono profesional.

## Territorio por defecto (2026-11-14)
- Arranque siempre en Matanzas → Ciénaga de Zapata (paso 1 y cada vez que se
  elige Matanzas). El usuario puede cambiarlo; el documento solo lo
  sobrescribe si aún no se tocó el territorio.

## Mercado informal como base única (2026-11-14)
- Todo el motor calcula con tasas informales (elToque): USD/EUR/MLC usan la
  columna informal; el ajuste por brecha formal quedó desactivado (factor 1).
- Selectores de uso bloqueados en «informal»; la columna formal BCC queda
  solo como referencia y se eliminó la comparación oficial-vs-informal del
  informe. Informes, cliente y presentación declaran tasa informal.
- NOTA: el enlace público ejecuta la última versión GUARDADA; tras estos
  cambios hay que guardar el generador en el editor para publicar el código
  actual.

## Marcas rojo/amarillo + lenguaje claro (2026-11-14)
- Al generar el estudio, los campos que deben cambiar se marcan en rojo en
  el formulario y el informe trae la tabla «Para que sea factible debe
  cambiar» (aspecto, campos y qué hacer).
- Al aplicar una ruta del plan de mejora, los campos modificados quedan en
  amarillo para explicarlos al dueño del proyecto (limpiar plan quita el
  amarillo).
- Informe técnico con «En palabras simples» y «Por qué importa aprobarlo»
  (empleos, aporte fiscal anual, oferta local) para lectores no técnicos.
