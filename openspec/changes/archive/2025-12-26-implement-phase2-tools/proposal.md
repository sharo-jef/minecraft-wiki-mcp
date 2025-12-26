# Change: Implement Phase 2 - Additional Tools and Error Handling

## Why

Phase 1で基本的なツール群が実装された後、AIエージェントがより効率的に情報を探索できるよう、Pack format情報の取得ツールとWiki検索ツールを追加する。また、エラーハンドリングを強化してより堅牢なサーバーにする。

## What Changes

- `get_pack_format_info` ツールの実装
  - Pack formatページから バージョン⇔フォーマット対応情報を取得
  - テンプレートを展開して表を解析
- `search_wiki_page` ツールの実装
  - Wiki内のページを検索
  - 結果を制限・フィルタリング
- エラーハンドリング強化
  - 類似ページ提案
  - 最も近いリビジョン提案
  - リトライロジック実装

## Impact

- Affected specs: `mcp-server` (Phase 1で作成したspecに追加)
- Affected code:
  - `src/tools/getPackFormatInfo.ts` (新規)
  - `src/tools/searchWikiPage.ts` (新規)
  - `src/api/mediawiki.ts` (エラーハンドリング強化)
  - `src/index.ts` (新ツール登録)

## Dependencies

- Phase 1 (implement-phase1-mvp) が完了していること
