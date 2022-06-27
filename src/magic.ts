import fs from "fs"
import path from "path"
import liveServer from "live-server"
import { parse, type HTMLElement } from "node-html-parser"
import { minify } from "html-minifier-terser"
import watch from "node-watch"

const dirname = process.cwd()

const Settings: any = {
  projectName: "Spear CLI",
  componentsFolder: `${dirname}/src/components`,
  srcDir: `${dirname}/src`,
  distDir: `${dirname}/dist`,
  entry: `${dirname}/src/index.spear`,
  template: `${dirname}/public/index.html`,
  spearlyAuthKey: "",
}

const TEXT_NODE = 3

const state = {
  components: {},
  componentList: [],
  rootRaw: "",
  rootNodes: null,
  templateRaw: "",
  finalNodes: null,
  globalProps: {},
  out: { css: [] },
}

async function parseComponents() {
  const files = fs.readdirSync(Settings.componentsFolder)

  state.componentList = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = path.extname(file)
    const fname = path.basename(file, ext)
    const rawData = fs.readFileSync(`${Settings.componentsFolder}/${file}`, "utf8")
    const minified = await minify(rawData, { collapseWhitespace: true })
    const tagName = fname.toUpperCase()
    const parsed = parse(minified)

    state.componentList.push({ tagName, rawData, parsed, nodes: null })
  }
}

function extractProps(node: HTMLElement, localProps: any) {
  const { key, value, scoped } = node.attributes

  if (scoped !== undefined) {
    state.globalProps[key] = value
  } else {
    localProps[key] = value
  }
}

function extractChildNodes(node: HTMLElement, parentTagName?: string) {
  console.log("->", node.tagName, node.rawTagName, node.childNodes.length)

  const localProps = {}

  const children = []

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement
    console.log("[tagName]...", child.tagName)

    if (child.tagName === "PROP") {
      extractProps(child, localProps)
      continue
    }

    if (child.tagName === "STYLE") {
      state.out.css.push(child.innerHTML)
      continue
    }

    const c = state.componentList.find((c) => c.tagName === child.tagName)
    if (c) {
      console.log(
        "[]... has component",
        child.tagName,
        node.tagName,
        parentTagName,
        !!state.components[child.tagName]
      )

      if (child.tagName !== parentTagName) {
        if (!c.nodes) {
          c.nodes = extractChildNodes(c.parsed, c.tagName)
        }

        children.push(c.nodes)
        continue
      }
    }

    children.push(extractChildNodes(child))
  }

  node.childNodes = children

  return node
}

function dumpStyle(html: HTMLElement) {
  fs.writeFileSync(`${Settings.distDir}/css.css`, state.out.css.join("\n"))
  const link = parse('<link rel="stylesheet" href="./css.css">')
  const head = html.querySelector("head")
  if (head) {
    head.appendChild(link)
  }
}

function injectCMS(html: HTMLElement) {
  const lib = parse(
    '<script src="https://static.spearly.com/js/v2/spearly-cms.browser.js" defer></script>'
  )
  const onLoad = parse(
    `<script>window.addEventListener('DOMContentLoaded', () => { const t = document.querySelectorAll(':not(:defined)'); for (const e of t) { e.style.visibility = "hidden"; }; window.spearly.config.AUTH_KEY = "${Settings.spearlyAuthKey}" }, { once: true })</script>`
  )
  const head = html.querySelector("head")
  if (head) {
    head.appendChild(lib)
    head.appendChild(onLoad)
  }
}

async function bundle() {
  // Clean old builds
  try {
    fs.rmSync(Settings.distDir, { recursive: true })
  } catch (error) {
    // ignore error
  }
  fs.mkdirSync(Settings.distDir)

  // load files
  state.rootRaw = fs.readFileSync(Settings.entry, "utf8")
  state.templateRaw = fs.readFileSync(Settings.template, "utf8")

  const minified = await minify(state.templateRaw, { collapseWhitespace: true })
  const html = parse(minified)

  await parseComponents()

  const rootMin = await minify(state.rootRaw, { collapseWhitespace: true })
  state.rootNodes = extractChildNodes(parse(rootMin))

  // Append style if needed
  if (state.out.css.length) {
    dumpStyle(html)
  }

  // Append nodes into final body
  html.querySelector("body").innerHTML = state.rootNodes.innerHTML

  // inject CMS lib if necessary
  if (Settings.spearlyAuthKey) {
    injectCMS(html)
  }

  let finalHtml = html.toString()

  // replace template variables
  const matches = finalHtml.match(/{{(.*?)}}/g)
  if (matches) {
    matches.forEach((m) => {
      const key = m.match(/[^{\}]+(?=})/)[0]
      const value = Settings[key]
      finalHtml = finalHtml.replace(m, value)
    })
  }

  fs.writeFileSync(`${Settings.distDir}/index.html`, finalHtml)
  console.log("Final", finalHtml)
}

export default function magic(action: string) {
  if (action === "watch") {
    Settings.distDir = path.resolve(dirname, "node_modules", "spear-cli", "tmpBuild")

    // Bundle before starting the server
    bundle()

    watch(Settings.srcDir, { recursive: true }, function (evt, name) {
      console.log("%s changed.", name)
      bundle()
    })

    var params = {
      port: 8080,
      host: "0.0.0.0",
      root: Settings.distDir,
      open: true,
      file: "index.html",
      wait: 1000,
      logLevel: 0 as any,
    }

    liveServer.start(params)
  } else if (action === "build") {
    bundle()
  }
}
