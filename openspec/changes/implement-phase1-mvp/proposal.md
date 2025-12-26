# Change: Implement Phase 1 MVP - Core Infrastructure and Basic Tools

## Why

Minecraft Datapack作成時に、AIエージェントがバージョン固有のフォーマット（pack.mcmeta、ディレクトリ構造、JSONスキーマ）を正確に把握する必要がある。静的なマッピングは保守が困難なため、MediaWiki APIを通じて動的に情報を取得できるMCP Serverが必要。

## What Changes

- MediaWiki API ラッパーの実装（`src/api/mediawiki.ts`）
- 型定義ファイルの作成（`src/types.ts`）
- ユーティリティ関数の実装（`src/utils/`）
- MCPサーバーエントリーポイント（`src/index.ts`）
- 以下の3つの基本ツールを実装:
  - `create_datapack_structure`: pack.mcmetaと正しいディレクトリ構造を生成
  - `get_wiki_page`: Wikiページの内容を取得（最新版または特定リビジョン）
  - `search_page_revisions`: ページの編集履歴から特定バージョンに関連するリビジョンを検索

## Impact

- Affected specs: `mcp-server`, `mediawiki-api`（新規作成）
- Affected code:
  - `src/index.ts`（MCPサーバーエントリーポイント）
  - `src/api/mediawiki.ts`（API wrapper）
  - `src/tools/createDatapackStructure.ts`
  - `src/tools/getWikiPage.ts`
  - `src/tools/searchPageRevisions.ts`
  - `src/utils/versionMapping.ts`
  - `src/utils/jsonExtractor.ts`
  - `src/types.ts`