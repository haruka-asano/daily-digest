#!/usr/bin/env node
/*
 * Daily Digest ビルドスクリプト
 *   node build.js            data/*.json をすべて docs/ に書き出す
 *   node build.js --check    チェックだけ行う(書き出さない)
 * 依存パッケージはありません(Node 18以上)。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'docs');
const CHECK_ONLY = process.argv.includes('--check');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const G = {
  ai: { n: 'AI', v: '--c-ai' },
  design: { n: 'デザイン', v: '--c-design' },
  web: { n: 'Web', v: '--c-web' },
  econ: { n: '経済・国際', v: '--c-econ' },
  trend: { n: 'トレンド', v: '--c-trend' },
  film: { n: '映画', v: '--c-film' },
  comedy: { n: 'お笑い', v: '--c-comedy' },
  culture: { n: '文化', v: '--c-culture' },
  fashion: { n: 'ファッション・ビューティー', v: '--c-fashion' },
};
const STUDY = ['design', 'web', 'econ', 'trend'];
const HOBBY = ['film', 'comedy', 'culture', 'fashion'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEK = '日月火水木金土';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);

/* ---------- チェック ---------- */
function validate(d, file) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(`${file}: ${msg}`); };
  need(/^\d{4}-\d{2}-\d{2}$/.test(d.date || ''), 'date は YYYY-MM-DD 形式');
  need(['morning', 'evening'].includes(d.edition), 'edition は morning か evening');
  const checkCard = (c, where) => {
    need(c && G[c.g], `${where}: g(ジャンル)が不正`);
    need([1, 2, 3].includes(c.s), `${where}: s(重要度)は 1〜3`);
    need(Number.isInteger(c.t) && c.t >= 1, `${where}: t(分)は1以上の整数`);
    for (const k of ['h', 'a', 'b', 'u', 'm']) need(typeof c[k] === 'string' && c[k].length > 0, `${where}: ${k} が空`);
    need(Array.isArray(c.r) && c.r.length >= 1 && c.r.every((x) => x.t && isUrl(x.u)), `${where}: r(出典)にhttp(s)のURLが必要`);
    if (c.img) need(isUrl(c.img.u) && c.img.a && c.img.c, `${where}: img は u(http/https)・a(代替文)・c(出典表記)が必要`);
  };
  if (d.ai) {
    if (d.ai.lead) checkCard({ g: 'ai', ...d.ai.lead }, 'ai.lead');
    (d.ai.cards || []).forEach((c, i) => checkCard(c, `ai.cards[${i}]`));
  }
  for (const k of STUDY) ((d.study || {})[k] || []).forEach((c, i) => { need(c.g === k, `study.${k}[${i}]: g は ${k}`); checkCard(c, `study.${k}[${i}]`); });
  for (const k of HOBBY) ((d.hobby || {})[k] || []).forEach((c, i) => { need(c.g === k, `hobby.${k}[${i}]: g は ${k}`); checkCard(c, `hobby.${k}[${i}]`); });
  if (d.gallery) {
    (d.gallery.sites || []).forEach((st, i) => {
      need(st.name, `gallery.sites[${i}]: name が空`);
      need(isUrl(st.url), `gallery.sites[${i}]: url が必要`);
      [...(st.today || []), ...((st.latest && st.latest.items) || [])].forEach((it, j) => {
        need(it.title && isUrl(it.url) && isUrl(it.img), `gallery.sites[${i}] の ${j} 番目: title・url・img(https) が必要`);
      });
    });
  }
  return errs;
}

