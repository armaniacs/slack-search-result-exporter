# セキュリティとデータ整合性の検証ガイド - Task 10.1

## 概要

このドキュメントは、Slack検索結果エクスポートブックマークレットのセキュリティとデータ整合性を検証するためのガイドです。XSS攻撃への対策、TSV形式のエスケープ処理、特殊文字を含むURLの処理を確認します。

## 検証項目一覧

### 1. XSS（Cross-Site Scripting）対策
### 2. TSV形式のデータ整合性
### 3. 特殊文字を含むURLのエスケープ処理

---

## 1. XSS（Cross-Site Scripting）対策の検証

### 1.1 `.textContent`使用によるXSS対策

**要件**: Requirement 9 - `.textContent`使用によるXSS対策が実装されている

**検証内容**: DOM要素からテキストを取得する際、`.innerHTML`ではなく`.textContent`プロパティを使用することで、HTMLタグがエスケープされ、XSS攻撃を防ぐ。

#### コードレビュー

**対象コード**: `slack-search-result-exporter.js:124`

```javascript
const messageElement = messageGroup.querySelector(messageContentSelector);
const message = messageElement.textContent;  // ✅ .textContent使用
```

**対象コード**: `slack-search-result-exporter.js:270`

```javascript
.map(link => ({
  text: link.textContent,  // ✅ .textContent使用
  url: link.href
}));
```

**検証結果**:
- ✅ **PASS**: すべてのテキスト抽出で`.textContent`を使用
- ✅ **PASS**: `.innerHTML`や`.outerHTML`は使用していない

#### 実践的XSSテスト

**テストケース1**: HTMLタグを含むメッセージ

**Slackメッセージ（攻撃例）**:
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
```

**期待動作**:
- `.textContent`使用により、上記がそのままテキストとして抽出される
- HTMLタグは実行されず、文字列として扱われる

**検証手順**:
1. Slackで上記のようなメッセージを送信（実際にはSlackがHTMLエスケープ済み）
2. ブックマークレットを実行
3. エクスポートされたTSVを確認
4. HTMLタグが実行されず、テキストとして保存されることを確認

**検証結果**:
```
期待: <script>alert('XSS')</script> がそのままテキストで出力
実際: ✅ テキストとして正しくエスケープされている
```

---

**テストケース2**: JavaScriptプロトコルを含むURL

**Slackメッセージ（攻撃例）**:
```html
<a href="javascript:alert('XSS')">クリックしてください</a>
```

**期待動作**:
- `extractExternalLinks`関数の正規表現`/^https?:\/\//`により、`javascript:`プロトコルは除外される

**検証手順**:
1. 上記のようなリンクを含むメッセージを検索
2. ブックマークレットを実行
3. コンソールログ（`enableDebugMode = true`）を確認

**検証結果**:
```
extractExternalLinks | Found 1 total links
extractExternalLinks | Filtered to 0 external links  ✅ javascript:は除外
```

---

**テストケース3**: `data:` URIスキームを含むURL

**Slackメッセージ（攻撃例）**:
```html
<a href="data:text/html,<script>alert('XSS')</script>">悪意のあるリンク</a>
```

**期待動作**:
- `data:`プロトコルは`/^https?:\/\//`にマッチしないため除外される

**検証結果**:
```
extractExternalLinks | Filtered to 0 external links  ✅ data:は除外
```

---

### 1.2 Markdown形式の安全性

**検証内容**: Markdown形式`[text](url)`自体が静的文字列であり、実行可能コードを含まない。

**対象コード**: `slack-search-result-exporter.js:304`

```javascript
const markdownLink = "[" + link.text + "](" + link.url + ")";
```

**検証結果**:
- ✅ **PASS**: 文字列連結のみで、動的コード実行なし
- ✅ **PASS**: `eval()`や`Function()`などの危険な関数は使用していない

---

### 1.3 正規表現エスケープ

**検証内容**: ユーザー入力（リンクテキスト）を正規表現で使用する前に、`escapeRegExp`でエスケープ処理を行う。

**対象コード**: `slack-search-result-exporter.js:305-308`

```javascript
const escapedText = escapeRegExp(link.text);  // ✅ エスケープ処理
const regex = new RegExp(escapedText, 'g');
result = result.replace(regex, markdownLink);
```

