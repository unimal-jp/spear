import glob from "glob"
import fs from "fs"
import path from "path"
import { parse } from "node-html-parser"
import { AssetFile, Component, Element, State } from "./interfaces/magicInterfaces"
import { DefaultSettings } from "./interfaces/SettingsInterfaces"

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

function bufferDeepCopy(buffer: Buffer): Buffer {
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
          } else {
            resolve(fs.readFileSync(files[0], "utf8"))
          }
        } else {
          resolve(null)
        }
      })
    })
  }