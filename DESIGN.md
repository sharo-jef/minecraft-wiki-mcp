# Minecraft Wiki MCP Server - 設計書

## 概要

Minecraft Wiki (MediaWiki API) を活用して、AI エージェントが Minecraft Datapack 作成を支援するための MCP Server。

## 設計方針

### 1. AI エージェント自己解決型アプローチ

- **静的マッピングを持たない**: バージョン → リビジョンのマッピングは AI エージェントが自分で探索
- **探索ツールの提供**: リビジョン履歴検索、特定リビジョン取得などのプリミティブを提供
- **理由**:
  - Pack format の更新頻度が高く、静的マッピングの保守が非現実的
  - AI エージェントは編集コメントから適切なリビジョンを判断可能
  - Wiki テンプレートシステムが複雑で自動パースが困難

### 2. 優先度付き設計

1. **pack.mcmeta の正確性**: データパック作成時に最初に呼ぶべきツールを提供
2. **バージョン互換性**: 各バージョンでのディレクトリ名変更、JSON フォーマット変更に対応
3. **探索性**: AI エージェントが必要な情報を自分で見つけられる

## ツール設計

### Tool 1: `create_datapack_structure`

**目的**: pack.mcmeta と正しいディレクトリ構造を生成

**パラメータ**:

```typescript
{
  minecraftVersion: string;  // e.g., "1.21.2"
  description: string;       // データパックの説明
  features?: string[];       // 必要な機能 (例: "recipes", "loot_tables", "advancements")
}
```

**動作**:

1. バージョンから pack_format を決定 (Pack format ページから取得)
2. バージョンに応じた正しいディレクトリ名を使用:
   - 1.21+ (format 48+): `loot_table`, `function`, `recipe`, `tag/item`
   - 1.20.6 以前: `loot_tables`, `functions`, `recipes`, `tags/items`
3. `pack.mcmeta` を生成:
   - 1.21.9+ (format 88.0+): `min_format`/`max_format` を使用
   - それ以前: `pack_format` を使用

**出力**:

```json
{
  "packMcmeta": { ... },
  "directoryStructure": {
    "data": {
      "namespace": {
        "function": [],
        "loot_table": [],
        ...
      }
    }
  },
  "version_info": {
    "minecraft_version": "1.21.2",
    "pack_format": 57,
    "directory_naming": "singular"  // "singular" (1.21+) or "plural" (legacy)
  }
}
```

### Tool 2: `search_wiki_page`

**目的**: Wiki 内のページを検索

**パラメータ**:

```typescript
{
  query: string;           // 検索クエリ
  namespace?: number;      // 0 = メインページ (デフォルト)
  limit?: number;          // 結果数 (デフォルト: 10)
}
```

**MediaWiki API**: `action=query&list=search`

**出力例**:

```json
{
  "results": [
    {
      "title": "Recipe",
      "pageId": 12345,
      "snippet": "Recipes are data files that define how items are crafted..."
    }
  ]
}
```

### Tool 3: `get_wiki_page`

**目的**: Wiki ページの内容を取得 (最新版または特定リビジョン)

**パラメータ**:

```typescript
{
  title: string;              // ページタイトル (e.g., "Recipe")
  revisionId?: number;        // 特定リビジョンID (省略時は最新版)
  section?: number;           // セクション番号 (省略時は全体)
  extractJson?: boolean;      // JSON コードブロックを抽出するか (デフォルト: true)
  format?: 'wikitext' | 'html' | 'plain';  // 出力形式 (デフォルト: 'plain')
}
```

**MediaWiki API**:

- 最新版: `action=parse&page={title}&section={section}`
- 特定リビジョン: `action=parse&oldid={revisionId}`

**動作**:

1. ページ内容を取得
2. `format` に応じて変換:
   - `'plain'`: HTML タグを除去したテキスト
   - `'html'`: レンダリングされた HTML
   - `'wikitext'`: Wiki マークアップ
3. `extractJson: true` の場合、`json ... ` ブロックを抽出

**出力例**:

```json
{
  "title": "Recipe",
  "revisionId": 3269126,
  "content": "...",
  "jsonBlocks": [
    {
      "type": "minecraft:crafting_shaped",
      "pattern": ["###", "# #", "###"],
      ...
    }
  ]
}
```

### Tool 4: `search_page_revisions`

**目的**: ページの編集履歴から特定バージョンに関連するリビジョンを検索

**パラメータ**:

