import glob from "glob"
import fs from "fs"
import path from "path"
import { parse } from "node-html-parser"
import { parse as yamlParse } from "yaml"
import { AssetFile, Component, Element, State } from "./interfaces/magicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"
import { APIOption } from "@spearly/cms-js-core"

function componentsDeepCopy(components: Component[]): Component[] {
    const ret = [] as Component[]
    components.forEach(component => {
        ret.push({
            fname: component.fname,
            tagName: component.tagName,
            rawData: component.rawData,
            node: parse(component.node.outerHTML) as Element,
            props: JSON.parse(JSON.stringify(component.props)),
        })
    })
    return ret
}

export function bufferDeepCopy(buffer?: Buffer): Buffer {
    if (!buffer) return null
    const newBuffer = new Buffer(buffer.length)
    buffer.copy(newBuffer)
    return buffer
}

function assetsDeepCopy(assets: AssetFile[]): AssetFile[] {
    const ret = [] as AssetFile[]
    assets.forEach(assetFile => {
        ret.push({
            filePath: assetFile.filePath,
            rawData: bufferDeepCopy(assetFile.rawData),
        })
    })
    return ret
}

export function stateDeepCopy(state: State): State {
    return {
        pagesList: componentsDeepCopy(state.pagesList),
        componentsList: componentsDeepCopy(state.componentsList),
        body: parse(state.body.outerHTML) as Element,
        globalProps: JSON.parse(JSON.stringify(state.globalProps)),
        out: {
            assetsFiles: assetsDeepCopy(state.out.assetsFiles)
        }
    }
}

export function defaultSettingDeepCopy(config: DefaultSettings): DefaultSettings {
    return JSON.parse(JSON.stringify(config))
}

export function loadFile(filePath: string) {
    return new Promise((resolve, reject) => {
      glob(filePath, null, async (er, files) => {
        if (er) {
          reject(er)
          return
        }
  
        if (files.length > 0) {
          const ext = path.extname(files[0])
  
          if (ext === ".js" || ext === ".mjs") {
            const data = await import(
              files[0],
              files[0].indexOf("json") > -1 ? { assert: { type: "json" } } : undefined
            )
            resolve(data.default)
          } else if (ext === ".json") {
            const data = fs.readFileSync(files[0], "utf8")
            resolve(JSON.parse(data))
          } else if (ext === ".yaml") {
            const data = fs.readFileSync(files[0], "utf8")
            resolve(yamlParse(data))
          } else {
            resolve(fs.readFileSync(files[0], "utf8"))
          }
        } else {
          resolve(null)
        }
      })
    })
  }

export function generateAPIOptionMap(node: Element): APIOption {
  const attrs = node.attributes
  const apiOptions = new Map<string, any>()
  if (!attrs || Object.keys(attrs).length <= 0) return apiOptions

  for (const key in attrs) {
    const value = attrs[key]
    const cmsKey = key.replace("cms-option-", "")
    switch(cmsKey) {
      case "limit":
      case "offset":
        apiOptions.set(cmsKey, parseInt(value))
        node.removeAttribute(key)
        break
      case "order":
      case "orderDirection":
      case "orderBy":
      case "filterBy":
      case "filterRef":
      case "filterMode":
        apiOptions.set(cmsKey, value)
        node.removeAttribute(key)
        break
      case "rangeFrom":
      case "rangeTo":
        apiOptions.set(cmsKey, new Date(value))
        node.removeAttribute(key)
        break
      case "filterValue": 
        apiOptions.set(cmsKey, [...value.split(",")])
        node.removeAttribute(key)
        break
      case "orders":
      case "filters":
        // For now, Spear doesn't support multiple specify.
        break

    }
  }
  return apiOptions
}