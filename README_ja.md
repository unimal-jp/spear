[English](./README.md)

# spear

Spear プロジェクトの OSS レポジトリです🚀

## Spear とは？

Spear は静的サイトジェネレータで、ヘッドレスCMSである [Spearly](https://cms.spearly.com/) との相性が良いツールです。
また Spearly を利用しなくても静的サイトを構築することも出来ます。


Spear には以下のパッケージがあります。

| Packages | Status | Details | README Link |
|---|---|---|---|
| [`spear-cli`](./packages/spear-cli/) | [![npm version](https://badge.fury.io/js/spear-cli.svg)](https://badge.fury.io/js/spear-cli) | SSG 本体 | [README](./packages/spear-cli/README_ja.md) |
| [`create-spear`](./packages/create-spear/) | [![npm version](https://badge.fury.io/js/create-spear.svg)](https://badge.fury.io/js/create-spear) | Spear プロジェクト作成ツール | [README](./packages/create-spear/README_ja.md) |
| [`cms-js-core`](./packages/spearly-cms-js-core/) | 公開中 | Spearly のコンテンツ埋め込みコンバーターライブラリ | [README](./packages/spearly-cms-js-core/README_ja.md) |
| `spearly-flutter` | 計画中 | Flutter へ CMS コンテンツを埋め込めるライブラリ | - |
| `spearly-svelte` | 計画中 | Svelte Kit へ CMS コンテンツを埋め込めるライブラリ | - |
| `spearly-astro` | 計画中 | Astro へ Spearly 埋め込みを簡単にするプラグイン | - |

---

## SSG 利用方法

1. `spear-cli` のインストール

`spear-cli` パッケージは NPM で配布されているので以下のコマンドでインストールが可能です。

```bash
# If you use the npm.
$ npm install "@spearly/spear-cli" -g

# If you use the yarn.
$ yarn global add "@spearly/spear-cli"

# If you use the pnpm.
$ pnpm install "@spearly/spear-cli" -g
```

2. プロジェクトの作成

`spear create` コマンドで質問に答えてプロジェクトを作成します。

```bash
$ spear create
Namespace(port=undefined, action='create', projectName=undefined, src=undefined)
 ### Welcome to Spear CLI ###


? Name of your project test-project
? Use Spearly CMS Yes
? Choose template type basic
? Enter your Spearly CMS API KEY abc

  ## Your project was created 🎉

  To start using, run the following command:
      cd test-project
      yarn install

  To start local server, run
      yarn dev

  To build static sources, run
      yarn build
```

3. 関連パッケージのインストールとプロジェクトのビルド

`build` タスクを実行すればビルドできます。(`dev` タスクを実行すると開発サーバーが起動しデバッグモードになります。)

```bash
$ cd test-project
# If you use the npm.
$ npm run build
# If you use the yarn.
$ yarn build
# If you use the pnpm.
$ pnpm run build
```

---

## リソース

- [Spearly CMS の公式ドキュメント](https://docs.spearly.com)

## コントリビューター

参加ありがとうございます！

<a href="https://github.com/unimal-jp/spear/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=unimal-jp/spear" />
</a>

## コントリビューション

Spear プロジェクトはオープンソースです。いつでもコントリビュートをお待ちしております🚀
もしコントリビュートしたい場合は、[コントリビューションガイド](./CONTRIBUTING_ja.md)を読んでください。

次のような貢献大歓迎です。

- ライブラリを利用したフィードバック
- バグや機能要望を [Issue](https://github.com/unimal-jp/spear/issues) へ登録
- Issue にある計画中の機能を実装する
