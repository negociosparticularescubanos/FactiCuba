// FactiCuba · Espejo de tasas y mercado — Cloudflare Worker (v2).
// Lee BCC, elToque, Revolico, Wikipedia, DuckDuckGo y turismo en el SERVIDOR
// y los devuelve con CORS abierto. Rutas:
//   GET /tasas            → formal BCC (TODAS las divisas Seg. III) + informal elToque
//   GET /revolico?q=      → anuncios reales (titulo, precio, moneda, url, fecha)
//   GET /wiki?q=          → resultados Wikipedia ES
//   GET /buscar?q=        → búsqueda web sin claves (Wikipedia + DuckDuckGo)
//   GET /turismo          → puntos históricos reales de turismo en Cuba (Wikipedia EN)
// Despliegue: Cloudflare Dashboard → Workers y Pages → Crear → pegar este
// archivo → Implementar. Caché pública de 5 min. Sin secretos ni claves.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (o) => new Response(JSON.stringify(o), { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
const UA = { "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36", "Accept-Language": "es" };
const trunc = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

async function tasas() {
  const out = { ok: false, fecha: new Date().toISOString(), servicio: "tasas" };
  try {
    const r = await fetch("https://api.bc.gob.cu/v1/tasas-de-cambio/activas", { headers: { "User-Agent": "FactiCuba" } });
    const j = await r.json();
    out.formalTodas = {};
    for (const t of (j.tasas || [])) {
      if (t.codigoMoneda && t.tasaEspecial > 0) out.formalTodas[t.codigoMoneda] = Math.round(t.tasaEspecial * 100) / 100;
    }
    const f = {};
    if (out.formalTodas.USD) f.USD = out.formalTodas.USD;
    if (out.formalTodas.EUR) f.EUR = out.formalTodas.EUR;
    out.formal = Object.keys(f).length ? f : null;
    out.fechaBCC = j.fechaDia || j.fechaHoy || ((j.tasas && j.tasas[0]) ? j.tasas[0].fechaDia : null);
    if (!out.formal) { out.errBCC = "sin USD/EUR en la respuesta (HTTP " + r.status + ")"; out.formalTodas = null; }
  } catch (e) { out.formal = null; out.formalTodas = null; out.errBCC = trunc(e, 90); }
  try {
    const r = await fetch("https://eltoque.com/tasas-de-cambio-cuba", { headers: UA });
    const h = await r.text();
    const inf = {};
    let m; const re = /"name":"([A-Z]+)\/CUP"[^}]*?"value":\s*"?([0-9]+(?:\.[0-9]+)?)"?/g;
    while ((m = re.exec(h))) {
      const k = (m[1] === "ECU") ? "EUR" : m[1];
      if (k === "USD" || k === "EUR" || k === "MLC") inf[k] = parseFloat(m[2]);
    }
    if (!inf.USD) {
      const t = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
      const seg = t.search(/mercado informal/i) >= 0 ? t.slice(t.search(/mercado informal/i), t.search(/mercado informal/i) + 6000) : t;
      const g = (re2) => { const x = seg.match(re2); return x ? parseFloat(x[1].replace(",", ".")) : null; };
      const u = g(/1\s+USD[^0-9]{0,60}?([0-9]{2,4}(?:[.,][0-9]{1,2})?)\s*CUP/i);
      const e2 = g(/1\s+EUR[^0-9]{0,60}?([0-9]{2,4}(?:[.,][0-9]{1,2})?)\s*CUP/i);
      const ml = g(/1\s+MLC[^0-9]{0,60}?([0-9]{2,4}(?:[.,][0-9]{1,2})?)\s*CUP/i);
      if (u) inf.USD = u; if (e2) inf.EUR = e2; if (ml) inf.MLC = ml;
    }
    const dm = h.match(/"dateModified":"([^"]+)"/);
    out.fechaToque = dm ? dm[1] : null;
    if (inf.USD) out.informal = inf; else { out.informal = null; out.errToque = "sin tasas legibles en la pagina (HTTP " + r.status + ")"; }
  } catch (e) { out.informal = null; out.errToque = trunc(e, 90); }
  out.ok = !!(out.formal || out.informal);
  return json(out);
}

async function revolico(q) {
  q = (q || "").slice(0, 80);
  if (!q) return json({ ok: false, error: "falta ?q=" });
  const searchUrl = "https://www.revolico.com/search/?q=" + encodeURIComponent(q);
  try {
    const r = await fetch(searchUrl, { headers: UA });
    const h = await r.text();
    const items = [];
    const seen = new Set();
    const push = (titulo, precio, moneda, link, fecha) => {
      titulo = trunc(titulo.replace(/&amp;/g, "&").replace(/&#x27;/g, "'"), 90);
      const p = parseFloat(precio);
      if (!titulo || !(p > 0) || items.length >= 40) return;
      const k = titulo.toLowerCase() + "|" + p + "|" + moneda;
      if (seen.has(k)) return; seen.add(k);
      items.push({ titulo, precio: String(precio), moneda, url: link && link.startsWith("/") ? "https://www.revolico.com" + link : (link || searchUrl), fecha: fecha || null });
    };
    let m;
    const re1 = /"title":"([^"]{3,120})"[^}]{0,800}?"price":([\d.]+)[^}]{0,300}?"currency":"([A-Z]{3})"[^}]{0,500}?"permalink":"([^"]+)"/g;
    while ((m = re1.exec(h))) push(m[1], m[2], m[3], m[4], (h.slice(m.index, m.index + 1500).match(/"updatedOnToOrder":"([^"]+)"/) || [])[1]);
    if (!items.length) {
      const re2 = /"permalink":"([^"]+)"[^}]{0,600}?"title":"([^"]{3,120})"[^}]{0,600}?"price":([\d.]+)[^}]{0,200}?"currency":"([A-Z]{3})"/g;
      while ((m = re2.exec(h))) push(m[2], m[3], m[4], m[1], null);
    }
    if (!items.length) {
      const re3 = /"title":"([^"]{3,120})"[^}]{0,800}?"price":([\d.]+)[^}]{0,300}?"currency":"([A-Z]{3})"/g;
      while ((m = re3.exec(h))) push(m[1], m[2], m[3], null, null);
    }
    return json({ ok: items.length > 0, query: q, fecha: new Date().toISOString(), items, url: searchUrl, total: items.length });
  } catch (e) { return json({ ok: false, query: q, error: trunc(e, 90) }); }
}

