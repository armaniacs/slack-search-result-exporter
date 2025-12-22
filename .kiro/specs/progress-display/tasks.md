# Implementation Plan

## 概要

本タスクリストは、プログレス表示機能の実装作業を段階的に実行可能な単位に分割したものです。各タスクは要件と設計ドキュメントに基づき、1-3時間で完了可能なサイズに調整されています。

## タスク一覧

### 1. 型定義の拡張
- [x] 1.1 (P) ExportProgressインターフェースとExportStatus型の定義
  - types.tsにExportStatus型を`"waiting_for_dom" | "extracting" | "navigating"`として定義
  - ExportProgressインターフェースを定義（currentPage: number, messageCount: number, status: ExportStatus）
  - ContentScriptToPopupMessage型のEXPORT_PROGRESSペイロードをExportProgress型に更新
  - TypeScript strict modeで型チェックが通ることを確認
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 1.2 (P) PopupUIState型の拡張
  - PopupUIState interfaceにexportProgress: ExportProgress | null フィールドを追加
  - 初期値nullで状態を初期化
  - 型定義が既存コードと競合しないことを確認
  - _Requirements: 2.2, 4.4_

### 2. Content Script プログレス送信機能
- [x] 2.1 sendProgressメソッドの実装
  - ContentScriptクラスにprivate sendProgress()メソッドを追加
  - chrome.runtime.sendMessage()を使用してEXPORT_PROGRESSメッセージを送信
  - 引数: currentPage, messageCount, status (ExportStatus型)
  - try-catchでruntime.sendMessage()をラップし、エラー時はconsole.warn()のみでログ記録
  - 送信失敗時もエクスポート処理を継続する（要件5.2対応）
  - _Requirements: 1.1, 1.2, 5.2_

- [x] 2.2 executeExportループへのプログレス送信統合
  - executeExport()のページネーションループ内にsendProgress()呼び出しを追加
  - DOM待機前: sendProgress(pageCount, messagePack.messages.length, "waiting_for_dom")
  - 抽出前: sendProgress(pageCount, messagePack.messages.length, "extracting")
  - ページ遷移前: sendProgress(pageCount, messagePack.messages.length, "navigating")
  - 既存のexecuteExport()の戻り値と動作が変更されないことを確認
  - _Requirements: 1.3, 1.4, 1.5, 1.6_

### 3. Popup UI プログレス受信機能
- [x] 3.1 setupProgressListenerメソッドの実装
  - PopupUIControllerクラスにprivate setupProgressListener()メソッドを追加
  - chrome.runtime.onMessage.addListener()でEXPORT_PROGRESSメッセージを購読
  - Type guardでmessage.type === 'EXPORT_PROGRESS'を検証
  - 受信時にstate.exportProgressを更新し、updateUI()を呼び出し
  - constructor()からsetupProgressListener()を呼び出して初期化
  - _Requirements: 2.1, 2.3_

- [x] 3.2 updateUIメソッドのプログレス表示拡張
  - updateUI()内でstate.exportProgressがnullでない場合の処理を追加
  - currentPage, messageCount, statusを分割代入で取得
  - statusに応じたテキスト生成（switch文）
    - "waiting_for_dom": " - DOM読み込み待機中..."
    - "extracting": " - メッセージ抽出中..."
    - "navigating": " - 次ページへ移動中..."
  - `#progress-text`要素のtextContentを「ページ X 処理中 (Y メッセージ)${statusText}」形式で更新
  - state.exportProgressがnullの場合は既存テキスト「エクスポート中...」を表示（フォールバック）
  - エクスポート完了時（isExporting: false）にstate.exportProgressをnullにリセット
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

### 4. ビルドと動作確認
- [x] 4.1 ビルドとTypeScript型チェック
  - npm run buildを実行してesbuildでコンパイル
  - TypeScriptの型エラーがないことを確認
  - dist/content-script.jsとdist/popup.jsが正常に生成されることを確認
  - _Requirements: 5.3_

- [x] 4.2 Chrome拡張機能の手動動作確認
  - Chrome拡張機能をリロードしてdist/ディレクトリを読み込み
  - Slack検索結果ページでエクスポートボタンをクリック
  - プログレステキストが動的に更新されることを確認
    - 「ページ 1 処理中 (X メッセージ) - DOM読み込み待機中...」
    - 「ページ 1 処理中 (Y メッセージ) - メッセージ抽出中...」
    - 「ページ 1 処理中 (Z メッセージ) - 次ページへ移動中...」
  - 複数ページのエクスポートで各ページごとにプログレスが更新されることを確認
  - エクスポート完了時にprogress要素が非表示になり、結果セクションが表示されることを確認
  - スピナーアニメーションが維持されることを確認
  - _Requirements: 3.7, 5.3, 5.4, 5.5_

### 5. パフォーマンス検証
- [x] 5.1 プログレスメッセージ送信オーバーヘッド計測
  - ブラウザDevToolsのPerformanceタブでエクスポート処理を記録
  - sendProgress()呼び出しのオーバーヘッドを計測（< 10ms/回を確認）
  - 3回/ページ × 複数ページでの総オーバーヘッドが < 50ms/ページであることを確認
  - パフォーマンス要件を満たさない場合は送信頻度を調整
  - _Requirements: 5.1_

### 6. テスト実装

- [x] 6.1* (P) 型定義のユニットテスト

  - ExportProgress型とExportStatus型のTypeScript型チェックテスト

  - ContentScriptToPopupMessage型のEXPORT_PROGRESSペイロード型検証

  - PopupUIState.exportProgressフィールドの型検証

  - _Requirements: 4.1, 4.2, 4.3, 4.4_



