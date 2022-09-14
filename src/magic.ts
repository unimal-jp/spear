import fs from "fs"
import path from "path"
import { minify } from "html-minifier-terser"
import glob from "glob"
import { parse } from "node-html-parser"
import liveServer from "live-server"
import watch from "node-watch"
import { Args } from "./interfaces/argsInterfaces"
import { Element, State } from "./interfaces/magicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"

let dirname = process.cwd()
let Settings: DefaultSettings

function initializeArgument(args: Args) {
  if (args.src) {
    dirname = path.resolve(args.src)
  }
  Settings = {
    projectName: "Spear CLI",
    settingsFile: "spear.config",
    pagesFolder: `${dirname}/src/pages`,
    componentsFolder: `${dirname}/src/components`,
    srcDir: `${dirname}/src`,
    distDir: `${dirname}/dist`,
    entry: `${dirname}/src/pages/index.?(spear|html)`,
    template: `${dirname}/public/index.html`,
    spearlyAuthKey: "",
    port: 8080,
    host: "0.0.0.0",
  }
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
    const component = !isNative && state.componentsList.find((c) => c.tagName === tagName)

    // console.log("  --")
    // console.log("  tagName:", node.nodeType, tagName, node.innerText)
    // console.log("  isNative:", isNative ? 1 : 0, "hasComponent:", !!component ? 1 : 0)

    if (tagName === "style") {
      state.out.css.push(node.innerHTML)
      return
    }

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
      // console.log("  append component", component.node.outerHTML)
      component.node.childNodes.forEach((child) => res.appendChild(child))
    } else {
      // console.log("  append node", node.outerHTML)
      res.appendChild(node)
    }
  })

  return res.childNodes
}

async function parsePages(state: State, dirPath: string) {
  const files = fs.readdirSync(dirPath)

  console.log("")
  console.log("[Parse Pages]")

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

      const head = node.querySelector("head")
      const title = head?.querySelector("title")
      if (title && title.innerText === "{{projectName}}") {
        title.innerHTML = Settings.projectName
      }

      console.log(`  [Page]: ${fname}`)
      state.pagesList.push({ fname, tagName, rawData, node, props: {} })
    }
  }
}

async function parseComponents(state: State, dirPath: string) {
  const files = fs.readdirSync(dirPath)

  console.log("")
  console.log("[Parse components]")

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

      console.log(`  [Component]: ${fname}`)
      state.componentsList.push({ fname, tagName, rawData, node, props: {} })
    }
  }
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

function dumpStyle(state: State) {
  const data = state.out.css.join("\n")
  fs.writeFileSync(`${Settings.distDir}/css.css`, data)

  state.pagesList.forEach((page) => {
    const link = parse('<link rel="stylesheet" href="./css.css">')
    const head = page.node?.querySelector("head")

    if (head) {
      head.appendChild(link)
    }
  })

  console.log("")
  console.log("[Style]")
  console.log(data)
}

function dumpPages(state: State) {
  state.pagesList.forEach((page) => {
    console.log("")
    console.log(`[Page]: ${page.fname}`)
    console.log(page.node.outerHTML)
    fs.writeFileSync(`${Settings.distDir}/${page.fname}.html`, page.node.outerHTML)
  })
}

async function bundle() {
  const state: State = {
    pagesList: [],
    componentsList: [],
    body: parse("") as Element,
    globalProps: {},
    out: { css: [] },
  }

  // Create dist folder
  createDir()

  // First parse components from the /components folder
  await parseComponents(state, Settings.componentsFolder)
  await parsePages(state, Settings.pagesFolder)

  // Run list again to parse children of the components
  state.componentsList.forEach((component) => {
    component.node.childNodes = parseElements(state, component.node.childNodes as Element[])
  })

  // Run list again to parse children of the pages
  state.pagesList.forEach((page) => {
    page.node.childNodes = parseElements(state, page.node.childNodes as Element[])
  })

  // Append style if needed
  if (state.out.css.length) {
    dumpStyle(state)
  }

  // Dump pages
  dumpPages(state)
}

function loadFile(filePath: string) {
  return new Promise((resolve, reject) => {
    glob(filePath, null, async (er, files) => {
      if (er) {
        reject(er)
        return
      }

      if (files.length) {
        const ext = path.extname(files[0])

        if (ext === ".js") {
          const data = await import(
            files[0],
            files[0].indexOf("json") > -1 ? { assert: { type: "json" } } : undefined
          )
          resolve(data.default)
        } else if (ext === ".json") {
          const data = fs.readFileSync(files[0], "utf8")
          resolve(JSON.parse(data))
        } else {
          resolve(fs.readFileSync(files[0], "utf8"))
        }
      } else {
        resolve(null)
      }
    })
  })
}

async function loadSettingsFromFile() {
  const data = await loadFile(`${dirname}/${Settings.settingsFile}.?(js|json)`)
  if (data) {
    Object.keys(data).forEach((k) => {
      Settings[k] = data[k]
    })
  }
}

export default async function magic(args: Args) {
  console.log(args.action)
  initializeArgument(args)

  if (args.action === "watch") {
    Settings.distDir = path.resolve(dirname, "node_modules", "spear-cli", "tmpBuild")

    // Load default settings from spear.config.{js,json}|package.json
    await loadSettingsFromFile()

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