/* ---------- 部品 ---------- */
const crypto = require('crypto');
const stars = (n) => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
const srcs = (r) =>
  r && r.length
    ? `<p class="src">出典: ${r.map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>`).join(' ')}</p>`
    : '';
let CUR_DATE = '';
const ckBtn = (obj) =>
  `<button type="button" class="ck" aria-pressed="false" aria-label="気になる記事に入れる" title="気になる" data-ck="${esc(JSON.stringify(obj))}">☆</button>`;
const idOf = (t) => CUR_DATE + '-' + crypto.createHash('md5').update(String(t)).digest('hex').slice(0, 8);

function card(c) {
  const g = G[c.g];
  const img = c.img
    ? `<figure class="ph"><img src="${esc(c.img.u)}" alt="${esc(c.img.a)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><figcaption>${esc(c.img.c)}</figcaption></figure>`
    : '';
  const save = { id: idOf(c.h), date: CUR_DATE, gl: g.n, h: c.h, a: c.a, r: c.r, img: c.img ? c.img.u : '' };
  return `<article class="card" data-g="${c.g}" data-min="${c.t}" style="--g:var(${g.v})"><div class="tab">${ckBtn(save)}${esc(c.c || g.n)}</div>${img}<div class="body">
<div class="pills"><span class="pill"><i></i>重要度 ${stars(c.s)}</span><span class="pill">${c.t}分</span>${c.p ? `<span class="pill price">${esc(c.p)}</span>` : ''}${c.n ? `<span class="pill note">${esc(c.n)}</span>` : ''}</div>
<h3>${esc(c.h)}</h3><p class="lead-s">${esc(c.a)}</p>
<dl class="rows"><div class="r"><dt>なぜ今</dt><dd>${esc(c.b)}</dd></div><div class="r"><dt>自分ごと</dt><dd>${esc(c.u)}</dd></div></dl>
<details><summary>もっと詳しく</summary><p>${esc(c.m)}</p></details>${srcs(c.r)}</div></article>`;
}

const grid = (arr) => `<div class="grid">${arr.map(card).join('\n')}</div>`;

/* 小見出し + カード(経済・トレンド・デザインなど) */
const subSec = (id, key, arr) =>
  arr && arr.length
    ? `<section class="sub" id="${id}" data-sec="list" style="--g:var(${G[key].v})"><h3 class="grp-h"><i></i>${G[key].n}</h3>${grid(arr)}</section>`
    : '';

function aiSection(ai) {
  if (!ai) return '';
  const l = ai.lead;
  const lead = l
    ? `<div class="lead"><div><div class="pills"><span class="pill"><i></i>重要度 ${stars(l.s)}</span><span class="pill">${l.t}分</span>${l.n ? `<span class="pill note">${esc(l.n)}</span>` : ''}</div><h3>${esc(l.h)}</h3></div>
<div><p class="lead-s">${esc(l.a)}</p><dl class="rows"><div class="r"><dt>なぜ今</dt><dd>${esc(l.b)}</dd></div><div class="r"><dt>自分ごと</dt><dd>${esc(l.u)}</dd></div></dl>
<details><summary>もっと詳しく</summary><p>${esc(l.m)}</p></details>${srcs(l.r)}</div></div>`
    : '';
  const EMPTY = ['確認できず', 'なし', '確認中'];
  const rows = (ai.rows || [])
    .filter((r) => !EMPTY.includes(r.tag))
    .map((r) => `<div class="co"><b>${esc(r.co)}</b><span class="pill"><i></i>${esc(r.tag)}</span><span class="d">${esc(r.text)}</span></div>`)
    .join('\n');
  const save = l ? { id: idOf(l.h), date: CUR_DATE, gl: 'AI', h: l.h, a: l.a, r: l.r, img: l.img ? l.img.u : '' } : null;
  return `<section class="sub" id="ai" data-sec="ai" style="--g:var(--c-ai)"><h3 class="grp-h"><i></i>AI</h3>
<article class="card aibox" data-g="ai" data-min="${l ? l.t : 0}" style="--g:var(--c-ai)"><div class="tab">${save ? ckBtn(save) : ''}AI</div><div class="body">${lead}
${rows}</div></article>
${ai.cards && ai.cards.length ? `<div class="grid" style="margin-top:18px">${ai.cards.map(card).join('\n')}</div>` : ''}</section>`;
}