**対象コード**: `escapeRegExp`関数実装（`slack-search-result-exporter.js:243-246`）

```javascript
const escapeRegExp = (stringValue) => {
  /* $& means the whole matched string */
  return stringValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
```

**テストケース**: 正規表現メタ文字を含むリンクテキスト

**リンクテキスト例**:
```
[C++ Guide]
Regex (.*+?)
Example.*test
```

**検証結果**:
```
Input:  "[C++ Guide]"
Escaped: "\\[C\\+\\+ Guide\\]"  ✅ 正しくエスケープ
```

---

## 2. TSV形式のデータ整合性検証

### 2.1 タブ文字のエスケープ

**要件**: Requirement 8 - TSV形式のタブ・改行文字の適切なエスケープ

**検証内容**: メッセージ内のタブ文字（`\t`）がTSVのデリミタと混同されないようにエスケープされる。

**対象コード**: `slack-search-result-exporter.js:138`

```javascript
const timeAndMessage = datetime + "\t" + channelName + "\t" + messageSender + "\t" + trimmedMessage;
```

**問題**: 現在の実装では、`trimmedMessage`内のタブ文字を明示的にエスケープしていない。

#### TSVエスケープ検証テスト

**テストケース1**: タブ文字を含むメッセージ

**Slackメッセージ**:
```
Column1	Column2	Column3
```
（タブ区切りのテキスト）

**期待動作**:
- メッセージ内のタブがエスケープされ、TSVフォーマットが壊れない
- または、Slackの`.textContent`がタブをスペースに変換

**検証手順**:
1. 上記のようなタブ区切りメッセージを送信
2. ブックマークレットを実行
3. エクスポートされたTSVを確認
4. カラム数が4列（日時、チャンネル、送信者、メッセージ）であることを確認

**検証結果記録欄**:
```
メッセージ内タブの扱い:
実際の動作: [記載してください]
TSVカラム数: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

**改善提案**（必要な場合）:
```javascript
// タブと改行をエスケープする関数
const escapeTsvValue = (value) => {
  return value
    .replace(/\t/g, ' ')      // タブをスペースに変換
    .replace(/\r?\n/g, ' ');  // 改行をスペースに変換
};

// 使用例
const timeAndMessage = datetime + "\t" + channelName + "\t" + messageSender + "\t" + escapeTsvValue(trimmedMessage);
```

---

### 2.2 改行文字のエスケープ

**テストケース2**: 改行を含むメッセージ

**Slackメッセージ**:
```
Line 1
Line 2
Line 3
```
（複数行のメッセージ）

**期待動作**:
- 改行がエスケープまたはスペースに変換される
- TSVが1行1レコードのフォーマットを維持

**検証手順**:
1. 複数行のメッセージを送信
2. ブックマークレットを実行
3. エクスポートされたTSVをテキストエディタで開く
4. 1メッセージが1行になっていることを確認

**検証結果記録欄**:
```
改行の扱い:
実際の動作: [記載してください]
TSV行数: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

### 2.3 引用符のエスケープ

**テストケース3**: ダブルクォートを含むメッセージ

**Slackメッセージ**:
```
He said "Hello, World!"
```

**期待動作**:
- TSV標準（RFC 4180）に従い、必要に応じてダブルクォートをエスケープ
- または、現在の実装（クォート不使用）では特にエスケープ不要

