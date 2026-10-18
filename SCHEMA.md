# data/*.json の形

```json
{
  "date": "2026-10-16",
  "edition": "morning",              // 常に "morning"
  "asof": "08:20",                   // 情報を集め終えた時刻(日本時間)。画面に「2026.10.16 金 08:20現在」と出る
  "footnote": "今日は拾えなかったもの、など",
  "ai": {
    "lead":  { 記事 (g は不要) },
    "rows":  [ { "co": "OpenAI", "tag": "新機能", "text": "..." } ],
    "cards": [ 記事, ... ]           // g は "ai"
  },
  "buzz":   [ { "g": "ai", "kw": "キーワード", "text": "何が話題か", "url": "https://search.yahoo.co.jp/realtime/search?p=..." } ],
  "gallery": {
    "sites": [
      { "name": "SANKOU!", "url": "https://sankoudesign.com/",
        "today": [ { "title": "サイト名", "url": "https://掲載サイト/", "img": "https://サムネイル.jpg", "tag": "SOTD", "credit": "制作: 〇〇(省略可)" } ],
        "latest": { "date": "10/12", "items": [ 同じ形 ] },     // 今日の更新がないときだけ
        "note": "取得できなかった理由など(省略可)" }
    ],
    "src": [ { "t": "出典名", "u": "https://..." } ]
  },
  "study":  { "design": [記事], "web": [記事], "econ": [記事], "trend": [記事] },
  "hobby":  { "film": [記事], "comedy": [記事], "culture": [記事], "fashion": [記事] },   // fashion(ファッション・ビューティー)の記事は g が "fashion"。新作の記事は p に価格
  "alerts": [ { "g": "culture", "kind": "写真展", "days": "あと2日", "title": "...", "place": "会場 / 期間 / 料金" } ],
  "alertsSrc": [ { "t": "出典名", "u": "https://..." } ],
  "calendar": [ { "k": "10/17(土)", "t": "予定", "d": "補足(省略可)", "s": "ジャンル" } ],
  "calendarSrc": [ { "t": "出典名", "u": "https://..." } ],
  "quick": [ { "c": "国際", "text": "短い1文(見出し)", "m": "押すと開く、2〜3文の詳しい説明", "src": { "t": "NHK", "u": "https://..." } } ],
  "term":  { "w": "用語", "text": "やさしい説明", "note": "確認できていない点(省略可)", "src": { "t": "NHK", "u": "https://..." } },
  "weekly": { "title": "今週ここまで", "items": [ { "h": "AI", "text": "..." } ] }
}
```

## 記事
```json
{
  "g": "design",                     // ai design web econ trend film comedy culture
  "c": "文化 / 写真",                 // タブの表示名(省略可)
  "s": 3,                            // 重要度 1〜3
  "t": 1,                            // 読む時間(分)
  "n": "報道ベース",                  // 注記(省略可)
  "p": "¥29,700",                    // 価格(省略可。新作・新商品の記事で使う)
  "h": "見出し",
  "a": "説明(何が起きたか)",
  "b": "なぜ今",
  "u": "自分ごと",
  "m": "もっと詳しく",
  "img": { "u": "https://...", "a": "代替文", "c": "出典表記" },   // 省略可
  "r": [ { "t": "出典名", "u": "https://..." } ]                  // 1つ以上
}
```
