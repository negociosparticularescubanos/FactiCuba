// FactiCuba · Espejo de tasas — lee el BCC y elToque en el servidor y
// devuelve las tasas limpias con CORS abierto, para que la app pueda
// sincronizar desde cualquier navegador sin claves ni intermediarios.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname !== "/tasas") {
      return new Response(JSON.stringify({ ok: true, servicio: "FactiCuba · espejo de tasas", ruta: "/tasas" }), { headers: CORS });
    }
    const out = { ok: true, fecha: new Date().toISOString() };
    // Formal: API pública del Banco Central de Cuba (tasaEspecial = Segmento III)
    try {
      const r = await fetch("https://api.bc.gob.cu/v1/tasas-de-cambio/activas", { headers: { "User-Agent": "FactiCuba" } });
      const j = await r.json();
      out.formal = {};
      for (const t of (j.tasas || [])) {
        if (t.codigoMoneda === "USD" || t.codigoMoneda === "EUR") out.formal[t.codigoMoneda] = t.tasaEspecial;
      }
      out.fechaBCC = j.fechaDia || null;
      if (!out.formal.USD) { out.errBCC = "sin USD en la respuesta (HTTP " + r.status + ")"; out.formal = null; }
    } catch (e) { out.formal = null; out.errBCC = String(e).slice(0, 90); }
    // Informal: página pública de tasas de elToque (bloque de datos incrustado)
    try {
      const r = await fetch("https://eltoque.com/tasas-de-cambio-cuba", { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36", "Accept-Language": "es" } });
      const h = await r.text();
      const inf = {};
      const re = /"name":"([A-Z]+)\/CUP"[^}]*?"value":\s*"?([0-9]+(?:\.[0-9]+)?)"?/g;
      let m;
      while ((m = re.exec(h))) { if (m[1] === "USD" || m[1] === "EUR" || m[1] === "MLC") inf[m[1]] = parseFloat(m[2]); }
      const dm = h.match(/"dateModified":"([^"]+)"/);
      out.fechaToque = dm ? dm[1] : null;
      if (inf.USD) out.informal = inf; else { out.informal = null; out.errToque = "sin tasas legibles en la página (HTTP " + r.status + ")"; }
    } catch (e) { out.informal = null; out.errToque = String(e).slice(0, 90); }
    out.ok = !!(out.formal || out.informal);
    return new Response(JSON.stringify(out), { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
  }
};
