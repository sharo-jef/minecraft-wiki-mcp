# Minecraft Wiki MCP Server

> [!Important]
> This project was created using [OpenSpec](https://github.com/Fission-AI/OpenSpec).

Minecraft Wiki (MediaWiki API) を活用して、AI エージェントが Minecraft Datapack 作成を支援するための MCP Server です。

## 機能

### 実装済み ✅

- [x] **`create_datapack_structure`** - pack.mcmeta と正しいディレクトリ構造を生成

  - バージョン対応 pack_format の自動選択（1.13 ～ 1.21.11）
  - 配列形式の pack_format サポート（`[94, 1]` など）
  - min_format/max_format 形式対応（1.21.9+）
  - 3 階層のバージョン解決（ハードコード → Wiki → フォールバック）
  - Pre-release/Snapshot/RC バージョンの正規化と Wiki 検索
  - ディレクトリ命名規則の自動判定（singular/plural）
  - JSON Schema 生成とバージョン固有の警告表示

- [x] **`get_pack_format_info`** - Minecraft バージョンと pack format の対応情報を取得

  - ハードコードされたバージョンマッピング
  - ディレクトリ命名規則の情報提供

- [x] **`get_wiki_page`** - Wiki ページの内容を取得

  - JSON コードブロックの自動抽出機能
  - 特定リビジョンの取得

- [x] **`search_wiki_page`** - Wiki 内のページを検索

  - ページネーション対応

- [x] **`search_page_revisions`** - ページの編集履歴から特定バージョンに関連するリビジョンを検索

  - バージョンパターンによるフィルタリング
  - 日付範囲指定

- [x] **`compare_versions`** - 2 つのバージョン間での変更点を比較
  - JSON フォーマット差分の可視化

## インストール

```bash
npm install
npm run build
```

## 使用方法

### ローカル実行

```bash
npm start
```

### MCP 設定 (Claude Desktop など)

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

## 開発

```bash
npm run dev    # TypeScript watch mode
npm run check  # Biome lint & format
```

## ライセンス

MIT
