[README in Japanese](./README_ja.md)

# spear-cli

[![npm version](https://badge.fury.io/js/@spearly%2Fspear-cli.svg)](https://badge.fury.io/js/@spearly%2Fspear-cli)

This is SSG(Static Site Generator) for Spearly.  

## Usage

### Create project

As first step, you need to create:

1. `npm create spear@latest` : This command start wizard creating project.

```bash
Namespace(port=undefined, action='create', projectName=undefined, src=undefined)
 ### Welcome to Spear CLI ###


? Name of your project (spear-cli) <Input your project name>
? Use Spearly CMS (Use arrow keys)
❯ Yes      <- Choose 'yes' if you use the Spear content.
  No
? Enter your Spearly CMS API KEY  <Input your Spearly API KEY>
? Choose template type (Use arrow keys)
❯ basic 
  empty 
? Generate Sitemap? 
❯ Yes 
  No 
  ? Enter your hosting URL (Example: https://foobar.netlify.app/) () 


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

If you finish wizard, your preparation for using spear-cli.

### Editing pages

You can edit pages to you prefer.  spear-cli support some features:

- Components
  - You can create parts of pages as `components`.
- assets
  - Images / Scripsts / CSS...
- Insert Spearly content list into pages.
  - You can insert list of content.
- Insert Spearly content into pages.
  - You can generate specified Spearly content as page.
- Static Routing
  - You can use static routing feature that moving to content pages.

You can use live-mode as well. If you want to use it, you need to execute the following command:

```bash
spear watch -s <project directory>
```

### Static Routing

`spear-cli` generate static site with Spearly CMS Content. The spec is as follow:

- File name: `/path/[alias].html`
- Generated File name: `/path/<content-alias>.html` (e.g., content alias is `first-blog`, file name is `/path/first-blog.html`)
- Spearly Syntax: Same to spearly embed js v3. (For detail, see official document.)
- You can create list pages by using spearly syntax as well.

### SASS

`spear-clil` supports SASS syntax. All of `scss` files under the `src` is compiled, and spear will copy compiled css file to relative path under `dist`.

### Sitemap generation

`spear-cli` will generate sitemap automatically if you set the sitemap configuration into config file.  
This feature requires the flag of the site generating and host URL. You can specify these values in `spear.config.js` file.

```javascript
  "generateSitemap": boolean,
  "siteURL": string,
```

### SEO Tag

Spear will inject the SEO related tag into generated file if you configure the SEO Tag setting.  
If you want to use SEO feature, you need to plugin into `spear.config.mjs` file.

```javascript
import { spearSEO } from "@spearly/spear-cli/dist/plugins/spear-seo.js"
export default {
  ...
  plugins: [
    spearSEO(),
  ]
}
```

After you set above setting, Spear will inject SEO related tag automatically.

```html
<spear-seo
  title="Page title"
  meta-description="Page description"
  meta-og:url="/pics/ogp.png">
</spear-seo>
```

Available attribute for SEO is the following:

| Attribute | Description | Generated Value|
|-----------|-------------|----------------|
| title | Site title |  <title>value</title> |
| meta-*** | Meta information | <meta name="****" value="value"> |
| link-*** | Link description | <link rel="***" href="value"> |

You can pass global setting via `spearSEO` parameter.

```javascript
import { spearSEO } from "@spearly/spear-cli/dist/plugins/spear-seo.js"
export default {
  ...
  plugins: [
    spearSEO({
      "title": "My Blog"
    }),
  ]
}
```

### i18n (Internationalization)

You can localize your site with i18n plugin if you have international site.  
If you want to use it, you need to configure plugin setting into `spear.config.mjs`.

```javascript
import { spearI18n } from "@spearly/spear-cli/dist/plugins/spear-i18n.js"
export default {
  ...
  plugins: [
    spearI18n('./i18n.yaml')
  ]
}
```

The language file is requirement for using i18n. Language file is consist of key and value.

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

Spear provide the two way for using localization feature:

1. i18n Attributes

Spear will replace the all child node to localized string if there are HTML Tags which has i18n.

Example：
```html
<p i18n="title"></p>
<!-- Replaced the bellow in Japanese -->
<p>ブログだよ</p>
```

2. Embed syntax (`{%= translate() %}`)

Spear will replace the embed syntax as well.

```html
<title>{%= translate('title') %}</title>
<!-- Replaced the bellow in Japanese -->
<title>ブログだよ</title>
```

You can specify `t()` instead of `translate()`.

Spear provide the two way for using localization link feature as well:

1. spear-link Tag

Spear will replace the specified URL of `spear-link` tag to each language.

```html
<spear-link href="/about.html">About us</spear-link>
<!-- Replaced the bellow in Japanese -->
<a href="/ja/about.html">About us</a>
```

2. Embed Syntax (`{%= localize() %}`)

Spear will replace the URL of embed syntax to each language.

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

Note that:
 - Generated URL path will change by original specified path.(Absolute path and relative path.)

### Directory structures

`spear-cli` has directory rules:

- components : top-level directory named `components'
  - There are spear components which inserting into pages or other component.
  - spear-cli allow nested directory structure. (E.g., /components/common, /components/cards)
  - spear-cli ignore the name which is same to HTML DOM tag name since preventing mixed native and component content. (e.g., body, header, section).
- assets/public: top-level assets files directory named `assets` or `public`.
  - spear-cli output this directory without converting.
- other directories: top-level directories any named.
  - spear-cli output this directory with html converting.
  - spear-cli keep directory structure.
  - If there are html/spear/htm file, spear-cli traverse and insert spear component.
  - If there are binary file, spear-cli output files as it is.

Example directories:

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

After spear-cli build, an above example directory will be the following structure.

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

Note that:

- `components/header.spear` and `components/main.spear` was inserted pages.
- `pages/index.spear` renamed `pages/index.html`.

### Building pages

At the last process, you can build all of them.

```bash
$ spear build -s <project directory>
```

Congrats! You can build your pages with Spearly 🚀🚀🚀

## Configuration File

Spear build according to `spear.config.js`. This file has the following settings:

```js
module.exports = {
  "spearlyAuthKey": string,     // Specify the spearly api token for fetching.
  "projectName": string,        // This project name.
  "generateSitemap": boolean,   // Whether generating the sitemap or not.
  "siteURL": string,            // Base URL of generation sitemap. (optional)
  "apiDomain": string,          // Fetching API Domain. (optional)
};
```

## Editor settings

Spear is a editor free tool.
However, you can use the following settings to have a better experience when coding in your favorite editor.

### Visual Studio Code

A default settings is created at `.vscode/settings.json` for better highlighting of the code, specially `.spear` files.

### JetBrains(IntelliJ, WebStorm, PhpStorm, etc)

While IntelliJ Plugin is under construction, there is a workaround for the editor to highlight `.spear` files at  [Configure associations between filename patterns and file types](https://www.jetbrains.com/help/idea/creating-and-registering-file-types.html#configure-associations-between-filename-patterns-and-file-types)

## Contributing

If you want to contribute this project, You can read [CONTRIBUTING.md](./CONTRIBUTING.md) !  
We will wait for your participant!
