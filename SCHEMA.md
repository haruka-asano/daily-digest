# data/*.json の形

```json
{
  "date": "2026-10-16",
  "edition": "morning",              // "morning"(朝刊) か "evening"(夕刊)
  "updated": "情報は10月16日の昼ごろまで",
  "footnote": "今日は拾えなかったもの、など",
  "ai": {
    "lead":  { 記事 (g は不要) },
    "rows":  [ { "co": "OpenAI", "tag": "新機能", "text": "..." } ],
    "cards": [ 記事, ... ]           // g は "ai"
  },
  "buzz":   [ { "g": "ai", "kw": "キーワード", "text": "何が話題か", "url": "https://search.yahoo.co.jp/realtime/search?p=..." } ],
  "study":  { "design": [記事], "web": [記事], "econ": [記事], "trend": [記事] },
  "hobby":  { "film": [記事], "comedy": [記事], "culture": [記事] },
  "alerts": [ { "g": "culture", "kind": "写真展", "days": "あと2日", "title": "...", "place": "会場 / 期間 / 料金" } ],
  "alertsSrc": [ { "t": "出典名", "u": "https://..." } ],
  "calendar": [ { "k": "10/17(土)", "t": "予定", "d": "補足(省略可)", "s": "ジャンル" } ],
  "calendarSrc": [ { "t": "出典名", "u": "https://..." } ],
  "quick": [ { "c": "国際", "text": "短い1文", "src": { "t": "NHK", "u": "https://..." } } ],
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
  "h": "見出し",
  "a": "説明(何が起きたか)",
  "b": "なぜ今",
  "u": "自分ごと",
  "m": "もっと詳しく",
  "img": { "u": "https://...", "a": "代替文", "c": "出典表記" },   // 省略可
  "r": [ { "t": "出典名", "u": "https://..." } ]                  // 1つ以上
}
```
