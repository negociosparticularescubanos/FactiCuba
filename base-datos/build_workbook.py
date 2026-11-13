#!/usr/bin/env python3
"""Construye FactiCuba_DB.xlsx: base para convertir a Google Sheets.
Reglas aplicadas: sin contraseñas en claro (solo huellas), sesiones por
token_hash, imágenes/documentos solo como metadatos + URL de Drive,
auditoría, moneda base CUP y metodología completa de factibilidad.
"""
import json, re
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path.home() / "workspace/facticuba-online"
html = (ROOT / "index.html").read_text(errors="ignore")
OUT = ROOT / "base-datos/FactiCuba_DB.xlsx"

def extract_obj(name):
    i = html.index(f"const {name}")
    i = html.index("{", i)
    depth = 0; in_str = False; esc = False
    for j in range(i, len(html)):
        c = html[j]
        if in_str:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': in_str = False
        else:
            if c == '"': in_str = True
            elif c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0: return json.loads(html[i:j+1])
    raise ValueError(name)

PROV_MUN = extract_obj("PROV_MUN")
POB = extract_obj("POB")
SECT = {}
for _m in re.finditer(r'"([^"]+)":\{precio:([0-9.]+),cv:([0-9.]+),pen:([0-9.]+),capt:([0-9.]+),eq:([0-9.]+),upw:([0-9.]+),nom:"([^"]+)"\}', html):
    SECT[_m.group(1)] = {"precio": float(_m.group(2)), "cv": float(_m.group(3)), "pen": float(_m.group(4)), "capt": float(_m.group(5)), "eq": float(_m.group(6)), "upw": float(_m.group(7)), "nom": _m.group(8)}
ACTOR = {}
for _m in re.finditer(r'(pdl|mipyme_priv|mipyme_est|tcp|cna):\{n:"([^"]+)",util:([0-9.]+),ventas:([0-9.]+),msg:"([^"]+)"\}', html):
    ACTOR[_m.group(1)] = {"n": _m.group(2), "util": float(_m.group(3)), "ventas": float(_m.group(4)), "msg": _m.group(5)}

NAVY = "17365D"; BLUE = "2F5597"; GREEN = "375623"; ORANGE = "7B4B12"; PURPLE = "4F3866"; RED = "7A1F1F"; GREY = "595959"
HDR_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=10)
HDR_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)
THIN = Border(bottom=Side(style="thin", color="BFBFBF"))

wb = Workbook()
wb.remove(wb.active)

TABLE_COLORS = {}
def add_table(name, headers, rows=None, color=BLUE, widths=None):
    ws = wb.create_sheet(name)
    TABLE_COLORS[name] = color
    ws.append(headers)
    for c in range(1, len(headers)+1):
        cell = ws.cell(row=1, column=c)
        cell.font = HDR_FONT; cell.fill = PatternFill("solid", fgColor=color); cell.alignment = HDR_ALIGN
    ws.row_dimensions[1].height = 32
    for row in rows or []:
        ws.append(list(row))
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{max(1, ws.max_row)}"
    for idx, h in enumerate(headers, 1):
        w = (widths or {}).get(h, min(34, max(13, len(h)+3)))
        ws.column_dimensions[get_column_letter(idx)].width = w
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=len(headers)):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=isinstance(cell.value, str) and len(cell.value) > 55)
            cell.border = THIN
    ws.sheet_properties.tabColor = color
    return ws

# ---------------- Panel (no es tabla) ----------------
panel = wb.create_sheet("Panel")
panel.sheet_properties.tabColor = NAVY
panel.column_dimensions["A"].width = 34; panel.column_dimensions["B"].width = 92
panel.merge_cells("A1:B1"); c = panel["A1"]; c.value = "FactiCuba — Base de datos de estudios de factibilidad"
c.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=NAVY); c.alignment = Alignment(horizontal="center", vertical="center"); panel.row_dimensions[1].height = 34
info = [
    ("Estado de la base", "CREADA — pendiente de conectar la app mediante un servidor Apps Script (la app debe comprobar el servidor real y mostrar el indicador verde/rojo)."),
    ("Versión de estructura", "1.0 · 2026-11-12"),
    ("Cuenta destino", "negociosparticularescubanos@gmail.com"),
    ("Sitio publicado", "https://negociosparticularescubanos.github.io/FactiCuba/"),
    ("Moneda base", "CUP (toda conversión guarda moneda original, tasa, fecha y fuente)"),
    ("Horizonte", "36 meses en el estudio estándar; expediente formal 2025-2030 = 72 meses"),
    ("Estudios registrados", "=COUNTA(Estudios!A2:A100000)"),
    ("Usuarios registrados", "=COUNTA(Usuarios!A2:A100000)"),
    ("Dictámenes emitidos", "=COUNTA(Dictamenes!A2:A100000)"),
    ("Acciones de mejora", "=COUNTA(Plan_Mejora!A2:A100000)"),
    ("Municipios cargados", "=COUNTA(Territorios!A2:A100000)"),
]
r = 3
for k, v in info:
    panel.cell(row=r, column=1, value=k).font = Font(bold=True, color=NAVY)
    cc = panel.cell(row=r, column=2, value=v); cc.alignment = Alignment(wrap_text=True, vertical="top"); panel.row_dimensions[r].height = 28
    r += 1
