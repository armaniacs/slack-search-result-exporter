# ブラウザ互換性テストガイド - Task 9.1

## 概要

このドキュメントは、Slack検索結果エクスポートブックマークレットの主要ブラウザでの動作確認を行うためのガイドです。Markdown形式URL保存機能を含む全機能が、Chrome、Firefox、Safariで正しく動作することを検証します。

## テスト対象ブラウザ

### 必須対応ブラウザ

1. **Google Chrome** (最新安定版)
   - 対象バージョン: Chrome 90+
   - レンダリングエンジン: Blink

2. **Mozilla Firefox** (最新安定版)
   - 対象バージョン: Firefox 88+
   - レンダリングエンジン: Gecko

3. **Apple Safari** (最新安定版)
   - 対象バージョン: Safari 14+
   - レンダリングエンジン: WebKit

## 事前準備

### 1. ブックマークレットのインストール

各ブラウザで以下の手順を実施:

1. `slack-search-result-exporter.js`の全内容をコピー
2. ブラウザのブックマークマネージャーを開く
3. 新規ブックマークを作成
4. 名前: `Export Slack Search`
5. URL: `javascript:(function(){` + [コピーしたコード] + `})()`
6. ブックマークを保存

### 2. テスト用Slackワークスペース

- アクティブなSlackワークスペースにアクセス権があること
- 外部URLリンクを含むメッセージが検索可能であること
- 複数ページにわたる検索結果が取得可能であること

## テストケース一覧

### TC9.1.1: 基本動作確認（全ブラウザ共通）

**目的**: 基本的なエクスポート機能の動作確認

**手順**:
1. Slackワークスペースにログイン
2. 検索バーでメッセージを検索（例: 過去1週間のメッセージ）
3. 検索結果が表示されることを確認
4. ブックマークレットをクリック
5. ポップアップウィンドウが表示されることを確認
6. TSV形式のメッセージが表示されることを確認

**期待結果**:
- ✅ エラーなくブックマークレットが実行される
- ✅ ポップアップウィンドウが正しく表示される
- ✅ TSV形式（日時\tチャンネル\t送信者\tメッセージ）で出力される
- ✅ メッセージが正しくエクスポートされる

---

### TC9.1.2: Markdown形式URL変換（全ブラウザ共通）

**目的**: 外部URLがMarkdown形式で正しく変換されることを確認

**手順**:
1. 外部URLリンクを含むメッセージを検索（例: "https"で検索）
2. 検索結果に外部リンク付きメッセージが表示されることを確認
3. ブックマークレットを実行
4. エクスポートされたメッセージ内のURLを確認

**期待結果**:
- ✅ 外部URL（http/https）が`[リンクテキスト](URL)`形式で出力される
- ✅ 複数のURLがすべてMarkdown形式に変換される
- ✅ 内部リンク（相対パス、mailto等）は変換されない

**検証例**:
```
変換前: Check out GitHub for more info.
変換後: Check out [GitHub](https://github.com) for more info.
```

---

### TC9.1.3: DOM API互換性（全ブラウザ共通）

**目的**: 使用しているDOM APIが各ブラウザで正しく動作することを確認

**手順**:
1. ブラウザの開発者ツール（F12）を開く
2. Consoleタブを選択
3. `enableDebugMode = true`でブックマークレットを実行
4. コンソールログを確認

**期待結果**:
- ✅ `querySelectorAll('a')`が正しくリンク要素を取得
- ✅ `textContent`プロパティが正しくテキストを返す
- ✅ `MutationObserver`が正しく動作
- ✅ `Array.from()`が正しく配列に変換
- ✅ 正規表現`/^https?:\/\//`が正しく動作
- ✅ エラーログが出力されない

---

### TC9.1.4: ページネーション機能（全ブラウザ共通）

**目的**: 複数ページにわたる検索結果のエクスポート

**手順**:
1. 50件以上の結果が得られる検索クエリを実行
2. ブックマークレットを実行
3. 自動ページめくりが実行されることを確認
4. すべてのページのメッセージがエクスポートされることを確認