function buzzSection(buzz) {
  if (!buzz || !buzz.length) return '';
  const rows = buzz
    .map((b) => `<div class="tr2"><b>${esc(b.kw)}</b><span>${esc(b.text)}${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">Yahoo!リアルタイム検索</a>` : ''}</span></div>`)
    .join('\n');
  return `<section class="sub" id="buzz" style="--g:var(--c-x)"><h3 class="grp-h"><i></i>Xの話題<span class="cnt">Yahoo!リアルタイム検索で見えた、いま話題の投稿</span></h3><div class="box">${rows}</div></section>`;
}

function galItem(it, site) {
  const save = { id: idOf(site + it.url), date: CUR_DATE, gl: 'Webギャラリー', h: it.title, a: (site ? site + ' / ' : '') + (it.credit || ''), r: [{ t: site || 'サイト', u: it.url }], img: it.img };
  return `<div class="gi"><a href="${esc(it.url)}" target="_blank" rel="noopener"><figure><img src="${esc(it.img)}" alt="${esc(it.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')"></figure></a>
<div class="gc">${ckBtn(save)}${it.tag ? `<span class="pill">${esc(it.tag)}</span> ` : ''}<a class="gt" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a>${it.credit ? `<span class="cr">${esc(it.credit)}</span>` : ''}</div></div>`;
}

function gallerySection(g) {
  if (!g || !g.sites) return '';
  const sites = g.sites
    .map((st) => ({ st, today: st.today || [], latest: st.latest && st.latest.items && st.latest.items.length ? st.latest : null }))
    .filter((x) => x.today.length || x.latest) // 取得できなかったサイトは出さない
    .sort((p, q) => (q.today.length > 0) - (p.today.length > 0)); // 今日の更新があるサイトを先に
  if (!sites.length) return '';
  const blocks = sites
    .map(({ st, today, latest }) => {
      const head = (cnt) => `<h4 class="gh"><a href="${esc(st.url)}" target="_blank" rel="noopener">${esc(st.name)}</a>${cnt}</h4>`;
      if (today.length) {
        return `<div class="gsite today">${head(`<span class="gbadge">本日更新 ${today.length}件</span>`)}<div class="gal">${today.map((it) => galItem(it, st.name)).join('')}</div></div>`;
      }
      return `<div class="gsite past">${head(`<span class="cnt">本日の更新なし / 直近の更新 ${esc(latest.date)}</span>`)}<div class="gal">${latest.items.map((it) => galItem(it, st.name)).join('')}</div></div>`;
    })
    .join('\n');
  return `<section class="sub" id="gallery" style="--g:var(--c-web)"><h3 class="grp-h"><i></i>Webデザインギャラリー<span class="cnt">枠のあるサイトは本日の更新(アワードはSite of the Dayのみ)</span></h3>${blocks}${srcs(g.src)}</section>`;
}

let PATROL = { perDay: 6, sites: [] };
let PATROL_UPD = {};
try { PATROL = JSON.parse(fs.readFileSync(path.join(ROOT, 'patrol.json'), 'utf8')); } catch (e) { /* なければ巡回リンクは出さない */ }
try { PATROL_UPD = JSON.parse(fs.readFileSync(path.join(ROOT, 'patrol-updates.json'), 'utf8')).updates || {}; } catch (e) { /* なければ新着表示なし */ }

function ptItem(x, withBox) {
  const u = PATROL_UPD[x.name];
  const upd = u
    ? `<a class="ptu" href="${esc(u.url)}" target="_blank" rel="noopener">${u.fresh ? '<span class="new">NEW</span>' : ''}${esc(u.title)}${u.date ? `<span class="ptd2">${esc(u.date.slice(5).replace('-', '/'))}</span>` : ''}</a>`
    : '';
  const main = withBox
    ? `<label><input type="checkbox" data-pt="${esc(x.name)}"><a class="ptl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a></label>`
    : `<a class="ptl" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`;
  return `<div class="pt" data-cat="${esc(x.cat)}">${main}<span class="ptn">${esc(x.cat)}</span>${upd}</div>`;
}