r += 1
panel.merge_cells(f"A{r}:B{r}"); panel.cell(row=r, column=1, value="Reglas obligatorias de esta base").font = Font(size=13, bold=True, color=NAVY); r += 1
rules = [
    "1. Nunca guardar contraseñas en claro: Usuarios.hash_contrasena solo admite huella con sal (formato algoritmo$sal$huella) y Sesiones solo token_hash.",
    "2. No sembrar credenciales en código ni en esta hoja. El primer administrador se crea desde el servidor al primer registro; el resto entra por registro o invitación.",
    "3. Imágenes y documentos: comprimir antes de subir, guardar el archivo en una carpeta de Google Drive de negociosparticularescubanos@gmail.com y registrar aquí solo URL, tamaño y SHA-256 (pestaña Imagenes_Documentos).",
    "4. Toda aplicación enlazada debe comprobar el servidor real al cargar y mostrar indicador verde (conectado) o rojo (sin conexión). Estado actual de FactiCuba: PENDIENTE DE CONEXIÓN.",
    "5. No borrar historia: usar estados (archivado/revocado) y registrar cambios en Auditoria. Los dictámenes se guardan por versión; un cambio crea una versión nueva.",
    "6. Un negocio no es factible solo por tener utilidad en un mes: debe pasar los bloqueos de Criterios_Factibilidad y las Reglas_Dictamen (demanda probada, margen, equilibrio, caja, VAN/TIR/PRI, financiamiento cerrado, energía y legalidad).",
    "7. Si sale factible, el trabajo no termina: Dictamenes debe enlazar un Plan_Mejora con métricas, responsables, fechas e indicadores de verificación (catálogo en Catalogo_Mejoras).",
    "8. Toda cifra externa (tasas, precios, población, turismo, plan municipal) lleva fuente, fecha del dato y fecha de consulta en Fuentes_Evidencias / Tasas / Precios_Mercado.",
    "9. Los importes conservan moneda original y tasa aplicada; el campo *_cup es el valor convertido y auditable.",
    "10. Validar siempre el resultado con contador, ONAT municipal y Dirección de Economía y Planificación: esta base apoya prefactibilidad y factibilidad, no sustituye licencias ni aprobaciones.",
]
for t in rules:
    panel.merge_cells(f"A{r}:B{r}"); cc = panel.cell(row=r, column=1, value=t); cc.alignment = Alignment(wrap_text=True, vertical="top"); panel.row_dimensions[r].height = 30; r += 1

# ---------------- Configuración ----------------
config_rows = [
    ("moneda_base", "CUP", "moneda", "Moneda de cálculo y reporte", "Regla de Leonardo", "No"),
    ("tasa_descuento_van_pct", 12, "% anual", "Tasa para VAN y comparación de la TIR", "Motor FactiCuba", "Sí"),
    ("margen_factible_min_pct", 15, "%", "Margen neto mínimo para dictamen favorable sin condiciones financieras", "Motor FactiCuba", "Sí"),
    ("margen_condicional_min_pct", 0, "%", "Por debajo o igual a 0 con utilidad no positiva hay bloqueo; entre 0 y 15 exige análisis y condiciones", "Metodología FactiCuba DB", "Sí"),
    ("pri_factible_max_meses", 30, "meses", "Recuperación máxima para verde", "Motor FactiCuba", "Sí"),
    ("pri_bloqueo_meses", 60, "meses", "PRI mayor o infinito bloquea", "Motor FactiCuba", "Sí"),
    ("equilibrio_factible_max_pct", 85, "% de capacidad", "Punto de equilibrio máximo tolerado", "Motor FactiCuba", "Sí"),
    ("riesgo_alerta_min", 60, "puntos 0-100", "Riesgo total que obliga condición o bloqueo según mitigación", "Motor FactiCuba", "Sí"),
    ("confianza_factible_min", 60, "puntos 0-100", "Evidencia mínima para llamar factible a un estudio", "Metodología FactiCuba DB", "Sí"),
    ("confianza_insuficiente_max", 39, "puntos 0-100", "Por debajo: INFORMACIÓN INSUFICIENTE antes que NO FACTIBLE", "Metodología FactiCuba DB", "Sí"),
    ("van_minimo_cup", 0, "CUP", "El VAN debe ser mayor que este valor al horizonte evaluado", "Finanzas de proyecto", "Sí"),
    ("dscr_minimo_si_deuda", 1.20, "ratio", "Flujo disponible / servicio de deuda mínimo si existe crédito", "Finanzas de proyecto", "Sí"),
    ("reserva_operativa_min_meses", 2, "meses de costos fijos", "Capital de trabajo mínimo recomendado en entorno de escasez e interrupciones", "Metodología Cuba", "Sí"),
    ("brecha_financiamiento_max_cup", 0, "CUP", "Plan de inversión menos fuentes confirmadas; debe quedar en cero antes de abrir", "Expediente FactiCuba", "No"),
    ("rampa_mes_1_pct", 40, "%", "Arranque gradual de ventas", "Motor FactiCuba", "Sí"),
    ("rampa_mes_2_pct", 60, "%", "Arranque gradual de ventas", "Motor FactiCuba", "Sí"),
    ("rampa_mes_3_pct", 80, "%", "Arranque gradual de ventas", "Motor FactiCuba", "Sí"),
    ("horizonte_estandar_meses", 36, "meses", "Serie mensual estándar", "Motor FactiCuba", "No"),
    ("expediente_desde", 2025, "año", "Inicio del expediente formal", "FactiCuba paso 5", "No"),
    ("expediente_hasta", 2030, "año", "Fin del expediente formal", "FactiCuba paso 5", "No"),
    ("limite_intentos_login", 5, "intentos", "Bloqueo temporal tras fallos", "Regla de seguridad de Leonardo", "No"),
    ("bloqueo_login_min", 5, "minutos", "Duración del bloqueo temporal de login", "Estándar de sus servidores", "No"),
    ("sesion_dias", 30, "días", "Vigencia máxima de una sesión", "Estándar de sus servidores", "Sí"),
    ("imagen_lado_max_px", 1280, "px", "Compresión: lado mayor máximo antes de subir", "Regla de imágenes", "Sí"),
    ("carpeta_drive_imagenes", "FactiCuba — Imágenes y documentos", "carpeta", "Destino en Drive de la cuenta de negocios", "Regla de imágenes", "Sí"),
    ("app_url", "https://negociosparticularescubanos.github.io/FactiCuba/", "URL", "Sitio publicado de FactiCuba en GitHub Pages", "Leonardo, 2026-11-12", "Sí"),
    ("servidor_url", "", "URL", "URL /exec del Apps Script cuando se despliegue", "Pendiente", "Sí"),
    ("estado_conexion_app", "PENDIENTE", "estado", "Debe pasar a CONECTADO solo tras ping real del servidor", "Regla del indicador", "Servidor"),
]
add_table("Configuracion", ["parametro", "valor", "unidad", "descripcion", "fuente_o_regla", "editable"], config_rows, GREY,
          {"parametro": 34, "descripcion": 62, "fuente_o_regla": 28})

