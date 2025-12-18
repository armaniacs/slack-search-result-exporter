# 手動テスト実行ガイド - Tasks 9.1 & 10.1

## 概要

このガイドに従って、タスク9.1（ブラウザ互換性テスト）とタスク10.1（セキュリティとデータ整合性の検証）を実際のSlack環境で実行します。

**所要時間**: 約60-90分

---

## 事前準備

### 1. ブックマークレットのインストール

各ブラウザ（Chrome、Firefox、Safari）で以下を実施：

#### Chrome

1. Chromeを起動
2. ブックマークバーを表示（Cmd+Shift+B / Ctrl+Shift+B）
3. ブックマークバーを右クリック → 「ページを追加」
4. 名前: `Export Slack Search`
5. URL欄に以下を入力:

```javascript
javascript:(function(){/* slack-search-result-exporter.jsの全内容をここに貼り付け */})()
```

6. 保存

#### Firefox

1. Firefoxを起動
2. ブックマークツールバーを表示（Cmd+Shift+B / Ctrl+Shift+B）
3. 「ブックマーク」メニュー → 「ブックマークを追加」
4. 名前: `Export Slack Search`
5. URL欄に上記のJavaScriptコードを貼り付け
6. 保存

#### Safari

1. Safariを起動
2. 「ブックマーク」メニュー → 「ブックマークを追加」
3. 名前: `Export Slack Search`
4. URL欄に上記のJavaScriptコードを貼り付け
5. お気に入りバーに追加
6. 保存

### 2. デバッグモードの有効化

テスト中の詳細ログを確認するため、`slack-search-result-exporter.js`の5行目を確認：

```javascript
const enableDebugMode = true;  // ✅ trueであることを確認
```

### 3. テスト用Slackメッセージの準備

Slackワークスペースに以下のテストメッセージを投稿（テスト用チャンネル推奨）：

```
メッセージ1: 通常のテキストメッセージ（URLなし）

メッセージ2: 単一外部URL
Check out https://github.com for code repositories.

メッセージ3: 複数外部URL
Visit https://google.com for search and https://github.com for code.

メッセージ4: 内部リンクと外部URL混在
See #general channel and https://example.com

メッセージ5: 特殊文字を含むURL
Documentation: https://example.com/search?query=hello world&lang=ja

メッセージ6: リンクテキストに特殊文字
[C++ Guide] https://cppreference.com
Regex (.*+?) https://example.com/regex

メッセージ7: タブ区切り（データ整合性テスト用）
Column1	Column2	Column3

メッセージ8: 複数行（データ整合性テスト用）
Line 1
Line 2
Line 3
```

---

## テスト実行フェーズ

### Phase 1: Chrome テスト（タスク9.1）

#### Step 1.1: 基本動作確認

1. ChromeでSlackワークスペースにログイン
2. 検索バーで上記テストメッセージを検索（例: "Check out"）
3. 検索結果が表示されることを確認
4. ブックマークレット「Export Slack Search」をクリック
5. **開発者ツール（F12）を開き、Consoleタブを確認**

**期待結果チェックリスト**:
- [✅] エラーなくブックマークレットが実行される
- [✅] ポップアップウィンドウが表示される
- [✅] TSV形式（日時\tチャンネル\t送信者\tメッセージ）で出力される
- [✅] コンソールに`>>> getMessage`などのログが表示される

**結果記録**:
```
Chrome基本動作:✅ PASS 
備考: ___________
```

---

#### Step 1.2: Markdown形式URL変換確認

1. エクスポートされたテキストエリアの内容を確認
2. メッセージ2（単一URL）を探す
3. URL部分が`[github.com](https://github.com)`のようなMarkdown形式になっているか確認

**期待結果チェックリスト**:
- [✅] 外部URLが`[テキスト](URL)`形式に変換されている
- [✅] コンソールログに`Extracted N external links`が表示される
- [✅] 変換前後のメッセージがログ出力されている

