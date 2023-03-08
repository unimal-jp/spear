import fs from "fs"
import path from "path"
import { minify } from "html-minifier-terser"
import { parse } from "node-html-parser"
import liveServer from "live-server"
import watch from "node-watch"
import { Args } from "./interfaces/argsInterfaces"
import { Component, Element, State, SiteMapURL } from "./interfaces/magicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"
import { fileURLToPath } from "url"
import HTML_TAG_LIST from './htmlList.js'
import { SpearlyJSGenerator } from '@spearly/cms-js-core'
import sass from 'sass'
import chalk from 'chalk'
import { SitemapStream, streamToPromise } from "sitemap"
import { Readable } from "stream"
import { defaultSettingDeepCopy, loadFile, stateDeepCopy, generateAPIOptionMap, removeCMSAttributes } from "./util.js"

const libFilename = fileURLToPath(import.meta.url)
const libDirname = path.dirname(libFilename)

let dirname = process.cwd()
let Settings: DefaultSettings
let jsGenerator: SpearlyJSGenerator

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
    apiDomain: "api.spearly.com",
    generateSitemap: false,
    siteURL: "",
    rootDir: dirname,
    plugins: []
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

async function parseElements(state: State, nodes: Element[]) {
  const res = parse("") as Element

  //nodes.forEach((node) => {
  for (const node of nodes) {
    const tagName = node.rawTagName
    const isTextNode = node.nodeType === 3
    const component = state.componentsList.find((c) => c.tagName === tagName)

    if (component) {
      // Regenerate node since node-html-parser's HTMLElement doesn't have deep copy.
      // If we consumed this element once, this HTML node might release on memory.
      const minified = await minify(component.rawData, { collapseWhitespace: true })
      const node = parse(minified) as Element
      node.childNodes.forEach((child) => res.appendChild(child.clone()))
      continue
    }

    // Inject CMS loop
    if (!isTextNode && node.getAttribute("cms-loop") !== undefined) {
      const contentType = node.getAttribute("cms-content-type")
      removeCMSAttributes(node)
      const generatedStr = await jsGenerator.generateList(node.outerHTML, contentType, "", generateAPIOptionMap(node))
      const generatedNode = parse(generatedStr) as Element
      res.appendChild(generatedNode)
      continue
    }

    // Inject CMS single page(Specified cms-content)
    if (
      !isTextNode &&
      node.getAttribute("cms-item") !== undefined &&
      node.getAttribute("cms-content-type") !== undefined &&
      node.getAttribute("cms-content") !== undefined
    ) {
      const contentType = node.getAttribute("cms-content-type")
      const contentId   = node.getAttribute("cms-content")
      removeCMSAttributes(node)
      const generatedStr = await jsGenerator.generateContent(node.outerHTML, contentType, contentId)
      const generatedNode = parse(generatedStr) as Element
      res.appendChild(generatedNode)
      continue
    }

    if (!isTextNode && !component) {
      node.props = {}
      extractProps(state, node)
    }

    // Todo: Check better way to do this, components are being parsed twice
    if (node.childNodes.length > 0) {
      node.childNodes = await parseElements(state, node.childNodes as Element[])
    }

    // console.log("  append node", node.outerHTML)
    res.appendChild(node)
  }

  return res.childNodes
}

async function generateAliasPagesFromPagesList(state: State): Promise<Component[]> {
  const replacePagesList: Component[] = []
  for (const page of state.pagesList) {
    const targetElement = page.node.querySelector("[cms-item]")
    if (page.fname.includes("[alias]") && targetElement) {
      const contentId = targetElement.getAttribute("cms-content-type")
      removeCMSAttributes(targetElement as Element)
      const generatedContents = await jsGenerator.generateEachContentFromList(targetElement.innerHTML, contentId, generateAPIOptionMap(targetElement as Element))
      generatedContents.forEach(c => {
        targetElement.innerHTML = c.generatedHtml
        const html = page.node.innerHTML.replace(targetElement.innerHTML, c.generatedHtml)
        replacePagesList.push({
          fname: page.fname.split("[alias]").join(c.alias),
          node: parse(html) as Element,
          props: page.props,
          tagName: page.tagName,
          rawData: html
        })
      })
    } else {
      replacePagesList.push(page)
    }
  }
  return replacePagesList
}

