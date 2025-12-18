# 技術設計: SlackメッセージエクスポートにMarkdown形式URL保存機能

## アーキテクチャ概要

既存の`createPromiseGetMessages`関数を拡張し、メッセージからテキストを抽出する際に外部URLリンクも同時に抽出してMarkdown形式に変換する。

### 設計原則
- **単一責任**: URL抽出、Markdown変換、メッセージ整形の各処理を分離
- **Pure関数中心**: 副作用を局所化し、テスタビリティを向上
- **後方互換性**: リンクなしメッセージは既存動作を維持

## コンポーネント設計

### 1. URL抽出コンポーネント

#### `extractExternalLinks(element)`
**責務**: DOM要素から外部URLリンク配列を抽出

**入力**:
- `element: HTMLElement` - メッセージ要素

**出力**:
- `Array<{text: string, url: string}>` - リンクテキストとURLのペア配列

**処理フロー**:
1. `element.querySelectorAll('a')`でリンク要素を取得
2. `link.href`が`/^https?:\/\//`にマッチするもののみフィルタリング（外部URLのみ）
3. `{ text: link.textContent, url: link.href }`形式でマッピング

**実装詳細**:
```javascript
const extractExternalLinks = (element) => {
  const links = element.querySelectorAll('a');
  return Array.from(links)
    .filter(link => /^https?:\/\//.test(link.href))
    .map(link => ({
      text: link.textContent,
      url: link.href
    }));
};
```

### 2. Markdown変換コンポーネント

#### `convertMessageWithMarkdownLinks(message, links)`
**責務**: メッセージ内のリンクテキストをMarkdown形式に置換

**入力**:
- `message: string` - 元のメッセージテキスト
- `links: Array<{text: string, url: string}>` - リンク配列

**出力**:
- `string` - Markdown形式に変換されたメッセージ

**処理フロー**:
1. リンク配列をループ
2. 各リンクテキストを`[text](url)`形式に変換
3. メッセージ内のリンクテキストを正規表現で検索・置換

**実装詳細**:
```javascript
const convertMessageWithMarkdownLinks = (message, links) => {
  let result = message;
  links.forEach(link => {
    const markdownLink = `[${link.text}](${link.url})`;
    const escapedText = escapeRegExp(link.text);
    result = result.replace(new RegExp(escapedText, 'g'), markdownLink);
  });
  return result;
};
```

**エッジケース処理**:
- リンクテキストに特殊文字が含まれる場合: `escapeRegExp`で正規表現エスケープ
- 同じリンクテキストが複数回出現: グローバルフラグ`g`で全置換

### 3. メッセージ抽出コンポーネント（既存修正）

#### `createPromiseGetMessages(messagePack)` - 修正箇所
**変更点**: メッセージテキスト抽出時にURL情報も取得し、Markdown形式に変換

**修正前**:
```javascript
const message = messageGroup.querySelector(messageContentSelector).textContent;
// ... (textContent のみ使用)
const trimmedMessage = message.replace(...).replace(...);
```

**修正後**:
```javascript
const messageElement = messageGroup.querySelector(messageContentSelector);
const message = messageElement.textContent;

// 【新規】外部URLリンクを抽出してMarkdown形式に変換
const externalLinks = extractExternalLinks(messageElement);
const messageWithMarkdownLinks = convertMessageWithMarkdownLinks(message, externalLinks);

const trimmedMessage = messageWithMarkdownLinks.replace(...).replace(...);
```

**影響範囲**: slack-search-result-exporter.js:97-143

## データフロー

```
メッセージDOM要素
  ↓
extractExternalLinks()
  ↓ [{text, url}, ...]
convertMessageWithMarkdownLinks()
  ↓ "text [link](url) text"
既存のメッセージ整形処理
  ↓
TSV出力
```

## テスト戦略（Outside-In TDD）

### E2Eテスト（外側）
**目的**: 実際のSlackページでの動作確認

**テストケース**:
1. 単一外部URLリンクを含むメッセージのエクスポート
2. 複数外部URLリンクを含むメッセージのエクスポート
3. 内部リンクと外部URLが混在するメッセージ
4. URLリンクなしメッセージ（後方互換性）

**ツール**: Playwright/Puppeteer

### 統合テスト（中間層）
**目的**: DOM操作と関数連携の検証

**テストケース**:
1. モックDOM要素からのリンク抽出
2. 外部/内部リンクのフィルタリング
3. 複数リンクの処理
4. リンクなし要素の処理

### 単体テスト（内側）
**目的**: 各関数のロジック検証

#### `extractExternalLinks(element)`
- リンクなし要素 → 空配列
- 外部URLのみフィルタリング（http/https）
- 内部リンク除外（相対パス、mailto等）
- null/undefinedの処理

