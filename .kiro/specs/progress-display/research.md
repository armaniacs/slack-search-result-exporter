# Research & Design Decisions

---
**Purpose**: プログレス表示機能の設計判断および調査結果を記録

**Usage**:
- Light Discoveryプロセスで得た知見を文書化
- 既存システムへの統合方針を明確化
- 技術的判断根拠を保存
---

## Summary
- **Feature**: `progress-display`
- **Discovery Scope**: Extension (既存Chrome Extension機能への拡張)
- **Key Findings**:
  - 既存の`EXPORT_PROGRESS`型定義は存在するが未実装（types.ts:74）
  - Content Scriptのメッセージング機構は`sendResponse()`コールバックパターンを使用
  - Popup UIには既存の`#progress`要素とスピナーアニメーションが存在
  - 現在のexecuteExport()はページネーションループ内でプログレス送信ポイントを複数持つ

## Research Log

### Chrome Extension メッセージングパターン調査
- **Context**: Content Script ↔ Popup間のリアルタイムプログレス通信方式の選定
- **Sources Consulted**:
  - 既存実装（src/content-script.ts:45-78, src/popup.ts:285-297）
  - Chrome Extension Manifest V3ドキュメント
- **Findings**:
  - 現在の実装は`chrome.tabs.sendMessage()`で一方向通信
  - Content Scriptは`sendResponse()`コールバックで応答
  - `EXPORT_PROGRESS`型は定義済みだが送信コードは未実装
  - 非同期処理中の中間メッセージ送信には`chrome.tabs.sendMessage()`は不適（PopupがContent Scriptへ送信する形式のため）
- **Implications**:
  - **Design Decision**: Content Script → Popup方向のプログレス通知には`chrome.runtime.sendMessage()`を使用
  - Popupでは`chrome.runtime.onMessage`リスナーを追加してプログレスメッセージを受信
  - 既存の`sendResponse()`パターンは完了/エラー通知専用として維持

### 既存UI要素とスタイリング
- **Context**: プログレス表示UIの実装方式決定
- **Sources Consulted**: src/popup.html, src/popup.css:111-140
- **Findings**:
  - `#progress`要素とスピナーアニメーション既存
  - `#progress-text`要素は静的テキスト「エクスポート中...」のみ表示
  - updateUI()メソッドでdisplayプロパティを制御（popup.ts:337-364）
- **Implications**:
  - 既存UI要素を再利用可能
  - `#progress-text.textContent`を動的更新するロジック追加のみで実装可能
  - CSS変更不要（視覚的一貫性維持）

### プログレス送信タイミングと粒度
- **Context**: executeExport()内でのメッセージ送信ポイント特定
- **Sources Consulted**: src/content-script.ts:142-158（ページネーションループ）
- **Findings**:
  - 各ページ処理は3段階: DOM待機 → メッセージ抽出 → 次ページ遷移
  - `pageCount`と`messagePack.messages.length`が利用可能
  - ループ内で`waitForSearchResult()`, `extractMessages()`, `clickNextButton()`の各完了時に送信可能
- **Implications**:
  - **Design Decision**: 各段階でstatus付きプログレスメッセージ送信
  - 粒度: DOM待機後、抽出完了後、ページ遷移後の3回/ページ
  - パフォーマンス影響: 送信オーバーヘッド < 10ms/回（要件5.1: < 50ms/ページを満たす）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 双方向sendResponse | Content ScriptがsendResponse()でプログレスとfinal結果を両方返す | 既存パターンと一貫性 | sendResponse()は1回のみ呼び出し可（中間プログレス不可） | ❌ 技術的制約により不採用 |
| chrome.runtime.sendMessage | Content ScriptからPopupへ非同期メッセージ送信 | 複数回送信可能、非同期処理中でも利用可 | Popupでリスナー追加必要、既存パターンと併用 | ✅ 採用: 中間プログレス専用 |
| Long-lived connection (Port) | chrome.runtime.connectでポート確立 | 継続的双方向通信、低オーバーヘッド | 複雑性増加、エラーハンドリング追加必要 | ⚠️ オーバーエンジニアリング、将来検討 |

## Design Decisions