# ---------------- Seguridad / sistema ----------------
add_table("Usuarios", ["usuario_id", "usuario", "hash_contrasena", "rol", "nombre", "correo", "telefono", "estado", "debe_cambiar_clave", "intentos_fallidos", "bloqueado_hasta", "creado_en", "actualizado_en", "ultimo_acceso", "creado_por", "notas"], color=RED, widths={"hash_contrasena": 52, "correo": 28})
add_table("Sesiones", ["sesion_id", "usuario_id", "token_hash", "creado_en", "expira_en", "revocado_en", "ip_resumen", "user_agent_resumen"], color=RED, widths={"token_hash": 52})
add_table("Auditoria", ["auditoria_id", "fecha_hora", "usuario_id", "accion", "entidad", "entidad_id", "detalle_no_sensible", "resultado", "origen"], color=RED, widths={"detalle_no_sensible": 55})
add_table("Imagenes_Documentos", ["archivo_id", "estudio_id", "tipo", "nombre_original", "nombre_drive", "url_drive", "carpeta_drive", "mime", "bytes_originales", "bytes_comprimidos", "ancho_px", "alto_px", "sha256", "subido_por", "creado_en", "estado"], color=RED, widths={"url_drive": 48, "sha256": 48, "nombre_original": 34})
add_table("Respaldo_Registro", ["respaldo_id", "fecha", "tipo", "alcance", "destino", "url_drive", "sha256", "responsable", "resultado", "notas"], color=RED, widths={"url_drive": 48, "sha256": 48})

# ---------------- Núcleo de estudios ----------------
add_table("Estudios", ["estudio_id", "codigo_fc", "propietario_usuario_id", "nombre_proyecto", "descripcion", "estado", "version_actual", "provincia", "municipio", "actor_codigo", "tamano", "sector", "moneda_base", "creado_en", "actualizado_en", "fecha_dictamen", "dictamen_actual", "confianza_datos_0_100", "riesgo_total_0_100", "inversion_total_cup", "utilidad_neta_mensual_cup", "margen_neto_pct", "punto_equilibrio_unidades", "punto_equilibrio_pct_capacidad", "pri_meses", "van_3_anos_cup", "tir_3_anos_pct", "van_6_anos_cup", "tir_6_anos_pct", "brecha_financiamiento_cup", "alineacion_plan_municipal", "archivado"], widths={"nombre_proyecto": 32, "descripcion": 55})
add_table("Entradas_JSON", ["entrada_id", "estudio_id", "version", "parte", "origen", "payload_json", "hash_payload", "creado_por", "creado_en", "es_actual"], widths={"payload_json": 70, "hash_payload": 48})
add_table("Proyecto_Detalle", ["estudio_id", "version", "objetivo_general", "aporte_territorial", "encadenamientos", "empleos_objetivo", "sustitucion_importaciones_pct", "ajuste_demanda", "ajuste_conectividad", "ajuste_deficit_energetico", "ajuste_transporte", "moneda_costos", "moneda_ingresos", "moneda_divisa_principal", "tasa_modo", "frecuencia_compras_mes", "ingreso_medio_cliente_cup", "dependencia_importada_pct", "insumos_informales_pct", "sobreprecio_informal_pct", "reposicion_divisas_pct_ventas", "capacidad_unidades_mes", "ocupacion_pct", "competencia_nivel", "escenario_turistico", "respaldo_energia", "dependencia_pagos", "crecimiento_ingresos_anual_pct", "inflacion_costos_anual_pct", "rampa_activa", "plan_municipal_json", "investigacion_web_json", "notas"], widths={"objetivo_general": 55, "aporte_territorial": 45, "plan_municipal_json": 55, "investigacion_web_json": 55})
add_table("Mercado_Estudio", ["registro_id", "estudio_id", "version", "segmento_cliente", "necesidad_o_problema", "poblacion_objetivo", "visitantes_mes", "demanda_unidades_mes", "participacion_objetivo_pct", "clientes_mes", "frecuencia_compra_mes", "disposicion_pago_cup", "canal_venta", "competidor_referencia", "ventaja_competitiva", "precio_formal_referencia_cup", "precio_informal_referencia_cup", "precio_propio_cup", "posicion_precio_pct_vs_informal", "evidencia", "fuente_id", "confianza_0_100", "notas"], widths={"necesidad_o_problema": 48, "evidencia": 48, "ventaja_competitiva": 40})
add_table("Productos_Servicios", ["producto_id", "estudio_id", "version", "nombre", "unidad", "precio_cup", "costo_variable_unitario_cup", "capacidad_mes", "ocupacion_esperada_pct", "ventas_unidades_mes", "ingreso_mensual_cup", "costo_variable_mensual_cup", "margen_contribucion_unitario_cup", "margen_contribucion_pct", "activo", "notas"], widths={"nombre": 34})
add_table("Inversion", ["inversion_id", "estudio_id", "version", "categoria", "concepto", "cantidad", "costo_unitario_original", "moneda_original", "tasa_cup", "costo_total_cup", "vida_util_anos", "proveedor", "estado_compra", "fecha_prevista", "fuente_id", "notas"], widths={"concepto": 42})
add_table("Costos_Fijos", ["costo_fijo_id", "estudio_id", "version", "categoria", "concepto", "monto_mensual_original", "moneda_original", "tasa_cup", "monto_mensual_cup", "recurrente", "fecha_inicio", "fecha_fin", "notas"], widths={"concepto": 42})
add_table("Insumos_Costos_Variables", ["insumo_id", "estudio_id", "producto_id", "version", "concepto", "unidad", "cantidad_por_unidad_producto", "costo_unitario_cup", "proveedor", "origen", "moneda_original", "tasa_cup", "notas"], widths={"concepto": 42})
add_table("Combustible_Energia", ["registro_id", "estudio_id", "version", "tipo", "unidad", "cantidad_mes", "precio_formal_cup", "precio_informal_cup", "fuente_elegida", "costo_mensual_cup", "respaldo", "notas"])
add_table("Nomina_Tributos", ["registro_id", "estudio_id", "version", "trabajadores_contratados", "salario_medio_cup", "socios_titulares", "nomina_mensual_cup", "impuesto_ventas_pct", "impuesto_utilidades_pct", "impuesto_fuerza_trabajo_pct", "seguridad_social_pct", "cuota_socios_cup", "escala_progresiva_json", "tributos_mensuales_estimados_cup", "notas"], widths={"escala_progresiva_json": 55})