**期待結果**:
- ✅ 複数ページを自動で処理できる
- ✅ 重複メッセージが除外される（`messageSet`による重複排除）
- ✅ すべてのページのメッセージが含まれる

---

### TC9.1.5: 特殊文字処理（全ブラウザ共通）

**目的**: 特殊文字を含むURLやメッセージの正しい処理

**手順**:
1. 以下のような特殊文字を含むメッセージを検索:
   - URLに特殊文字: `https://example.com/path?query=value&foo=bar`
   - リンクテキストに特殊文字: `[C++ Guide]`, `Regex (.*+?)`
2. ブックマークレットを実行
3. エクスポート結果を確認

**期待結果**:
- ✅ URLの特殊文字が正しくエンコードされる
- ✅ リンクテキストの特殊文字が`escapeRegExp`で正しくエスケープされる
- ✅ Markdown形式が崩れない
- ✅ TSV形式のタブ・改行がエスケープされる

---

## ブラウザ別の追加確認項目

### Chrome固有の確認項目

- ✅ Blink エンジンでの`MutationObserver`動作
- ✅ V8 JavaScriptエンジンでの`async/await`動作
- ✅ ポップアップブロッカーの影響確認
- ✅ コンソールログの正しい出力

### Firefox固有の確認項目

- ✅ Gecko エンジンでの`querySelectorAll`動作
- ✅ SpiderMonkey JavaScriptエンジンでの正規表現動作
- ✅ ポップアップウィンドウのフォーカス動作
- ✅ プライバシー保護機能との互換性

### Safari固有の確認項目

- ✅ WebKit エンジンでの`Array.from()`動作
- ✅ JavaScriptCore エンジンでの`Promise`動作
- ✅ `textContent`プロパティの動作
- ✅ サードパーティCookie制限の影響

---

## パフォーマンス確認

### 測定項目

各ブラウザで以下のパフォーマンス指標を測定:

1. **リンク抽出時間**: 100件のメッセージからリンク抽出（目標: 2秒以内）
2. **Markdown変換時間**: 100件のメッセージを変換（目標: 5秒以内）
3. **総エクスポート時間**: 100件のメッセージをエクスポート（目標: 5秒以内）

**測定方法**:
- 開発者ツールのPerformanceタブでプロファイリング
- `performance.now()`で各処理の時間を計測
- コンソールログのタイムスタンプを確認

**期待結果**:
- ✅ すべてのブラウザで目標時間以内に完了
- ✅ ブラウザ間で著しいパフォーマンス差がない（±20%以内）

---

## エラーハンドリング確認

### エラーシナリオ

各ブラウザで以下のエラーケースをテスト:

1. **検索結果なし**: 検索結果が0件の場合
2. **ネットワークエラー**: ページ読み込み中にブックマークレット実行
3. **DOM要素なし**: セレクタが見つからない場合
4. **ページ遷移**: エクスポート中にページ遷移

**期待結果**:
- ✅ エラーが発生しても JavaScript例外でクラッシュしない
- ✅ 適切なログメッセージが出力される（`enableDebugMode`時）
- ✅ 部分的なデータでもエクスポート可能

---

## デバッグモード

### デバッグログの有効化

`slack-search-result-exporter.js`の5行目を以下に変更:

```javascript
const enableDebugMode = true;
```

### 確認するログメッセージ

各ブラウザのコンソールで以下のログが正しく出力されることを確認:

```
>>> getMessage
>>> createPromiseWaitSearchResult
>>> createPromiseGetMessages
createPromiseGetMessages | Extracted N external links
createPromiseGetMessages | Message before conversion: ...
createPromiseGetMessages | Message after conversion: ...
>>> extractExternalLinks
extractExternalLinks | Found N total links
extractExternalLinks | Filtered to N external links
>>> convertMessageWithMarkdownLinks
convertMessageWithMarkdownLinks | Converting N links
```

---

## テスト結果記録テンプレート

### Chrome テスト結果