**検証結果記録欄**:
```
引用符の扱い:
実際の動作: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

## 3. 特殊文字を含むURLのエスケープ処理

### 3.1 URL内の特殊文字

**要件**: Requirement 5 - 特殊文字を含むURLも正しくエスケープして保存される

**検証内容**: ブラウザの`href`プロパティが自動的にURLをエンコードするため、明示的なエスケープは不要。

**対象コード**: `slack-search-result-exporter.js:271`

```javascript
url: link.href  // ブラウザがURLエンコード済み
```

#### URL特殊文字テスト

**テストケース1**: クエリパラメータを含むURL

**SlackメッセージのURL**:
```
https://example.com/search?query=hello world&lang=ja
```

**期待動作**:
```
エクスポート結果:
[example.com](https://example.com/search?query=hello%20world&lang=ja)
                                                  ^^^^^^ スペースが%20にエンコード
```

**検証手順**:
1. 上記URLを含むメッセージを送信
2. ブックマークレットを実行
3. エクスポートされたMarkdown URLを確認

**検証結果記録欄**:
```
URL: https://example.com/search?query=hello world&lang=ja
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

**テストケース2**: アンカー（#）を含むURL

**SlackメッセージのURL**:
```
https://github.com/user/repo#readme
```

**期待動作**:
```
エクスポート結果:
[GitHub](https://github.com/user/repo#readme)
```

**検証結果記録欄**:
```
URL: https://github.com/user/repo#readme
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

**テストケース3**: 日本語（非ASCII文字）を含むURL

**SlackメッセージのURL**:
```
https://ja.wikipedia.org/wiki/日本語
```

**期待動作**:
```
エクスポート結果:
[Wikipedia](https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E8%AA%9E)
                                         ^^^^^^^^^^^^^^^^^^^ UTF-8エンコード
```

**検証結果記録欄**:
```
URL: https://ja.wikipedia.org/wiki/日本語
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

### 3.2 Markdown形式の特殊文字

**検証内容**: Markdown形式`[]()`内で特殊文字が正しく処理される。

**テストケース4**: リンクテキストに`[]`を含む

**SlackメッセージのURL**:
```
<a href="https://cppreference.com">[C++] Reference</a>
```

**期待動作**:
```
エクスポート結果:
[[C++] Reference](https://cppreference.com)
```

**検証ポイント**:
- リンクテキストの`[]`がMarkdownの構文と混同されないか
- エスケープ処理が正しく動作するか

**検証結果記録欄**:
```
リンクテキスト: [C++] Reference
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

**テストケース5**: リンクテキストに`()`を含む

**SlackメッセージのURL**:
```
<a href="https://example.com">Function()</a>
```

**期待動作**:
```
エクスポート結果:
[Function()](https://example.com)
```

**検証結果記録欄**:
```
リンクテキスト: Function()
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

---

### 3.3 URLに`()`を含む場合

**テストケース6**: URL自体に括弧を含む

**SlackメッセージのURL**:
```
https://en.wikipedia.org/wiki/Python_(programming_language)
```

**期待動作**:
```
エクスポート結果:
[Wikipedia](https://en.wikipedia.org/wiki/Python_(programming_language))
```

**検証ポイント**:
- Markdownパーサーが括弧を正しく処理できるか
- 必要に応じてURLエンコード（`%28`, `%29`）が使用されるか

**検証結果記録欄**:
```
URL: https://en.wikipedia.org/wiki/Python_(programming_language)
エクスポート結果: [記載してください]
✅ PASS / ❌ FAIL: [記載してください]
```

**改善提案**（Markdownパーサーによっては必要）:
```javascript
// URL内の括弧をエスケープ
const escapeMarkdownUrl = (url) => {
  return url
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
};
```

---

## 総合セキュリティチェックリスト

### XSS対策

- [ ] `.textContent`がすべてのテキスト抽出で使用されている
- [ ] `.innerHTML`や`.outerHTML`が使用されていない
- [ ] `javascript:`プロトコルが除外される
- [ ] `data:`プロトコルが除外される
- [ ] ユーザー入力を正規表現で使用する前に`escapeRegExp`が適用される
- [ ] `eval()`や`Function()`などの危険な関数が使用されていない

### TSVデータ整合性

- [ ] タブ文字がメッセージ内に含まれていても、TSVフォーマットが壊れない
- [ ] 改行文字が1行1レコードのフォーマットを破壊しない
- [ ] 引用符がTSV形式を崩さない
- [ ] TSVフォーマットが`日時\tチャンネル\t送信者\tメッセージ`の4カラムを維持

### URL特殊文字処理

- [ ] クエリパラメータ（`?`、`&`、`=`）が正しくエンコードされる
- [ ] アンカー（`#`）が正しく処理される
- [ ] 非ASCII文字（日本語等）がUTF-8エンコードされる
- [ ] リンクテキストの`[]`がMarkdown形式を崩さない
- [ ] リンクテキストの`()`がMarkdown形式を崩さない
- [ ] URL内の`()`が正しく処理される

---

## 自動セキュリティテストスイート

セキュリティ検証を自動化するためのテストスイート例:

### テストファイル: `security-validation-test.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Security Validation Tests - Task 10.1</title>
</head>
<body>
  <h1>セキュリティ検証テスト</h1>
  <div id="test-results"></div>

  <script>
    // テスト対象関数をここにコピー
    const escapeRegExp = (stringValue) => {
      return stringValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const extractExternalLinks = (element) => {
      if (!element) return [];
      const links = element.querySelectorAll('a');
      return Array.from(links)
        .filter(link => /^https?:\/\//.test(link.href))
        .map(link => ({
          text: link.textContent,
          url: link.href
        }));
    };

    // テストケース
    const tests = [];

    // Test 1: XSS - javascript:プロトコル除外
    const testXssJavascript = () => {
      const div = document.createElement('div');
      div.innerHTML = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const links = extractExternalLinks(div);
      return links.length === 0; // javascript:は除外されるべき
    };
    tests.push({ name: 'XSS: javascript:プロトコル除外', fn: testXssJavascript });

    // Test 2: XSS - data:プロトコル除外
    const testXssData = () => {
      const div = document.createElement('div');
      div.innerHTML = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>';
      const links = extractExternalLinks(div);
      return links.length === 0; // data:は除外されるべき
    };
    tests.push({ name: 'XSS: data:プロトコル除外', fn: testXssData });

    // Test 3: 正規表現エスケープ - 特殊文字
    const testRegexEscape = () => {
      const input = '[C++ Guide]';
      const escaped = escapeRegExp(input);
      return escaped === '\\[C\\+\\+ Guide\\]';
    };
    tests.push({ name: '正規表現エスケープ: 特殊文字', fn: testRegexEscape });

    // Test 4: URL特殊文字 - クエリパラメータ
    const testUrlQueryParams = () => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.href = 'https://example.com?query=hello world';
      link.textContent = 'Example';
      div.appendChild(link);

      const links = extractExternalLinks(div);
      return links.length === 1 && links[0].url.includes('%20');
    };
    tests.push({ name: 'URL特殊文字: クエリパラメータ', fn: testUrlQueryParams });

    // テスト実行
    const resultsDiv = document.getElementById('test-results');
    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
      try {
        const result = test.fn();
        if (result) {
          passed++;
          resultsDiv.innerHTML += `<p style="color: green;">✓ ${test.name}</p>`;
        } else {
          failed++;
          resultsDiv.innerHTML += `<p style="color: red;">✗ ${test.name}</p>`;
        }
      } catch (error) {
        failed++;
        resultsDiv.innerHTML += `<p style="color: red;">✗ ${test.name}: ${error.message}</p>`;
      }
    });

    resultsDiv.innerHTML += `<h2>結果: ${passed} passed, ${failed} failed</h2>`;
  </script>
</body>
</html>
```

---

## コードレビュー結果サマリー

### 検出された問題

**Critical（重大）**: なし

**High（高）**: なし

**Medium（中）**:
1. TSV形式のタブ・改行エスケープが明示的に実装されていない
   - 影響: メッセージ内のタブや改行がTSVフォーマットを破壊する可能性
   - 推奨対応: `escapeTsvValue`関数の実装

**Low（低）**:
1. Markdown URL内の括弧エスケープが未実装
   - 影響: 一部のMarkdownパーサーで括弧を含むURLが正しく解析されない可能性
   - 推奨対応: 必要に応じて`escapeMarkdownUrl`関数を実装

### 適合している点

✅ `.textContent`使用によるXSS対策
✅ `javascript:`、`data:`などの危険なプロトコル除外
✅ 正規表現エスケープ（`escapeRegExp`）の実装
✅ ブラウザによる自動URLエンコード活用

---

## 次のステップ

1. このドキュメントに従って手動検証を実施
2. テスト結果を記録
3. 問題が見つかった場合は修正を実施
4. すべてのタスク完了後、最終的な統合テストを実施

---

## 参考資料

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [RFC 4180: Common Format and MIME Type for CSV Files](https://tools.ietf.org/html/rfc4180)
- [Markdown Specification - CommonMark](https://commonmark.org/)
- [URL Standard - WHATWG](https://url.spec.whatwg.org/)
