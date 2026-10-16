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
};
const STUDY = ['design', 'web', 'econ', 'trend'];
const HOBBY = ['film', 'comedy', 'culture'];
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
  return errs;
}

/* ---------- 部品 ---------- */
const stars = (n) => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
const srcs = (r) =>
  r && r.length
    ? `<p class="src">出典: ${r.map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)}</a>`).join('')}</p>`
    : '';

function card(c) {
  const g = G[c.g];
  const img = c.img
    ? `<figure class="ph"><img src="${esc(c.img.u)}" alt="${esc(c.img.a)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><figcaption>${esc(c.img.c)}</figcaption></figure>`
    : '';
  return `<article class="card" data-g="${c.g}" data-min="${c.t}" style="--g:var(${g.v})"><div class="tab">${esc(c.c || g.n)}</div>${img}<div class="body">
<div class="pills"><span class="pill"><i></i>重要度 ${stars(c.s)}</span><span class="pill">${c.t}分</span>${c.n ? `<span class="pill note">${esc(c.n)}</span>` : ''}</div>
<h3>${esc(c.h)}</h3><p class="lead-s">${esc(c.a)}</p>
<dl class="rows"><div class="r"><dt>なぜ今</dt><dd>${esc(c.b)}</dd></div><div class="r"><dt>自分ごと</dt><dd>${esc(c.u)}</dd></div></dl>
<details><summary>もっと詳しく</summary><p>${esc(c.m)}</p></details>${srcs(c.r)}</div></article>`;
}

const group = (k, arr) =>
  arr && arr.length
    ? `<div class="grp" data-grp="${k}" style="--g:var(${G[k].v})"><h3 class="grp-h"><i></i>${G[k].n}</h3><div class="grid">${arr.map(card).join('\n')}</div></div>`
    : '';

function aiSection(ai) {
  if (!ai) return '';
  const l = ai.lead;
  const lead = l
    ? `<div class="lead"><div><div class="pills"><span class="pill"><i></i>重要度 ${stars(l.s)}</span><span class="pill">${l.t}分</span>${l.n ? `<span class="pill note">${esc(l.n)}</span>` : ''}</div><h3>${esc(l.h)}</h3></div>
<div><p class="lead-s">${esc(l.a)}</p><dl class="rows"><div class="r"><dt>なぜ今</dt><dd>${esc(l.b)}</dd></div><div class="r"><dt>自分ごと</dt><dd>${esc(l.u)}</dd></div></dl>
<details><summary>もっと詳しく</summary><p>${esc(l.m)}</p></details>${srcs(l.r)}</div></div>`
    : '';
  const rows = (ai.rows || [])
    .map((r) => `<div class="co"><b>${esc(r.co)}</b><span class="pill"><i></i>${esc(r.tag)}</span><span class="d">${esc(r.text)}</span></div>`)
    .join('\n');
  const cards = (ai.cards || []).map(card).join('\n');
  return `<section class="sec" id="ai" style="padding-top:40px" data-sec="ai">
<div class="sh"><div><span class="en">Today's AI</span><h2>AI 忖度なしレポート</h2></div><p>どの会社も同じ基準で</p></div>
<article class="card aibox" data-g="ai" data-min="${l ? l.t : 0}" style="--g:var(--c-ai)"><div class="tab">AI</div><div class="body">${lead}
<p class="honest">Claudeを作っているAnthropic社の話題も、他社と同じ基準で書きます。良い点だけでなく、弱い点や問題も入れます。</p>
${rows}</div></article>
<div class="grid" style="margin-top:18px">${cards}</div></section>`;
}

