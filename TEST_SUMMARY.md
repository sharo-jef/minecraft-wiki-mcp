# Test Summary

## Overview

Total: **236 tests**

- ✅ Passed: **228 tests**
- ❌ Failed: **8 tests**

## Test Coverage

### ✅ Fully Passing Test Suites

1. **searchWikiPage.test.ts** - 11/11 tests passed

   - Query parameter validation
   - Search functionality
   - HTML stripping in snippets
   - Limit handling
   - Namespace filtering
   - Edge cases (empty results, missing data)

2. **warningGenerator.test.ts** - 15/15 tests passed

   - Unknown version warnings
   - Pre-release notation tips
   - Directory naming warnings (singular/plural)
   - Min/max format warnings
   - supported_formats warnings
   - Wiki source information

3. **fileGenerator.test.ts** - 19/19 tests passed

   - pack.mcmeta generation
   - Min/max format support
   - Load setup generation
   - Directory naming (singular/plural)
   - Feature directory paths
   - Edge cases

4. **schemaGenerator.test.ts** - 17/17 tests passed

   - Basic schema generation
   - pack_format vs min/max format
   - Version-specific features (1.19+, 1.20.2+, 1.21.9+)
   - Fallback version handling

5. **searchPageRevisions.test.ts** - 13/13 tests passed

   - Title parameter validation
   - Revision fetching
   - Version pattern filtering
   - Regex pattern support
   - Limit handling
   - Date range filtering
   - Missing page handling
   - Cache usage

6. **versionMapping.test.ts** - 26/26 tests passed

   - getPackFormat functionality
   - Version normalization (.0 suffix)
   - Version ranges
   - Directory naming by version
   - Min/max format detection
   - Pre-release notation handling
   - Data consistency checks

7. **integration.test.ts** - 19/19 tests passed

   - Datapack creation workflow
   - Pack format lookup
   - Version normalization
   - Directory naming
   - Min/max format detection
   - Feature directory generation
   - JSON extraction
   - HTML stripping
   - Warning generation
   - Schema generation

8. **getPackFormatInfo.test.ts** - 11/11 tests passed

   - Parameter validation
   - Known version lookup
   - Pack format number lookup
   - Unknown version handling
   - Version normalization
   - Cache usage

9. **createDatapackStructure.test.ts** - 14/14 tests passed

   - Required parameter validation
   - Namespace format validation
   - pack.mcmeta generation
   - Min/max format for 1.21.9+
   - Load setup inclusion
   - Schema output
   - Warning output
   - Unknown version handling
   - Pack format resolution

10. **mediawiki.test.ts** - 19/19 tests passed
    - API call functionality
    - Parameter handling
    - Error handling
    - Rate limiting and retry logic
    - Similar page search
    - Nearest revision finding

### ⚠️ Test Suites with Failures

#### 1. jsonExtractor.test.ts (17/18 passed)

**Failed:**

- `should remove script tags and content` - 期待値の問題
  - 期待: "Content More content"
  - 実際: "ContentMore content"
  - **原因**: stripHtml 実装が script タグを削除する際、スペースを保持しない

#### 2. compareVersions.test.ts (7/9 passed)

**Failed:**

- `should find revisions for both versions` - Mock の設定の問題

  - version2.revision が null になっている
  - **原因**: compareVersions の内部実装がテストのモック設定と合っていない可能性

- `should handle empty JSON blocks` - 期待値の問題
  - 期待: summary に "No JSON differences" が含まれる
  - 実際: "No revision found matching version pattern..."
  - **原因**: JSON ブロックが空の場合の処理ロジック

#### 3. getWikiPage.test.ts (12/13 passed)

**Failed:**

- `should suggest nearest revision when revision not found` - Mock の設定の問題
  - WikiAPIError が発生
  - **原因**: エラーオブジェクトのモック設定が不完全

#### 4. edgeCases.test.ts (28/32 passed)

**Failed:**

- `should handle mixed content` - 期待値の問題

  - 期待: "Text bold & italic <special> more" (スペース 2 個)
  - 実際: "Text bold & italic <special> more" (スペース 3 個)
  - **原因**: &nbsp;の置換と trim の処理順序

- `should handle empty description` - 実装の挙動の問題

  - 期待: description が空文字列 ""
  - 実際: description が undefined
  - **原因**: fileGenerator.ts は空文字列を undefined として扱う

- `should handle limit of 0` - インポートパスの問題

  - エラー: Cannot find module '/api/mediawiki.js'
  - **原因**: 相対パスが間違っている (../api/mediawiki.js が正しい)

- `should handle empty version pattern` - インポートパスの問題
  - エラー: Cannot find module '/api/mediawiki.js'
  - **原因**: 相対パスが間違っている (../api/mediawiki.js が正しい)

## 実装で確認が必要な点

以下のテストが失敗していますが、これは実装の挙動を確認する必要があります:

### 1. stripHtml 関数 (src/utils/jsonExtractor.ts)

- script タグ削除後のスペース処理
- 連続する&nbsp;の処理

**現在の実装:**

```typescript
.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
```

**期待される挙動:**

- タグを削除する際、前後のスペースを適切に処理する必要があるか?

### 2. generateDatapackFiles 関数 (src/utils/fileGenerator.ts)

- 空文字列の description を受け取った場合、pack.mcmeta に description フィールドを含めるべきか?

**現在の実装:**

```typescript
if (description) {
  packMcmeta.pack.description = description;
}
```

**期待される挙動:**

- `description === ""` の場合も含めるべきか、それとも undefined のみ除外すべきか?

### 3. compareVersions 関数 (src/tools/compareVersions.ts)

- 2 つのバージョンが同じリビジョンにマッチする場合の処理
- JSON ブロックが空の場合のサマリーメッセージ

**確認が必要:**

- 実装のロジックがテストの期待と一致するか確認

### 4. getWikiPage 関数 (src/tools/getWikiPage.ts)

- nosuchrevid エラーのハンドリング

**確認が必要:**

- WikiAPIError のインスタンスチェックと code 比較が正しく動作するか

## Edge Case テストの修正が必要な箇所

### src/edgeCases.test.ts

**Line 378, 406**: インポートパスを修正

```typescript
// 誤: "../api/mediawiki.js"
// 正: "./api/mediawiki.js" または適切な相対パス
```

## 次のステップ

1. ✅ ビルドは成功している (`npm run build`)
2. ⚠️ 以下を確認してください:
   - stripHtml 関数のスペース処理は現在の実装が正しいか?
   - generateDatapackFiles は空文字列の description をどう扱うべきか?
   - compareVersions の実装ロジックは期待通りか?
   - getWikiPage のエラーハンドリングは正しく動作するか?

これらの確認後、必要に応じてテストの期待値を実装の挙動に合わせて調整するか、実装を修正するかを判断してください。
