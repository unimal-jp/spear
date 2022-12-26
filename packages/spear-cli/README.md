[README in Japanese](./README-ja.md)

# spear-cli

[![npm version](https://badge.fury.io/js/spear-cli.svg)](https://badge.fury.io/js/spear-cli)

This is SSG(Static Site Generator) for Spearly.  

## Usage

### Install

1. npm

```bash
npm install spear-cli -g
```

1. yarn

```bash
yarn global add spear-cli
```

### Create project

As first step, you need to create:

1. `spear create` : This command start wizard creating project.

```bash
Namespace(port=undefined, action='create', projectName=undefined, src=undefined)
 ### Welcome to Spear CLI ###


? Name of your project (spear-cli) <Input your project name>
? Use Spearly CMS (Use arrow keys)
❯ Yes      <- Choose 'yes' if you use the Spear content.
  No
? Enter your Spearly CMS API KEY  <Input your Spearly API KEY>



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

## Resource

spear-cli has official document by using Spearly CMS.


## Contributing

If you want to contribute this project, You can read [CONTRIBUTING.md](./CONTRIBUTING.md) !  
We will wait for your participant!