# ---------------- Finanzas (verde) ----------------
add_table("Flujo_Mensual", ["flujo_id", "estudio_id", "version", "horizonte_meses", "mes_indice", "anio_calendario", "mes_calendario", "factor_rampa", "unidades", "ingresos_cup", "costos_variables_cup", "costos_fijos_cup", "impuesto_ventas_cup", "impuesto_utilidades_cup", "capex_cup", "flujo_neto_cup", "flujo_acumulado_cup", "ocupacion_pct"], color=GREEN)
add_table("Evaluacion_Anual", ["evaluacion_id", "estudio_id", "version", "anio_indice", "anio_calendario", "ingresos_cup", "egresos_cup", "flujo_neto_cup", "flujo_descontado_cup", "acumulado_cup", "capex_cup", "van_parcial_cup", "notas"], color=GREEN)
add_table("Sensibilidad", ["sensibilidad_id", "estudio_id", "version", "escenario", "variable", "cambio_pct", "utilidad_neta_mensual_cup", "margen_pct", "pri_meses", "van_cup", "sigue_factible", "observacion"], color=GREEN, widths={"escenario": 30, "observacion": 48})
add_table("Expediente_Programas", ["programa_id", "estudio_id", "version", "codigo_programa", "nombre", "descripcion", "responsable", "hito", "indicador_resultado", "meta", "estado"], color=GREEN, widths={"descripcion": 55, "hito": 40})
add_table("Presupuesto_2025_2030", ["presupuesto_id", "estudio_id", "version", "programa_codigo", "anio", "tipo", "monto_cup", "notas"], color=GREEN)
add_table("Financiamiento", ["financiamiento_id", "estudio_id", "version", "fuente", "monto_original", "moneda_original", "tasa_cup", "monto_cup", "condiciones", "estado", "fecha_compromiso"], color=GREEN, widths={"condiciones": 48})

