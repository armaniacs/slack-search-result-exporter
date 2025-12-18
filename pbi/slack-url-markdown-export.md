# PBI: SlackメッセージエクスポートにMarkdown形式URL保存機能を追加

**作成日**: 2025-12-17
**ステータス**: Ready for Sprint
**見積もり**: 3ストーリーポイント

---

## ユーザーストーリー

**Slackメッセージをエクスポートするユーザー**として、**メッセージ内の外部URLリンクをMarkdown形式で保存できる**機能がほしい、なぜなら**エクスポートしたTSVファイル内でもリンク情報を失わず、他のツール（Obsidian等）で活用できるから**

---

## ビジネス価値

### 価値
エクスポートしたメッセージ内のURL情報を保持し、後から参照先にアクセス可能にする。

### 測定方法
- URLリンク付きメッセージのエクスポート成功率: 100%
- Markdown形式でのURL保存率: 対象メッセージの100%
- ユーザーフィードバック: Obsidian等でのリンク活用事例

### ユーザー影響
- Obsidianなどのマークダウン対応ツールでリンクをそのまま活用可能
- エクスポートしたデータの情報価値が向上
- 外部ツールとの連携が容易

---

## BDD受け入れシナリオ

```gherkin
Feature: Slackメッセージの外部URLをMarkdown形式でエクスポート

Scenario: 外部URLリンクを含むメッセージをエクスポート
  Given Slack検索結果に外部URLリンクを含むメッセージがある
  And メッセージ内のURLが<a>タグとして表示されている
  When ブックマークレットを実行してメッセージをエクスポートする
  Then TSVのメッセージ本文に[リンク名](URL)形式でURLが保存される
  And URLはhttp/httpsで始まる外部リンクのみ対象

Scenario: 複数の外部URLリンクを含むメッセージ
  Given メッセージに複数の外部URLリンクが含まれている
  When ブックマークレットを実行してエクスポートする
  Then 全ての外部URLが[リンク名](URL)形式で保存される

Scenario: 外部URLリンクがないメッセージ
  Given メッセージにURLリンクが含まれていない
  When ブックマークレットを実行してエクスポートする
  Then メッセージ本文がそのまま保存される（既存動作を維持）

Scenario: 内部リンクは除外
  Given メッセージに内部リンク（#channel、@user）と外部URLが混在
  When ブックマークレットを実行してエクスポートする
  Then 外部URL（http/https）のみMarkdown形式で保存される
  And 内部リンクはテキストとして保存される
```

---

## 受け入れ基準

- [ ] 外部URL（http/https）が`[リンク名](URL)`のMarkdown形式でTSVに保存される
- [ ] 複数のURLが含まれる場合、全てのURLがMarkdown形式で保存される
- [ ] 内部リンク（チャンネル、ユーザーメンション等）はMarkdown変換の対象外
- [ ] URLリンクがないメッセージは既存動作と同じ（後方互換性）
- [ ] TSVフォーマットは既存形式を維持（日時\tチャンネル\t送信者\tメッセージ本文）
- [ ] 特殊文字を含むURLも正しくエスケープして保存される

---

## t_wadaスタイル テスト戦略

### E2Eテスト（ブラウザ実行）
- Slack検索結果ページで実際にリンク付きメッセージをエクスポート
- 出力されたTSVファイルのMarkdown形式を検証
- 複数ページにわたるメッセージのURL保存を確認

**テストケース例**:
```javascript
describe('E2E: Slack Message Export with URLs', () => {
  it('should export external URLs in Markdown format', async () => {
    // Given: Slack検索結果ページにリンク付きメッセージがある
    await page.goto('https://app.slack.com/search');
    await page.waitForSelector('.c-search_message__content');

    // When: ブックマークレットを実行
    await page.evaluate(bookmarkletCode);

    // Then: TSVにMarkdown形式でURLが保存される
    const tsvContent = await getExportedTSV();
    expect(tsvContent).toContain('[Obsidian公式サイト](https://obsidian.md/)');
  });
});
```

### 統合テスト（DOM操作）
- モックDOM要素からの`<a>`タグ抽出テスト
- `href`属性の取得とフィルタリング（http/https）
- リンクテキストとURLのペア生成テスト

