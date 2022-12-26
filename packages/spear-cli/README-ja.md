[README in English](./README.md)

# spear-cli

[![npm version](https://badge.fury.io/js/spear-cli.svg)](https://badge.fury.io/js/spear-cli)

`spear-cli` はSpearly 向けの静的サイトジェネレーターです (SSG) 

## 利用方法

### インストール

1. npm

```bash
npm install spear-cli -g
```

1. yarn

```bash
yarn global add spear-cli
```

### プロジェクトの作成

最初に以下の手順でプロジェクトを作成します。

1. `spear create` : このコマンドを実行するとプロジェクトを作成するためのウィザードが起動します。

```bash
Namespace(port=undefined, action='create', projectName=undefined, src=undefined)
 ### Welcome to Spear CLI ###


? Name of your project (spear-cli) <Input your project name>　←プロジェクト名を入力します。
? Use Spearly CMS (Use arrow keys)
❯ Yes      <- Choose 'yes' if you use the Spear content.      ←CMS を利用する場合は「Yes」を選択
  No
? Enter your Spearly CMS API KEY  <Input your Spearly API KEY> ← CMS を利用する場合は Spearly の API キーを入力



? Name of your project SampleProject
? Use Spearly CMS Yes
? Enter your Spearly CMS API KEY aaaaaa

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

ライブモードも利用できます。ライブモードを医療したい場合は以下のコマンドを利用してください。

```bash
spear watch -s <project directory>
```

### 静的ルーティング

`spear-cli` は Spearly CMS コンテンツを静的ファイルとして生成します。仕様は以下の通りです。

- ファイル名は `/path/[alias].html` として保存します。
  - このファイルは生成されると、`/path/<content-alias>.html` として出力されます。(例：コンテンツエイリアスが `first-blog` の場合は `/path/first-blog.html` となります)

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

## ドキュメント

spear-cli で利用する構文の公式ドキュメントは Spearly CMS にあります。

## 貢献

このプロジェクトへ貢献する場合は、[CONTRIBUTING.md](../../CONTRIBUTING.md) をご覧ください！
参加をお待ちしています！