```typescript
{
  title: string;              // ページタイトル
  versionPattern?: string;    // 編集コメントで検索するパターン (e.g., "1.21.2")
  startDate?: string;         // 検索開始日 (ISO 8601形式)
  endDate?: string;           // 検索終了日
  limit?: number;             // 結果数 (デフォルト: 20)
}
```

**MediaWiki API**: `action=query&prop=revisions&rvprop=ids|timestamp|comment|user`

**動作**:

1. ページの編集履歴を取得
2. `versionPattern` が指定されている場合、編集コメントでフィルタリング
3. 日付範囲でフィルタリング

**出力例**:

```json
{
  "revisions": [
    {
      "revisionId": 3269126,
      "timestamp": "2025-11-15T10:30:00Z",
      "comment": "Updated for 1.21.2 ingredient format changes",
      "user": "ExampleUser"
    },
    {
      "revisionId": 2557310,
      "timestamp": "2024-05-12T08:15:00Z",
      "comment": "1.20.5 snapshot updates",
      "user": "AnotherUser"
    }
  ]
}
```

**使用例**:

```
AI エージェント: "1.21.2 の Recipe フォーマットが知りたい"
→ search_page_revisions(title="Recipe", versionPattern="1.21.2")
→ 該当するリビジョン 3269126 を発見
→ get_wiki_page(title="Recipe", revisionId=3269126, extractJson=true)
→ 1.21.2 の JSON フォーマットを取得
```

### Tool 5: `get_pack_format_info`

**目的**: Minecraft バージョンと pack format の対応情報を取得

**パラメータ**:

```typescript
{
  minecraftVersion?: string;  // 特定バージョンの情報 (e.g., "1.21.2")
  packFormat?: number;        // 特定フォーマットの情報
}
```

**動作**:

1. Pack_format ページから情報を取得
2. テンプレートを展開して表を解析
3. バージョンまたはフォーマット番号でフィルタリング

**出力例**:

```json
{
  "minecraft_version": "1.21.2",
  "pack_format": 57,
  "min_format": null,
  "max_format": null,
  "releases": ["1.21.2", "1.21.3"],
  "changes": [
    "Removed attribute ID prefixes such as generic.",
    "Changed formats of data components, loot tables and predicates.",
    "Added crafting_transmute recipe type."
  ],
  "directory_naming": "singular", // 1.21+ の場合
  "directory_map": {
    "functions": "function",
    "loot_tables": "loot_table",
    "recipes": "recipe",
    "tags/items": "tag/item"
  }
}
```

### Tool 6: `compare_versions`

**目的**: 2 つのバージョン間での変更点を比較

**パラメータ**:

```typescript
{
  page: string; // 比較するページ (e.g., "Recipe")
  fromVersion: string; // 開始バージョン (e.g., "1.20.5")
  toVersion: string; // 終了バージョン (e.g., "1.21.2")
}
```

**動作**:

1. `search_page_revisions` で各バージョンのリビジョンを検索
2. 両方のリビジョン内容を取得
3. JSON ブロックを比較して差分を生成

**出力例**:

```json
{
  "fromVersion": {
    "version": "1.20.5",
    "revisionId": 2557310,
    "timestamp": "2024-05-12T08:15:00Z"
  },
  "toVersion": {
    "version": "1.21.2",
    "revisionId": 3269126,
    "timestamp": "2025-11-15T10:30:00Z"
  },
  "changes": {
    "ingredient_format": {
      "before": "Object with 'item' or 'tag' property",
      "after": "String with 'minecraft:item' or '#minecraft:tag'"
    },
    "new_fields": ["show_notification"],
    "removed_fields": []
  },
  "example_diff": {
    "1.20.5": {
      "ingredient": { "item": "minecraft:iron_ingot" }
    },
    "1.21.2": {
      "ingredient": "minecraft:iron_ingot"
    }
  }
}
```

## バージョン互換性データ

### ディレクトリ名変更履歴

| Pack Format | Minecraft Version | 変更内容                                                                                                      |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 48 (1.21)   | 1.21, 1.21.1      | `loot_tables` → `loot_table`<br>`functions` → `function`<br>`recipes` → `recipe`<br>`tags/items` → `tag/item` |

### pack.mcmeta フォーマット変更

| Pack Format | Minecraft Version | フォーマット                                         |
| ----------- | ----------------- | ---------------------------------------------------- |
| 88.0+       | 1.21.9+           | `min_format` / `max_format` (マイナーバージョン対応) |
| ~87         | ~1.21.8           | `pack_format` (単一整数)                             |

