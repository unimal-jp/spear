[日本語](./README_ja.md)

# Spear

This is Open Source Repository for Spear🚀

## What is Spear?

The Spear is Static Site Generator(SSG) that can integrate with Headless CMS called Spearly.
You can build the static site without Spearly as well.

The Spear project has the following packages:

| Packages | Status | Details | README Link |
|---|---|---|---|
| [`spear-cli`](./packages/spear-cli/) | [![npm version](https://badge.fury.io/js/spear-cli.svg)](https://badge.fury.io/js/spear-cli) | SSG CLI | [README](./packages/spear-cli/README_ja.md) |
| [`cms-js-core`](./packages/spearly-cms-js-core/) | Public | Spearly contents converter library. | [README](./packages/spearly-cms-js-core/README_ja.md) |
| `spearly-flutter` | In Planning | The library which Embedding CMS Content into Flutter | - |
| `spearly-svelte` | In Planning | The library which embedding CMS Content into Svelte Kit | - |
| `spearly-astro` | In Planning | The plugin which embedding Spearly Content into Astro more easily | - |

---

## SSG Usage

1. Install the `spear-cli` package.

We provide the `spear-cli` package via NPM. So you can install this packages by using the following command:

```bash
# If you use the npm.
$ npm install "@spearly/spear-cli" -g

# If you use the yarn.
$ yarn global add "@spearly/spear-cli"

# If you use the pnpm.
$ pnpm install "@spearly/spear-cli" -g
```

2. Create project

You can create the project by using `spear `create` command to answer some questions.

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

3. Install related packages and build the project

You can build the project for `build` task. (You can switch debug mode by using `dev` task as well)

```bash
$ cd test-project
# If you use the npm.
$ npm install
$ npm run build
# If you use the yarn.
$ yarn install
$ yarn build
# If you use the pnpm.
$ pnpm install
$ pnpm run build
```

---

## Resource

- [Spearly CMS Official Documentation](https://docs.spearly.com)


## Contributing

The Spear project is open source, so we waiting for your contribution🚀
If you want to contribute to this project, You can read [CONTRIBUTING.md](./CONTRIBUTING.md) !  

We look forward to your participation in the following:

- Use our library and feedback!
- File the issue to https://github.com/unimal-jp/spear/issues/
- Implement the planning feature in the issue.
