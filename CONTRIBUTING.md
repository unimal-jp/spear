# Welcome spear-cli projects 🚀🚀

This is SSG(Static Site Generator) for Spearly.  
The goal of this project is bring SSR/(SSG) feature to user without specific framework.

## Building and Testing.

### Build

You can build spear-cli as follow single command.

```bash
$ yarn build
```

As result of an above command, generated outputs into `dist` directory

### Testing

You can execute generated spear-cli by using the following command:

```bash
$ node dist/index.js
```

## Publish on npm

```bash
# First version up
npm version {patch|minor|major}

# push to repo
git push origin main --tags

# Publish to NPM
npm publish --access public
```
