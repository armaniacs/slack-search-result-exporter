# Requirements Document

## Project Description (Input)
chrome-extesion化する。extensionをクリックしたらslackの検索ページを保存できるようにする。そのうえで、検索条件はいくつかプリセットされる（当日、昨日、一週間、一ヶ月など）一度選んだプリセットは次回にも使われるように保存される。検索ページだけでなく表示されているチャンネルを保存するような機能も有する。

## Introduction
本仕様書は、既存のブックマークレット実装をChrome拡張機能として再実装するプロジェクトの要件を定義する。拡張機能は、Slack検索結果とチャンネルコンテンツのワンクリックエクスポート、カスタマイズ可能な日付フィルタプリセット、およびユーザー設定の永続化機能を提供する。

## Requirements

### Requirement 1: Chrome拡張機能の基本構造
**Objective:** ユーザーとして、ブラウザにインストール可能なChrome拡張機能として動作する形で既存のブックマークレット機能を利用したい。これにより、ブックマークレットの手動実行が不要になる。

#### Acceptance Criteria
1. The Chrome Extension shall アドレスバー横のツールバーに拡張機能アイコンを表示する
2. When ユーザーが拡張機能アイコンをクリックした, the Chrome Extension shall 現在のSlackページ種別（検索結果ページまたはチャンネルページ）を検出する
3. The Chrome Extension shall manifest.json に必要な権限（activeTab, storage）を定義する
4. The Chrome Extension shall コンテンツスクリプトとしてSlackページ内で実行される
5. If Slackページ以外で拡張機能アイコンがクリックされた, then the Chrome Extension shall エラーメッセージを表示する

### Requirement 2: 検索結果ページのエクスポート機能
**Objective:** ユーザーとして、Slack検索結果ページで拡張機能をクリックすることで、検索結果をTSV形式でエクスポートしたい。これにより、既存のブックマークレット機能と同等の動作を拡張機能から実行できる。

#### Acceptance Criteria
1. When ユーザーがSlack検索結果ページで拡張機能アイコンをクリックした, the Chrome Extension shall 既存のブックマークレットと同じロジックで検索結果を収集する
2. The Chrome Extension shall 複数ページにわたる検索結果を自動的にページネーションして取得する
3. The Chrome Extension shall 収集したメッセージをTSV形式（タイムスタンプ、チャンネル、送信者、本文）で整形する
4. When メッセージ収集が完了した, the Chrome Extension shall ポップアップウィンドウにTSVデータを表示する
5. The Chrome Extension shall 重複メッセージを排除するためにSet型のデータ構造を使用する
6. If ページネーション中にエラーが発生した, then the Chrome Extension shall 収集済みデータを保持し、エラー内容をユーザーに通知する

### Requirement 3: チャンネルページのエクスポート機能
**Objective:** ユーザーとして、Slackチャンネルページで拡張機能をクリックすることで、表示中のチャンネルメッセージをエクスポートしたい。これにより、検索結果だけでなくチャンネルコンテンツも保存できる。

#### Acceptance Criteria
1. When ユーザーがSlackチャンネルページで拡張機能アイコンをクリックした, the Chrome Extension shall 現在表示されているチャンネルメッセージを収集する
2. The Chrome Extension shall チャンネルページ用のDOMセレクタを使用してメッセージ要素を抽出する
3. The Chrome Extension shall 収集したチャンネルメッセージをTSV形式で整形する
4. When メッセージ収集が完了した, the Chrome Extension shall ポップアップウィンドウにTSVデータを表示する
5. If チャンネルページのDOM構造が想定と異なる, then the Chrome Extension shall エラーメッセージを表示し、データ収集を中断する

### Requirement 4: 日付フィルタプリセット機能
**Objective:** ユーザーとして、検索時に「当日」「昨日」「一週間」「一ヶ月」などの日付フィルタプリセットを選択したい。これにより、日付範囲を手動入力する手間を省ける。