/* カテゴリを交互に並べる(毎日のローテーションで、種類がばらけるように) */
function interleave(sites) {
  const byCat = {};
  sites.forEach((s) => (byCat[s.cat] = byCat[s.cat] || []).push(s));
  const cats = Object.keys(byCat);
  const out = [];
  for (let i = 0; out.length < sites.length; i++) cats.forEach((c) => { if (byCat[c][i]) out.push(byCat[c][i]); });
  return out;
}

function patrolSection() {
  const sites = PATROL.sites || [];
  if (!sites.length) return '';
  const daily = sites.filter((x) => x.tier === 'daily');
  const rotate = interleave(sites.filter((x) => x.tier === 'rotate'));
  const shelf = sites.filter((x) => x.tier === 'shelf');
  const shelfCats = [...new Set(shelf.map((x) => x.cat))];
  const rotAll = rotate.map((x, i) => `<div class="rotwrap" data-i="${i}">${ptItem(x, true)}</div>`).join('');
  return `<section class="sub" id="patrol" style="--g:var(--c-web)" data-per-day="${PATROL.perDay || 6}"><h3 class="grp-h"><i></i>巡回リンク<span class="cnt" id="patrolN"></span></h3>
<p class="ptd">自分で見に行くサイトです。リンクを開くと、今日の分にチェックが付きます(翌日に消えます)。ローテーションは日付で自動的に決まります。</p>
<h4 class="pth">毎日のお気に入り</h4><div class="ptg" id="ptDaily">${daily.map((x) => ptItem(x, true)).join('')}</div>
<h4 class="pth">今日のローテーション</h4><div class="ptg" id="ptToday"></div>
<details class="pta"><summary>ローテーション全体を見る(${rotate.length}サイト)</summary><div class="ptg" id="ptRest">${rotAll}</div></details>
<details class="pta"><summary>資料棚(アーカイブ・UIガイドなど ${shelf.length}サイト)</summary>${shelfCats.map((c) => `<h4 class="pth">${esc(c)}</h4><div class="ptg">${shelf.filter((x) => x.cat === c).map((x) => ptItem(x, false)).join('')}</div>`).join('')}</details></section>`;
}

function alertsSection(a, srcList) {
  if (!a || !a.length) return '';
  const items = a
    .map((x) => `<article class="card" style="--g:var(${G[x.g].v})"><div class="tab"><span>${esc(x.kind)}</span><b>${esc(x.days)}</b></div><div class="body"><h3>${esc(x.title)}</h3><p>${esc(x.place)}</p></div></article>`)
    .join('\n');
  return `<section class="sub" id="alerts" style="--g:var(--c-culture)"><h3 class="grp-h"><i></i>会期終了間近<span class="cnt">今週末までに行けるもの</span></h3><div class="al">${items}</div>${srcs(srcList)}</section>`;
}

function calendarSection(rows, srcList) {
  if (!rows || !rows.length) return '';
  const items = rows
    .map((r) => `<div class="tr"><span class="k">${esc(r.k)}</span><span class="t">${esc(r.t)}${r.d ? `<span class="d">${esc(r.d)}</span>` : ''}</span><span class="s">${esc(r.s)}</span></div>`)
    .join('\n');
  return `<section class="sub" id="calendar" style="--g:var(--c-x)"><h3 class="grp-h"><i></i>賞レース・映画祭カレンダー<span class="cnt">これからの予定を日付順に</span></h3><div class="box">${items}</div>${srcs(srcList)}</section>`;
}

