# Implementation Tasks - Phase 1 MVP

## 1. Project Setup
- [x] 1.1 package.json の依存関係を確認・インストール
- [x] 1.2 tsconfig.json の設定確認

## 2. Core Types
- [x] 2.1 `src/types.ts` に型定義を実装
  - PackMcmeta, DirectoryStructure, VersionInfo
  - WikiPage, WikiRevision, SearchResult
  - カスタムエラークラス

## 3. MediaWiki API Wrapper
- [x] 3.1 `src/api/mediawiki.ts` を実装
  - callMediaWikiAPI 関数
  - デフォルトパラメータ設定（format=json, origin=*）
  - エラーハンドリング

## 4. Utility Functions
- [x] 4.1 `src/utils/jsonExtractor.ts` を実装
  - extractJsonBlocks: ```json ブロックを抽出
  - stripHtml: HTMLタグを除去
- [x] 4.2 `src/utils/versionMapping.ts` を実装
  - getPackFormat: バージョンからpack formatを取得
  - getDirectoryNames: singular/plural命名を返す
  - KNOWN_PACK_FORMATS 定義

## 5. MCP Tools Implementation
- [x] 5.1 `src/tools/createDatapackStructure.ts` を実装
  - パラメータ: minecraftVersion, description, features
  - pack.mcmetaとディレクトリ構造を生成
  - 1.21+のsingular命名、pre-1.21のplural命名対応
- [x] 5.2 `src/tools/getWikiPage.ts` を実装
  - パラメータ: title, revisionId, section, extractJson, format
  - 最新版または特定リビジョンの取得
  - JSONブロック抽出オプション
- [x] 5.3 `src/tools/searchPageRevisions.ts` を実装
  - パラメータ: title, versionPattern, startDate, endDate, limit
  - 編集履歴の検索とフィルタリング

## 6. MCP Server Entry Point
- [x] 6.1 `src/index.ts` を実装
  - Serverインスタンス作成
  - ListToolsRequestSchema ハンドラ（ツール一覧）
  - CallToolRequestSchema ハンドラ（ツール実行）
  - StdioServerTransport で起動

## 7. Build & Test
- [x] 7.1 TypeScriptビルドが成功することを確認
- [x] 7.2 MCPサーバーが正常に起動することを確認
