import { DefaultSettings } from "./SettingsInterfaces"
import { HTMLElement } from "node-html-parser"
import { FileUtil } from "../utils/file"

export type SpearSettings = DefaultSettings

export type Element = HTMLElement & { props: { [key: string]: string } }

export interface Component {
  fname: string
  tagName: string
  rawData?: string
  node: Element
  props: { [key: string]: string }
}

export interface AssetFile {
  filePath: string
  rawData?: Buffer
}

export interface SpearState {
  pagesList: Component[]
  componentsList: Component[]
  body: Element
  globalProps: { [key: string]: string }
  out: {
    assetsFiles: AssetFile[]
  }
}

export interface SpearOption {
  fileUtil: FileUtil
}

export type FieldType = {
    identifier: string
    // Value is depend on the type of field.
    getValue: () => unkonown
}

export type Content = {
    attributes: {
      contentAlias: string
      fields: FieldType[]
      nextContent: Content | null
      previousContent: Content | null
      publicUid: string
      createdAt: Date
      publishedAt: Date
      updatedAt: Date
    }
}