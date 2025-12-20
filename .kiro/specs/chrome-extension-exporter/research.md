# Research & Design Decisions

---
**Purpose**: Chrome拡張機能への移行とSlackエクスポート機能の拡張に関する技術調査結果と設計判断を記録する。

**Usage**:
- ブックマークレット→Chrome拡張機能移行の技術的制約を文書化
- Manifest V3アーキテクチャパターンと設計判断の根拠を提供
- 将来の監査と再利用のための参照情報を保持
---

## Summary
- **Feature**: `chrome-extension-exporter`
- **Discovery Scope**: Complex Integration (既存実装の拡張+新機能追加)
- **Key Findings**:
  - Manifest V3では Service Worker ベースのアーキテクチャが必須
  - chrome.storage.sync には 100KB/512アイテムの制限がある
  - Content Script と Service Worker 間のメッセージパッシングパターンが必要
  - 既存ブックマークレット(421行)の DOM 操作ロジックは Content Script に移行可能

## Research Log

### Chrome Extension Manifest V3 アーキテクチャ要件

- **Context**: 2025年時点でのChrome拡張機能開発の最新標準を調査
- **Sources Consulted**:
  - [Chrome Extensions API - storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
  - [About extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
  - [Building Browser Extensions in 2025](https://nitiweb.net/blog/browser-extension-development-2025)
  - [Understanding Modern Chrome Extensions Guide](https://www.solutionstreet.com/blog/2025/02/25/understanding-modern-chrome-extensions-a-developers-guide/)
- **Findings**:
  - **Service Worker必須**: Manifest V3では persistent background pages が廃止され、event-driven service workers に置き換え
  - **ライフサイクル制約**: Service Workerは必要時のみロード、アイドル時にアンロード→状態はchrome.storageに保存必須
  - **Content Script制限**: Content ScriptはDOM操作可能だが、ほとんどのChrome APIにアクセス不可→Service Workerとのメッセージング必要
  - **CORS制約**: Chrome 73以降、Content Scriptはページと同じCORSポリシー制約を受ける
- **Implications**:
  - 既存ブックマークレットのDOM操作ロジック → Content Script に配置
  - 拡張機能の制御ロジックとStorage操作 → Service Worker に配置
  - 両者間の通信には chrome.runtime.sendMessage/onMessage パターン使用

### chrome.storage.sync API 制約と設計影響

- **Context**: ユーザー設定永続化(日付プリセット)の技術的制約を調査
- **Sources Consulted**:
  - [chrome.storage API Reference](https://developer.chrome.com/docs/extensions/reference/api/storage)
- **Findings**:
  - **Total quota**: 102,400 bytes (~100 KB)
  - **Per-item limit**: 8,192 bytes (~8 KB)
  - **Max items**: 512
  - **Write rate limit**: 120 ops/分 (2 ops/秒), 1,800 ops/時
  - **API methods**: `get()`, `set()`, `remove()`, `clear()`, `onChanged`イベント
  - **Sync機能**: ユーザーがChromeにログインしている全ブラウザで同期可能
- **Implications**:
  - 日付プリセット設定(数バイト)は制限内に十分収まる
  - 設定変更は `onChanged` イベントでリアルタイム適用可能
  - 書き込み頻度制限は日付プリセット選択程度では問題なし
  - TSVエクスポートデータ自体はStorageに保存せず、ポップアップ表示のみ(サイズ制限回避)

### Message Passing パターンとコンポーネント通信

- **Context**: Content Script ↔ Service Worker 間の通信設計
- **Sources Consulted**:
  - [Service Worker in Browser Extensions](https://medium.com/whatfix-techblog/service-worker-in-browser-extensions-a3727cd9117a)
  - [Chrome Extensions architecture overview](https://developer.chrome.com/docs/extensions/mv3/architecture-overview)
- **Findings**:
  - **One-off messages**: `chrome.runtime.sendMessage()` → `chrome.runtime.onMessage`
  - **Long-lived connections**: `chrome.runtime.connect()` → `chrome.runtime.onConnect`
  - **パターン**: Content Script → Service Worker へのメッセージ送信 → Service Workerが処理 → Content Scriptへ返信
  - **制約**: Content ScriptはChrome API呼び出し不可、Service WorkerはDOM操作不可
- **Implications**:
  - エクスポート処理開始: Popup UI → Content Script へメッセージ
  - 設定読み込み: Content Script → Service Worker へ設定取得リクエスト → 返答
  - 設定保存: Popup UI → Service Worker へ設定保存リクエスト

### 既存ブックマークレット実装分析

- **Context**: 421行のJavaScript実装を Chrome Extension に移植する方針決定
- **Sources Consulted**:
  - プロジェクト内 `slack-search-result-exporter.js` (421行)
  - [Bookmarklet to Chrome extension boilerplate](https://github.com/micmro/bookmarklet-to-chrome-extension-boilerplate)
- **Findings**:
  - **コア機能**:
    - `getMessage()`: 再帰的ページネーション制御
    - `createPromiseWaitSearchResult()`: MutationObserver によるDOM読み込み待機
    - `createPromiseGetMessages()`: DOMセレクタによるメッセージ抽出
    - `createPromiseClickNextButton()`: 次ページボタンクリック
    - `showMessagesPopup()`: TSVデータをポップアップ表示
  - **DOMセレクタ**:
    - `[role="document"]`: メッセージグループ
    - `.c-search_message__content`: メッセージコンテンツ
    - `.c-timestamp`: タイムスタンプ
  - **データ構造**: `messagePack` オブジェクトで状態管理(messages配列、messageSet、hasNextPageフラグ)
- **Implications**:
  - DOM操作ロジックは Content Script に直接移植可能
  - IIFE パターン → Chrome Extension のモジュール構造に変換
  - MutationObserver パターンはそのまま使用可能
  - グローバル変数なし → 各実行で独立した messagePack 初期化

### TypeScript 型安全性とChrome Extension API

- **Context**: 型安全性の確保とChrome API型定義
- **Sources Consulted**:
  - [Building Chrome Extension with Vite, React, TypeScript](https://medium.com/@jamesprivett29/02-building-a-chrome-extension-template-using-vite-react-and-typescript-d5d9912f1b40)
  - Chrome Types: `@types/chrome` npm package
- **Findings**:
  - Chrome Extension API用の型定義は `@types/chrome` で提供
  - TypeScript strict mode 推奨
  - `chrome.storage.StorageArea` インターフェースあり
  - Message passing には型付きメッセージ型定義が有効
- **Implications**:
  - メッセージペイロード、設定オブジェクト、DOMセレクタ結果に明示的な型定義必須
  - `any` 型の使用禁止(設計原則に従う)
  - エラーハンドリングには Discriminated Union パターン使用

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **Layered MV3 Pattern** | Content Script(DOM層) + Service Worker(Logic層) + Popup UI(Presentation層)の3層分離 | 責任分離明確、Chrome API制約に適合、既存コード再利用性高 | メッセージング複雑化、デバッグ難度やや高 | Manifest V3標準パターン、steering原則に整合 |
| Monolithic Content Script | 全ロジックをContent Scriptに集約 | シンプル、メッセージング不要 | Storage API使用不可、状態管理困難、Service Worker不使用はMV3非推奨 | 却下: MV3ベストプラクティスに反する |
| Event-Driven Microservices | 複数の独立したService Workerと細分化されたContent Scripts | 高度なモジュール性 | 過剰設計、この規模の機能には不要 | 却下: 現在の要件に対して過剰 |

**選択**: Layered MV3 Pattern - Manifest V3の制約と既存steering原則(単一責任、境界明確化)に最適

## Design Decisions

### Decision: `Content Script による既存DOM操作ロジックの再利用`

- **Context**: 421行のブックマークレット実装をChrome Extensionに移植
- **Alternatives Considered**:
  1. **完全書き直し** - ゼロから新規実装
  2. **最小限の修正で移植** - IIFE構造をモジュール化、DOM操作ロジックは保持
  3. **部分的リファクタリング** - コア機能は再利用、新機能部分のみ新規実装
- **Selected Approach**: オプション3(部分的リファクタリング)
  - 既存のDOM操作ロジック(`createPromiseGetMessages`, `createPromiseWaitSearchResult`)は Content Script に移植
  - ページネーション制御(`getMessage`, `createPromiseClickNextButton`)も Content Script 内で維持
  - 新機能(日付フィルタ、設定永続化)は新規コンポーネントとして追加
- **Rationale**:
  - 既存実装は十分にテスト済み(Playwright E2Eテスト完備)
  - Slackの複雑なDOM構造への対応ロジックを再利用できる
  - MutationObserverパターンはChrome Extensionでも有効
  - リスク最小化: 動作実績のあるコードを最大限活用
- **Trade-offs**:
  - **Benefits**: 開発時間短縮、バグリスク低減、既存テストスイート再利用可能
  - **Compromises**: レガシーコードの一部継承(ただし、リファクタリング機会は保持)
- **Follow-up**: Content Script実装時に既存のPlaywrightテストをChrome Extension環境に適応

### Decision: `Service Worker による設定管理と拡張機能制御`

- **Context**: Manifest V3ではpersistent background pages不可、Service Workerのみ使用可能
- **Alternatives Considered**:
  1. **Content Script内で設定管理** - chrome.storage API使用不可のため不可能
  2. **Service Worker + chrome.storage.sync** - 標準パターン
  3. **Service Worker + chrome.storage.local** - 同期なし、単一デバイスのみ
- **Selected Approach**: オプション2(Service Worker + chrome.storage.sync)
  - Service WorkerがStorage APIを管理
  - 日付プリセット設定を `chrome.storage.sync` に保存
  - Content ScriptとPopup UIはService Workerにメッセージング経由で設定取得/更新
- **Rationale**:
  - Manifest V3の必須要件
  - ユーザー設定のクロスデバイス同期が可能(要件5に適合)
  - Service Workerはイベント駆動でリソース効率的
- **Trade-offs**:
  - **Benefits**: ベストプラクティス準拠、将来のChrome更新への耐性
  - **Compromises**: メッセージング層追加によるコード量増加
- **Follow-up**: Service Workerライフサイクル管理とエラーハンドリングの実装

### Decision: `Popup UI によるユーザーインタラクション`

- **Context**: ユーザーが日付プリセット選択、エクスポート実行、結果表示を行うUI
- **Alternatives Considered**:
  1. **Browser Action Popup** - ツールバーアイコンクリックでポップアップ表示
  2. **Options Page** - 専用設定ページ
  3. **Content Script埋め込みUI** - Slackページ内にUIを注入
- **Selected Approach**: オプション1(Browser Action Popup)
  - `manifest.json` の `action.default_popup` にHTMLファイル指定
  - Popup内で日付プリセット選択UI、エクスポートボタン、結果表示エリアを提供
  - Popupは軽量で高速起動
- **Rationale**:
  - ユーザー体験: ブックマークレットと同様のワンクリック実行
  - 要件6(UI/UX)に適合: ポップアップUI、進行状況表示、結果表示
  - SlackページのDOMを汚染しない(Content Script埋め込みUIを避ける)
- **Trade-offs**:
  - **Benefits**: シンプル、非侵襲的、Chrome標準UI
  - **Compromises**: Popup閉じると状態リセット(ただし設定はStorageに永続化)
- **Follow-up**: Popup UIのレスポンシブデザイン実装、ローディング状態管理

### Decision: `TypeScript によるType-Safe実装`

- **Context**: 型安全性確保とChrome API型定義活用
- **Alternatives Considered**:
  1. **Plain JavaScript** - 既存ブックマークレットと同じ
  2. **TypeScript (strict mode)** - 厳格な型チェック
  3. **JSDoc型アノテーション** - JavaScript + 型ヒント
- **Selected Approach**: オプション2(TypeScript strict mode)
  - `@types/chrome` パッケージ使用
  - Message payloads, Storage data, DOM selector結果に明示的型定義
  - `any` 型禁止(設計原則に従う)
  - Discriminated Union によるエラーハンドリング
- **Rationale**:
  - 設計原則「Type Safety is Mandatory」に準拠
  - Chrome API呼び出しの型安全性確保
  - リファクタリング時の安全性向上
  - ランタイムエラーの早期検出
- **Trade-offs**:
  - **Benefits**: バグ削減、IDE補完強化、保守性向上
  - **Compromises**: ビルドプロセス必要(ただし最小限のツールチェーン)
- **Follow-up**: `tsconfig.json` 設定、型定義ファイル作成、ビルド設定

## Risks & Mitigations

- **Risk 1: Slack DOM構造変更** - Slackが頻繁にUI更新を行い、DOMセレクタが無効化される可能性
  - **Mitigation**: 複数のフォールバックセレクタを定義(既存実装パターン継承)、定期的なE2Eテスト実行、変更検知時のアラート
- **Risk 2: Manifest V3 Service Worker制約** - Service Workerのライフサイクル管理の複雑さ
  - **Mitigation**: イベント駆動設計徹底、状態はStorage永続化、Service Worker再起動を前提とした実装
- **Risk 3: チャンネルページDOM構造の不明確性** - 要件3のチャンネルページエクスポートは新機能で既存実装なし
  - **Mitigation**: 実装フェーズで実Slackページ調査、段階的実装、検索結果ページ実装後に着手
- **Risk 4: chrome.storage.sync容量制限** - 将来的にプリセット種類増加で容量不足
  - **Mitigation**: 現時点では日付プリセット4種(当日/昨日/一週間/一ヶ月)のみで十分余裕、将来的に増加時は `chrome.storage.local` 併用検討
- **Risk 5: Browser互換性** - Chrome以外のブラウザ(Edge, Brave等)での動作保証
  - **Mitigation**: 要件8でChrome 90以降を対象、WebExtensions API標準準拠により他Chromiumブラウザでも動作見込み

## References

### Chrome Extension Architecture
- [Chrome Extensions API - storage](https://developer.chrome.com/docs/extensions/reference/api/storage) - chrome.storage.sync API仕様とベストプラクティス
- [About extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers) - Service Workerライフサイクルとイベント処理
- [Chrome Extensions architecture overview](https://developer.chrome.com/docs/extensions/mv3/architecture-overview) - Manifest V3アーキテクチャ概要
- [Manifest - content scripts](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) - Content Scripts宣言とパーミッション

### Manifest V3 Migration
- [Building Browser Extensions in 2025](https://nitiweb.net/blog/browser-extension-development-2025) - 2025年の拡張機能開発動向
- [Understanding Modern Chrome Extensions Guide](https://www.solutionstreet.com/blog/2025/02/25/understanding-modern-chrome-extensions-a-developers-guide/) - Manifest V3開発者ガイド
- [Service Worker in Browser Extensions](https://medium.com/whatfix-techblog/service-worker-in-browser-extensions-a3727cd9117a) - Service Worker実装パターン

### Bookmarklet Migration
- [Bookmarklet to Chrome extension boilerplate](https://github.com/micmro/bookmarklet-to-chrome-extension-boilerplate) - ブックマークレット移行ボイラープレート
- [Convert bookmarklet to Chrome extension](https://sandbox.self.li/bookmarklet-to-extension/) - 変換ツールとパターン

### TypeScript Development
- [Building Chrome Extension with Vite, React, TypeScript](https://medium.com/@jamesprivett29/02-building-a-chrome-extension-template-using-vite-react-and-typescript-d5d9912f1b40) - TypeScript Chrome拡張機能開発
- [@types/chrome](https://www.npmjs.com/package/@types/chrome) - Chrome API型定義パッケージ