async function wiki(q) {
  q = (q || "").slice(0, 120);
  if (!q) return json({ ok: false, error: "falta ?q=" });
  try {
    const r = await fetch("https://es.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=" + encodeURIComponent(q) + "&srlimit=8&origin=*", { headers: UA });
    const j = await r.json();
    const items = ((j.query && j.query.search) || []).slice(0, 8).map((x) => ({
      fuente: "Wikipedia",
      titulo: x.title,
      extracto: trunc(String(x.snippet || "").replace(/<[^>]+>/g, " "), 280),
      url: "https://es.wikipedia.org/wiki/" + encodeURIComponent(String(x.title).replace(/ /g, "_"))
    }));
    return json({ ok: items.length > 0, query: q, fecha: new Date().toISOString(), items });
  } catch (e) { return json({ ok: false, query: q, error: trunc(e, 90) }); }
}

async function buscar(q) {
  q = (q || "").slice(0, 120);
  if (!q) return json({ ok: false, error: "falta ?q=" });
  const items = [];
  const seen = new Set();
  const add = (x) => { const k = String(x.url || "").toLowerCase(); if (!k || seen.has(k)) return; seen.add(k); items.push(x); };
  try {
    const r = await fetch("https://es.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=" + encodeURIComponent(q) + "&srlimit=5&origin=*", { headers: UA });
    const j = await r.json();
    for (const x of ((j.query && j.query.search) || []).slice(0, 5)) {
      add({ fuente: "Wikipedia", titulo: x.title, extracto: trunc(String(x.snippet || "").replace(/<[^>]+>/g, " "), 280), url: "https://es.wikipedia.org/wiki/" + encodeURIComponent(String(x.title).replace(/ /g, "_")) });
    }
  } catch (e) {}
  try {
    const r = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1&skip_disambig=1", { headers: UA });
    const j = await r.json();
    if (j.AbstractURL && j.AbstractText) add({ fuente: "DuckDuckGo", titulo: j.Heading || q, extracto: trunc(j.AbstractText, 280), url: j.AbstractURL });
    for (const t of (j.RelatedTopics || []).slice(0, 6)) {
      if (t.FirstURL && t.Text) add({ fuente: "DuckDuckGo", titulo: trunc(t.Text.split(" - ")[0] || t.FirstURL, 90), extracto: trunc(t.Text, 280), url: t.FirstURL });
    }
  } catch (e) {}
  return json({ ok: items.length > 0, query: q, fecha: new Date().toISOString(), items: items.slice(0, 10) });
}

async function turismo() {
  try {
    const r = await fetch("https://en.wikipedia.org/w/api.php?action=parse&format=json&page=Tourism_in_Cuba&prop=wikitext&origin=*", { headers: UA });
    const j = await r.json();
    const wt = (j.parse && j.parse.wikitext && j.parse.wikitext["*"]) || "";
    const clean = wt.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, " ").replace(/{{[^}]*}}/g, " ");
    const puntos = [];
    const seen = new Set();
    const re = /(\d[\d.,]*\s*million[^.\n]{0,160})/gi;
    let m;
    while ((m = re.exec(clean)) && puntos.length < 8) {
      const ctx = clean.slice(Math.max(0, m.index - 90), m.index + 170);
      const y = ctx.match(/(19|20)\d{2}/);
      const txt = trunc(m[1].replace(/\[\[[^\]]*\]\]/g, " "), 170);
      const k = txt.slice(0, 60);
      if (!seen.has(k) && /arrivals|visitors|visited|tourist/i.test(ctx)) { seen.add(k); puntos.push({ texto: txt + (y ? " (" + y[0] + ")" : ""), url: "https://en.wikipedia.org/wiki/Tourism_in_Cuba" }); }
    }
    return json({ ok: puntos.length > 0, fecha: new Date().toISOString(), fuente: "Wikipedia · Tourism in Cuba (cifras históricas de referencia; el dato mensual vigente lo aporta la ONEI)", url: "https://en.wikipedia.org/wiki/Tourism_in_Cuba", puntos });
  } catch (e) { return json({ ok: false, error: trunc(e, 90) }); }
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/tasas") return tasas();
    if (url.pathname === "/revolico") return revolico(url.searchParams.get("q"));
    if (url.pathname === "/wiki") return wiki(url.searchParams.get("q"));
    if (url.pathname === "/buscar") return buscar(url.searchParams.get("q"));
    if (url.pathname === "/turismo") return turismo();
    return json({ ok: true, servicio: "FactiCuba · espejo de tasas y mercado v2", rutas: ["/tasas", "/revolico?q=", "/wiki?q=", "/buscar?q=", "/turismo"], workerVersion: 2 });
  }
};