**結果記録**:
```
Chrome Markdown変換:
元メッセージ: Check out https://github.com for code repositories.
変換後: 2025-12-17 Wed 19:46:27	test_yasuarak	Yasuhiro ARAKI	Check out [https://github.com](https://github.com/) for code repositories.
✅ PASS
```

---

#### Step 1.3: 複数URLとフィルタリング確認

1. メッセージ3（複数URL）のエクスポート結果を確認
2. メッセージ4（内部リンク混在）のエクスポート結果を確認

**期待結果チェックリスト**:
- [✅] 複数のURLがすべてMarkdown形式に変換
- [✅] 内部リンク（#general）はそのまま残る
- [✅] 外部URLのみMarkdown化
- [✅] リンクプレビューテキストが除外される

**結果記録**:
```
Chrome 複数URL: ✅ PASS
備考: リンクプレビュー除外機能を追加して修正完了
```

##### メッセージ３の最終変換結果
```
2025-12-17 Wed 19:46:37	test_yasuarak	Yasuhiro ARAKI	Visit [https://google.com](https://google.com/) for search and [https://github.com](https://github.com/) for code.
```
✅ リンクプレビューテキスト（`google.com`）が正しく除外されている

---

#### Step 1.4: 特殊文字処理確認

1. メッセージ5（クエリパラメータ）のエクスポート結果を確認
2. URLが正しく処理されているか確認

**結果記録**:
```
Chrome 特殊文字: ✅ PASS
URL: https://example.com/search?query=hello world&lang=ja
エクスポート結果: Documentation: [https://example.com/search?query=hello](https://example.com/search?query=hello) world&lang=ja
備考: URLのクエリパラメータが正しく処理されている
```

---

#### Step 1.5: パフォーマンス確認

1. 大量検索結果（50件以上）で検索
2. ブックマークレットを実行
3. 開発者ツールの**Performanceタブ**でプロファイリング
4. エクスポート完了までの時間を計測

**期待結果**:
- 100件のメッセージで5秒以内に完了

**結果記録**:
```
Chrome パフォーマンス: ⏭️ SKIPPED
備考: 少量のテストメッセージ（8件）で動作確認済み
```

---

### Phase 2: Firefox テスト（タスク9.1）

**結果記録**:
```
⏭️ SKIPPED - Firefoxは使用しないためテストをスキップ
```

---

### Phase 3: Safari テスト（タスク9.1）

**結果記録**:
```
⏭️ SKIPPED - Safariは使用しないためテストをスキップ
```

---

### Phase 4: セキュリティ検証（タスク10.1）

**ブラウザ**: Chrome（代表として使用）

#### Step 4.1: XSS対策確認

1. 開発者ツール（F12）→ Consoleタブを開く
2. ブックマークレットを実行
3. コンソールログで以下を確認:

```javascript
// 確認ポイント
extractExternalLinks | Found N total links
extractExternalLinks | Filtered to M external links  // M <= N
```

4. `slack-search-result-exporter.js`をテキストエディタで開く
5. 以下のコードを検索・確認:

```javascript
// ✅ 確認1: .textContent使用
const message = messageClone.textContent;  // 158行目

// ✅ 確認2: .textContent使用
linkText = link.textContent.trim();  // 288行目

// ✅ 確認3: 正規表現フィルタ
.filter(link => /^https?:\/\//.test(link.href))  // 273-275行目
```

**期待結果チェックリスト**:
- [✅] `.textContent`がすべてのテキスト抽出で使用されている
- [✅] `.innerHTML`や`.outerHTML`が使用されていない
- [✅] `javascript:`プロトコルが除外される（フィルタ正規表現で）
- [✅] `data:`プロトコルが除外される

**結果記録**:
```
XSS対策: ✅ PASS
.textContent使用: ✅
危険なプロトコル除外: ✅
備考: すべてのテキスト抽出で.textContentを使用、http/https以外は除外
```

---

