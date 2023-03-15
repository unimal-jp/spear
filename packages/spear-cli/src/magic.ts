import fs from "fs"
import path from "path"
import { minify } from "html-minifier-terser"
import { parse } from "node-html-parser"
import liveServer from "live-server"
import watch from "node-watch"
import { Args } from "./interfaces/ArgsInterfaces"
import { Component, Element, State } from "./interfaces/MagicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"
import { fileURLToPath } from "url"
import { SpearlyJSGenerator } from '@spearly/cms-js-core'
import chalk from 'chalk'
import { defaultSettingDeepCopy, stateDeepCopy, generateAPIOptionMap, removeCMSAttributes, insertComponentSlot } from "./utils/util.js"
import { FileUtil } from "./utils/file.js"
import { LocalFileManipulator } from "./file/LocalFileManipulator.js"

const libFilename = fileURLToPath(import.meta.url)
const libDirname = path.dirname(libFilename)
const fileUtil = new FileUtil(new LocalFileManipulator())

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
    const component = state.componentsList.find((c) => c.tagName === tagName) as Component

    if (component) {
      // Regenerate node since node-html-parser's HTMLElement doesn't have deep copy.
      // If we consumed this element once, this HTML node might release on memory.
      const minified = await minify(component.rawData, { collapseWhitespace: true })
      const deepCopyNode = parse(minified) as Element
      const componentNode = parse(insertComponentSlot(deepCopyNode, node as Element)) as Element
      componentNode.childNodes.forEach((child) => res.appendChild(child.clone()))
      continue
    }

    // Inject CMS loop
    if (!isTextNode && node.getAttribute("cms-loop") !== undefined) {
      const contentType = node.getAttribute("cms-content-type")
      const apiOption = generateAPIOptionMap(node)
      removeCMSAttributes(node)
      const generatedStr = await jsGenerator.generateList(node.outerHTML, contentType, "", apiOption)
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
      const apiOption = generateAPIOptionMap(targetElement as Element)
      removeCMSAttributes(targetElement as Element)
      const generatedContents = await jsGenerator.generateEachContentFromList(targetElement.innerHTML, contentId, apiOption)
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

function createDir() {
  // Clean old builds
  try {
    fs.rmSync(Settings.distDir, { recursive: true })
  } catch (error) {
    // ignore error
  }
  fs.mkdirSync(Settings.distDir, { recursive: true })
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
        const newState = await plugin.beforeBuild(state, { fileUtil })
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
    await fileUtil.parseComponents(state, Settings.componentsFolder)
  } catch(e) {
    console.log(e);
    return false;
  }

  try {
    await fileUtil.parsePages(state, Settings.srcDir)
  } catch(e) {
    console.log(e);
    return false;
  }

  // Run list again to parse children of the components
  const componentsList = [] as Component[]
  for (const component of state.componentsList) {
    const parsedNode = await parseElements(state, component.node.childNodes as Element[]) as Element[]
    componentsList.push({
      "fname": component.fname,
      "rawData": parsedNode[0].outerHTML,
      "tagName": component.tagName,
      "node": parsedNode[0],
      "props": {}
    })
  }
  state.componentsList = componentsList

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
        const newState = await plugin.afterBuild(state, { fileUtil })
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
  fileUtil.dumpPages(state, libDirname, Settings)

  // Hook API: bundle
  for (const plugin of Settings.plugins) {
    if (plugin.bundle) {
      try {
        const newState = await plugin.bundle(state, { fileUtil })
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
  const data = await fileUtil.loadFile(`${dirname}/${Settings.settingsFile}.?(mjs|js|json)`)
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
        const newSettings = await plugin.configuration(Settings, { fileUtil })
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