function buzzSection(buzz) {
  if (!buzz || !buzz.length) return '';
  const rows = buzz
    .map((b) => `<div class="tr2" data-g="${esc(b.g)}"><b>${esc(b.kw)}</b><span>${esc(b.text)}${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">Yahoo!リアルタイム検索</a>` : ''}</span></div>`)
    .join('\n');
  return `<section class="sec" id="buzz" data-sec="buzz"><div class="sh"><div><span class="en">On X</span><h2>Xの話題</h2></div><p>Yahoo!リアルタイム検索で見えた、いま話題の投稿</p></div><div class="box">${rows}</div></section>`;
}

const sectionList = (id, label, groups, keys) => {
  const inner = keys.map((k) => group(k, groups && groups[k])).join('');
  return inner
    ? `<section class="sec" id="${id}" data-sec="list"><div class="sh"><div><span class="en">${label.en}</span><h2>${label.ja}</h2></div><p>${label.sub}</p></div>${inner}</section>`
    : '';
};

function alertsSection(a, srcList) {
  if (!a || !a.length) return '';
  const items = a
    .map((x) => `<article class="card" style="--g:var(${G[x.g].v})"><div class="tab"><span>${esc(x.kind)}</span><b>${esc(x.days)}</b></div><div class="body"><h3>${esc(x.title)}</h3><p>${esc(x.place)}</p></div></article>`)
    .join('\n');
  return `<section class="sec" id="alerts"><div class="sh"><div><span class="en">Last Days</span><h2>会期終了間近</h2></div><p>今週末までに行けるもの</p></div><div class="al">${items}</div>${srcs(srcList).replace('<p class="src">', '<p class="src" style="margin-top:12px">')}</section>`;
}

function calendarSection(rows, srcList) {
  if (!rows || !rows.length) return '';
  const items = rows
    .map((r) => `<div class="tr"><span class="k">${esc(r.k)}</span><span class="t">${esc(r.t)}${r.d ? `<span class="d">${esc(r.d)}</span>` : ''}</span><span class="s">${esc(r.s)}</span></div>`)
    .join('\n');
  return `<section class="sec" id="calendar"><div class="sh"><div><span class="en">Calendar</span><h2>賞レース・映画祭カレンダー</h2></div><p>これからの予定を日付順に</p></div><div class="box">${items}</div>${srcs(srcList).replace('<p class="src">', '<p class="src" style="margin-top:12px">')}</section>`;
}

function quickSection(q) {
  if (!q || !q.length) return '';
  const items = q
    .map((x) => `<div class="tr2"><b>${esc(x.c)}</b><span>${esc(x.text)}${x.src ? `<a href="${esc(x.src.u)}" target="_blank" rel="noopener">${esc(x.src.t)}</a>` : ''}</span></div>`)
    .join('\n');
  return `<section class="sec" id="quick"><div class="sh"><div><span class="en">In Brief</span><h2>ひとこと</h2></div><p>短く知っておくニュース</p></div><div class="box">${items}</div></section>`;
}

function termSection(t) {
  if (!t) return '';
  return `<section class="sec" id="term"><article class="card term" style="--g:var(--c-econ)" data-min="1"><div class="tab">今日の用語</div><div class="body"><div><span class="en">Today's word</span></div><div><p class="w">${esc(t.w)}</p><p>${esc(t.text)}</p><p class="src">${t.note ? esc(t.note) + ' ' : ''}${t.src ? `出典: <a href="${esc(t.src.u)}" target="_blank" rel="noopener">${esc(t.src.t)}</a>` : ''}</p></div></div></article></section>`;
}

function weeklySection(w) {
  if (!w || !w.items || !w.items.length) return '';
  const cells = w.items.map((i) => `<div><b>${esc(i.h)}</b>${esc(i.text)}</div>`).join('');
  return `<section class="sec" id="weekly"><article class="card" style="--g:var(--c-trend)"><div class="tab">${esc(w.title || '今週ここまで')}</div><div class="wk">${cells}</div></article></section>`;
}