function quickSection(q) {
  if (!q || !q.length) return '';
  const items = q
    .map((x) => {
      const src = x.src ? `<a href="${esc(x.src.u)}" target="_blank" rel="noopener">${esc(x.src.t)}</a>` : '';
      return `<details class="qd"><summary><b>${esc(x.c)}</b><span>${esc(x.text)}</span></summary><div class="qb">${x.m ? `<p>${esc(x.m)}</p>` : ''}<p class="src">${src ? '出典: ' + src : ''}</p></div></details>`;
    })
    .join('\n');
  return `<section class="sub" id="quick" style="--g:var(--c-econ)"><div class="box qbox">${items}</div></section>`;
}

function termSection(t) {
  if (!t) return '';
  return `<section class="sub" id="term" style="--g:var(--c-econ)"><article class="card term" style="--g:var(--c-econ)" data-min="1"><div class="tab">今日の用語</div><div class="body"><div><span class="en">Today's word</span></div><div><p class="w">${esc(t.w)}</p><p>${esc(t.text)}</p><p class="src">${t.note ? esc(t.note) + ' ' : ''}${t.src ? `出典: <a href="${esc(t.src.u)}" target="_blank" rel="noopener">${esc(t.src.t)}</a>` : ''}</p></div></div></article></section>`;
}

function weeklySection(w, wd) {
  if (!w || !w.items || !w.items.length) return '';
  const cells = w.items.map((i) => `<div><b>${esc(i.h)}</b>${esc(i.text)}</div>`).join('');
  return `<section class="sub" id="weekly" style="--g:var(--c-trend)"><article class="card" style="--g:var(--c-trend)"><div class="tab">${wd}曜号 / 今週ここまで</div><div class="wk">${cells}</div></article></section>`;
}

/* ---------- ページ ---------- */
const block = (n, en, ja, inner) =>
  inner.trim() ? `<div class="blk blk${n}"><div class="bh"><span class="en">${en}</span><h2>${ja}</h2></div>${inner}</div>` : '';

