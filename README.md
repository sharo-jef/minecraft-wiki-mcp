# Minecraft Wiki MCP Server

> [!Important]
> This project was created using [OpenSpec](https://github.com/Fission-AI/OpenSpec).

Minecraft Wiki (MediaWiki API) を活用して、AI エージェントが Minecraft Datapack 作成を支援するための MCP Server です。

## 機能

- `create_datapack_structure` - pack.mcmeta と正しいディレクトリ構造を生成
- `search_wiki_page` - Wiki 内のページを検索
- `get_wiki_page` - Wiki ページの内容を取得
- `search_page_revisions` - ページの編集履歴から特定バージョンに関連するリビジョンを検索
- `get_pack_format_info` - Minecraft バージョンと pack format の対応情報を取得
- `compare_versions` - 2つのバージョン間での変更点を比較

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