#### `convertMessageWithMarkdownLinks(message, links)`
- 単一リンクの置換
- 複数リンクの置換
- リンクテキスト重複時の処理
- 特殊文字を含むリンクテキスト
- 空配列の処理

### テストピラミッド比率
```
E2E:       2ケース（ハッピーパス、複雑ケース）
統合:      6ケース（DOM操作、フィルタリング）
単体:     18ケース（境界値、エラーハンドリング）
比率:     1:3:9
```

## パフォーマンス設計

### 計算量分析
- `querySelectorAll('a')`: O(n) - メッセージ内のリンク数
- `filter + map`: O(n) - リンク数に比例
- `replace`: O(m * n) - メッセージ長 × リンク数

**想定**: 通常のSlackメッセージでリンク数は1-5個程度のため、影響は軽微

### 最適化ポイント
- リンク抽出は1回のみ（キャッシュ不要）
- 正規表現エスケープは必要時のみ実行
- 大量メッセージ時の非同期処理は既存実装を維持

## セキュリティ設計

### XSS対策
- `.textContent`プロパティ使用によりHTMLエスケープ済み
- ユーザー入力を直接DOM操作しない
- Markdown形式の`[]()`記法は静的文字列のため安全

### エスケープ処理
- TSV形式のタブ・改行文字は既存処理を維持
- URL内の特殊文字は`href`プロパティから取得（ブラウザがエンコード済み）
- リンクテキスト内の特殊文字は正規表現エスケープ

## エラーハンドリング設計

### エラーケース
1. **メッセージ要素が見つからない**: `querySelector`がnull → 既存処理でスキップ
2. **リンク要素が壊れている**: `href`が不正 → フィルタで除外
3. **特殊文字のエスケープ失敗**: 正規表現エラー → try-catchで処理

### ログ出力
既存のデバッグモード（`enableDebugMode`）を活用:
```javascript
log("extractExternalLinks | Found " + links.length + " external links");
```

## 後方互換性保証

### 既存動作の維持
- リンクなしメッセージ: `extractExternalLinks` → 空配列 → `convertMessageWithMarkdownLinks`でそのまま返却
- TSVフォーマット: 既存の`日時\tチャンネル\t送信者\tメッセージ本文`を維持
- セレクタ: 既存セレクタを変更せず、追加のみ

### 破壊的変更のチェック
- ✅ 関数シグネチャ変更なし（内部実装のみ）
- ✅ グローバル変数追加なし
- ✅ 既存関数の削除なし

## 実装順序（TDDサイクル）

### Phase 1: Red（テスト作成）
1. 単体テスト: `extractExternalLinks`
2. 単体テスト: `convertMessageWithMarkdownLinks`
3. 統合テスト: DOM操作 + 関数連携
4. E2Eテスト: 実際のSlackページ

### Phase 2: Green（最小実装）
1. `extractExternalLinks`関数作成
2. `convertMessageWithMarkdownLinks`関数作成
3. `createPromiseGetMessages`修正

### Phase 3: Refactor（品質向上）
1. 関数の責務分離確認
2. 定数化（セレクタ、正規表現パターン）
3. エラーハンドリング追加
4. コメント追加

## ファイル構成

### 変更ファイル
- `slack-search-result-exporter.js`: 主要な実装ファイル
  - 新規関数: `extractExternalLinks`, `convertMessageWithMarkdownLinks`
  - 修正関数: `createPromiseGetMessages` (97-143行目)

### 新規ファイル（テスト）
- テストファイルは本プロジェクトに含まず（ブックマークレット特性上）
- 開発時のみローカルでテスト実施

## 技術的制約

### 必須条件
- Vanilla JavaScript（ES6+）
- フレームワーク/ライブラリ不使用
- ブラウザネイティブAPI のみ

### 動作環境
- Chrome 90+
- Firefox 88+
- Safari 14+

## リスク緩和策

### DOM構造変更への対応
- 複数セレクタパターンの準備:
  ```javascript
  const messageLinkSelectors = [
    '.c-search_message__content a',
    '[data-qa="message-text"] a',
    '.c-message__body a'
  ];
  ```

### 特殊文字処理の強化
- 既存の`escapeRegExp`関数を活用
- Markdown特殊文字（`[]()` ）のエスケープテスト

### パフォーマンス監視
- 開発時にパフォーマンス測定を実施
- 100件メッセージで5秒以内の目標

## 参考資料

- 既存コード: `slack-search-result-exporter.js`
- Markdown仕様: [CommonMark](https://commonmark.org/)
- DOM API: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