function page(d) {
  CUR_DATE = d.date;
  const [y, m, day] = d.date.split('-').map(Number);
  const wd = WEEK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  const asof = d.asof ? ` ${esc(d.asof)}現在` : '';
  const dateHtml = `<div class="date">${y}.<b>${m}.${day} ${wd}</b>${asof}</div>`;

  const parts = {
    quick: quickSection(d.quick),
    ai: aiSection(d.ai),
    econ: subSec('econ', 'econ', (d.study || {}).econ),
    trend: subSec('trend', 'trend', (d.study || {}).trend),
    buzz: buzzSection(d.buzz),
    design: subSec('design', 'design', (d.study || {}).design),
    web: subSec('web', 'web', (d.study || {}).web),
    gallery: gallerySection(d.gallery),
    patrol: patrolSection(),
    film: subSec('film', 'film', (d.hobby || {}).film),
    comedy: subSec('comedy', 'comedy', (d.hobby || {}).comedy),
    culture: subSec('culture', 'culture', (d.hobby || {}).culture),
    // 以前の "finds"(心躍る新作)は、ファッション・ビューティーに統合して表示する
    fashion: subSec('fashion', 'fashion', [...((d.hobby || {}).fashion || []), ...(((d.hobby || {}).finds || []).map((c) => ({ ...c, g: 'fashion' })))]),
    alerts: alertsSection(d.alerts, d.alertsSrc),
    calendar: calendarSection(d.calendar, d.calendarSrc),
    term: termSection(d.term),
    weekly: weeklySection(d.weekly, wd),
  };
  const groups = [
    ['quick'],
    ['ai', 'econ', 'trend', 'buzz'],
    ['design', 'web', 'gallery', 'patrol'],
    ['film', 'comedy', 'culture', 'fashion', 'alerts', 'calendar', 'term', 'weekly'],
  ];
  const NAV = {
    quick: ['ひとこと', '--c-econ'], ai: ['AI', '--c-ai'], econ: ['経済・国際', '--c-econ'], trend: ['トレンド', '--c-trend'], buzz: ['Xの話題', '--c-x'],
    design: ['デザイン', '--c-design'], web: ['Web', '--c-web'], gallery: ['Webギャラリー', '--c-web'], patrol: ['巡回リンク', '--c-web'],
    film: ['映画', '--c-film'], comedy: ['お笑い', '--c-comedy'], culture: ['文化', '--c-culture'], fashion: ['ファッション', '--c-fashion'],
    alerts: ['会期終了間近', '--c-culture'], calendar: ['カレンダー', '--c-x'], term: ['今日の用語', '--c-econ'], weekly: [`${wd}曜号`, '--c-trend'],
  };
  const navGroups = groups
    .map((g) => g.filter((k) => parts[k]).map((k) => `<a href="#${k}" style="--g:var(${NAV[k][1]})"><i></i>${NAV[k][0]}</a>`).join(''))
    .filter(Boolean);
  const toc = navGroups.join('<span class="sep"></span>');
  const inner = (g) => g.map((k) => parts[k]).join('\n');
  const blocks = [
    block(1, 'Brief', 'ひとこと', inner(groups[0])),
    block(2, 'News', 'ニュース', inner(groups[1])),
    block(3, 'Design', 'デザイン', inner(groups[2])),
    block(4, 'Hobby &amp; Culture', '趣味と文化', inner(groups[3])),
  ].join('\n');
  const bar = Object.keys(G).map((k) => `<i style="background:var(${G[k].v})"></i>`).join('');
  const kit = cfg.adobeFontsKitId
    ? `<script>(function(d){var config={kitId:'${cfg.adobeFontsKitId}',scriptTimeout:3000,async:true},h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\\bwf-loading\\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)})(document);</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.siteTitle)} ${d.date}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
${kit}
</head>
<body>
<header class="wrap"><div class="hdr"><div class="logo"><b>${esc(cfg.siteTitle)}</b></div>${dateHtml}</div></header>
<div class="bar" aria-hidden="true">${bar}</div>
<div class="wrap"><div class="issuebar"><div class="issue" id="issue"></div><button type="button" class="sv" id="savedBtn">☆ チェックした記事 <b id="savedN">0</b></button></div></div>
<div class="wrap layout"><nav class="toc" id="toc" aria-label="ページ内移動">${toc}</nav>
<main>
${blocks}
</main></div>
<aside class="saved" id="saved" hidden><div class="sv-h"><b>チェックした記事</b><button type="button" id="savedClose" aria-label="閉じる">×</button></div><p class="sv-n">このブラウザにだけ保存されます(パソコンとスマホでは共有されません)。</p><div id="savedList"></div><button type="button" class="sv-clear" id="savedClear">すべて外す</button></aside>
<footer class="wrap"></footer>
<script src="app.js"></script>
</body>
</html>
`;
}

/* ---------- 実行 ---------- */
const files = fs.readdirSync(DATA_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}(-evening)?\.json$/.test(f)).sort();
if (!files.length) { console.error('data/ に YYYY-MM-DD.json がありません'); process.exit(1); }

let allErrs = [];
const issues = files.map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
  allErrs = allErrs.concat(validate(d, f));
  return { f, d };
});
if (allErrs.length) {
  console.error('チェックでエラーがありました:\n' + allErrs.join('\n'));
  process.exit(1);
}
if (CHECK_ONLY) { console.log(`チェックOK(${files.length}件)`); process.exit(0); }

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'template', 'style.css'), path.join(OUT_DIR, 'style.css'));
fs.copyFileSync(path.join(ROOT, 'template', 'app.js'), path.join(OUT_DIR, 'app.js'));

// 公開するのは最新の号だけ。古いページは残さない。
const latest = issues[issues.length - 1];
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), page(latest.d), 'utf8');
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.html') && f !== 'index.html') fs.unlinkSync(path.join(OUT_DIR, f));
}
console.log(`書き出しました: docs/index.html (${latest.d.date}${latest.d.edition === 'evening' ? ' 夕刊' : ''})`);