function isParseTarget(ext: string) {
  return [".html", ".htm", ".spear"].includes(ext)
}

function needSASSBuild(ext: string) {
  return [".scss"].includes(ext)
}

async function parsePages(state: State, dirPath: string, relatePath = "") {
  if (relatePath === "components") return
  if (!fs.existsSync(dirPath)) return
  const files = fs.readdirSync(dirPath)

  console.log("")
  console.log("[Parse Pages]")

  for (const file of files) {
    const filePath = `${dirPath}/${file}`
    const ext = path.extname(file)
    const fname = path.basename(file, ext)
    const isDir = fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()

    if (isDir) {
      await parsePages(state, filePath, relatePath + (relatePath !== "" ? '/' : '') + file)
    } else if (needSASSBuild(ext)) {
      const result = sass.compile(filePath)
      state.out.assetsFiles.push({ filePath: `${relatePath}/${fname}.css`, rawData: Buffer.from(result.css) })
      continue
    } else if (!isParseTarget(ext)) {
      const rawData = fs.readFileSync(filePath)
      state.out.assetsFiles.push({ filePath: `${relatePath}/${file}`, rawData })
      continue
    } else {
      const rawData = fs.readFileSync(filePath, "utf8")
      const minified = await minify(rawData, { collapseWhitespace: true })
      const tagName = fname.toLowerCase() // todo: keep lowerCase?
      const node = parse(minified) as Element

      console.log(`  [Page]: ${fname}(/${relatePath})`)
      state.pagesList.push({ fname: `${relatePath}/${fname}`, tagName, rawData, node, props: {} })
    }
  }
}

async function parseComponents(state: State, dirPath: string) {
  if (!fs.existsSync(dirPath)) return
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
    } else if (!isParseTarget(ext)) {
      const rawData = fs.readFileSync(filePath)
      state.out.assetsFiles.push({ filePath: file, rawData })
      continue
    } else {
      const rawData = fs.readFileSync(filePath, "utf8")
      const minified = await minify(rawData, { collapseWhitespace: true })
      const tagName = fname.toLowerCase() // todo: keep lowerCase?
      const node = parse(minified) as Element

      if (HTML_TAG_LIST.includes(tagName)) {
        throw Error(`Component[${tagName}] is built-in HTML tag. You need specify other name.`)
      }
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
  fs.mkdirSync(Settings.distDir, { recursive: true })
}

async function dumpPages(state: State) {
  const linkList:Array<SiteMapURL> = []
  for (const page of state.pagesList) {
    // Read index.html template
    let indexNode;
    if (!page.node.innerHTML.includes("</html>")) {
      const indexRawData = fs.readFileSync(`${libDirname}/templates/index.html`, "utf8")
      const minified = await minify(indexRawData, { collapseWhitespace: true })
      indexNode = parse(minified) as Element
      const body = indexNode.querySelector("body")
      body.appendChild(page.node)
    } else {
      indexNode = page.node;
    }
    console.log("")
    console.log(`[Page]: ${page.fname}`)

    // Inject title
    if (indexNode) {
      const head = indexNode.querySelector("head")
      if (head) {
        head.innerHTML = head.innerHTML.replace("{{projectName}}", Settings.projectName)
      }
    }

    writeFile(`${Settings.distDir}/${page.fname}.html`, indexNode.outerHTML)
    linkList.push({
      url: `${page.fname}.html`,
      changefreq: "daily",
      priority: 0.7,
    })
  }

  // Generate Sitemap
  if (Settings.generateSitemap) {
    try {
      const data = await streamToPromise(Readable.from(linkList).pipe(new SitemapStream({ hostname: Settings.siteURL })))
      console.log(`[Sitemap]: /sitemap.xml`)
      writeFile(`${Settings.distDir}/sitemap.xml`, data.toString())
    } catch (e) {
      console.log(e)
    }
  }

  for (const asset of state.out.assetsFiles) {
    writeFile(`${Settings.distDir}/${asset.filePath}`, asset.rawData)
  }
}

