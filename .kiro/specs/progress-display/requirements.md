# Requirements Document

## Project Description (Input)
プログレス表示の実装

## Introduction

Slack Search Result Exporter Chrome拡張機能のエクスポート処理に、リアルタイムプログレス表示機能を追加します。現在、エクスポート処理は「開始→完了」のバイナリ応答のみで、ユーザーは処理中の進捗状況を把握できません。本機能により、現在のページ数、累計メッセージ数、処理段階をPopup UIに表示し、ユーザー体験を向上させます。

## Requirements

### Requirement 1: プログレス情報の送信

**Objective:** As a Chrome Extension developer, I want Content Scriptからプログレス情報をPopupに送信する機能, so that エクスポート処理の進捗状況をリアルタイムで通知できる

#### Acceptance Criteria
1. When Content ScriptがexecuteExport()のページネーションループ内で各ページ処理を完了した時, the Content Script shall `EXPORT_PROGRESS`メッセージをPopupに送信する
2. The `EXPORT_PROGRESS`メッセージ shall 以下の情報を含む: `currentPage`(現在のページ番号), `messageCount`(累計メッセージ数)
3. When Content ScriptがDOM待機中の時, the Content Script shall プログレスメッセージのstatusフィールドに`"waiting_for_dom"`を設定する
4. When Content Scriptがメッセージ抽出中の時, the Content Script shall プログレスメッセージのstatusフィールドに`"extracting"`を設定する
5. When Content Scriptが次ページ遷移中の時, the Content Script shall プログレスメッセージのstatusフィールドに`"navigating"`を設定する
6. The Content Script shall エクスポート処理の各段階(DOM待機、抽出、ページ遷移)でプログレスメッセージを送信する

### Requirement 2: プログレス情報の受信と状態管理

**Objective:** As a Popup UI developer, I want Content Scriptからのプログレスメッセージを受信し状態を更新する機能, so that UI表示を動的に変更できる

#### Acceptance Criteria
1. When PopupがContent Scriptから`EXPORT_PROGRESS`メッセージを受信した時, the Popup shall メッセージのpayloadを内部状態に保存する
2. The Popup shall `exportProgress`状態フィールドを定義し、`currentPage`, `messageCount`, `status`を保持する
3. When プログレス情報が更新された時, the Popup shall `updateUI()`メソッドを呼び出してUI再描画をトリガーする
4. If プログレスメッセージの受信に失敗した場合, then the Popup shall エラー処理を行わず、最後に受信した進捗情報を保持し続ける

### Requirement 3: プログレス表示UI

**Objective:** As a user, I want エクスポート処理中の詳細な進捗情報を視覚的に確認できる機能, so that 処理の進行状況と完了までの目安を把握できる

#### Acceptance Criteria
1. When エクスポート処理が実行中(`isExporting: true`)の時, the Popup UI shall 既存の`#progress`要素を表示する
2. The Popup UI shall `#progress-text`要素のテキスト内容を動的に更新し、現在のページ数と累計メッセージ数を表示する
3. The 進捗テキスト shall 「ページ X 処理中 (Y メッセージ)」のフォーマットで表示される (X=currentPage, Y=messageCount)
4. When statusが`"waiting_for_dom"`の時, the Popup UI shall 進捗テキストに「DOM読み込み待機中...」を付加表示する
5. When statusが`"extracting"`の時, the Popup UI shall 進捗テキストに「メッセージ抽出中...」を付加表示する
6. When statusが`"navigating"`の時, the Popup UI shall 進捗テキストに「次ページへ移動中...」を付加表示する
7. The Popup UI shall 既存のスピナーアニメーション(`.spinner`)を維持し、視覚的フィードバックを継続する
8. When エクスポート処理が完了(`EXPORT_COMPLETE`受信)した時, the Popup UI shall `#progress`要素を非表示にし、結果セクションを表示する

### Requirement 4: メッセージ型定義の拡張

**Objective:** As a TypeScript developer, I want プログレスメッセージの型定義を正確に定義する, so that 型安全性を確保し実装ミスを防止できる

#### Acceptance Criteria
1. The `types.ts` shall `ExportProgress`インターフェースを定義し、`currentPage: number`, `messageCount: number`, `status: ExportStatus`フィールドを含む
2. The `ExportStatus`型 shall `"waiting_for_dom" | "extracting" | "navigating"`のユニオン型として定義される
3. The `ContentScriptToPopupMessage`型 shall 既存の`EXPORT_PROGRESS`メッセージ型のpayloadフィールドを`ExportProgress`型に更新する
4. The Popup state interface shall `exportProgress: ExportProgress | null`フィールドを追加する

### Requirement 5: 既存機能との互換性

**Objective:** As a developer, I want プログレス表示機能が既存のエクスポート処理を妨げないこと, so that リグレッションを防止し安定性を維持できる

#### Acceptance Criteria
1. The プログレス送信機能 shall エクスポート処理のパフォーマンスに著しい影響を与えない (オーバーヘッド < 50ms/ページ)
2. If プログレスメッセージ送信が失敗した場合, then the Content Script shall エクスポート処理を継続し、エラーをスローしない
3. The 既存の`EXPORT_COMPLETE`および`EXPORT_ERROR`メッセージ shall 変更なく動作し続ける
4. The 既存のエラーハンドリング(部分データ保持) shall プログレス表示追加後も維持される
5. The 既存のUI要素(`#result-section`, `#error-message`) shall プログレス表示と競合せず正常に表示される