```
日付: YYYY-MM-DD
Chromeバージョン: XX.X.X.X
OSバージョン: macOS XX.X / Windows XX / Linux

TC9.1.1: ✅ PASS / ❌ FAIL
  備考:

TC9.1.2: ✅ PASS / ❌ FAIL
  備考:

TC9.1.3: ✅ PASS / ❌ FAIL
  備考:

TC9.1.4: ✅ PASS / ❌ FAIL
  備考:

TC9.1.5: ✅ PASS / ❌ FAIL
  備考:

パフォーマンス:
  リンク抽出: XXXms
  Markdown変換: XXXms
  総エクスポート時間: XXXms

総合評価: ✅ ALL PASS / ⚠️ MINOR ISSUES / ❌ CRITICAL ISSUES
```

### Firefox テスト結果

```
日付: YYYY-MM-DD
Firefoxバージョン: XX.X
OSバージョン: macOS XX.X / Windows XX / Linux

TC9.1.1: ✅ PASS / ❌ FAIL
  備考:

TC9.1.2: ✅ PASS / ❌ FAIL
  備考:

TC9.1.3: ✅ PASS / ❌ FAIL
  備考:

TC9.1.4: ✅ PASS / ❌ FAIL
  備考:

TC9.1.5: ✅ PASS / ❌ FAIL
  備考:

パフォーマンス:
  リンク抽出: XXXms
  Markdown変換: XXXms
  総エクスポート時間: XXXms

総合評価: ✅ ALL PASS / ⚠️ MINOR ISSUES / ❌ CRITICAL ISSUES
```

### Safari テスト結果

```
日付: YYYY-MM-DD
Safariバージョン: XX.X
OSバージョン: macOS XX.X

TC9.1.1: ✅ PASS / ❌ FAIL
  備考:

TC9.1.2: ✅ PASS / ❌ FAIL
  備考:

TC9.1.3: ✅ PASS / ❌ FAIL
  備考:

TC9.1.4: ✅ PASS / ❌ FAIL
  備考:

TC9.1.5: ✅ PASS / ❌ FAIL
  備考:

パフォーマンス:
  リンク抽出: XXXms
  Markdown変換: XXXms
  総エクスポート時間: XXXms

総合評価: ✅ ALL PASS / ⚠️ MINOR ISSUES / ❌ CRITICAL ISSUES
```

---

## 既知の互換性問題

### ブラウザ固有の制約

**Chrome**:
- なし（現時点で既知の問題なし）

**Firefox**:
- なし（現時点で既知の問題なし）

**Safari**:
- ポップアップブロッカーが厳格な場合、`window.open()`が制限される可能性あり
- 対策: ユーザーにポップアップ許可を促す

---

## トラブルシューティング

### ブックマークレットが実行されない

**症状**: クリックしても何も起こらない

**原因と対策**:
- **Chrome/Firefox**: JavaScript が無効化されている → ブラウザ設定でJavaScriptを有効化
- **Safari**: ブックマークバーの「開発」メニューでJavaScriptを有効化

### ポップアップウィンドウが表示されない

**症状**: エクスポートは実行されるがポップアップが出ない

**原因と対策**:
- ポップアップブロッカーが有効 → Slackドメインを許可リストに追加
- Safari特有: 「ポップアップウィンドウを開く」を許可

### Markdown形式に変換されない

**症状**: URLがそのままテキストで出力される

**原因と対策**:
- Slackのリンク要素が`<a>`タグでない → Slack UIの変更を調査
- デバッグモードで`extractExternalLinks`のログを確認

---

## 次のステップ

ブラウザ互換性テスト完了後:

1. テスト結果を記録
2. 問題が見つかった場合は修正を実施
3. Task 10.1（セキュリティとデータ整合性の検証）に進む

---

## 参考資料

- [Chrome DevTools Documentation](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://developer.mozilla.org/en-US/docs/Tools)
- [Safari Web Inspector](https://developer.apple.com/safari/tools/)
- [Can I Use - Browser Compatibility Tables](https://caniuse.com/)
