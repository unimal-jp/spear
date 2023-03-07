[README in English](./README.md)

# spear-cli

[![npm version](https://badge.fury.io/js/@spearly%2Fspear-cli.svg)](https://badge.fury.io/js/@spearly%2Fspear-cli)

`spear-cli` は Spearly 向けの静的サイトジェネレーターです (SSG) 

## 利用方法

### プロジェクトの作成

最初に以下の手順でプロジェクトを作成します。

1. `npm create spear@latest` : このコマンドを実行するとプロジェクトを作成するためのウィザードが起動します。

```bash
Namespace(port=undefined, action='create', projectName=undefined, src=undefined)
 ### Welcome to Spear CLI ###


? Name of your project (spear-cli) <Input your project name>　←プロジェクト名を入力します。
? Use Spearly CMS (Use arrow keys)
❯ Yes      <- Choose 'yes' if you use the Spear content.      ←CMS を利用する場合は「Yes」を選択
  No
? Enter your Spearly CMS API KEY  <Input your Spearly API KEY> ← CMS を利用する場合は Spearly の API キーを入力
? Choose template type (Use arrow keys)                        ← テンプレートタイプを選択する
❯ basic 
  empty 
? Generate Sitemap?                                            ← サイトマップを生成するかどうかの選択
❯ Yes 
  No 
  ? Enter your hosting URL (Example: https://foobar.netlify.app/) () ← サイトマップを生成する場合ベースとなるURL



? Name of your project SampleProject
? Use Spearly CMS Yes
? Enter your Spearly CMS API KEY **********

  ## Your project was created 🎉

  To start using, run the following command:
      cd SampleProject
      yarn install

  To start local server, run
      yarn dev

  To build static sources, run
      yarn build

```

これで `spear-cli` を使う準備は完了しました 🚀

### ページの編集

自由にページを作成できます。`spear-cli` は以下の機能を提供しています。

- コンポーネント
  - ページの一部の部品をコンポーネントとして作成できます。
  - `components` ディレクトリにコンポーネントを作成します。
- アセット
  - イメージやスクリプト、CSS などを `assets` ディレクトリに作成できます。
  - ディレクトリ名は任意のもので構いません。
- Spearly CMS のコンテンツリスト
  - Spearly CMS のコンテンツのリストをページ内に挿入できます。
  - 記述方法は、Spearly CMS 埋め込み JavaScript と同じです。
  - `cms-loop` 属性を要素へ付与すると、その要素はリストとして生成されます。
- Spearly CMS のコンテンツ
  - Spearly CMS のコンテンツをページ内に挿入できます。
  - 記述方法は、Spearly CMS 埋め込み JavaScript と同じです。
  - `cms-item` 属性を要素へ付与すると、その要素はコンテンツとして生成されます。
- 静的ルーティング
  - コンテンツページへのリンクは静的ルーティングを利用できます。

ライブモードも利用できます。ライブモードを利用したい場合は以下のコマンドを実行してください。

```bash
spear watch -s <project directory>
```

### 静的ルーティング

`spear-cli` は Spearly CMS コンテンツを静的ファイルとして生成します。仕様は以下の通りです。

- ファイル名は `/path/[alias].html` として保存します。
  - このファイルは生成されると、`/path/<content-alias>.html` として出力されます。(例：コンテンツエイリアスが `first-blog` の場合は `/path/first-blog.html` となります)

### SASS

`spear-cli` は SASS 構文をサポートしてます。`src` にある `.scss` ファイルはすべてコンパイルされ、`dist` からの相対パスへコンパイル結果の CSS が保存されます。

### サイトマップ生成

`spear-cli` の設定ファイルでサイトマップ生成設定がされている場合、自動でサイトマップを生成します。  
サイトマップ生成設定には、サイトマップ生成の有無と、ホスト URL の情報が必要です。次の2つの設定を `spear.config.mjs` に入れることで動作します。

```javascript
  "generateSitemap": boolean,
  "siteURL": string,
```

### SEO タグ

SEO タグ設定をすることで、生成した HTM  ファイルに SEO タグを注入することが出来ます。  
設定は `spear.config.mjs` のプラグイン機能を利用します。

```javascript
import { spearSEO } from "@spearly/spear-cli/dist/plugins/spear-seo.js"
export default {
  ...
  plugins: [
    spearSEO(),
  ]
}
```

コンポーネントやページ内で以下のタグを好きな場所に書くことで、SEO タグを自動で注入します。

```html
<spear-seo
  title="Page title"
  meta-description="Page description"
  meta-og:url="/pics/ogp.png">
</spear-seo>
```

指定可能な属性は以下の通りです。

| Attribute | Description | Generated Value|
|-----------|-------------|----------------|
| title |	サイトタイトル。 |  <title>value</title> |
| meta-*** | メタ情報 | <meta name="****" value="value"> |
| link-*** | リンク情報 | <link rel="***" href="value"> |

### i18n (国際化)

サイトを複数言語で運用する場合、i18n プラグインを利用することで、サイトを多言語化することが出来ます。  
設定は `spear.config.mjs` に i18n プラグインを指定します。

```javascript
import { spearI18n } from "@spearly/spear-cli/dist/plugins/spear-i18n.js"
export default {
  ...
  plugins: [
    spearI18n('./i18n.yaml')
  ]
}
```

国際化するためには言語ファイルを用意する必要があります。言語ファイルはキー/バリューの組み合わせになります。

```yaml
settings:
  default: "jp"
lang:
  jp:
    - title: ブログだよ
    - description: ブログサイトです
    - url: https://www.yahoo.co.jp
  en:
    - title: Blog
    - description: This is blog site.
    - url: https://www.google.com
```

各ページやコンポーネントで指定するに、Spear  は 2 種類の方法を提供しています。

1. i18n 属性

HTML タグに i18n 属性を付与すると、インライン全てが言語ファイルで指定した値に置き換わります。

例：
```html
<p i18n="title"></p>
<!-- Replaced the bellow in Japanese -->
<p>ブログだよ</p>
```

2. 独自構文 (`{%= translate() %}`)

HTML 内に独自構文を書くことで、Spear はその文字を置換します。

```html
<title>{%= translate('title') %}</title>
<!-- Replaced the bellow in Japanese -->
<title>ブログだよ</title>
```

この `translate()` 関数は省略して `t()` と記載することも可能です。

また、リンクも置き換えたい場合も同様に Spear は 2 種類の方法を提供しています。

1. spear-link タグ

spear-link タグは指定された URL を言語ごとに置換した `<a>` タグを生成します。

```html
<spear-link href="/about.html">About us</spear-link>
<!-- Replaced the bellow in Japanese -->
<a href="/ja/about.html">About us</a>
```

2. 独自構文 (`{%= localize() %}`)

HTML 内に独自構文を書くことで、Spear は指定された URL を言語ごとに置換します。

```html
<script>
  function click() {
    window.location = "{%= localize('./about.html') %}"
  }
</script>
<!-- Replaced the bellow in Japanese -->
<script>
  function click() {
    window.location = "ja/about.html"
  }
</script>
```

リンクは相対パス、絶対パスの指定方法によって生成される結果が変わることに注意してください。

### ディレクトリ構造

`spear-cli` は以下のディレクトリ構造のルールがあります。

- components : ルートディレクトリ直下の `components' です。
  - 他のページやコンポーネントへ挿入するための spear コンポーネントを保存する場所です。
  - spear-cli はネストされたコンポーネントディレクトリを保証します。(例： /components/common、/components/cards)
  - spear-cli はネイティブDOM要素と同じ名前のコンポーネントを指定する事はできません。(例：`body` / `header` / `section`)
- assets / public : ルートディレクトリ直下の `assets` や `public` などです。
  - spear-cli では何も加工せずにそのまま出力します。
- その他のディレクトリ
  - spear-cli では何も加工せずにそのまま出力します。
  - html / spear / htm ファイルがある場合は、ファイル内を解析して spear コンポーネントの指定があれば挿入します。
  - バイナリファイルは解析せずそのまま出力します。

ディレクトリサンプル:

```bash
├── package.json
├── spear.config.json
└── src
    ├── assets
    │   ├── css
    │   │   └── main.css
    │   └── js
    │       └── main.js
    ├── blog
    │   ├── index.html
    │   └── [alias].html
    ├── components
    │   ├── header.spear
    │   └── main.spear
    ├── images
    │   └── logo.png
    ├── index.html
    ├── pages
    │   └── index.spear
    └── public
        └── favicon.ico
```

spear-cli のビルドを実行後は蒸気サンプルは以下のような構成で出力されます。

```bash
├── dist
│   ├── assets
│   │   ├── css
│   │   │   └── main.css
│   │   └── js
│   │       └── main.js
│   ├── blog
│   │   ├── index.html
│   │   ├── first-blog.html
│   │   ├── second-blog.html
│   │   ├──     :
│   │   └── second-blog.html
│   ├── images
│   │   └── logo.png
│   ├── pages
│   │   └── index.html
│   └── public
│       └── favicon.ico
├── package.json
├── spear.config.json
```

注意：

- `components/header.spear` と `components/main.spear` は各ページに挿入されます。
- `pages/index.spear` は `pages/index.html` にリネームされます.

### ビルド

最後のプロセスとして以下のコマンドでビルドできます。

```bash
$ spear build -s <project directory>
```

これで Spearly ページがビルドできました🚀🚀🚀

## 設定ファイル

Spear のビルドは `spear.config.mjs` に従って行われます。このファイルは以下のような設定値を持ちます。

```js
export default {
  "spearlyAuthKey": string,     // データを取得するための Spearly API トークンを指定します
  "projectName": string,        // プロジェクト名を指定します
  "generateSitemap": boolean,   // サイトマップを生成するかを指定します
  "siteURL": string,            // サイトマップを生成する際のベースURLを指定します(オプション)
  "apiDomain": string,          // フェッチする API サーバーのドメインを指定します(オプション)
};
```

## エディタについて

Spear はエディタを選びません。
ただし、以下の設定をすることでより快適な開発が行えます。

### Visual Studio Code

 プロジェクト作成時に生成される `.vscode/settings.json` を利用してください。

### JetBrains(IntelliJ, WebStorm, PhpStorm 等)

- IntelliJ の Plugin ができるまでは、独自の設定が必要です。
- 公式ドキュメントに沿って、 `.spear` を `.html` として認識するように設定してください。

[ファイル名パターンとファイルタイプ間の関連付けを構成する](https://pleiades.io/help/idea/creating-and-registering-file-types.html#configure-associations-between-filename-patterns-and-file-types)


## 貢献

このプロジェクトへ貢献する場合は、[CONTRIBUTING.md](../../CONTRIBUTING.md) をご覧ください！
参加をお待ちしています！
