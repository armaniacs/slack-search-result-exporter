# Implementation Plan

## Task List

### 1. プロジェクトセットアップとビルド環境構築

- [x] 1.1 (P) TypeScriptビルド環境をセットアップ
  - `tsconfig.json` を strict mode で設定
  - `@types/chrome` パッケージをインストール
  - TypeScript Compiler (tsc) のビルドスクリプトを package.json に追加
  - ビルド出力ディレクトリ構成を確認
  - _Requirements: 1.1, 8.1_

- [x] 1.2 (P) manifest.json を作成
  - Manifest V3形式でメタデータ定義
  - 必要最小限の権限 (`activeTab`, `storage`) を設定
  - Slackドメイン (`*://*.slack.com/*`) への host_permissions を設定
  - Service Worker、Content Script、Popup UIのエントリポイントを定義
  - _Requirements: 1.1, 1.3, 7.2, 7.4_

- [x] 1.3 (P) プロジェクト構造とディレクトリを作成
  - 拡張機能用ソースファイルディレクトリ (src/) を作成
  - アイコン画像ファイル (icons/icon16.png, icon48.png, icon128.png) を配置
  - ビルド出力ディレクトリ (dist/) を設定
  - .gitignore にビルド成果物を追加
  - _Requirements: 1.1_

### 2. Service Worker と Storage 管理の実装

- [x] 2.1 (P) SettingsManager を実装
  - chrome.storage.sync API の型安全なラッパーを作成
  - `get()`, `set()`, `getAll()`, `clear()` メソッドを実装
  - デフォルト値 (selectedPreset: "week") を定義
  - 型ガード関数で読み込みデータを検証
  - Storage エラーハンドリング (quota超過、読み書きエラー) を実装
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.2 DatePresetManager を実装
  - DatePreset型 ("today"|"yesterday"|"week"|"month") を定義
  - 各プリセットから日付範囲 (DateRange) を計算する `calculateDateRange()` を実装
  - Slack検索クエリ形式 (`after:YYYY-MM-DD`) を生成する `toSlackQuery()` を実装
  - タイムゾーン処理 (ユーザーローカル時刻基準) を考慮
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 2.3 Service Worker のイベントハンドラを実装
  - `chrome.runtime.onMessage` リスナーを登録してメッセージ受信処理を実装
  - Popup UI からの設定読み込みリクエストに応答
  - Popup UI からの設定保存リクエストに応答
  - `chrome.storage.onChanged` リスナーでクロスデバイス同期を検知
  - メッセージペイロード型検証を実装
  - _Requirements: 1.4, 5.1, 5.2_

### 3. Content Script: Slack DOM 操作とメッセージ抽出の実装

- [x] 3.1 ページ種別検出機能を実装
  - URL パターン (`/search/` 含む) でページ種別を判定
  - DOM 構造で検索結果ページとチャンネルページを識別
  - 未対応ページの場合はエラーメッセージを返す
  - _Requirements: 1.2, 1.5_

- [x] 3.2 (P) MessageExtractor を実装 (検索結果ページ)
  - MutationObserver で Slack DOM 読み込み完了を待機
  - `[role="document"]` セレクタでメッセージグループを取得
  - タイムスタンプ、チャンネル名、送信者、本文を抽出
  - Set型で重複メッセージを排除
  - 既存ブックマークレットのDOMセレクタパターンを移植
  - _Requirements: 2.1, 2.2, 2.5, 8.3_

- [x] 3.3 ChannelExtractor の調査と実装準備
  - 実Slackチャンネルページで DOM 構造を調査
  - チャンネルメッセージ用の DOMセレクタ候補を特定
  - 検索結果ページとの構造差異を確認
  - フォールバックセレクタ戦略を設計
  - _Requirements: 3.1, 3.2, 8.5_

