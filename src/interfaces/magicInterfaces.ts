import { HTMLElement } from "node-html-parser"

export type Element = HTMLElement & { props: { [key: string]: string } }

export interface Component {
  fname: string
  tagName: string
  rawData?: string
  node: Element
  props: { [key: string]: string }
}

export interface State {
  pagesList: Component[]
  componentsList: Component[]
  body: Element
  globalProps: { [key: string]: string }
  out: {
    css: string[],
    script: string[]
  }
}
