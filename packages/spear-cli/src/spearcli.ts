import path from "path"
import { parse } from "node-html-parser"
import { EditorFile } from "./interfaces/EditorFile"
import { Element } from "./interfaces/MagicInterfaces"

/*
 * Traverse for collecting the components list from input files.
 */
const traverseCollectingComponents = async (files: EditorFile[]) => {
  let componentList = []
  for (const file of files) {
    if (!file.children) {
      const ext      = path.extname(file.name)
      const fname    = path.basename(file.name, ext)
      const tagName  = fname.toLowerCase()
      const rawData  = file.content
      const minified = rawData;
      const node     = parse(minified) as Element
      componentList.push({
        fname,
        tagName,
        node
      })
    } else {
      const childList = await traverseCollectingComponents(file.children)
      componentList = componentList.concat(childList)
    }
  }

  return componentList
}

/*
 * Traverse node element for generating page content.
 */
const traverseConvertPages = async (nodes: Element[], componentList) => {
  const res = parse("") as Element
  for (const node of nodes) {
    const tagName    = node.rawTagName
    const isTextNode = node.nodeType ===3
    const isNative   = !isTextNode && node.hasAttribute("native")
    const component  = !isNative && componentList.find((c) => c.tagName === tagName)

    if (node.childNodes.length > 0) {
      node.childNodes = await traverseConvertPages(node.childNodes as Element[], componentList)
    }

    if (component) {
      component.node.childNodes.forEach((child) => res.appendChild(child))
    } else {
      res.appendChild(node)
    }
  }

  return res.childNodes
}

/*
 * Generating the preview from input files and target file.
 *
 */
export default async function magicInternal(inputFiles: EditorFile[], targetFile: EditorFile, apiToken: string) {
  if (!inputFiles || !targetFile) {
    return undefined
  }
  const componentList = await traverseCollectingComponents(inputFiles)

  // For preview, we make the conent string.
  for (const file of inputFiles) {
    if (file.path === targetFile.path && file.name === targetFile.name) {
      const minified = file.content;
      const node = parse(minified) as Element

      const result = await traverseConvertPages(node.childNodes as Element[], componentList)
      const indexNode = parse(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://static.spearly.com/js/v3/spearly-cms.browser.js" defer></script>
  <script>window.addEventListener('DOMContentLoaded',()=>{const t=document.querySelectorAll(':not(:defined)');for(const e of t) {e.style.visibility="hidden";}; window.spearly.config.AUTH_KEY="${apiToken}"},{once:true})</script>
</head>
<body></body>
</html>
`) as Element

      const body = indexNode.querySelector("body")
      result.forEach(res => {
        body.appendChild(res)
      })

      return indexNode.outerHTML
    }
  }

  return undefined
}