/* ---------- ページ ---------- */
function page(d, isLatest) {
  const [y, m, day] = d.date.split('-').map(Number);
  const wd = WEEK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  const dateLabel = `TODAY ${y}.${MONTHS[m - 1]} ${m}/${day} ${wd}`;
  const edLabel = d.edition === 'evening' ? '夕刊' : '朝刊';
  const sections = [
    ['ai', 'AI', aiSection(d.ai)],
    ['buzz', 'Xの話題', buzzSection(d.buzz)],
    ['study', '勉強', sectionList('study', { en: 'Study', ja: '勉強', sub: 'デザイン・Web・経済・トレンド' }, d.study, STUDY)],
    ['hobby', '趣味', sectionList('hobby', { en: 'Hobby', ja: '趣味', sub: '映画・お笑い・文化' }, d.hobby, HOBBY)],
    ['alerts', '会期終了間近', alertsSection(d.alerts, d.alertsSrc)],
    ['calendar', 'カレンダー', calendarSection(d.calendar, d.calendarSrc)],
    ['quick', 'ひとこと', quickSection(d.quick)],
    ['term', '今日の用語', termSection(d.term)],
    ['weekly', 'ふりかえり', weeklySection(d.weekly)],
  ].filter((s) => s[2]);
  const toc = sections.map((s) => `<a href="#${s[0]}">${s[1]}</a>`).join('');
  const chips =
    '<button type="button" class="chip" data-f="all" aria-pressed="true">すべて</button>' +
    Object.keys(G).map((k) => `<button type="button" class="chip" data-f="${k}" style="--g:var(${G[k].v})" aria-pressed="false"><i></i>${G[k].n}</button>`).join('');
  const bar = Object.keys(G).map((k) => `<i style="background:var(${G[k].v})"></i>`).join('');
  const kit = cfg.adobeFontsKitId
    ? `<script>(function(d){var config={kitId:'${cfg.adobeFontsKitId}',scriptTimeout:3000,async:true},h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\\bwf-loading\\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)})(document);</script>`
    : '';
  const notice = d.notice || '日本語の出典を優先し、各記事の下に出典を付けています。英語の出典には「英語」と表示しています。';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.siteTitle)} ${d.date} ${edLabel}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
${kit}
</head>
<body>
<div class="notice">${esc(notice)}</div>
<header class="wrap"><div class="hdr"><div class="logo"><b>${esc(cfg.siteTitle)}</b></div><div class="date">${dateLabel}(${edLabel})</div></div></header>
<div class="bar" aria-hidden="true">${bar}</div>
<div class="wrap"><div class="issue" id="issue" data-prefix="${esc(d.updated ? d.updated + ' / ' : '')}"></div><div class="filter"><span class="q">今日はどれを読む?</span><div class="chips" id="chips">${chips}</div></div></div>
<div class="wrap layout"><nav class="toc" id="toc" aria-label="ページ内移動"><span class="lbl">いま読んでいる場所</span>${toc}</nav>
<main>
${sections.map((s) => s[2]).join('\n')}
</main></div>
<footer class="wrap"><p class="foot-note">${esc(d.footnote || '')}</p><span><a href="archive.html">バックナンバー</a></span></footer>
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

issues.forEach(({ f, d }) => fs.writeFileSync(path.join(OUT_DIR, f.replace(/\.json$/, '.html')), page(d), 'utf8'));
const latest = issues[issues.length - 1];
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), page(latest.d, true), 'utf8');

const list = issues
  .slice()
  .reverse()
  .map(({ f, d }) => `<li><a href="${f.replace(/\.json$/, '.html')}">${d.date}${d.edition === 'evening' ? '(夕刊)' : ''}</a></li>`)
  .join('\n');
fs.writeFileSync(
  path.join(OUT_DIR, 'archive.html'),
  `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>バックナンバー</title><link rel="stylesheet" href="style.css"></head><body><main class="wrap" style="padding-top:40px"><h2>バックナンバー</h2><ul>${list}</ul><p><a href="index.html">最新号へ</a></p></main></body></html>\n`,
  'utf8'
);
console.log(`書き出しました: ${files.length}件 → docs/ (最新: ${latest.d.date})`);
