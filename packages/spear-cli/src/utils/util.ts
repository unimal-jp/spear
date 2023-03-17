import { parse } from "node-html-parser"
import { AssetFile, Component, Element, State } from "../interfaces/MagicInterfaces"
import { DefaultSettings } from "../interfaces/SettingsInterfaces"
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

export function removeCMSAttributes(node: Element) {
  for (const key in node.attributes) {
    if (key.startsWith("cms-")) {
      node.removeAttribute(key)
    }
  }
}

export function insertComponentSlot(componentElement: Element, parentElement: Element): string {
  const slotElements = componentElement.querySelectorAll("slot")
  // If component has not <Slot> element, return component html string as is.
  if (slotElements.length <= 0) return componentElement.innerHTML
  if (slotElements.length === 1) {

    // Single Slot
    const slotElement = slotElements[0]
    console.log(`parentElement: [${parentElement.innerHTML}]`)
    if (parentElement.innerHTML !== "") {
      slotElement.insertAdjacentHTML('afterend', parentElement.innerHTML)
      slotElement.remove()
    } else {
      // Fallback. remove slot element and insert inner of SLot
      slotElement.insertAdjacentHTML('afterend', slotElement.innerHTML)
      slotElement.remove()
    }
    return componentElement.innerHTML
  } else {
    // Multiple Slot(Mean named slot)
    for (const slotElement of slotElements) {
      const slotName = slotElement.getAttribute("name")
      // TODO: We need to conditional process for slotname is undefined.
      const parentSlotReplaceElement = parentElement.querySelector(`[slot="${slotName}"]`)
      if (parentSlotReplaceElement) {
        parentSlotReplaceElement.removeAttribute("slot")
        slotElement.insertAdjacentHTML('afterend', parentSlotReplaceElement.outerHTML)
        slotElement.remove()
      } else {
        slotElement.insertAdjacentHTML('afterend', slotElement.innerHTML)
        slotElement.remove()
      }
    }
    return componentElement.innerHTML
  }
}


export function isParseTarget(ext: string) {
  return [".html", ".htm", ".spear"].includes(ext)
}

export function needSASSBuild(ext: string) {
  return [".scss"].includes(ext)
}