#### Step 4.2: TSVデータ整合性確認

1. メッセージ7（タブ区切り）をエクスポート
2. エクスポート結果をテキストエディタにコピー
3. タブ文字で分割してカラム数を確認

**期待結果**:
- TSV形式が4カラム（日時、チャンネル、送信者、メッセージ）を維持
- メッセージ内のタブがTSVフォーマットを破壊しない

**結果記録**:
```
TSVタブ処理: ✅ PASS
カラム数: 4（期待: 4）
エクスポート結果: 2025-12-17 Wed 19:47:48	test_yasuarak	Yasuhiro ARAKI	Column1  Column2  Column3
備考: タブ文字がスペース2つに変換され、TSVフォーマットが維持されている
```

---

4. メッセージ8（複数行）をエクスポート
5. エクスポート結果の行数を確認

**期待結果**:
- 1メッセージが1行のTSVレコードになる

**結果記録**:
```
TSV改行処理: ✅ PASS
メッセージ行数: 1（期待: 1）
エクスポート結果: Line 1<br>Line 2<br>Line 3
備考: 改行が<br>タグに変換され、TSVフォーマットが維持されている
```

---

#### Step 4.3: 特殊文字エスケープ確認

1. メッセージ6（リンクテキストに特殊文字）をエクスポート
2. Markdown形式が正しいか確認

**期待結果**:
```
[C++ Guide] [https://cppreference.com](https://cppreference.com/)
Regex (.*+?) [https://example.com/regex](https://example.com/regex)
```

**結果記録**:
```
特殊文字エスケープ: ✅ PASS
リンクテキスト: [C++ Guide]
エクスポート結果: [C++ Guide] [https://cppreference.com](https://cppreference.com/)<br>Regex (.*+?) [https://example.com/regex](https://example.com/regex)
備考: 特殊文字（[]、括弧、正規表現文字）が正しく処理されている
```

---

## 総合評価

### タスク9.1: ブラウザ互換性テスト

```
Chrome:  ✅ ALL PASS
  - 基本動作: ✅
  - Markdown変換: ✅
  - 複数URL/フィルタリング: ✅
  - 特殊文字処理: ✅
  - パフォーマンス: ⏭️ SKIPPED

Firefox: ⏭️ SKIPPED（使用しないため）
Safari:  ⏭️ SKIPPED（使用しないため）

総合: ✅ PASS
```

### タスク10.1: セキュリティとデータ整合性

```
XSS対策:          ✅ PASS
  - .textContent使用: ✅
  - 危険なプロトコル除外: ✅

TSV整合性:        ✅ PASS
  - タブ文字処理: ✅
  - 改行処理(<br>変換): ✅

特殊文字処理:     ✅ PASS
  - Markdown特殊文字: ✅
  - 正規表現文字: ✅

総合: ✅ PASS
```

---

## 問題が見つかった場合

### 報告フォーマット

```
問題タイトル: ___________
重大度: Critical / High / Medium / Low
ブラウザ: Chrome / Firefox / Safari
再現手順:
1. ___________
2. ___________

期待結果: ___________
実際の結果: ___________
スクリーンショット: [添付]
```

---

## テスト完了後のアクション

1. このガイドに記録したテスト結果をまとめる
2. すべてのテストがPASSした場合:
   - tasks.mdのタスク9.1と10.1を完了としてマーク
   - spec.jsonの`implementation.completed`を`true`に設定

3. 問題が見つかった場合:
   - 問題を報告
   - 修正後に再テスト

---

## 次のステップ

- [✅] Chrome テスト完了
- [⏭️] Firefox テスト完了（スキップ）
- [⏭️] Safari テスト完了（スキップ）
- [✅] セキュリティ検証完了
- [✅] テスト結果記録完了
- [N/A] 問題報告（問題なし）
- [ ] tasks.md更新
- [ ] spec.json更新

**Phase 1 & Phase 4 完了！すべてのテストがPASSしました！🎉**