## 実装技術スタック

### 必須要件

- **Node.js**: v18+ (ES Modules サポート)
- **TypeScript**: 型安全性
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP クライアント**: MediaWiki API 呼び出し用

### プロジェクト構造

```
minecraft-wiki-mcp/
├── src/
│   ├── index.ts              # MCP Server エントリーポイント
│   ├── tools/
│   │   ├── createDatapackStructure.ts
│   │   ├── searchWikiPage.ts
│   │   ├── getWikiPage.ts
│   │   ├── searchPageRevisions.ts
│   │   ├── getPackFormatInfo.ts
│   │   └── compareVersions.ts
│   ├── api/
│   │   └── mediawiki.ts      # MediaWiki API ラッパー
│   └── utils/
│       ├── versionMapping.ts  # バージョン判定ロジック
│       └── jsonExtractor.ts   # JSON ブロック抽出
├── package.json
├── tsconfig.json
└── README.md
```

### package.json 設定 (npx 実行)

```json
{
  "name": "minecraft-wiki-mcp",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "minecraft-wiki-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

## AI エージェント向けツール使用ガイド

### ユースケース 1: 新規データパック作成

```
1. create_datapack_structure(minecraftVersion="1.21.2", description="My Pack")
   → pack.mcmeta と正しいディレクトリ構造を取得

2. get_wiki_page(title="Recipe", extractJson=true)
   → 最新の Recipe JSON フォーマットを取得

3. データパックファイルを作成
```

### ユースケース 2: 古いバージョン向けデータパック

```
1. create_datapack_structure(minecraftVersion="1.20.5")
   → 1.20.5 用の pack.mcmeta (pack_format=41, loot_tables ディレクトリ)

2. search_page_revisions(title="Recipe", versionPattern="1.20.5")
   → 1.20.5 時代のリビジョンを検索

3. get_wiki_page(title="Recipe", revisionId=2557310)
   → 1.20.5 の Recipe フォーマット (ingredient: {item: "..."})
```

### ユースケース 3: バージョン間移行

```
1. compare_versions(page="Recipe", fromVersion="1.20.5", toVersion="1.21.2")
   → ingredient フォーマットの変更を検出

2. 既存の JSON を新フォーマットに変換
```

## エラーハンドリング

### Wiki API エラー

- ページが存在しない: 類似ページを提案
- リビジョンが見つからない: 最も近い日付のリビジョンを提案
- レート制限: リトライロジック実装

### バージョン判定エラー

- 不明なバージョン: Pack format ページから最新情報を取得するよう促す
- 曖昧なリビジョン: 複数候補を返して AI エージェントに選択させる

## 将来の拡張可能性

1. **キャッシング**: よく使われるページ/リビジョンをローカルキャッシュ
2. **オフラインモード**: Pack format 履歴の静的スナップショットを提供
3. **他の Wiki 対応**: Bedrock Edition Wiki など
4. **バリデーション**: 生成した JSON のスキーマチェック

## 実装優先順位

### Phase 1 (MVP)

1. MediaWiki API ラッパー実装
2. `create_datapack_structure` ツール
3. `get_wiki_page` ツール
4. `search_page_revisions` ツール

### Phase 2

5. `get_pack_format_info` ツール (Pack format ページ解析)
6. `search_wiki_page` ツール
7. エラーハンドリング強化

### Phase 3

8. `compare_versions` ツール
9. キャッシング実装
10. ドキュメント整備

---

## 実装詳細ガイド

### MediaWiki API 仕様

**ベース URL**: `https://minecraft.wiki/api.php`

**共通パラメータ**:

- `format=json` - JSON レスポンスを取得
- `origin=*` - CORS 対応

#### 1. ページ検索 API

```
GET https://minecraft.wiki/api.php?action=query&list=search&srsearch={query}&format=json&origin=*
```

**パラメータ**:

- `action=query` - クエリアクション
- `list=search` - 検索リスト
- `srsearch={query}` - 検索クエリ
- `srnamespace=0` - メインページのみ (オプション)
- `srlimit={limit}` - 結果数 (デフォルト: 10, 最大: 500)

**レスポンス例**:

```json
{
  "query": {
    "search": [
      {
        "ns": 0,
        "title": "Recipe",
        "pageid": 12345,
        "snippet": "Recipes are data files..."
      }
    ]
  }
}
```

#### 2. ページ内容取得 API (最新版)