# ---------------- Riesgos, requisitos y dictamen (naranja) ----------------
add_table("Riesgos", ["riesgo_id", "estudio_id", "version", "categoria", "riesgo", "probabilidad_1_5", "impacto_1_5", "nivel", "puntaje_0_100", "mitigacion", "costo_mitigacion_cup", "responsable", "fecha_revision", "estado"], color=ORANGE, widths={"riesgo": 48, "mitigacion": 55})
ruta_rows = [
    (1, "Definir la oportunidad", "¿Qué problema resuelve, para quién y por qué ahora?", "Idea, cliente, territorio, actor y objetivo", "Entrevista y observación local", "Ficha inicial del proyecto", "Promotor", "Hay cliente y problema concretos"),
    (2, "Probar demanda", "¿Cuántos compran, cuánto pagan y con qué frecuencia?", "Población, turismo, segmento, frecuencia, disposición de pago", "Encuestas, preventa, cartas de intención, precios reales", "Demanda mensual defendible", "Promotor/analista", "Demanda con evidencia, no solo población"),
    (3, "Estudiar competencia y precio", "¿Contra quién compite y qué ventaja sostiene el precio?", "Competidores, precios formal/informal, diferenciación", "Revolico, visitas, fuentes web fechadas", "Precio y posicionamiento", "Analista", "Precio dentro de banda y ventaja clara"),
    (4, "Diseñar la operación", "¿Capacidad, proceso, local, tecnología y calidad alcanzan?", "Capacidad, proceso, equipos, mantenimiento, normas", "Cotizaciones y fichas técnicas", "Modelo técnico y CAPEX", "Responsable técnico", "Capacidad coherente con demanda"),
    (5, "Asegurar suministros y energía", "¿Qué pasa si falta el insumo, el combustible o la corriente?", "Proveedores, stock, importaciones, respaldo energético", "Cotizaciones, contratos o cartas", "Plan de abastecimiento y respaldo", "Promotor", "Sin punto único de fallo sin mitigación"),
    (6, "Cerrar legalidad y tributos", "¿La figura, el objeto, el local y las licencias permiten operar?", "Actor, objeto social, local, ONAT, licencias, contratos", "Confirmación ONAT/CAM/Dirección de Economía y Planificación", "Ruta legal con responsables y fechas", "Contador/asesor", "Ningún bloqueo legal abierto"),
    (7, "Armar equipo y gestión", "¿Quién vende, produce, cobra, registra y decide?", "Roles, plantilla, salarios, contabilidad, controles", "Perfiles y procedimientos", "Organigrama y nómina", "Promotor", "Funciones críticas cubiertas"),
    (8, "Calcular economía", "¿La unidad gana antes de mirar el mes completo?", "Precio, CVU, margen de contribución, fijos y tributos", "Motor financiero", "Punto de equilibrio y utilidad", "Analista", "Contribución positiva y equilibrio ≤ capacidad"),
    (9, "Probar caja e inversión", "¿Se recupera y resiste meses malos?", "Inversión, capital de trabajo, flujo 36/72 meses, VAN, TIR, PRI", "Flujo mensual y anual", "Indicadores y brecha de financiamiento", "Analista", "VAN>0, TIR>tasa, PRI dentro de límite y brecha=0"),
    (10, "Estresar el plan", "¿Sigue vivo con precio -10%, ocupación -15 pp y costos +10%?", "Sensibilidad y escenarios", "Motor de sensibilidad", "Condiciones y reservas", "Analista", "No quiebra en el estrés o hay mitigación financiada"),
    (11, "Dictaminar", "¿Factible, condicionado, no factible o falta información?", "Requisitos, indicadores, riesgo y confianza", "Reglas_Dictamen", "Dictamen versionado", "Analista/admin", "Bloqueos resueltos o decisión explícita"),
    (12, "Mejorar y seguir", "Si es factible, ¿cómo gana más con menos riesgo?", "Plan_Mejora con KPI, dueño, fecha y costo", "Catalogo_Mejoras", "Plan de mejora verificable", "Promotor", "Cada debilidad tiene acción e indicador"),
]
add_table("Ruta_Factibilidad", ["paso", "fase", "pregunta_guia", "datos_necesarios", "evidencia_minima", "salida", "responsable", "criterio_de_avance"], ruta_rows, ORANGE, widths={"pregunta_guia": 52, "datos_necesarios": 48, "evidencia_minima": 48, "criterio_de_avance": 48})
criterios = [
    ("MKT-01", "Mercado y demanda", "Demanda mensual cuantificada por segmento y territorio", "Sí", "Ventas objetivo ≤ demanda defendible y capacidad", "Encuesta, preventa, intención de compra o historial", "Mercado_Estudio", 18, "No dictaminar favorable: falta la prueba central del negocio", "Validar demanda antes de invertir"),
    ("MKT-02", "Mercado y demanda", "Cliente ideal, problema y frecuencia de compra definidos", "No", "Segmento y frecuencia coherentes con población/visitas", "Descripción y entrevistas", "Mercado_Estudio", 18, "Baja la confianza y exige condición", "Afinar segmento y propuesta"),
    ("MKT-03", "Mercado y demanda", "Precio validado contra formal, informal y disposición de pago", "Sí", "Precio cubre costos y queda en banda defendible del mercado", "Precios fechados de Revolico/web/competidores", "Precios_Mercado", 18, "Bloquea si el precio no cubre el costo o no tiene referencia", "Reposicionar precio/valor"),
    ("MKT-04", "Mercado y demanda", "Competencia y ventaja competitiva identificadas", "No", "Diferenciación concreta, no solo 'buena calidad'", "Mapa de competidores", "Mercado_Estudio", 18, "Condición de comercialización", "Diferenciación y nicho"),
    ("MKT-05", "Mercado y demanda", "Canales de venta y captación con costo estimado", "No", "Existe ruta realista para alcanzar la ocupación supuesta", "Canales, alianzas o preventas", "Mercado_Estudio", 18, "Condición antes de abrir", "Canales y preventa"),
    ("TEC-01", "Técnico y capacidad", "Proceso productivo o de servicio descrito paso a paso", "Sí", "Capacidad instalada ≥ punto de equilibrio", "Diagrama/ficha de proceso", "Proyecto_Detalle", 14, "Bloquea si equilibrio > capacidad", "Rediseñar capacidad/proceso"),
    ("TEC-02", "Técnico y capacidad", "Local, ubicación, infraestructura y transporte adecuados", "Sí", "Acceso de clientes/proveedores y costo logístico incluido", "Contrato o aval del local, inspección", "Proyecto_Detalle", 14, "Bloquea si no hay local o acceso viable", "Cambiar ubicación o logística"),
    ("TEC-03", "Técnico y capacidad", "Tecnología, equipos, mantenimiento y repuestos identificados", "No", "Equipos cotizados con vida útil y mantenimiento", "Cotizaciones", "Inversion", 14, "Condición y reserva de mantenimiento", "Fases de CAPEX y mantenimiento"),
    ("SUM-01", "Suministros y energía", "Proveedores principales y alternos para insumos críticos", "Sí", "Ningún insumo crítico con proveedor único sin plan B", "Cotizaciones o cartas de proveedores", "Insumos_Costos_Variables", 12, "Bloquea o condiciona según criticidad", "Doble proveedor y sustitutos locales"),
    ("SUM-02", "Suministros y energía", "Inventario y capital de trabajo para interrupciones", "No", "Stock coherente con plazo de reposición y perecibilidad", "Cálculo de stock y rotación", "Inversion/Flujo_Mensual", 12, "Condición de caja", "Optimizar inventario y rotación"),
    ("SUM-03", "Suministros y energía", "Energía y combustible asegurados o respaldo dimensionado", "Sí", "El negocio opera su horario crítico con respaldo costeado", "Plan energético y costo del respaldo", "Combustible_Energia", 12, "Bloquea si la operación depende de energía no asegurada", "Solar/UPS/planta y horarios"),
    ("LEG-01", "Legal y tributario", "Figura jurídica y objeto social cubren la actividad exacta", "Sí", "Actividad permitida para PDL/MIPYME/TCP/CNA elegido", "Confirmación oficial o asesoría", "Estudios", 12, "Bloqueo total hasta corregirlo", "Ajustar figura u objeto antes de gastar"),
    ("LEG-02", "Legal y tributario", "Tenencia del local y licencias/permisos identificados", "Sí", "Ruta, costo, responsable y plazo de cada permiso", "Lista de trámites y avales", "Requisitos_Estudio", 12, "Bloqueo si un permiso es imposible", "Cambiar local/actividad o completar permiso"),
    ("LEG-03", "Legal y tributario", "Carga ONAT, laboral, seguridad social y aportes incluidos", "Sí", "Tributos del actor en Nomina_Tributos y en el flujo", "Criterio del contador/ONAT municipal", "Nomina_Tributos", 12, "Bloquea el dictamen si se omiten tributos materiales", "Corregir modelo tributario"),
    ("ORG-01", "Organización y capital humano", "Roles críticos, plantilla y salarios realistas", "No", "Producción, venta, caja y administración cubiertos", "Organigrama y perfiles", "Nomina_Tributos", 8, "Condición de contratación/formación", "Formación y polivalencia"),
    ("ORG-02", "Organización y capital humano", "Contabilidad, control interno y registro diario definidos", "No", "Responsable y herramienta de registro desde el día uno", "Procedimiento escrito", "Auditoria", 8, "Condición antes de operar", "Implantar control y cierre mensual"),
    ("FIN-01", "Financiero y económico", "Inversión completa: activos, instalación, licencias y puesta en marcha", "Sí", "CAPEX + capital de trabajo + contingencia identificados", "Cotizaciones por partida", "Inversion", 24, "Bloquea si falta una partida material", "Completar y fasear inversión"),
    ("FIN-02", "Financiero y económico", "Financiamiento confirmado y brecha en cero", "Sí", "Fuentes confirmadas ≥ plan total antes de abrir", "Aprobaciones, ahorros o compromisos", "Financiamiento", 24, "Bloqueo: no abrir con brecha abierta", "Fasear, preventa o nueva fuente"),
    ("FIN-03", "Financiero y económico", "Margen de contribución unitario positivo", "Sí", "Precio neto de impuesto de ventas − CVU > 0", "Motor financiero", "Productos_Servicios", 24, "Bloqueo económico", "Precio, CVU o mezcla de productos"),
    ("FIN-04", "Financiero y económico", "Punto de equilibrio alcanzable", "Sí", "Equilibrio ≤85% de la capacidad para verde", "Motor financiero", "Estudios", 24, "Rojo si equilibrio > capacidad; condición si >85%", "Bajar fijos o subir contribución"),
    ("FIN-05", "Financiero y económico", "Flujo de caja mensual no quiebra la operación", "Sí", "Sin saldo acumulado insalvable y con reserva operativa", "Flujo_Mensual 36 meses", "Flujo_Mensual", 24, "Bloquea si la caja se agota sin fuente real", "Capital de trabajo y calendario de pagos"),
    ("FIN-06", "Financiero y económico", "VAN, TIR y PRI dentro de umbrales", "Sí", "VAN>0, TIR>tasa de descuento y PRI≤30 meses para verde", "Evaluacion_Anual", "Configuracion", 24, "PRI>60 bloquea; intermedio condiciona", "Fasear CAPEX y mejorar flujo"),
    ("FIN-07", "Financiero y económico", "Sensibilidad y escenarios superados o mitigados", "No", "Precio −10%, ocupación −15 pp y costos +10% analizados", "Sensibilidad", "Sensibilidad", 24, "Condición si un estrés vuelve negativo el flujo", "Reserva, gatillos y plan B"),
    ("AMB-01", "Ambiental y seguridad", "Impactos, residuos, agua, ruido y seguridad controlados", "No", "Medidas y costos incluidos; sin prohibición ambiental", "Lista de medidas", "Riesgos", 5, "Bloquea si existe prohibición o daño no mitigable", "Rediseño limpio y seguridad"),
    ("SOC-01", "Social y territorial", "Empleo, aporte local y coherencia con el plan municipal", "No", "Alineación declarada y, en PDL, aval/ruta CAM", "Comparación con plan municipal", "Proyecto_Detalle", 4, "Condición, especialmente en PDL", "Encadenamiento local"),
    ("DIG-01", "Digital, pagos y continuidad", "Cobro, conectividad y registro funcionan sin internet continuo", "No", "Al menos un canal electrónico y un respaldo en efectivo/manual", "Prueba de pago y procedimiento", "Proyecto_Detalle", 3, "Condición operativa", "Doble canal de cobro"),
    ("CON-01", "Digital, pagos y continuidad", "Riesgos principales con mitigación, costo y responsable", "No", "Riesgo total <60 o mitigaciones financiadas", "Riesgos", "Riesgos", 3, "Condición si riesgo ≥60 sin respaldo", "Mitigación y continuidad"),
]
add_table("Criterios_Factibilidad", ["criterio_codigo", "dimension", "requisito", "bloqueante", "condicion_minima", "evidencia_requerida", "fuente_datos", "peso_dimension_pct", "regla_si_no_cumple", "area_mejora_relacionada"], criterios, ORANGE, widths={"requisito": 52, "condicion_minima": 52, "evidencia_requerida": 48, "regla_si_no_cumple": 52})
add_table("Requisitos_Estudio", ["requisito_eval_id", "estudio_id", "version", "criterio_codigo", "estado_evaluacion", "puntaje_0_100", "evidencia", "fuente_id", "observacion", "responsable", "fecha_limite", "bloquea_dictamen"], color=ORANGE, widths={"evidencia": 52, "observacion": 48})
reglas_rows = [
    ("R-01", 1, "Existe un criterio bloqueante en No cumple (legal imposible, sin local, sin permiso, brecha de financiamiento)", "NO FACTIBLE hasta corregirlo", "Un bloqueo no se compensa con buen VAN", "Metodología DB"),
    ("R-02", 2, "Confianza de datos <40 o falta demanda/precio con evidencia", "INFORMACIÓN INSUFICIENTE", "No se dictamina sobre suposiciones sin prueba", "Metodología DB"),
    ("R-03", 3, "Utilidad neta mensual ≤0 o margen de contribución ≤0", "NO FACTIBLE", "La operación pierde en su nivel normal", "FactiCuba"),
    ("R-04", 4, "Punto de equilibrio > capacidad instalada", "NO FACTIBLE", "Ni vendiendo todo cubre los fijos", "FactiCuba"),
    ("R-05", 5, "PRI >60 meses o infinito", "NO FACTIBLE", "Recuperación fuera del horizonte razonable", "FactiCuba"),
    ("R-06", 6, "Flujo acumulado agota la caja sin fuente confirmada", "NO FACTIBLE hasta cerrar financiamiento", "La caja manda: utilidad sin liquidez también quiebra", "Metodología DB"),
    ("R-07", 7, "VAN ≤0 o TIR ≤ tasa de descuento al horizonte principal", "NO FACTIBLE o rediseño profundo", "No crea valor frente al costo del dinero", "Finanzas de proyecto"),
    ("R-08", 8, "Margen neto <12%, PRI >30, equilibrio >85% o riesgo ≥60", "FACTIBLE CONDICIONADO", "Hay negocio posible, pero frágil: condiciones y Plan_Mejora obligatorios", "FactiCuba + DB"),
    ("R-09", 9, "Un escenario de sensibilidad vuelve el flujo negativo sin mitigación financiada", "FACTIBLE CONDICIONADO", "Debe existir reserva, gatillo o plan B antes de abrir", "Metodología DB"),
    ("R-10", 10, "Sin bloqueos, margen ≥15%, PRI ≤30, equilibrio ≤85%, VAN>0, TIR>tasa, riesgo <60 y confianza ≥60", "FACTIBLE", "Supera economía, evidencia y riesgo; aun así lleva Plan_Mejora de optimización", "FactiCuba + DB"),
]
add_table("Reglas_Dictamen", ["regla_id", "prioridad", "condicion", "resultado", "fundamento", "origen"], reglas_rows, ORANGE, widths={"condicion": 62, "resultado": 34, "fundamento": 58})
add_table("Dictamenes", ["dictamen_id", "estudio_id", "version", "fecha", "resultado", "puntaje_total_0_100", "puntaje_mercado", "puntaje_tecnico", "puntaje_suministros", "puntaje_legal", "puntaje_organizacion", "puntaje_financiero", "puntaje_ambiental", "puntaje_social", "puntaje_digital_continuidad", "bloqueos_abiertos", "advertencias", "confianza_0_100", "riesgo_0_100", "resumen", "condiciones", "analista_usuario_id", "estado"], color=ORANGE, widths={"resumen": 58, "condiciones": 58, "advertencias": 45})