async function writeFile(targetPath, data) {
  const targetPathDir = path.dirname(targetPath)
  if (!fs.existsSync(targetPathDir)) {
    fs.mkdirSync(targetPathDir, { recursive: true })
  }
  fs.writeFileSync(targetPath, data)
}

async function bundle(): Promise<boolean> {
  let state: State = {
    pagesList: [],
    componentsList: [],
    body: parse("") as Element,
    globalProps: {},
    out: {
      assetsFiles: [],
    },
  }
  
  jsGenerator = new SpearlyJSGenerator(Settings.spearlyAuthKey, Settings.apiDomain)

  // Hook API: beforeBuild
  for (const plugin of Settings.plugins) {
    if (plugin.beforeBuild) {
      try {
        const newState = await plugin.beforeBuild(state)
        if (newState) {
          state = stateDeepCopy(newState)
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `)
      }
    }
  }

  // Create dist folder
  createDir()

  // First parse components from the /components folder
  try {
    await parseComponents(state, Settings.componentsFolder)
  } catch(e) {
    console.log(e);
    return false;
  }

  try {
    await parsePages(state, Settings.srcDir)
  } catch(e) {
    console.log(e);
    return false;
  }

  // Run list again to parse children of the components
  const componentsList = state.componentsList
  state.componentsList = []
  for (const component of componentsList) {
    const parsedNode = await parseElements(state, component.node.childNodes as Element[]) as Element[]
    state.componentsList.push({
      "fname": component.fname,
      "rawData": parsedNode[0].outerHTML,
      "tagName": component.tagName,
      "node": parsedNode[0],
      "props": {}
    })
  }
  // Run list again to parse children of the pages
  for (const page of state.pagesList) {
    page.node.childNodes = await parseElements(state, page.node.childNodes as Element[])
  }

  // generate static routing files.
  state.pagesList = await generateAliasPagesFromPagesList(state)

  // Hook API: afterBuild
  for (const plugin of Settings.plugins) {
    if (plugin.afterBuild) {
      try {
        const newState = await plugin.afterBuild(state)
        if (newState) {
          state = stateDeepCopy(newState)
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `)
      }
    }
  }

  // Dump pages
  dumpPages(state)

  // Hook API: bundle
  for (const plugin of Settings.plugins) {
    if (plugin.bundle) {
      try {
        const newState = await plugin.bundle(state)
        if (newState) {
          state = stateDeepCopy(newState)
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `)
      }
    }
  }

  return true
}

async function loadSettingsFromFile() {
  const data = await loadFile(`${dirname}/${Settings.settingsFile}.?(mjs|js|json)`)
  if (data) {
    Object.keys(data).forEach((k) => {
      Settings[k] = data[k]
    })
  }
}

export default async function magic(args: Args): Promise<boolean> {
  console.log(args.action)
  initializeArgument(args)

  if (args.action === "watch") {
    Settings.distDir = path.resolve(dirname, "node_modules", "spear-cli", "tmpBuild")
  }

  // Load default settings from spear.config.{js,json}|package.json
  await loadSettingsFromFile()

  // Hook API after settings
  for (const plugin of Settings.plugins) {
    if (plugin.configuration) {
      try {
        const newSettings = await plugin.configuration(Settings)
        if (newSettings) {
          Settings = defaultSettingDeepCopy(newSettings)
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `)
      }
    }
  }

  if (args.action === "watch") {
    if (args.port) {
      Settings.port = args.port
    }
    // Bundle before starting the server
    await bundle()

    watch(Settings.srcDir, { recursive: true }, function (evt, name) {
      console.log("changed: %s", name)
      bundle()
    })

    const params = {
      port: Settings.port,
      host: Settings.host,
      root: Settings.distDir,
      open: false,
      file: "index.html",
      wait: 1000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logLevel: 0 as any,
    }

    liveServer.start(params)
    console.log(chalk.green(`
    Server started on port ${Settings.port} 🚀
    You can access the following URL:
    
      http://localhost:${Settings.port}
    `))
    return true
  } else if (args.action === "build") {
    return await bundle()
  }
}