- [x] 3.4 ChannelExtractor を実装 (チャンネルページ)
  - 調査結果に基づくチャンネルメッセージ用DOMセレクタを実装
  - 表示中のチャンネルメッセージを抽出
  - DOM構造不一致時のエラーハンドリングを実装
  - MessageExtractor との共通抽象化を検討
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 3.5 (P) MessageFormatter を実装
  - TSV形式変換 (タイムスタンプ、チャンネル、送信者、本文) を実装
  - 外部リンクのMarkdown形式変換 (`convertLinksToMarkdown()`) を実装
  - XSSエスケープ処理 (`escapeXSS()`) を実装
  - 不正プロトコル (`javascript:` 等) フィルタリングを実装
  - 既存ブックマークレットのロジックを移植
  - _Requirements: 2.3, 3.3, 7.1, 7.5_

- [x] 3.6 ページネーション制御を実装
  - 次ページボタン検出機能を実装
  - 次ページボタンクリックとDOM読み込み待機を実装
  - ページ上限チェックで無限ループを防止
  - `messagePack` オブジェクトで状態管理 (messages配列、messageSet、hasNextPageフラグ)
  - 再帰的ページネーションロジックを実装
  - _Requirements: 2.2, 2.6_

- [x] 3.7 Content Script メッセージング処理を実装
  - `chrome.runtime.onMessage` リスナーを登録
  - Popup UI からのエクスポート開始メッセージを受信
  - エクスポート進行状況を Popup UI へ通知
  - エクスポート完了メッセージ (TSVデータ含む) を送信
  - エラー発生時にエラーメッセージと部分データを送信
  - _Requirements: 2.4, 2.6, 6.2_

### 4. Popup UI の実装

- [ ] 4.1 (P) Popup HTML/CSS を作成
  - popup.html にUIレイアウトを実装
  - 日付プリセット選択ボタングループを作成
  - エクスポートボタンを作成
  - 進行状況表示エリア (ローディングインジケータ) を作成
  - 結果表示テキストエリアを作成
  - クリップボードコピーボタンを作成
  - レスポンシブデザインのCSSを実装
  - _Requirements: 4.1, 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 4.2 Popup UI の状態管理とイベント処理を実装
  - PopupUIState 型を定義 (selectedPreset, isExporting, exportResult, error)
  - Service Worker から設定読み込みを実行
  - 前回選択プリセットをデフォルト選択状態で表示
  - 日付プリセット選択時に Service Worker へ保存リクエスト送信
  - エクスポートボタンクリック時に Content Script へメッセージ送信
  - _Requirements: 4.1, 4.5, 5.2, 5.3, 6.1_

- [ ] 4.3 Popup UI のエクスポート結果表示を実装
  - Content Script からの進行状況メッセージを受信してUI更新
  - エクスポート完了時にTSVデータをテキストエリアに表示
  - クリップボードコピーボタンクリック時に Clipboard API を使用
  - エラー発生時にユーザーフレンドリーなエラーメッセージを表示
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 4.4 日付プリセット適用フローの調査と実装準備
  - プリセット選択後のSlack検索実行方法を調査 (URL書き換え or DOM操作)
  - Popup UI → Content Script → Slack Page遷移フローを設計
  - `APPLY_DATE_PRESET` メッセージ型を定義
  - Content Script に SearchExecutor 機能追加の必要性を判断
  - _Requirements: 4.3, 4.4_

- [ ] 4.5 日付プリセット適用機能を実装
  - 調査結果に基づきプリセット適用ロジックを実装
  - DatePresetManager で生成したクエリをSlack検索に適用
  - プリセット適用後にエクスポート処理を自動開始
  - _Requirements: 4.3, 4.4, 4.5_

### 5. セキュリティとエラーハンドリングの実装

- [ ] 5.1 (P) XSS防止とセキュリティ検証を実装
  - MessageFormatter の XSSエスケープ処理を検証
  - Popup UI のテキストエリアを `readonly` 属性に設定
  - Popup UI で `textContent` 使用を徹底 (`innerHTML` 禁止)
  - Content Security Policy を manifest.json に設定 (`script-src 'self'`)
  - 不正プロトコルフィルタリング (`/^(https?|mailto):/` のみ許可) を検証
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5.2 (P) エラーハンドリングとユーザーフィードバックを実装
  - DOM構造不一致エラーのハンドリング (エラーメッセージ表示、部分データ保持)
  - ページネーションエラーのハンドリング (収集済みデータ表示、エラー通知)
  - Storage quota超過エラーのハンドリング (デフォルト設定で続行)
  - Slack以外のページでの実行エラーを検出してメッセージ表示
  - フォールバックセレクタ使用によるDOM変更への対応
  - _Requirements: 1.5, 2.6, 3.5, 5.4, 8.5_