# ---------------- Mejora (morado) ----------------
add_table("Plan_Mejora", ["accion_id", "estudio_id", "dictamen_id", "area", "problema_detectado", "metrica_afectada", "valor_actual", "objetivo", "accion", "tipo", "prioridad", "responsable", "fecha_inicio", "fecha_limite", "costo_estimado_cup", "impacto_esperado", "indicador_verificacion", "estado", "avance_pct", "resultado_verificado", "notas"], color=PURPLE, widths={"problema_detectado": 45, "accion": 58, "impacto_esperado": 42, "indicador_verificacion": 42})
mejoras = [
    ("MEJ-01", "Margen neto entre 0% y 15%", "Precio y valor", "Crear versión premium o paquete y probar subida pequeña de precio con preventa", "Margen neto +3 a +5 pp", "30-60 días", "Bajo", "Alto", "Margen por producto y tasa de conversión"),
    ("MEJ-02", "CVU alto o subiendo", "Costo variable", "Pedir 3 cotizaciones, sustituir insumo importado por local equivalente y fijar ficha de costo por unidad", "CVU −5% a −15%", "30 días", "Medio", "Alto", "CVU real por unidad vendida"),
    ("MEJ-03", "Mermas o desperdicio", "Operación", "Pesar/registrar merma por turno y ajustar porciones, recetas o proceso", "Merma −30%", "30 días", "Bajo", "Medio", "Kg o unidades perdidas / producción"),
    ("MEJ-04", "Punto de equilibrio >85% capacidad", "Costos fijos", "Renegociar alquiler, compartir espacio, pasar tareas a costo variable y recortar fijos sin venta asociada", "Equilibrio −10 pp de capacidad", "30-90 días", "Medio", "Alto", "Fijos mensuales y equilibrio semanal"),
    ("MEJ-05", "Ocupación por debajo del plan", "Ventas", "Preventa, alianzas locales/turísticas, canal de pedidos y oferta de prueba con costo de captación controlado", "Ocupación +10 pp", "30-60 días", "Medio", "Alto", "Clientes nuevos y repetición"),
    ("MEJ-06", "PRI >30 meses", "Inversión", "Fasear CAPEX: abrir mínimo viable, alquilar o comprar equipo usado verificado y reinvertir por hitos", "PRI −20%", "Antes de abrir", "Medio", "Alto", "CAPEX real vs plan y flujo acumulado"),
    ("MEJ-07", "VAN ≤0 o TIR baja", "Modelo de negocio", "Subir mezcla de productos de mayor contribución, fasear inversión y renegociar plazos antes de abandonar", "VAN positivo al recalcular", "Antes de abrir", "Alto", "Alto", "VAN/TIR con datos nuevos, no deseados"),
    ("MEJ-08", "Caja negativa en meses de rampa", "Tesorería", "Depósitos por encargo, cobrar antes de producir, negociar 15-30 días a proveedores y crear reserva de 2 meses de fijos", "Saldo mínimo ≥0", "Inmediato", "Medio", "Alto", "Saldo semanal de caja"),
    ("MEJ-09", "Dependencia de un proveedor", "Suministros", "Segundo proveedor, sustituto aprobado y stock de seguridad por plazo real de reposición", "Cero paradas por insumo crítico", "30-90 días", "Medio", "Alto", "Días de parada y cobertura de stock"),
    ("MEJ-10", "Costo o paradas por energía", "Energía", "Medir consumo por hora, mover producción a horario seguro, solar/UPS por cargas críticas y precio con costo real de respaldo", "Horas perdidas −50%", "30-90 días", "Medio", "Alto", "Horas de interrupción y costo kWh efectivo"),
    ("MEJ-11", "Precio por encima del informal sin justificación", "Posicionamiento", "Añadir garantía, rapidez, entrega o calidad medible; si no, acercar precio a la banda del mercado", "Conversión sin caer margen", "30 días", "Bajo", "Medio", "Ventas por visita y reclamos"),
    ("MEJ-12", "Precio muy por debajo del mercado", "Precio", "Subir por escalones del 5% midiendo volumen; capturar valor antes de ampliar capacidad", "Ingreso por unidad +5%", "30 días", "Bajo", "Medio", "Elasticidad observada y margen"),
    ("MEJ-13", "Confianza de datos <60", "Evidencia", "Piloto de 2-4 semanas, 20-30 encuestas útiles, preventa o cartas de intención antes del CAPEX grande", "Confianza ≥60", "Antes de abrir", "Bajo", "Alto", "Ventas reales del piloto vs supuesto"),
    ("MEJ-14", "Riesgo ≥60", "Riesgos", "Financiar primero la mitigación del riesgo mayor y poner gatillo escrito de pausa o cambio", "Riesgo −15 puntos", "Antes de abrir", "Medio", "Alto", "Matriz de riesgos revisada mensual"),
    ("MEJ-15", "Factible y estable 3 meses", "Crecimiento", "Ampliar solo el cuello de botella: capacidad, horario o canal con mayor contribución por peso invertido", "Utilidad +15% sin bajar margen", "Trimestral", "Medio", "Alto", "Contribución por peso de CAPEX nuevo"),
    ("MEJ-16", "Factible con caja sana", "Reinversión", "Crear fondo de mantenimiento y reposición antes de repartir utilidades", "Reserva = 1 mes de fijos", "Mensual", "Bajo", "Medio", "Saldo del fondo y equipos operativos"),
    ("MEJ-17", "Ventas concentradas en un cliente/canal", "Diversificación", "Segundo canal y límite de concentración por cliente", "Ningún cliente >30% de ventas", "60-90 días", "Medio", "Medio", "Concentración mensual de ventas"),
    ("MEJ-18", "Equipo sobrecargado o calidad inestable", "Capital humano", "Ficha de proceso, polivalencia, control de calidad y salario ligado a resultado medible", "Reclamos −30%", "30-60 días", "Bajo", "Medio", "Reclamos y producción por trabajador"),
]
add_table("Catalogo_Mejoras", ["mejora_id", "disparador", "area", "accion_recomendada", "objetivo_tipico", "horizonte", "esfuerzo", "impacto", "indicador_verificacion"], mejoras, PURPLE, widths={"disparador": 38, "accion_recomendada": 72, "objetivo_tipico": 36, "indicador_verificacion": 42})

