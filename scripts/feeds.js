#!/usr/bin/env node
/*
 * 巡回サイトのRSS/Atomを自動で探して、新着を patrol-updates.json に書き出す。
 *   node scripts/feeds.js
 * ・patrol.json の各サイトについて、フィードのURLを自動検出する(1回見つけたら patrol-feeds.json に保存)。
 * ・ページは取得できたのにフィードが見つからなかったサイトは、30日は探し直さない。
 * ・ページ自体が取得できなかったとき(ネットワークの問題など)は、「なし」と記録しない。次回また探す。
 * 依存パッケージなし(Node 18以上)。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (compatible; DailyDigestFeedCheck/1.0)';
const TIMEOUT_MS = 12000;
const RETRY_DAYS = 30;
const FRESH_HOURS = 48;
const CANDIDATES = ['/feed', '/feed/', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/blog/feed', '/news/feed'];

const dec = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xml,application/rss+xml,*/*' }, redirect: 'follow', signal: ctl.signal });
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    return { ok: true, text: text.slice(0, 600000), url: res.url };
  } catch (e) {
    return { ok: false, error: String(e && e.message) };
  } finally {
    clearTimeout(t);
  }
}

const looksLikeFeed = (txt) => /<(rss|feed|rdf:RDF)[\s>]/i.test(String(txt).slice(0, 4000));

/* ページ内の <link rel="alternate" type="application/rss+xml" href="..."> を探す */
function findFeedLinks(html, base) {
  const out = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    if (!/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const h = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!h) continue;
    try { out.push(new URL(h[1].replace(/&amp;/g, '&'), base).href); } catch (e) { /* 無視 */ }
  }
  return out;
}

/* RSS 2.0 / RSS 1.0 / Atom から、最新の記事を取り出す */
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = dec((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    let link = '';
    const atom = b.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (atom) link = atom[1];
    else link = dec((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1]);
    const d = (b.match(/<(pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/\1>/i) || [])[2];
    const t = d ? Date.parse(dec(d)) : NaN;
    if (title && link) items.push({ title, url: link, ts: Number.isNaN(t) ? null : t });
  }
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return items;
}

async function discover(site) {
  const page = await get(site.url);
  if (!page.ok) return { state: 'unreachable' };
  if (looksLikeFeed(page.text)) return { state: 'found', url: site.url };
  for (const u of findFeedLinks(page.text, page.url || site.url)) {
    const f = await get(u);
    if (f.ok && looksLikeFeed(f.text)) return { state: 'found', url: u };
  }
  const origin = new URL(page.url || site.url).origin;
  for (const c of CANDIDATES) {
    const f = await get(origin + c);
    if (f.ok && looksLikeFeed(f.text)) return { state: 'found', url: origin + c };
  }
  return { state: 'none' };
}

async function pool(items, n, fn) {
  const q = items.slice();
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()); }));
}

async function main() {
  const patrol = JSON.parse(fs.readFileSync(path.join(ROOT, 'patrol.json'), 'utf8'));
  const cacheFile = path.join(ROOT, 'patrol-feeds.json');
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : { feeds: {} };
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const updates = {};
  const stat = { found: 0, none: 0, unreachable: 0, fetched: 0, failed: 0 };

  await pool(patrol.sites, 6, async (site) => {
    let ent = cache.feeds[site.name];
    const stale = ent && ent.url === null && ent.checked && (now - Date.parse(ent.checked)) / 86400000 > RETRY_DAYS;
    if (!ent || stale) {
      const r = await discover(site);
      if (r.state === 'found') { ent = { url: r.url, checked: today }; stat.found++; }
      else if (r.state === 'none') { ent = { url: null, checked: today }; stat.none++; }
      else { stat.unreachable++; return; } // 取得できなかった。「なし」とは記録しない
      cache.feeds[site.name] = ent;
    }
    if (!ent.url) return;
    const f = await get(ent.url);
    if (!f.ok) { stat.failed++; return; }
    const items = parseFeed(f.text);
    if (!items.length) { stat.failed++; return; }
    stat.fetched++;
    const top = items[0];
    updates[site.name] = {
      title: top.title,
      url: top.url,
      date: top.ts ? new Date(top.ts + 9 * 3600000).toISOString().slice(0, 10) : null,
      fresh: top.ts ? now - top.ts < FRESH_HOURS * 3600000 : false,
    };
  });

  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'patrol-updates.json'), JSON.stringify({ generated: new Date().toISOString(), updates }, null, 2) + '\n');
  console.log(`フィード: 新規に見つけた ${stat.found} / なし ${stat.none} / ページを取得できず ${stat.unreachable} / 新着を取得 ${stat.fetched} / 取得失敗 ${stat.failed}`);
}

module.exports = { parseFeed, findFeedLinks, looksLikeFeed };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(0); }); // 失敗しても、号づくりは止めない
