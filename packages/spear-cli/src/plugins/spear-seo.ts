import { parse } from "node-html-parser"
import { loadFile } from "../util.js"
import { Component, Element, HookApi, SpearSettings, SpearState } from "../interfaces/HookCallback"

let globalSettings: Map<string, string>

// This plugin will replace `spear-seo` tag.
// SettingsFile:
//   JavaScript Object files which has key and value like following.
//   export default {
//     title: "Blog site.",
//   }
export function spearSEO(settingsFile?: string): HookApi {
    // Use configuration and afterBuild hook for generating SEO.
    return {
        configuration: async function(settings: SpearSettings) {
            globalSettings = new Map<string, string>()
            if (settingsFile !== "") {
                try {
                    const settingFileContent = await loadFile(`${settings.rootDir}/${settingsFile}`)
                    if (settingFileContent) {
                        Object.keys(settingFileContent).forEach((k) => {
                            globalSettings.set(k, settingFileContent[k])
                        })
                    }
                } catch (e) {
                    console.log("  [Plugins] Reading settings file failure:")
                    console.error(e)
                    throw e
                }
            }
            return null
        },
        beforeBuild: undefined,
        afterBuild: generateSEOBeforeBundle,
        bundle: undefined,
    }
}

async function generateSEOBeforeBundle(state: SpearState): Promise<SpearState> {
    console.log('  [Plugins] Spear SEO Generation:')
    const generatedState = Object.assign({}, state) as SpearState
    const pageList = [] as Component[]
    for (const page of generatedState.pagesList) {
        console.log("  [Plugins] Traverse SEO Tag on :" + page.fname)
        // If target Node doesn't have <html> element,
        // wrap it by empty html.
        let indexNode: Element
        if (!page.node.innerHTML.includes("</html>")) {
            indexNode = parse(`<!DOCTYPE html><html lang=en><head><meta charset=UTF-8><meta content="IE=edge"http-equiv=X-UA-Compatible><meta content="width=device-width,initial-scale=1"name=viewport></head><body></body></html>`) as Element
            const body = indexNode.querySelector("body")
            if (!body) {
                throw new Error("SEO Plugin: Internal Error. Fail converting the empty html.")
            }
            body.appendChild(page.node)
        } else {
            indexNode = page.node
        }
        
        // Replace Global SEO Setting
        let htmlStr = indexNode.outerHTML as string
        globalSettings.forEach((val, key) => {
            htmlStr = htmlStr.split(`{%= #seo_${key} %}`).join(val)
        });
        indexNode = parse(htmlStr) as Element

        // Replace each SEO Tag.
        // Support one spear-seo tag in one HTML file.
        const spearSEOTag = indexNode.querySelector("spear-seo")
        if (spearSEOTag) {
            console.log("  [Plugins] separ-seo found.")
            const headerTag = indexNode.querySelector("head")
            Object.keys(spearSEOTag.attributes).forEach((k) => {
                if (k === "title") {
                    const titleTag = parse(`<title>${spearSEOTag.attributes[k]}</title>`)
                    headerTag.appendChild(titleTag)
                } else if (k.startsWith("meta-")) {
                    const metaName = k.replace("meta-", "")
                    const metaValue = spearSEOTag.attributes[k]
                    const metaTag = parse(`<meta name="${metaName}" content="${metaValue}">`)
                    headerTag.appendChild(metaTag)
                } else if (k.startsWith("link-")) {
                    const linkRel = k.replace("link-", "")
                    const linkHref = spearSEOTag.attributes[k]
                    const linkTag = parse(`<link rel="${linkRel}" href="${linkHref}">`)
                    headerTag.appendChild(linkTag)
                }
            })
            spearSEOTag.remove()
        }
        pageList.push({
            fname: page.fname,
            tagName: page.tagName,
            rawData: indexNode.outerHTML,
            node: indexNode,
            props: page.props,
        })
    }
    generatedState.pagesList = pageList

    return generatedState
}