# ---------------- Evidencia y mercado ----------------
add_table("Fuentes_Evidencias", ["fuente_id", "estudio_id", "tipo", "titulo", "editor_o_fuente", "url", "fecha_consulta", "fecha_del_dato", "valor_relevante", "archivo_drive_url", "confiabilidad_0_100", "notas"], widths={"titulo": 42, "url": 52, "valor_relevante": 42})
add_table("Precios_Mercado", ["precio_id", "estudio_id", "producto_buscado", "titulo_anuncio", "precio_original", "moneda_original", "tasa_cup", "precio_cup", "fuente", "url", "fecha_consulta", "es_mediana", "utilidad_estimada_cup", "margen_estimado_pct"], widths={"titulo_anuncio": 48, "url": 52})
add_table("Tasas", ["tasa_id", "fecha_hora", "divisa", "fuente", "tasa_formal_cup", "tasa_informal_cup", "tasa_manual_cup", "tasa_usada_cup", "url_fuente", "capturado_por", "notas"], widths={"url_fuente": 52})

# ---------------- Territorios (168 municipios del paquete) ----------------
terr_rows = []
for prov, municipios in PROV_MUN.items():
    for mun in municipios:
        terr_rows.append((prov, mun, POB.get(prov, {}).get(mun, ""), "Censo 2022 / ONEI (estimación redondeada en FactiCuba)", "", "", "", "", "", ""))
