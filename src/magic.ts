import fs from "fs"
import path from "path"
import { minify } from "html-minifier-terser"
import { parse, type HTMLElement } from "node-html-parser"
import liveServer from "live-server"
import watch from "node-watch"
import { Args } from "./interfaces/argsInterfaces"
import { Element, State } from "./interfaces/magicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"

const dirname = process.cwd()

const Settings: DefaultSettings = {
  projectName: "Spear CLI",
  settingsFile: "spear.config",
  componentsFolder: `${dirname}/src/components`,
  srcDir: `${dirname}/src`,
  distDir: `${dirname}/dist`,
  entry: `${dirname}/src/index.spear`,
  template: `${dirname}/public/index.html`,
  spearlyAuthKey: "",
  port: 8080,
  host: "0.0.0.0",
}

function extractProps(state: State, node: Element) {
  const { key, value, scoped } = node.attributes

  if (scoped !== undefined) {
    state.globalProps[key] = value
  } else {
    node.props[key] = value
  }
}

function parseElements(state: State, nodes: Element[]) {
  const res = parse("") as Element

  nodes.forEach((node) => {
    const tagName = node.rawTagName
    const isTextNode = node.nodeType === 3
    const isNative = !isTextNode && node.hasAttribute("native")
    const component = !isNative && state.componentList.find((c) => c.tagName === tagName)

    // console.log("  --")
    // console.log("  tagName:", node.nodeType, tagName, node.innerText)
    // console.log("  isNative:", isNative ? 1 : 0, "hasComponent:", !!component ? 1 : 0)

    if (!isTextNode && !component) {
      node.props = {}
      extractProps(state, node)
    }

    if (isNative) {
      node.removeAttribute("native")
    }

    // Todo: Check better way to do this, components are being parsed twice
    if (node.childNodes.length) {
      node.childNodes = parseElements(state, node.childNodes as Element[])
    }

    if (component) {
      console.log("  append component", component.node.outerHTML)
      component.node.childNodes.forEach((child) => res.appendChild(child))
    } else {
      console.log("  append node", node.outerHTML)
      res.appendChild(node)
    }
  })

  return res.childNodes
}

async function parseComponents(state: State, dirPath: string) {
  const files = fs.readdirSync(dirPath)

  console.log("[Parse components]: Start")

  for (const file of files) {
    const filePath = `${dirPath}/${file}`
    const ext = path.extname(file)
    const fname = path.basename(file, ext)
    const isDir = fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()

    if (isDir) {
      await parseComponents(state, filePath)
    } else {
      const rawData = fs.readFileSync(filePath, "utf8")
      const minified = await minify(rawData, { collapseWhitespace: true })
      const tagName = fname.toLowerCase() // todo: keep lowerCase?
      const node = parse(minified) as Element

      console.log("  ", tagName, node.innerHTML)

      state.componentList.push({ tagName, rawData, node, props: {} })
    }
  }

  // Run list again to parse children of the components
  state.componentList.forEach((component) => {
    component.node.childNodes = parseElements(state, component.node.childNodes as Element[])
  })
}

function createDir() {
  // Clean old builds
  try {
    fs.rmSync(Settings.distDir, { recursive: true })
  } catch (error) {
    // ignore error
  }
  fs.mkdirSync(Settings.distDir)
}

async function bundle() {
  const state: State = {
    componentList: [],
    rootRaw: "",
    rootNode: null,
    body: parse("") as Element,
    templateRaw: "",
    globalProps: {},
    out: { css: [] },
  }

  createDir()

  // load files
  state.rootRaw = fs.readFileSync(Settings.entry, "utf8")
  state.rootNode = parse(state.rootRaw) as Element

  state.templateRaw = fs.readFileSync(Settings.template, "utf8")

  await parseComponents(state, Settings.componentsFolder)

  // parse title
  const head = state.rootNode.querySelector("head")
  const title = head.querySelector("title")
  if (title && title.innerText === "{{projectName}}") {
    title.innerHTML = Settings.projectName
  }

  // parse body
  const el = state.rootNode.querySelector("body")
  if (el) {
    el.childNodes = parseElements(state, el.childNodes as Element[])
  }

  console.log("out:", state.rootNode.outerHTML)

  // const minified = await minify(state.templateRaw, { collapseWhitespace: true })
  // const html = parse(minified)

  // console.log(state.body.outerHTML)

  // const rootMin = await minify(state.rootRaw, { collapseWhitespace: true })
  // state.rootNode = extractChildNodes(state, parse(rootMin))

  // // Append style if needed
  // if (state.out.css.length) {
  //   dumpStyle(state, html)
  // }

  // // Append nodes into final body
  // html.querySelector("body").innerHTML = state.rootNode.innerHTML

  // // inject CMS lib if necessary
  // if (Settings.spearlyAuthKey) {
  //   injectCMS(html)
  // }

  // let finalHtml = html.toString()

  // // replace template variables
  // const matches = finalHtml.match(/{{(.*?)}}/g)
  // if (matches) {
  //   matches.forEach((m) => {
  //     const key = m.match(/[^{\}]+(?=})/)[0]
  //     const value = Settings[key]
  //     finalHtml = finalHtml.replace(m, value)
  //   })
  // }

  // fs.writeFileSync(`${Settings.distDir}/index.html`, finalHtml)
  // console.log("Final", finalHtml)
}

async function loadSettings() {
  try {
    const settingsFilePrefix = `${dirname}/${Settings.settingsFile}`

    if (fs.existsSync(`${settingsFilePrefix}.js`)) {
      const data = await import(`${settingsFilePrefix}.js`)
      Object.keys(data.default).forEach((k) => {
        Settings[k] = data.default[k]
      })
    } else if (fs.existsSync(`${settingsFilePrefix}.json`)) {
      const data = await import(`${settingsFilePrefix}.json`, { assert: { type: "json" } })
      Object.keys(data.default).forEach((k) => {
        Settings[k] = data.default[k]
      })
    } else {
      const data = await import(`${dirname}/package.json`, { assert: { type: "json" } })
      Settings.projectName = data.default.name
    }
  } catch (error) {
    console.log(error)
  }
}

export default async function magic(args: Args) {
  console.log(args.action)

  if (args.action === "watch") {
    Settings.distDir = path.resolve(dirname, "node_modules", "spear-cli", "tmpBuild")

    // Load default settings from spear.config.{js,json}|package.json
    await loadSettings()

    if (args.port) {
      Settings.port = args.port
    }

    // Bundle before starting the server
    bundle()

    watch(Settings.srcDir, { recursive: true }, function (evt, name) {
      console.log("changed: %s", name)
      bundle()
    })

    var params = {
      port: Settings.port,
      host: Settings.host,
      root: Settings.distDir,
      open: false,
      file: "index.html",
      wait: 1000,
      logLevel: 0 as any,
    }

    liveServer.start(params)
    console.log("Server started on port %s", Settings.port)
  } else if (args.action === "build") {
    bundle()
  }
}
