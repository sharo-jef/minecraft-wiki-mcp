# Change: Implement Phase 3 - Enhancements (Compare Versions & Caching)

## Why

バージョン間の移行作業を支援するため、2つのバージョン間でのフォーマット変更点を比較するツールが必要。また、よく使われるページ/リビジョンをキャッシュすることで、API呼び出しを減らしレスポンス時間を改善する。

## What Changes

- `compare_versions` ツールの実装
  - 2つのバージョン間でのWikiページ変更点を比較
  - JSONブロックの差分を検出
  - 移行に必要な変更点をハイライト
- キャッシング機構の実装
  - ページコンテンツのローカルキャッシュ
  - リビジョン情報のキャッシュ
  - Pack format情報のキャッシュ
  - TTL設定とキャッシュ無効化

## Impact

- Affected specs: `mcp-server`, `caching` (新規)
- Affected code:
  - `src/tools/compareVersions.ts` (新規)
  - `src/utils/cache.ts` (新規)
  - 各ツールにキャッシュ統合

## Dependencies

- Phase 1 (implement-phase1-mvp) が完了していること
- Phase 2 (implement-phase2-tools) が完了していること