**テストケース例**:
```javascript
describe('Integration: Link Extraction from DOM', () => {
  it('should extract external links from message element', () => {
    // Given: メッセージDOMにリンクが含まれる
    const messageElement = createMockMessageElement([
      { text: 'Obsidian公式サイト', url: 'https://obsidian.md/' },
      { text: '#general', url: '/archives/C123456/p1234567890' }
    ]);

    // When: リンクを抽出
    const links = extractExternalLinks(messageElement);

    // Then: 外部URLのみ抽出される
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      text: 'Obsidian公式サイト',
      url: 'https://obsidian.md/'
    });
  });
});
```

### 単体テスト（ロジック）

#### `extractExternalLinks(element)`: DOM要素から外部URLリンク配列を抽出
```javascript
describe('Unit: extractExternalLinks', () => {
  it('should return empty array when no links exist', () => {
    const element = createElement('<div>No links here</div>');
    expect(extractExternalLinks(element)).toEqual([]);
  });

  it('should filter only http/https URLs', () => {
    const element = createElement(`
      <div>
        <a href="https://example.com">External</a>
        <a href="/internal">Internal</a>
        <a href="mailto:test@example.com">Email</a>
      </div>
    `);
    const links = extractExternalLinks(element);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://example.com');
  });
});
```

#### `convertToMarkdownLink(linkText, url)`: Markdown形式`[text](url)`変換
```javascript
describe('Unit: convertToMarkdownLink', () => {
  it('should convert to Markdown format', () => {
    expect(convertToMarkdownLink('Example', 'https://example.com'))
      .toBe('[Example](https://example.com)');
  });

  it('should handle special characters in link text', () => {
    expect(convertToMarkdownLink('[Test]', 'https://example.com'))
      .toBe('[[Test]](https://example.com)');
  });
});
```

#### `replaceLinksInMessage(message, links)`: メッセージ内のリンクをMarkdown置換
```javascript
describe('Unit: replaceLinksInMessage', () => {
  it('should replace link text with Markdown format', () => {
    const message = 'Check out Example website';
    const links = [{ text: 'Example', url: 'https://example.com' }];
    expect(replaceLinksInMessage(message, links))
      .toBe('Check out [Example](https://example.com) website');
  });

  it('should handle multiple links', () => {
    const message = 'Visit Site1 and Site2';
    const links = [
      { text: 'Site1', url: 'https://site1.com' },
      { text: 'Site2', url: 'https://site2.com' }
    ];
    const result = replaceLinksInMessage(message, links);
    expect(result).toContain('[Site1](https://site1.com)');
    expect(result).toContain('[Site2](https://site2.com)');
  });
});
```

### テストピラミッド設計
```
E2E（2ケース）
- ハッピーパス: 単一URLのエクスポート
- 複雑ケース: 複数リンク + ページネーション
  ↓
統合（6ケース）
- DOM抽出（リンクあり/なし）
- 外部/内部フィルタリング
- 複数リンク処理
  ↓
単体（18ケース）
- extractExternalLinks: 境界値、フィルタリング
- convertToMarkdownLink: 特殊文字、エスケープ
- replaceLinksInMessage: 複数リンク、順序保証
```

---

## 実装アプローチ

### Outside-In TDD

#### Phase 1: Red（テスト作成）
1. **E2Eテスト作成**: Slackページでのリンク付きメッセージエクスポート
2. **統合テスト作成**: DOM要素からのリンク抽出
3. **単体テスト作成**: URL抽出・Markdown変換関数

