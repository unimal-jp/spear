# spear-cli

This is SSG(Static Site Generator) for Spearly.  

## Usage

### Install

1. npm

```bash
$ npm install spear-cli -g
```

2. yarn

```bash
$ yarn global add spear-cli
```

### Create project

As first step, you need to create:

1. `spear create` : This command start wizard creating project.

```
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
$ spear watch -s <project directory>
```

### Building pages

At the last process, you can build all of them.

```bash
$ spear build -s <project directory>


Congrats! You can build your pages with Spearly 🚀🚀🚀

## Contributing

If you want to contribute this project, You can read [CONTRIBUTING.md](./CONTRIBUTING.md) !