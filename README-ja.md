# slack-search-result-exporter

Slack検索結果のメッセージをTSV形式でエクスポートします。

[デモビデオ](https://github.com/user-attachments/assets/95238129-c958-40c7-8fb0-63a151d1d45b)

## 機能

✅ **Markdown URL変換**
- 外部URLを`[text](url)`形式に変換
- 内部リンク（#チャンネル参照）はそのまま保持
- 例: `Check out https://github.com` → `Check out [https://github.com](https://github.com/)`

✅ **リンクプレビューの除外**
- Slackのリンクプレビューテキスト（unfurlコンテンツ）を自動削除
- エクスポート時のURL重複テキストを防止
- `.c-search_message__attachments`要素を除外

✅ **複数行メッセージのサポート**
- 改行を`<br>`タグに変換してTSV互換性を確保
- 1行のTSV形式を維持
- 例: `Line 1\nLine 2` → `Line 1<br>Line 2`

✅ **Slack内部リンクのフィルタリング**
- `*.slack.com`ワークスペース内部リンクを除外
- 本物の外部URLのみをエクスポート

✅ **TSVデータエクスポート**
- タブ区切り値形式
- 4列構成: 日時 | チャンネル | 送信者 | メッセージ
- データ整合性のための特殊文字エスケープ

## 出力形式

エクスポートされるデータはTSV（タブ区切り値）形式で、4列構成です:

| 列 | 例 | 説明 |
|--------|---------|-------------|
| DateTime | `2025-12-17 Wed 19:46:37` | メッセージのタイムスタンプ (YYYY-MM-DD DDD HH:MM:SS) |
| Channel | `test_yasuarak` | チャンネル名または`DirectMessage` |
| Sender | `Yasuhiro ARAKI` | メッセージ送信者の表示名 |
| Message | `Visit [https://google.com](...)` | Markdown形式URLを含むメッセージテキスト |

**特殊文字の処理**:
- **改行**: `<br>`タグに変換
- **タブ**: メッセージ内容ではスペースとして保持
- **URL**: Markdown `[text](url)` 形式に変換
- **特殊文字**: リンクテキスト内で正規表現エスケープ


# 使い方

## インストール

### 方法1: クイックインストール（推奨）
1. [slack-search-result-exporter.user.js](slack-search-result-exporter.user.js) を開く
2. **ファイル全体の内容**をコピー（`javascript:(function(){...` で始まる）
3. ブラウザで新しいブックマークを作成:
   - **Chrome**: ブックマーク → ページを追加 (Cmd/Ctrl+D)
   - **Firefox**: ブックマーク → ブックマークを追加
   - **Safari**: ブックマーク → ブックマークを追加
4. ブックマークを編集:
   - **名前**: `Export Slack Search`（または任意の名前）
   - **URL**: コピーしたJavaScriptコードを貼り付け
5. ブックマークを保存

### 方法2: 手動コピー
1. [slack-search-result-exporter.js](slack-search-result-exporter.js) を開く
2. 全内容をコピー
3. 先頭に`javascript:(`、末尾に`);`を追加
4. 上記の手順3-5を実行

**注意**: `.user.js`ファイルは直接使用可能な形式です。`.js`ファイルはソースコードです。

## 使用方法

1. slack.comを開く
2. メッセージを検索して結果を待つ
3. ブックマークレットをクリック

\* ポップアップウィンドウを許可してください。

# Slackでの検索のコツ

```
# 2025/01/01～2025/01/31の間で自分の名前を含むメッセージを検索
xshoji -from:me after:2024-12-31 before:2025-02-01

# 2025/01/01～2025/01/31の間で自分が送信したメッセージを検索
from:me after:2024-12-31 before:2025-02-01

# @exampleから自分へのメッセージを検索（DMを除く）
from:@example xshoji -is:dm
```

## 使用例

### 例1: 基本的なURL変換

**Slackメッセージ**:
```
Check out https://github.com for code repositories.
```

**エクスポートされたTSV**:
```
2025-12-17 Wed 19:46:27	test_channel	John Doe	Check out [https://github.com](https://github.com/) for code repositories.
```

### 例2: 複数のURL

**Slackメッセージ**:
```
Visit https://google.com for search and https://github.com for code.
```

**エクスポートされたTSV**:
```
2025-12-17 Wed 19:46:37	test_channel	John Doe	Visit [https://google.com](https://google.com/) for search and [https://github.com](https://github.com/) for code.
```

### 例3: 複数行メッセージ

**Slackメッセージ**:
```
Line 1
Line 2
Line 3
```

**エクスポートされたTSV**（1行）:
```
2025-12-17 Wed 19:48:00	test_channel	John Doe	Line 1<br>Line 2<br>Line 3
```

### 例4: 混合コンテンツ

**Slackメッセージ**:
```
See #general channel and https://example.com
```

**エクスポートされたTSV**:
```
2025-12-17 Wed 19:46:51	test_channel	John Doe	See #general channel and [https://example.com](https://example.com/)
```
*注: 内部の#チャンネルリンクは保持され、外部URLのみが変換されます。*

# テスト

このプロジェクトには、ブラウザ互換性とセキュリティを確保するためのPlaywrightによる自動テストが含まれています。

## テストの実行

```bash
# 依存関係のインストール
npm install

# 全テストを実行（Chromium、Firefox、WebKit）
npm test

# 特定のブラウザでテストを実行
npm run test:chromium
npm run test:firefox
npm run test:webkit

# 特定のテストスイートを実行
npm run test:browser-compat   # ブラウザ互換性テスト
npm run test:security          # セキュリティ検証テスト

# インタラクティブUIモード
npm run test:ui

# テストレポートの表示
npm run test:report
```

## テストカバレッジ

- ✅ **ブラウザ互換性**（Chrome、Firefox、Safari）
  - ブックマークレット実行
  - Markdown URL変換
  - 複数URL処理
  - URL内の特殊文字
  - リンクプレビュー除外
  - 複数行メッセージ処理
  - パフォーマンス（5秒未満）

- ✅ **セキュリティ検証**
  - XSS保護（.textContent使用）
  - 危険なプロトコルフィルタリング（javascript:、data:）
  - 特殊文字エスケープ
  - Slack内部リンクフィルタリング
  - TSVデータ整合性
  - 改行/タブ文字処理

詳細なテスト結果については、[TEST-RESULTS.md](TEST-RESULTS.md)を参照してください。

## 手動テスト

実際のSlack環境での包括的なテストについては、[MANUAL-TEST-EXECUTION-GUIDE.md](MANUAL-TEST-EXECUTION-GUIDE.md)を参照してください。