```
GET https://minecraft.wiki/api.php?action=parse&page={title}&prop=text|wikitext&format=json&origin=*
```

**パラメータ**:

- `action=parse` - パースアクション
- `page={title}` - ページタイトル
- `prop=text` - HTML を取得
- `prop=wikitext` - Wiki マークアップを取得
- `section={number}` - 特定セクションのみ取得 (オプション)
- `disablelimitreport=1` - レポートを無効化 (推奨)

**レスポンス例**:

````json
{
  "parse": {
    "title": "Recipe",
    "pageid": 12345,
    "revid": 3269126,
    "text": {
      "*": "<div>...HTML content...</div>"
    },
    "wikitext": {
      "*": "== Syntax ==\n```json\n..."
    }
  }
}
````

#### 3. 特定リビジョン取得 API

```
GET https://minecraft.wiki/api.php?action=parse&oldid={revisionId}&prop=text|wikitext&format=json&origin=*
```

**パラメータ**:

- `oldid={revisionId}` - リビジョン ID

#### 4. ページ履歴取得 API

```
GET https://minecraft.wiki/api.php?action=query&prop=revisions&titles={title}&rvprop=ids|timestamp|comment|user&rvlimit={limit}&format=json&origin=*
```

**パラメータ**:

- `prop=revisions` - リビジョン情報
- `titles={title}` - ページタイトル
- `rvprop=ids|timestamp|comment|user` - 取得するプロパティ
- `rvlimit={limit}` - 結果数 (デフォルト: 10, 最大: 500)
- `rvstart={timestamp}` - 開始日時 (ISO 8601)
- `rvend={timestamp}` - 終了日時

**レスポンス例**:

```json
{
  "query": {
    "pages": {
      "12345": {
        "pageid": 12345,
        "title": "Recipe",
        "revisions": [
          {
            "revid": 3269126,
            "parentid": 3269125,
            "user": "ExampleUser",
            "timestamp": "2025-11-15T10:30:00Z",
            "comment": "Updated for 1.21.2"
          }
        ]
      }
    }
  }
}
```

### JSON 抽出ロジック

Wiki ページから JSON コードブロックを抽出するロジック:

````typescript
function extractJsonBlocks(wikitext: string): any[] {
  const jsonBlocks: any[] = [];

  // ```json ... ``` パターンを検索
  const regex = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(wikitext)) !== null) {
    try {
      const jsonText = match[1].trim();
      const parsed = JSON.parse(jsonText);
      jsonBlocks.push(parsed);
    } catch (e) {
      // 無効な JSON はスキップ
      console.error("Invalid JSON block:", e);
    }
  }

  return jsonBlocks;
}
````

**HTML からテキスト抽出**:

```typescript
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}
```

### バージョン判定ロジック

```typescript
interface PackFormatMapping {
  packFormat: number;
  minecraftVersions: string[];
  directoryNaming: "singular" | "plural";
  usesMinMaxFormat: boolean;
}

const KNOWN_PACK_FORMATS: PackFormatMapping[] = [
  {
    packFormat: 88,
    minecraftVersions: ["1.21.9", "1.21.10"],
    directoryNaming: "singular",
    usesMinMaxFormat: true,
  },
  {
    packFormat: 57,
    minecraftVersions: ["1.21.2", "1.21.3"],
    directoryNaming: "singular",
    usesMinMaxFormat: false,
  },
  {
    packFormat: 48,
    minecraftVersions: ["1.21", "1.21.1"],
    directoryNaming: "singular",
    usesMinMaxFormat: false,
  },
  {
    packFormat: 41,
    minecraftVersions: ["1.20.5", "1.20.6"],
    directoryNaming: "plural",
    usesMinMaxFormat: false,
  },
  // ... その他のフォーマット
];

function getPackFormat(minecraftVersion: string): PackFormatMapping | null {
  for (const mapping of KNOWN_PACK_FORMATS) {
    if (mapping.minecraftVersions.includes(minecraftVersion)) {
      return mapping;
    }
  }
  return null;
}

function getDirectoryNames(
  directoryNaming: "singular" | "plural"
): Record<string, string> {
  if (directoryNaming === "singular") {
    return {
      loot_tables: "loot_table",
      functions: "function",
      recipes: "recipe",
      "tags/items": "tag/item",
      advancements: "advancement",
    };
  } else {
    return {
      loot_tables: "loot_tables",
      functions: "functions",
      recipes: "recipes",
      "tags/items": "tags/items",
      advancements: "advancements",
    };
  }
}
```

