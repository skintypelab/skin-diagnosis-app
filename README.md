# GA4（Google Analytics 4）導入手順

このドキュメントは、本アプリの `analytics.js`（`AnalyticsService`）にGA4を接続するための手順書です。
コードは既に実装済みのため、**GA4側の設定と測定IDの反映のみ**で計測が開始できます。

> 補足: `analytics.js` の `GA4_MEASUREMENT_ID` が未設定（`'G-XXXXXXXXXX'` のまま）の場合、
> `AnalyticsService` は各 `trackXxx()` 呼び出し時に何もエラーを出さず安全にスキップします
> （コンソールに `[AnalyticsService] GA4未設定のため計測をスキップします...` という情報ログのみ出力）。
> そのため、GA4を未設定のままアプリを使い続けても既存機能に影響はありません。

---

## 1. GA4プロパティの作成

1. [Google Analytics](https://analytics.google.com/) にアクセスし、Googleアカウントでログインする。
2. 左下の「管理」（歯車アイコン）を開く。
3. 「アカウントを作成」または既存アカウントを選択し、「プロパティを作成」をクリックする。
4. プロパティ名（例: `SKIN TYPE LAB`）、レポートのタイムゾーン（`日本`）、通貨（`日本円`）を設定して「次へ」。
5. 業種・ビジネスの規模など簡単な質問に回答して「作成」。
6. 「データストリーム」の設定画面で **「ウェブ」** を選択する。
7. ウェブサイトのURL（本番公開先のドメイン）とストリーム名を入力し、「ストリームを作成」をクリックする。

---

## 2. 測定IDの取得

1. 作成したデータストリームの詳細画面を開く。
2. 画面右上に表示される **「測定ID」**（`G-XXXXXXXXXX` の形式）をコピーする。
   - この値が `analytics.js` に設定する `GA4_MEASUREMENT_ID` です。

---

## 3. `analytics.js` への設定方法

`analytics.js` 内の以下の行を、取得した測定IDに書き換えます。

```javascript
// 変更前
var GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';

// 変更後（例）
var GA4_MEASUREMENT_ID = 'G-ABC1234XYZ';
```

- 変更が必要なのは**この1行のみ**です。他のロジック（`dispatch`、`trackXxx` など）は変更不要です。
- 保存後、ブラウザでページを再読み込みすれば、GA4向けの `gtag.js` が自動的に読み込まれます。
- 本番環境と検証環境で別プロパティを使いたい場合は、環境ごとに測定IDを切り替えてデプロイしてください。

---

## 4. DebugViewでイベントを確認する方法

`analytics.js` には、拡張機能なしでDebugViewを有効化できる仕組みが組み込まれています。

1. アプリのURLに `?ga_debug=1` を付けてアクセスする（例: `index.html?ga_debug=1`）。
   - 一度アクセスすると `localStorage` にフラグが保存され、以降のアクセスでもDebugView向けの送信（`debug_mode: true`）が維持されます。
   - コンソールに `[AnalyticsService] GA4 debug_mode 有効化（DebugViewに表示されます）` と出れば有効化成功です。
   - 無効化したい場合は `?ga_debug=0` を付けてアクセスしてください。
   - （代替手段）Chromeに [Google Analytics Debugger 拡張機能](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) を入れても同様にDebugView送信ができます。
2. GA4の管理画面 →「管理」→ プロパティ列の **「DebugView」** を開く。
3. ブラウザでアプリ（`index.html`）を開き、診断・商品クリックなどの操作を行う。
4. DebugView画面にリアルタイムでイベントが流れてくることを確認する。
   - 画面左のタイムライン上に自分の端末（デバイス）が表示され、選択するとイベント一覧が見られます。
5. 反映まで数秒〜数十秒のラグがあるため、イベントが出ない場合は少し待ってから再確認してください。

---

## 5. 7つのイベントの確認方法

DebugView上で、以下の操作を行うと対応するイベント名が確認できます。

| 関数 | 操作 | イベント名 | 主なパラメータ |
|---|---|---|---|
| `trackDiagnosisStart()` | 診断を開始する（「診断をはじめる」ボタン） | `diagnosis_start` | なし |
| `trackDiagnosisComplete()` | 診断結果画面が表示される | `diagnosis_complete` | `skin_type`, `concerns` |
| `trackProductClick()` | 商品カードの「詳しく見る」を開く | `product_click` | `product_id`, `brand`, `category`, `context` |
| `trackIngredientClick()` | 成分タグをクリックする | `ingredient_click` | `ingredient_id` |
| `trackShopClick()` | Amazon / 楽天 / Qoo10リンクをクリックする | `shop_click` | `product_id`, `brand`, `category`, `shop` |
| `trackSearch()` | 検索窓に入力する（800ms入力停止後） | `search` | `query` |
| `trackShare()` | 診断結果の「シェアする」ボタンを使う | `share` | `method`, `target` |

確認手順の例（`shop_click` の場合）:
1. DebugViewを開いた状態でアプリの商品一覧を表示する。
2. 任意の商品の「Amazon」リンクをクリックする。
3. DebugViewのイベント一覧に `shop_click` が表示され、`shop: amazon` などのパラメータが含まれることを確認する。

他の6イベントも同様に、対応する操作を行ってDebugViewでイベント名とパラメータを確認してください。

---

## 6. 導入チェックリスト

- [ ] GA4プロパティを作成した
- [ ] ウェブ用データストリームを作成した
- [ ] 測定ID（`G-XXXXXXXXXX`形式）を取得した
- [ ] `analytics.js` の `GA4_MEASUREMENT_ID` を実際の測定IDに書き換えた
- [ ] ブラウザで `index.html` を開き、コンソールにGA4未設定の警告が出ないことを確認した
- [ ] `?ga_debug=1` を付けてアクセスし、debug_modeを有効化した
- [ ] DebugViewを開き、`diagnosis_start` が計測されることを確認した
- [ ] `diagnosis_complete` が計測されることを確認した
- [ ] `product_click` が計測されることを確認した
- [ ] `ingredient_click` が計測されることを確認した
- [ ] `shop_click` が計測されることを確認した
- [ ] `search` が計測されることを確認した
- [ ] `share` が計測されることを確認した
- [ ] 本番公開後、GA4の「リアルタイム」レポートでもイベントが届いていることを確認した