#### Acceptance Criteria
1. The Chrome Extension shall ポップアップUIに日付フィルタプリセット選択ボタンを表示する
2. The Chrome Extension shall 最低限「当日」「昨日」「一週間」「一ヶ月」のプリセットを提供する
3. When ユーザーがプリセットを選択した, the Chrome Extension shall Slackの検索クエリに適切な日付範囲パラメータを追加する
4. When プリセットが適用された, the Chrome Extension shall 該当する日付範囲の検索を自動実行する
5. The Chrome Extension shall プリセット選択後にエクスポート処理を開始する

### Requirement 5: ユーザー設定の永続化
**Objective:** ユーザーとして、一度選択した日付プリセットを次回起動時にも使用できるように保存したい。これにより、毎回同じプリセットを選択する手間を省ける。

#### Acceptance Criteria
1. When ユーザーが日付プリセットを選択した, the Chrome Extension shall 選択内容をchrome.storage.syncに保存する
2. When 拡張機能が起動した, the Chrome Extension shall chrome.storage.syncから前回の設定を読み込む
3. The Chrome Extension shall 前回選択されたプリセットをデフォルト選択状態で表示する
4. If 保存された設定が存在しない, then the Chrome Extension shall デフォルトプリセット（「一週間」など）を選択状態にする
5. The Chrome Extension shall ユーザー設定のクリア機能を提供する

### Requirement 6: 拡張機能のUI/UX
**Objective:** ユーザーとして、直感的で使いやすいポップアップUIを通じて拡張機能を操作したい。これにより、スムーズなエクスポート体験を得られる。

#### Acceptance Criteria
1. The Chrome Extension shall ポップアップウィンドウに拡張機能のメイン操作UIを表示する
2. The Chrome Extension shall エクスポート進行状況を視覚的に表示する（ローディングインジケータなど）
3. When エクスポートが完了した, the Chrome Extension shall 結果データをコピー可能なテキストエリアに表示する
4. The Chrome Extension shall ワンクリックでTSVデータをクリップボードにコピーするボタンを提供する
5. If エラーが発生した, then the Chrome Extension shall ユーザーフレンドリーなエラーメッセージを表示する
6. The Chrome Extension shall ポップアップUIのレスポンシブデザインを実装する

### Requirement 7: セキュリティとプライバシー
**Objective:** ユーザーとして、拡張機能が安全にSlackデータを扱うことを期待する。これにより、データ漏洩やセキュリティリスクを最小化できる。

#### Acceptance Criteria
1. The Chrome Extension shall XSS攻撃を防止するために、DOM操作時に適切なエスケープ処理を実行する
2. The Chrome Extension shall Slackドメイン以外でコンテンツスクリプトを実行しない
3. The Chrome Extension shall ユーザーデータを外部サーバーに送信しない（完全なクライアントサイド処理）
4. The Chrome Extension shall manifest.jsonで最小限の権限のみを要求する
5. If 不正なプロトコル（javascript:など）を含むリンクが検出された, then the Chrome Extension shall それらをフィルタリングする

### Requirement 8: 互換性とパフォーマンス
**Objective:** ユーザーとして、拡張機能がChrome環境で安定的に動作することを期待する。これにより、既存のブックマークレット実装と同等以上の信頼性を得られる。

#### Acceptance Criteria
1. The Chrome Extension shall Chrome最新版およびChrome 90以降のバージョンで動作する
2. The Chrome Extension shall 大量の検索結果（100件以上）を処理する際もブラウザフリーズを引き起こさない
3. The Chrome Extension shall MutationObserverを使用してSlackの動的コンテンツ読み込みを検出する
4. When ページネーション処理が長時間かかる, the Chrome Extension shall ユーザーに進行状況を通知する
5. If SlackのDOM構造が変更された, then the Chrome Extension shall フォールバック用セレクタを使用して動作を継続する試みを行う

