# daily-digest

毎日のニュースサイト。Claude Codeが毎朝(と、必要なら夕方)に `data/` へ内容を書き、`node build.js` で `docs/` にサイトを作ります。

- `CLAUDE.md` … Claudeへの指示(文章・出典・画像・Xの扱いのルール)
- `SCHEMA.md` … `data/*.json` の形
- `prompts/` … 朝刊・夕刊の手順
- `template/` … 見た目(CSS)と動き(JS)
- `build.js` … JSONからHTMLを作るスクリプト(Node 18以上、依存なし)
- `config.json` … サイト名とAdobe FontsのキットID
- `docs/` … 公開されるサイト(自動で作られます)

手元で確認する: `node build.js --check` → `node build.js` → `docs/index.html` を開く。