add_table("Territorios", ["provincia", "municipio", "poblacion_estimada", "fuente_poblacion", "visitantes_mes_estimados", "conectividad_pagos", "deficit_energetico", "transporte", "notas_locales", "actualizado_en"], terr_rows, widths={"provincia": 24, "municipio": 30, "fuente_poblacion": 52})

# ---------------- Catálogos (formato largo) ----------------
cat_rows = []
for code, a in ACTOR.items():
    cat_rows.append(("Actor", code, a["n"], f"Utilidades ref. {a['util']}% · Ventas/servicios ref. {a['ventas']}%", a["msg"]))
for code, n, d in [("micro", "Micro (1-10 ocupados)", ""), ("pequena", "Pequeña (11-35 ocupados)", ""), ("mediana", "Mediana (36-100 ocupados)", "")]:
    cat_rows.append(("Tamano", code, n, d, ""))
for name, s in SECT.items():
    cat_rows.append(("Sector", name, s["nom"], f"Precio ref. {s['precio']} CUP · CV {round(s['cv']*100)}% · Penetración {round(s['pen']*100)}% · Captación {round(s['capt']*100, 2)}%", "Parámetros de arranque del motor FactiCuba; sustituir por datos reales"))
for code in ["CUP", "USD", "EUR", "MLC"]:
    cat_rows.append(("Moneda", code, code, "Guardar siempre tasa, fecha y fuente", ""))
for code, n in [("baja", "Baja"), ("media", "Media"), ("alta", "Alta"), ("saturado", "Saturada")]:
    cat_rows.append(("Competencia", code, n, "", ""))
for code, n in [("total", "Total (solar + respaldo)"), ("parcial", "Parcial (planta o UPS)"), ("ninguna", "Sin respaldo")]:
    cat_rows.append(("Respaldo_energia", code, n, "", ""))
for code, n in [("alta", "Alta"), ("media", "Media"), ("baja", "Baja (mayoría efectivo)")]:
    cat_rows.append(("Dependencia_pagos", code, n, "", ""))
for v in ["borrador", "en_revision", "dictaminado", "aprobado", "en_mejora", "archivado"]:
    cat_rows.append(("Estado_estudio", v, v, "", ""))
for v in ["FACTIBLE", "FACTIBLE CONDICIONADO", "NO FACTIBLE", "INFORMACIÓN INSUFICIENTE"]:
    cat_rows.append(("Dictamen", v, v, "Ver Reglas_Dictamen", ""))
for v in ["Cumple", "No cumple", "En riesgo", "No evaluado", "No aplica"]:
    cat_rows.append(("Estado_requisito", v, v, "", ""))
for v in ["administrador", "analista", "cliente", "consultor"]:
    cat_rows.append(("Rol_usuario", v, v, "Sin contraseñas en claro; acceso por servidor", ""))
for code, n in [("P1", "Infraestructura"), ("P2", "Operaciones"), ("P3", "Capital humano"), ("P4", "Tecnología")]:
    cat_rows.append(("Programa_expediente", code, n, "", ""))
for v in ["autofinanciamiento CUP", "autofinanciamiento divisas", "crédito BANDEC/BPA", "presupuesto territorial / PDL-CAM", "cooperación / IED", "preventa", "aporte de socios"]:
    cat_rows.append(("Fuente_financiamiento", v, v, "", ""))
add_table("Catalogos", ["catalogo", "codigo", "valor", "parametros", "notas"], cat_rows, GREY, widths={"valor": 46, "parametros": 62, "notas": 62})

# ---------------- Diccionario de datos ----------------
desc = {
    "id": "Identificador único", "usuario_id": "Identificador del usuario", "estudio_id": "Identificador del estudio",
    "hash": "Huella criptográfica; nunca el secreto original", "token_hash": "Huella del token; nunca el token original",
    "cup": "Valor convertido a CUP con la tasa guardada en el registro", "pct": "Porcentaje", "fecha": "Fecha del registro",
    "json": "Bloque estructurado JSON para conservar el payload completo de la app", "url": "Enlace verificable",
}
dicc_rows = []
for ws in wb.worksheets:
    if ws.title in ("Panel", "Diccionario_Datos"): continue
    for cell in ws[1]:
        field = str(cell.value)
        d = "Campo de la tabla " + ws.title
        for k, v in desc.items():
            if k in field: d = v; break
        if field.endswith("_cup"): d = desc["cup"]
        if field.endswith("_pct") or "_0_100" in field: d = "Número en la escala indicada en el nombre"
        dicc_rows.append((ws.title, field, "texto/número/fecha según uso", "Sí" if field.endswith("_id") or field in ("usuario", "parametro", "criterio_codigo") else "Según flujo", d))
add_table("Diccionario_Datos", ["tabla", "campo", "tipo", "obligatorio", "descripcion"], dicc_rows, GREY, widths={"tabla": 28, "campo": 38, "descripcion": 62})

# Validaciones útiles en rangos vacíos
def dv(sheet, formula, range_):
    ws = wb[sheet]; d = DataValidation(type="list", formula1='"' + formula + '"', allow_blank=True); d.error = "Use un valor de la lista"; d.prompt = "Valores del catálogo"; ws.add_data_validation(d); d.add(range_)
dv("Usuarios", "administrador,analista,cliente,consultor", "D2:D10000")
dv("Usuarios", "activo,suspendido,archivado", "H2:H10000")
dv("Estudios", "borrador,en_revision,dictaminado,aprobado,en_mejora,archivado", "F2:F10000")
dv("Requisitos_Estudio", "Cumple,No cumple,En riesgo,No evaluado,No aplica", "E2:E10000")
dv("Plan_Mejora", "Alta,Media,Baja", "K2:K10000")
dv("Plan_Mejora", "pendiente,en_curso,hecha,verificada,cancelada", "R2:R10000")
dv("Dictamenes", "FACTIBLE,FACTIBLE CONDICIONADO,NO FACTIBLE,INFORMACIÓN INSUFICIENTE", "E2:E10000")

wb.active = wb["Panel"]
wb.save(OUT)
print("OK", OUT, "hojas:", len(wb.sheetnames), "municipios:", len(terr_rows), "criterios:", len(criterios), "mejoras:", len(mejoras))
