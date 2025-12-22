# slack-search-result-exporter

Slack検索結果とチャンネルのメッセージをTSV形式でエクスポート - Chrome拡張機能またはブックマークレットで利用可能

**🎯 推奨: 最高のエクスペリエンスには [Chrome拡張機能をインストール](#chrome拡張機能-推奨)**

**デモビデオ**: TBD（Chrome拡張機能のデモンストレーションを含む動画を近日公開）

## 機能

### Chrome拡張機能（推奨）

✅ **ワンクリックエクスポート**
- ツールバーアイコンをクリックするだけで即座にエクスポート
- 検索結果ページまたはチャンネルページを自動検出
- ブックマーク設定不要

✅ **日付フィルタプリセット**
- クイックフィルタ: 当日、昨日、一週間、一ヶ月
- セッション間で設定を永続化
- Chrome ブラウザ間で同期（chrome.storage.sync）

✅ **強化されたエクスポート機能**
- 自動ページネーション付き検索結果ページ
- チャンネルページのメッセージエクスポート（拡張機能限定）
- プログレスインジケータとローディング状態表示

✅ **優れたユーザーエクスペリエンス**
- モダンなポップアップUIと明確なステータス更新
- ワンクリックでクリップボードにコピー
- すべての操作で視覚的なフィードバック

✅ **すべてのコア機能**
- Markdown URL変換
- リンクプレビュー除外
- 複数行メッセージサポート
- TSV形式エクスポート
- XSS保護とセキュリティ

### ブックマークレット（軽量な代替手段）

✅ **コアエクスポート機能**
- Markdown URL変換
- リンクプレビュー除外
- 複数行メッセージサポート
- TSV形式エクスポート
- XSS保護

⚠️ **制限事項**
- 検索結果のみ（チャンネルエクスポート不可）
- 日付プリセットなし
- 設定の永続化なし
- 手動実行が必要

## どちらを使うべきか？

| 機能 | Chrome拡張機能 | ブックマークレット |
|------|---------------|------------------|
| ワンクリック操作 | ✅ | ❌（手動クリック） |
| 日付フィルタプリセット | ✅ | ❌ |
| 設定の永続化 | ✅ | ❌ |
| チャンネルページエクスポート | ✅ | ❌ |
| 検索結果エクスポート | ✅ | ✅ |
| インストール必要 | ✅ | ❌ |
| プログレスインジケータ | ✅ | ⚠️ 基本的 |
| クリップボードコピーボタン | ✅ | ❌ |
| Chrome ウェブストアインストール | 🔜 リクエストがあれば対応 | - |
| **推奨用途** | ほとんどのユーザー | 最小セットアップ、携帯性 |

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

> 💡 **Chrome ウェブストアでの簡単インストールをご希望ですか？**
>
> ワンクリックインストールを実現するため、Chrome ウェブストアでの公開を検討しています。
> この機能をご希望の場合は、[Issue を作成](https://github.com/armaniacs/slack-search-result-exporter/issues/new)するか 👍 リアクションでお知らせください。
>
> **[Chrome ウェブストア公開をリクエスト →](https://github.com/armaniacs/slack-search-result-exporter/issues/new?title=Request:%20Chrome%20Web%20Store%20Publication&body=I%20would%20like%20to%20install%20this%20extension%20from%20the%20Chrome%20Web%20Store%20for%20easier%20installation.)**
>
> _リクエストが多いほど、優先度が上がります！現在の利用者数に応じて公開を判断します。_

## Chrome拡張機能（推奨）

### オプション1: Chrome ウェブストア（近日公開予定）
リクエストが多い場合、ワンクリックインストールのためにChrome ウェブストアで公開します。上記のバナーからリクエストしてください！

### オプション2: 開発者モード（現在利用可能）
1. このリポジトリをダウンロード
2. `npm run build` を実行して拡張機能をビルド
3. Chrome → 拡張機能（chrome://extensions/）を開く
4. 「デベロッパーモード」を有効化
5. 「パッケージ化されていない拡張機能を読み込む」をクリック
6. `dist/` フォルダを選択
7. 拡張機能アイコンをツールバーにピン留め

## ブックマークレット（代替手段）

ゼロインストールまたはポータビリティが必要な場合に最適です。

### クイックインストール
1. [slack-search-result-exporter.user.js](slack-search-result-exporter.user.js) を開く
2. **ファイル全体の内容**をコピー（`javascript:(function(){...` で始まる）
3. ブラウザで新しいブックマークを作成:
   - **名前**: `Export Slack Search`（または任意の名前）
   - **URL**: コピーしたJavaScriptコードを貼り付け
4. ブックマークを保存

### 手動インストール
1. [slack-search-result-exporter.js](slack-search-result-exporter.js) を開く
2. 全内容をコピー
3. 先頭に`javascript:(`、末尾に`);`を追加
4. 上記の手順3-4を実行

## 使用方法

### Chrome拡張機能の使用

1. Slack（slack.com）に移動
2. 検索結果ページまたはチャンネルページを開く
3. ツールバーの拡張機能アイコンをクリック
4. （オプション）日付プリセットフィルタを選択
5. 「エクスポート」をクリック
6. ポップアップから結果をコピー

**プロのヒント**: よく使う検索には日付プリセットを使用してください。最後の選択が自動的に保存されます。

### ブックマークレットの使用

1. slack.comを開く
2. メッセージを検索して結果を待つ
3. ブックマークバーのブックマークレットをクリック
4. ポップアップウィンドウを許可
5. ポップアップからTSVデータをコピー

**注意**: ブックマークレットは検索結果ページでのみ動作し、チャンネルでは動作しません。

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

## ブックマークレットから拡張機能への移行

すでにブックマークレットを使用していますか？アップグレードすべき理由：

1. **時間節約**: 手動のブックマーククリックが不要
2. **より良い機能**: 日付プリセット、チャンネルエクスポート、永続的設定
3. **同じエクスポート形式**: 既存のワークフローがそのまま機能

**移行手順**:
1. 上記の手順でChrome拡張機能をインストール
2. （オプション）バックアップとしてブックマークレットを保持
3. 拡張機能の使用を開始 - エクスポートされるデータ形式は同一です

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