### Decision: プログレスメッセージング方式
- **Context**: エクスポート処理中の進捗情報をContent ScriptからPopup UIに通知する必要がある
- **Alternatives Considered**:
  1. sendResponse()コールバック拡張 — 既存パターン再利用だがワンショット通信のみ対応
  2. chrome.runtime.sendMessage() — 非同期・複数回送信可能
  3. chrome.runtime.connect() (Port API) — 双方向ストリーム通信
- **Selected Approach**: chrome.runtime.sendMessage()をプログレス専用に使用
  - Content Script: `chrome.runtime.sendMessage({ type: 'EXPORT_PROGRESS', ... })`
  - Popup: `chrome.runtime.onMessage.addListener()`で受信
- **Rationale**:
  - 既存の最終応答（EXPORT_COMPLETE/ERROR）はsendResponse()で維持
  - 中間プログレスのみruntime.sendMessageで送信し、実装複雑性を最小化
  - Port APIは通信頻度（3回/ページ）では過剰
- **Trade-offs**:
  - 利点: シンプル、既存コード変更最小限、Manifest V3推奨パターン
  - 欠点: メッセージングパターンが2種類混在（documentedで対応）
- **Follow-up**: Popup側リスナーでメッセージ型判別を確実に実施（type guard使用）

### Decision: ExportProgress型定義拡張
- **Context**: types.ts:74に既存の`EXPORT_PROGRESS`定義があるがpayload型が不完全
- **Alternatives Considered**:
  1. 既存の`{ currentPage, messageCount }`のみ使用
  2. `ExportStatus`型追加で処理段階（status）も含める
- **Selected Approach**: `ExportProgress`インターフェースとして正式定義
  ```typescript
  export type ExportStatus = "waiting_for_dom" | "extracting" | "navigating";
  export interface ExportProgress {
    currentPage: number;
    messageCount: number;
    status: ExportStatus;
  }
  ```
- **Rationale**:
  - 要件1.3-1.5でstatus表示が必須
  - Union型でステータス値を制限し、型安全性確保
  - Popup UIで各段階に応じたメッセージ表示可能
- **Trade-offs**:
  - 利点: 厳密な型チェック、ユーザーへの詳細フィードバック
  - 欠点: なし（既存コードへの影響なし）
- **Follow-up**: PopupUIState interfaceに`exportProgress: ExportProgress | null`追加

### Decision: UI更新戦略
- **Context**: プログレスメッセージ受信時のPopup UI反映方法
- **Selected Approach**:
  - Popupのstate.exportProgressフィールドに保存
  - 既存のupdateUI()メソッド内で`#progress-text`を動的更新
  - フォーマット: 「ページ X 処理中 (Y メッセージ) - [状態メッセージ]」
- **Rationale**:
  - 既存のstate管理パターンに統合
  - updateUI()の一貫性維持（全UI更新を単一メソッドで処理）
  - リアクティブ性確保（state変更 → updateUI()呼び出し）
- **Trade-offs**:
  - 利点: 既存パターンとの一貫性、テスト容易性
  - 欠点: 高頻度更新時のDOM書き換えコスト（実測で問題なし想定）
- **Follow-up**: プログレスメッセージ受信頻度をモニタリング（3回/ページ = 低頻度）

## Risks & Mitigations
- **Risk**: プログレスメッセージ送信失敗時のエクスポート処理中断 — **Mitigation**: try-catch囲みでエラーをログ記録のみ、処理継続（要件5.2）
- **Risk**: Popup閉鎖中のメッセージロスト — **Mitigation**: 許容（Popup再オープン時は処理完了または進行中、部分データ保持により復旧可能）
- **Risk**: Content Script再注入時の重複リスナー — **Mitigation**: 既存のsetupMessageListener()は単一インスタンスパターンで回避済み
- **Risk**: パフォーマンス影響（メッセージ送信オーバーヘッド） — **Mitigation**: 送信頻度制限（3回/ページ）、非同期送信で処理ブロック回避

## References
- [Chrome Extension Messaging](https://developer.chrome.com/docs/extensions/mv3/messaging/) — runtime.sendMessage vs tabs.sendMessage
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html) — ExportStatus型設計
- 既存実装: src/content-script.ts, src/popup.ts, src/types.ts