#### Phase 2: Green（実装）
```javascript
// createPromiseGetMessages関数の修正（slack-search-result-exporter.js:97-143）

const createPromiseGetMessages = async (messagePack) => {
  log(">>> createPromiseGetMessages");
  const messageGroupSelector = '[role="document"]';
  const messageContentSelector = ".c-search_message__content";
  const messageTimestampSelector = ".c-timestamp";
  const messageTimestampAttributeKey = "data-ts";
  const channelNameSelector = '[data-qa="inline_channel_entity__name"]';
  const messageSenderSelector = ".c-message__sender_button";
  const timestampLabelSelector = ".c-timestamp__label";

  return new Promise((resolve) => {
    messagePack.messagePushed = false;
    let messageGroups = document.querySelectorAll(messageGroupSelector);

    messageGroups.forEach((messageGroup) => {
      const datetime = timestampToTime(messageGroup.querySelector(messageTimestampSelector).getAttribute(messageTimestampAttributeKey).split(".")[0]);
      const channelNameDom = messageGroup.querySelector(channelNameSelector);
      let channelName = channelNameDom == null ? "DirectMessage" : channelNameDom.textContent;
      const messageSender = messageGroup.querySelector(messageSenderSelector).textContent;
      const timestampLabel = messageGroup.querySelector(timestampLabelSelector).textContent;

      // 【変更箇所】メッセージ要素を取得
      const messageElement = messageGroup.querySelector(messageContentSelector);
      const message = messageElement.textContent;

      // 【新規】外部URLリンクを抽出してMarkdown形式に変換
      const externalLinks = extractExternalLinks(messageElement);
      const messageWithMarkdownLinks = convertMessageWithMarkdownLinks(message, externalLinks);

      const removeMessageSender = new RegExp('^' + escapeRegExp(messageSender));
      const removeTimestampLabel = new RegExp('^.*?' + timestampLabel);
      const trimmedMessage = messageWithMarkdownLinks.replace(removeMessageSender, '').replace(removeTimestampLabel, '');

      const timeAndMessage = datetime + "\t" + channelName + "\t" + messageSender + "\t" + trimmedMessage;

      if (messagePack.messageSet.has(timeAndMessage)) {
        return;
      }
      messagePack.messages.push(timeAndMessage);
      messagePack.messagePushed = true;
      messagePack.messageSet.add(timeAndMessage);
      messageGroup.scrollIntoView();
    });
    resolve(messagePack);
  });
};

/**
 * 外部URLリンクを抽出（http/httpsのみ）
 * @param {HTMLElement} element - メッセージ要素
 * @returns {Array<{text: string, url: string}>} - リンクテキストとURL
 */
const extractExternalLinks = (element) => {
  const links = element.querySelectorAll('a');
  return Array.from(links)
    .filter(link => /^https?:\/\//.test(link.href))
    .map(link => ({
      text: link.textContent,
      url: link.href
    }));
};

/**
 * メッセージ内のリンクテキストをMarkdown形式に変換
 * @param {string} message - 元のメッセージテキスト
 * @param {Array<{text: string, url: string}>} links - リンク配列
 * @returns {string} - Markdown形式に変換されたメッセージ
 */
const convertMessageWithMarkdownLinks = (message, links) => {
  let result = message;
  links.forEach(link => {
    const markdownLink = `[${link.text}](${link.url})`;
    // リンクテキストを正規表現でエスケープして置換
    const escapedText = escapeRegExp(link.text);
    result = result.replace(new RegExp(escapedText, 'g'), markdownLink);
  });
  return result;
};
```

#### Phase 3: Refactor（リファクタリング）
- 関数の責務分離（URL抽出 / Markdown変換 / メッセージ整形）
- 定数化（セレクタ、正規表現パターン）
- エラーハンドリングの追加（nullチェック、try-catch）
- コメント追加（各関数の目的と引数・戻り値）

### Red-Green-Refactor サイクル
1. **Red**: テスト作成（失敗する）
2. **Green**: 最小限の実装でテストをパス
3. **Refactor**: コードの品質向上（可読性、保守性）
4. 1-3を繰り返す

---

## 技術的考慮事項

### 依存関係
- なし（既存のブックマークレット実装を拡張）

### テスタビリティ
- 関数を小さく分割してモック不要な設計
- DOM操作部分は統合テストでカバー
- ロジック部分は単体テストで完全カバレッジ
- Pure関数を中心に設計（副作用の局所化）

### パフォーマンス
- `querySelectorAll('a')`による追加DOM走査（影響は軽微）
- メッセージあたり数個のリンク想定（通常のSlackメッセージ）
- 正規表現による文字列置換のコスト（最適化可能）

### 非機能要件
- **後方互換性**: リンクなしメッセージは既存動作を維持
- **データ整合性**: TSV形式のタブ・改行文字のエスケープ処理
- **セキュリティ**: XSS対策（`.textContent`使用でエスケープ済み）
- **ブラウザ互換性**: Chrome、Firefox、Safari対応

### エッジケース
- リンクテキストが重複する場合の置換順序
- 特殊文字を含むURL（`[]()` エスケープ）
- 非常に長いURL（TSVのセル制限）
- 無効なURLフォーマット（壊れたリンク）

---

## Definition of Done

