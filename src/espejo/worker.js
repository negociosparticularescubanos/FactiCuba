// FactiCuba · Espejo de tasas y mercado — Cloudflare Worker.
// Lee BCC, elToque, Revolico y Wikipedia en el SERVIDOR y los devuelve
// con CORS abierto, para que la app (Perchance o GitHub Pages) sincronice
// desde cualquier navegador sin claves ni intermediarios.
// Despliegue: Cloudflare Dashboard → Workers y Pages → Crear → pegar este
// archivo → Implementar. Rutas: GET /tasas · GET /revolico?q= · GET /wiki?q=
// con caché pública de 5 min. Sin secretos ni claves en este archivo.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (o) => new Response(JSON.stringify(o), { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
const UA = { "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36", "Accept-Language": "es" };

async function tasas() {
  const out = { ok: true, fecha: new Date().toISOString() };
  try {
    const r = await fetch("https://api.bc.gob.cu/v1/tasas-de-cambio/activas", { headers: { "User-Agent": "FactiCuba" } });
    const j = await r.json();
    out.formal = {};
    for (const t of (j.tasas || [])) {
      if (t.codigoMoneda === "USD" || t.codigoMoneda === "EUR") out.formal[t.codigoMoneda] = t.tasaEspecial;
    }
    out.fechaBCC = j.fechaDia || j.fechaHoy || ((j.tasas && j.tasas[0]) ? j.tasas[0].fechaDia : null);
    if (!out.formal.USD) { out.errBCC = "sin USD en la respuesta (HTTP " + r.status + ")"; out.formal = null; }
  } catch (e) { out.formal = null; out.errBCC = String(e).slice(0, 90); }
  try {
    const r = await fetch("https://eltoque.com/tasas-de-cambio-cuba", { headers: UA });
    const h = await r.text();
    const inf = {};
    const re = /"name":"([A-Z]+)\/CUP"[^}]*?"value":\s*"?([0-9]+(?:\.[0-9]+)?)"?/g;
    let m;
    while ((m = re.exec(h))) {
      const k = (m[1] === "ECU") ? "EUR" : m[1];
      if (k === "USD" || k === "EUR" || k === "MLC") inf[k] = parseFloat(m[2]);
    }
    const dm = h.match(/"dateModified":"([^"]+)"/);
    out.fechaToque = dm ? dm[1] : null;
    if (inf.USD) out.informal = inf; else { out.informal = null; out.errToque = "sin tasas legibles en la página (HTTP " + r.status + ")"; }
  } catch (e) { out.informal = null; out.errToque = String(e).slice(0, 90); }
  out.ok = !!(out.formal || out.informal);
  return json(out);
}

async function revolico(q) {
  q = (q || "").slice(0, 80);
  if (!q) return json({ ok: false, error: "falta ?q=" });
  try {
    const r = await fetch("https://www.revolico.com/search/?q=" + encodeURIComponent(q), { headers: UA });
    const h = await r.text();
    const items = [];
    const re = /"title":"([^"]{3,90})"[^}]{0,500}?"price":([\d.]+)[^}]{0,200}?"currency":"([A-Z]{3})"/g;
    let m, n = 0;
    while ((m = re.exec(h)) && n < 40) { n++; items.push({ titulo: m[1], precio: m[2], moneda: m[3] }); }
    return json({ ok: items.length > 0, query: q, fecha: new Date().toISOString(), items, url: "https://www.revolico.com/search/?q=" + encodeURIComponent(q) });
  } catch (e) { return json({ ok: false, query: q, error: String(e).slice(0, 90) }); }
}

async function wiki(q) {
  q = (q || "").slice(0, 120);
  if (!q) return json({ ok: false, error: "falta ?q=" });
  try {
    const r = await fetch("https://es.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=" + encodeURIComponent(q) + "&srlimit=5&origin=*", { headers: UA });
    const j = await r.json();
    const items = ((j.query && j.query.search) || []).slice(0, 5).map((x) => ({
      fuente: "Wikipedia",
      titulo: x.title,
      extracto: String(x.snippet || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280),
      url: "https://es.wikipedia.org/wiki/" + encodeURIComponent(String(x.title).replace(/ /g, "_"))
    }));
    return json({ ok: items.length > 0, query: q, fecha: new Date().toISOString(), items });
  } catch (e) { return json({ ok: false, query: q, error: String(e).slice(0, 90) }); }
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/tasas") return tasas();
    if (url.pathname === "/revolico") return revolico(url.searchParams.get("q"));
    if (url.pathname === "/wiki") return wiki(url.searchParams.get("q"));
    return json({ ok: true, servicio: "FactiCuba · espejo de tasas y mercado", rutas: ["/tasas", "/revolico?q=", "/wiki?q="] });
  }
};