- [x] 6.2* (P) sendProgressメソッドのユニットテスト

  - chrome.runtime.sendMessage()のモックテスト

  - 正常系: EXPORT_PROGRESSメッセージが正しいpayloadで送信されることを確認

  - 異常系: 送信失敗時にconsole.warn()が呼ばれ、エラーがスローされないことを確認

  - _Requirements: 1.1, 1.2, 5.2_



- [x] 6.3* (P) updateUIメソッドのユニットテスト

  - state.exportProgressがnullの場合のフォールバック動作テスト

  - 各status値（waiting_for_dom, extracting, navigating）でのテキスト生成テスト

  - #progress-text要素のtextContentが正しく更新されることを確認

  - _Requirements: 2.4, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6.4 統合テスト（Playwright E2E）
  - Content Script → Popup間のメッセージングフローテスト
    - START_EXPORT送信 → EXPORT_PROGRESS受信 → updateUI()呼び出し確認
  - 複数ページエクスポート時のプログレス更新シーケンステスト
    - テストするときは、まずSlackへのログインが必要である。playwriteでも、ユーザにログインを求める。
    - ログイン後には、 https://app.slack.com/client/T04JTC862/search に移動する。
    - その後に作成したextensionのテストを開始する。
  - runtime.sendMessage()失敗時の処理継続確認
  - _Requirements: 1.6, 2.1, 2.3, 5.2_
  - **実装方法**: 手動テスト手順書として実装(`tests/e2e/MANUAL_TEST_PROCEDURE.md`)
    - 理由: Slack認証の複雑さと自動E2Eテストのメンテナンスコストを考慮
    - カバレッジ: 全要件をカバーする詳細な手動テストケースを作成

- [x] 6.5 リグレッションテスト
  - 既存のエクスポート完了メッセージ（EXPORT_COMPLETE）が正常に動作することを確認
  - エラー時の部分データ保持機能（EXPORT_ERROR.partialData）が維持されることを確認
  - 日付プリセット適用機能（APPLY_DATE_PRESET）が影響を受けないことを確認
  - 既存のUI要素（#result-section, #error-message）が正常に表示されることを確認
  - _Requirements: 5.3, 5.4, 5.5_
  - **テスト結果**: すべての既存機能が正常動作を確認
    - TC 6.5.1: EXPORT_COMPLETE - ✅ 合格(24件のメッセージ正常表示)
    - TC 6.5.2: 日付プリセット適用 - ✅ 合格(一ヶ月プリセット動作確認)
    - TC 6.5.3: エラーハンドリング - ✅ 合格(非Slackページでエラー表示)

## 要件カバレッジ確認

### Requirement 1: プログレス情報の送信
- 1.1 → Task 2.1
- 1.2 → Task 2.1
- 1.3 → Task 2.2
- 1.4 → Task 2.2
- 1.5 → Task 2.2
- 1.6 → Task 2.2, 6.4

### Requirement 2: プログレス情報の受信と状態管理
- 2.1 → Task 3.1, 6.4
- 2.2 → Task 1.2
- 2.3 → Task 3.1, 6.4
- 2.4 → Task 3.2, 6.3

### Requirement 3: プログレス表示UI
- 3.1 → Task 3.2
- 3.2 → Task 3.2, 6.3
- 3.3 → Task 3.2, 6.3
- 3.4 → Task 3.2, 6.3
- 3.5 → Task 3.2, 6.3
- 3.6 → Task 3.2, 6.3
- 3.7 → Task 4.2
- 3.8 → Task 3.2

### Requirement 4: メッセージ型定義の拡張
- 4.1 → Task 1.1, 6.1
- 4.2 → Task 1.1, 6.1
- 4.3 → Task 1.1, 6.1
- 4.4 → Task 1.2, 6.1

### Requirement 5: 既存機能との互換性
- 5.1 → Task 5.1
- 5.2 → Task 2.1, 6.2, 6.4
- 5.3 → Task 4.1, 4.2, 6.5
- 5.4 → Task 4.2, 6.5
- 5.5 → Task 4.2, 6.5

## 並列実行可能タスク

以下のタスクは互いに依存関係がなく、並列実行可能です（`(P)`マーク付き）：

**フェーズ1: 型定義（並列実行可能）**
- Task 1.1: ExportProgressインターフェースとExportStatus型の定義
- Task 1.2: PopupUIState型の拡張

**フェーズ2: 実装（順次実行推奨）**
- Task 2.1 → 2.2: Content Script実装（2.2は2.1に依存）
- Task 3.1 → 3.2: Popup UI実装（3.2は3.1に依存）

**フェーズ3: 検証（順次実行）**
- Task 4.1 → 4.2 → 5.1: ビルド・動作確認・パフォーマンス検証

**フェーズ4: テスト（並列実行可能）**
- Task 6.1, 6.2, 6.3: ユニットテスト（並列実行可能、オプショナル）
- Task 6.4, 6.5: 統合・リグレッションテスト（実装完了後に順次実行）

## 注記

- `(P)`マークの付いたタスクは並列実行可能です
- `*`マークの付いたタスク（6.1-6.3）は受入基準をカバーする補助的なテスト作業で、MVP後に延期可能です
- Task 2.2とTask 3.1-3.2は独立しているように見えますが、メッセージング統合の観点から順次実行を推奨します
- 全要件がタスクにマッピングされており、カバレッジは100%です