- [ ] BDD受け入れシナリオが全て通る（4シナリオ）
- [ ] テストカバレッジ80%以上（単体テスト）
- [ ] E2Eテストで実際のSlackページでの動作確認（Chrome、Firefox、Safari）
- [ ] コードレビュー完了（可読性・保守性・セキュリティ）
- [ ] リファクタリング完了（関数分割、命名改善、コメント追加）
- [ ] README.mdの更新（新機能の説明、使用例追加）
- [ ] 複数ブラウザでの動作確認（Chrome、Firefox、Safari）
- [ ] パフォーマンステスト（100件のメッセージで5秒以内）

---

## INVEST原則チェック

✅ **Independent**: 既存機能から独立（メッセージ抽出ロジックの拡張）
✅ **Negotiable**: 実装詳細（Markdown置換アルゴリズム等）は開発中に調整可能
✅ **Valuable**: URLリンク情報の保存という明確なビジネス価値
✅ **Estimable**: 3ストーリーポイント（チーム見積もり可能）
✅ **Small**: 1スプリント（2週間）で完了可能
✅ **Testable**: BDD受け入れシナリオで明確にテスト可能

---

## Readyチェックリスト

### 基本品質（ryuzee）
- [x] ユーザーストーリー形式で記述されている
- [x] ビジネス価値が明確
- [x] 1スプリントで完了可能なサイズ
- [x] 他のPBIから独立している
- [x] 外部依存関係がない

### ビヘイビア駆動（BDD）
- [x] ユーザーの具体的な行動シナリオが定義されている
- [x] Given-When-Then形式の受け入れシナリオが記述されている
- [x] ステークホルダーが理解できる言葉で表現されている
- [x] 実行可能な仕様として機能する

### テスト駆動（t_wada）
- [x] Outside-Inテストでアプローチ可能
- [x] 受け入れテストが自動化可能（E2E）
- [x] 単体テスト～E2Eテストの戦略が明確
- [x] テストファーストで実装可能な粒度
- [x] リファクタリング安全性が確保できる

---

## 開発プロセス提案（BDD×TDD統合）

### Phase 1: BDDシナリオ作成（ステークホルダー協働）
1. ステークホルダーと協働で受け入れシナリオを定義
2. 実例マッピングで具体的なケースを洗い出し
3. シナリオの優先順位付け（ハッピーパス優先）

### Phase 2: 受け入れテスト実装
1. GherkinシナリオをE2Eテストコードに変換
2. テスト実行環境の準備（Playwright/Puppeteer）
3. 初回実行（Red確認）

### Phase 3: Outside-In TDD
1. E2Eテストから開始（外側）
2. 統合テスト作成（中間層）
3. 単体テスト作成（内側）
4. 各レイヤーでRed-Green-Refactorサイクル

### Phase 4: 継続的リファクタリング
1. テストがGreenになったらリファクタリング
2. コードレビューでフィードバック
3. パフォーマンス最適化

### Phase 5: シナリオ検証
1. ステークホルダーとシナリオ実行確認
2. 受け入れ完了確認
3. ドキュメント更新

---

## 品質保証メトリクス

### ビヘイビアカバレッジ
- 定義されたシナリオ: 4件
- 実装済みシナリオ: 目標 4/4（100%）

### テストピラミッド比率
- E2E: 2ケース
- 統合: 6ケース（E2Eの3倍）
- 単体: 18ケース（E2Eの9倍）
- **比率**: 1:3:9（理想的なピラミッド構造）

### リファクタリング頻度
- グリーン後のリファクタリング実施率: 100%
- コードレビュー指摘事項への対応率: 100%

---

## リスクと軽減策

### リスク1: Slackの DOM構造変更
- **影響**: セレクタが無効になりリンク抽出失敗
- **軽減策**: 複数のセレクタパターンを用意、エラーハンドリング

### リスク2: 特殊文字を含むURLのエスケープ漏れ
- **影響**: TSVファイルの破損、Markdown形式の崩れ
- **軽減策**: 単体テストで境界値テスト、エスケープ関数の強化

### リスク3: パフォーマンス劣化
- **影響**: 大量メッセージのエクスポートが遅延
- **軽減策**: パフォーマンステスト実施、必要に応じて最適化

---

## 参考資料

- [Markdown記法ガイド](https://www.markdownguide.org/basic-syntax/)
- [Outside-In TDD](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)
- [BDD with Gherkin](https://cucumber.io/docs/gherkin/)
- [テストピラミッド](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**次のステップ**:
1. チームでPBIレビュー
2. 見積もりセッション（プランニングポーカー）
3. スプリントバックログに追加
4. 開発着手（TDDサイクル開始）
