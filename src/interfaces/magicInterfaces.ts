import { HTMLElement } from "node-html-parser"

export type Element = HTMLElement & { props: { [key: string]: string } }

export interface Component {
  tagName: string
  rawData?: string
  node: Element
  props: { [key: string]: string }
}

export interface State {
  componentList: Component[]
  rootRaw: string
  rootNode: Element | null
  body: Element
  templateRaw: string
  globalProps: { [key: string]: string }
  out: {
    css: string[]
  }
}
