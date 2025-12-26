# Implementation Tasks - Phase 3 Enhancements

## 1. Compare Versions Tool
- [x] 1.1 `src/tools/compareVersions.ts` を作成
- [x] 1.2 search_page_revisions を使って各バージョンのリビジョンを検索
- [x] 1.3 両リビジョンの内容を取得・比較
- [x] 1.4 JSONブロックの差分生成ロジック実装
- [x] 1.5 変更点の構造化出力フォーマット実装

## 2. Caching Infrastructure
- [x] 2.1 `src/utils/cache.ts` にキャッシュマネージャを実装
- [x] 2.2 インメモリキャッシュストア実装
- [x] 2.3 TTL (Time-To-Live) 設定実装
- [x] 2.4 キャッシュキー生成ロジック実装

## 3. Cache Integration
- [x] 3.1 get_wiki_page にキャッシュ統合
- [x] 3.2 get_pack_format_info にキャッシュ統合
- [x] 3.3 search_page_revisions にキャッシュ統合

## 4. Tool Registration
- [x] 4.1 `src/index.ts` に compare_versions ツールを登録
- [x] 4.2 ツール一覧のinputSchema定義追加

## 5. Testing
- [ ] 5.1 compare_versions ツールの動作確認
- [ ] 5.2 キャッシュの動作確認（ヒット/ミス）
- [ ] 5.3 TTL期限切れ後の動作確認