### 6. 統合とE2Eテスト

- [ ] 6.1 コンポーネント統合を実施
  - Service Worker、Content Script、Popup UI の全メッセージングフローを接続
  - 設定永続化フロー (保存 → 読み込み → UI反映) を統合検証
  - エクスポートフロー (Popup UI → Content Script → メッセージ抽出 → Popup UI 結果表示) を統合検証
  - クロスデバイス同期 (chrome.storage.sync) の動作確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 5.1, 6.1_

- [ ] 6.2 既存Playwright E2Eテストの適応
  - 既存のSlackモックページ (`tests/fixtures/slack-search-mock.html`) をChrome Extension環境に適応
  - 既存テストスイート (`tests/e2e/*.spec.js`) をChrome Extension用に修正
  - 拡張機能ロード、Popup UI操作、エクスポート実行のテストケースを追加
  - ページネーション、DOM構造検証、TSV形式検証のテストを移植
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 8.1, 8.2_

- [ ] 6.3 Chrome Extension 固有機能のE2Eテストを追加
  - 日付プリセット選択とStorage保存のテスト
  - 設定永続化とクロスデバイス同期のテスト
  - チャンネルページエクスポートのテスト
  - クリップボードコピー機能のテスト
  - Slack以外のページでのエラー表示テスト
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 5.2, 5.3, 6.3, 6.4_

- [ ]* 6.4 パフォーマンステストを実施 (オプション)
  - 100件以上のメッセージエクスポートでブラウザフリーズが発生しないことを検証
  - 10ページ以上のページネーション処理時間を測定
  - Storage書き込み頻度がrate limit (120 ops/分) 内に収まることを確認
  - Content Script起動時間がSlackページ読み込みに影響しないことを確認
  - _Requirements: 8.2, 8.3, 8.4_

### 7. ビルドとパッケージング

- [ ] 7.1 Chrome Extension パッケージをビルド
  - TypeScript → JavaScript 変換を実行
  - 全ソースファイルを dist/ にコピー
  - manifest.json、アイコン、HTMLファイルを dist/ に配置
  - Chrome Web Store用のZIPパッケージを生成
  - ビルド検証を実行
  - _Requirements: 1.1, 1.3_

- [ ] 7.2 ローカル環境でChrome拡張機能をテスト
  - chrome://extensions で開発者モードを有効化
  - dist/ ディレクトリから拡張機能を読み込み
  - 実Slackページで全機能を手動検証 (検索結果エクスポート、チャンネルエクスポート、プリセット適用)
  - セキュリティ検証 (XSS防止、権限、DOM制限) を実施
  - ブラウザ互換性 (Chrome 90以降) を確認
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3, 8.1_

## Requirements Coverage

全8つの要件グループ、合計40の受入基準をカバー:

- **Requirement 1 (Chrome拡張機能基本構造)**: Task 1.1, 1.2, 1.3, 2.3, 3.1, 6.1, 7.1, 7.2
- **Requirement 2 (検索結果ページエクスポート)**: Task 3.2, 3.5, 3.6, 3.7, 6.1, 6.2, 7.2
- **Requirement 3 (チャンネルページエクスポート)**: Task 3.1, 3.3, 3.4, 3.5, 6.3, 7.2
- **Requirement 4 (日付フィルタプリセット)**: Task 2.2, 4.1, 4.2, 4.4, 4.5, 6.3
- **Requirement 5 (ユーザー設定永続化)**: Task 2.1, 2.3, 4.2, 4.3, 5.2, 6.1, 6.3
- **Requirement 6 (拡張機能UI/UX)**: Task 3.7, 4.1, 4.2, 4.3, 6.1, 6.3
- **Requirement 7 (セキュリティとプライバシー)**: Task 1.2, 3.5, 5.1, 7.2
- **Requirement 8 (互換性とパフォーマンス)**: Task 1.1, 3.2, 3.6, 5.2, 6.2, 6.4, 7.2