**注意**: 上記の `KNOWN_PACK_FORMATS` は最小限の例です。実装時は `get_pack_format_info` ツールで動的に取得することを推奨します。

### MCP Server エントリーポイント

`src/index.ts` の実装例:

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ツールのインポート
import { createDatapackStructure } from "./tools/createDatapackStructure.js";
import { searchWikiPage } from "./tools/searchWikiPage.js";
import { getWikiPage } from "./tools/getWikiPage.js";
import { searchPageRevisions } from "./tools/searchPageRevisions.js";
import { getPackFormatInfo } from "./tools/getPackFormatInfo.js";
import { compareVersions } from "./tools/compareVersions.js";

const server = new Server(
  {
    name: "minecraft-wiki-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_datapack_structure",
        description:
          "Generate pack.mcmeta and correct directory structure for a specific Minecraft version",
        inputSchema: {
          type: "object",
          properties: {
            minecraftVersion: {
              type: "string",
              description: "Minecraft version (e.g., '1.21.2')",
            },
            description: {
              type: "string",
              description: "Datapack description",
            },
            features: {
              type: "array",
              items: { type: "string" },
              description:
                "Required features (e.g., ['recipes', 'loot_tables'])",
            },
          },
          required: ["minecraftVersion", "description"],
        },
      },
      {
        name: "search_wiki_page",
        description: "Search for pages in Minecraft Wiki",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            namespace: {
              type: "number",
              description: "Wiki namespace (0 = main pages)",
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_wiki_page",
        description: "Get wiki page content (latest or specific revision)",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Page title (e.g., 'Recipe')",
            },
            revisionId: {
              type: "number",
              description: "Specific revision ID (omit for latest)",
            },
            section: {
              type: "number",
              description: "Section number (omit for entire page)",
            },
            extractJson: {
              type: "boolean",
              description: "Extract JSON code blocks (default: true)",
            },
            format: {
              type: "string",
              enum: ["wikitext", "html", "plain"],
              description: "Output format (default: 'plain')",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "search_page_revisions",
        description: "Search page edit history for version-specific revisions",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Page title",
            },
            versionPattern: {
              type: "string",
              description:
                "Version pattern to search in comments (e.g., '1.21.2')",
            },
            startDate: {
              type: "string",
              description: "Start date (ISO 8601)",
            },
            endDate: {
              type: "string",
              description: "End date (ISO 8601)",
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 20)",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "get_pack_format_info",
        description: "Get pack format information for Minecraft versions",
        inputSchema: {
          type: "object",
          properties: {
            minecraftVersion: {
              type: "string",
              description: "Minecraft version (e.g., '1.21.2')",
            },
            packFormat: {
              type: "number",
              description: "Pack format number",
            },
          },
        },
      },
      {
        name: "compare_versions",
        description: "Compare changes between two Minecraft versions",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "string",
              description: "Page to compare (e.g., 'Recipe')",
            },
            fromVersion: {
              type: "string",
              description: "Starting version (e.g., '1.20.5')",
            },
            toVersion: {
              type: "string",
              description: "Ending version (e.g., '1.21.2')",
            },
          },
          required: ["page", "fromVersion", "toVersion"],
        },
      },
    ],
  };
});

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_datapack_structure":
        return await createDatapackStructure(args);
      case "search_wiki_page":
        return await searchWikiPage(args);
      case "get_wiki_page":
        return await getWikiPage(args);
      case "search_page_revisions":
        return await searchPageRevisions(args);
      case "get_pack_format_info":
        return await getPackFormatInfo(args);
      case "compare_versions":
        return await compareVersions(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Minecraft Wiki MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

### ツール実装テンプレート

各ツールは以下の形式で実装:

```typescript
// src/tools/exampleTool.ts
import { callMediaWikiAPI } from "../api/mediawiki.js";

interface ExampleToolArgs {
  param1: string;
  param2?: number;
}

interface ExampleToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export async function exampleTool(
  args: ExampleToolArgs
): Promise<ExampleToolResult> {
  // 1. パラメータ検証
  if (!args.param1) {
    throw new Error("param1 is required");
  }

  // 2. MediaWiki API 呼び出し
  const data = await callMediaWikiAPI({
    action: "query",
    list: "search",
    srsearch: args.param1,
  });

  // 3. レスポンス整形
  const resultText = JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: "text",
        text: resultText,
      },
    ],
  };
}
```

### MediaWiki API ラッパー実装

`src/api/mediawiki.ts`:

```typescript
import { URLSearchParams } from "url";

const WIKI_API_BASE = "https://minecraft.wiki/api.php";

interface MediaWikiParams {
  [key: string]: string | number | boolean | undefined;
}

export async function callMediaWikiAPI(params: MediaWikiParams): Promise<any> {
  // デフォルトパラメータ
  const defaultParams = {
    format: "json",
    origin: "*",
  };

  const allParams = { ...defaultParams, ...params };

  // undefined を除去
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(allParams)) {
    if (value !== undefined) {
      cleanParams[key] = String(value);
    }
  }

  const queryString = new URLSearchParams(cleanParams).toString();
  const url = `${WIKI_API_BASE}?${queryString}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `MediaWiki API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // エラーチェック
  if (data.error) {
    throw new Error(
      `MediaWiki API error: ${data.error.code} - ${data.error.info}`
    );
  }

  return data;
}
```

### 型定義

`src/types.ts`:

```typescript
export interface PackMcmeta {
  pack: {
    pack_format?: number;
    min_format?: number;
    max_format?: number;
    description: string;
  };
}

export interface DirectoryStructure {
  data: {
    [namespace: string]: {
      [directory: string]: string[];
    };
  };
}

export interface VersionInfo {
  minecraft_version: string;
  pack_format: number;
  directory_naming: "singular" | "plural";
  uses_min_max_format: boolean;
}

export interface WikiPage {
  title: string;
  pageid: number;
  revid: number;
  content: string;
  jsonBlocks?: any[];
}

export interface WikiRevision {
  revisionId: number;
  timestamp: string;
  comment: string;
  user: string;
}

export interface SearchResult {
  title: string;
  pageId: number;
  snippet: string;
}
```

### エラーハンドリングパターン

```typescript
export class WikiAPIError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "WikiAPIError";
  }
}

export class VersionNotFoundError extends Error {
  constructor(version: string) {
    super(`Version ${version} not found in Pack format data`);
    this.name = "VersionNotFoundError";
  }
}

export class PageNotFoundError extends Error {
  constructor(title: string) {
    super(`Page "${title}" not found`);
    this.name = "PageNotFoundError";
  }
}

// 使用例
try {
  const data = await callMediaWikiAPI(params);
} catch (error) {
  if (error instanceof WikiAPIError) {
    // 特定のエラー処理
  } else {
    // 一般的なエラー処理
  }
}
```

### テストデータ例

開発時の検証用データ:

```typescript
// src/utils/testData.ts
export const TEST_REVISIONS = {
  RECIPE_1_20_5: 2557310,
  RECIPE_1_21_2: 3269126,
  DATA_PACK_1_21: 3000000, // 仮の値
};

export const EXPECTED_JSON_1_20_5 = {
  type: "minecraft:crafting_shaped",
  pattern: ["###", "# #", "###"],
  key: {
    "#": { item: "minecraft:iron_ingot" },
  },
  result: { item: "minecraft:bucket" },
};

export const EXPECTED_JSON_1_21_2 = {
  type: "minecraft:crafting_shaped",
  pattern: ["###", "# #", "###"],
  key: {
    "#": "minecraft:iron_ingot",
  },
  result: { id: "minecraft:bucket" },
};
```

### デバッグ用ログ

開発時のデバッグ出力:

```typescript
const DEBUG = process.env.DEBUG === "true";

export function debugLog(message: string, data?: any): void {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
  }
}

// 使用例
debugLog("Fetching page", { title: "Recipe", revisionId: 3269126 });
```

### npm scripts の完全版

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "prepare": "npm run build",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "check": "biome check --write .",
    "test": "DEBUG=true node dist/index.js",
    "clean": "rm -rf dist"
  }
}
```

### shebang とパーミッション

`dist/index.js` の先頭に shebang が必要:

```typescript
#!/usr/bin/env node
```

ビルド後に実行権限を付与:

```bash
chmod +x dist/index.js
```

package.json の `bin` フィールドで自動的に処理されます。

### npx 実行方法

ローカル開発時:

```bash
npm run build
node dist/index.js
```

公開後のユーザー:

```bash
npx minecraft-wiki-mcp
```

MCP 設定ファイル (Claude Desktop 等):

```json
{
  "mcpServers": {
    "minecraft-wiki": {
      "command": "npx",
      "args": ["minecraft-wiki-mcp"]
    }
  }
}
```
