import { parse } from "node-html-parser"
import { bufferDeepCopy } from "../utils/util.js"
import { AssetFile, Component, Element, HookApi, SpearOption, SpearSettings, SpearState } from "../interfaces/HookCallbackInterface"


interface I18nSettings {
    default?: string,
}
type I18nWords = Map<string, string>
type I18nLanguages = Map<string, I18nWords>

const i18nSettings: I18nSettings = {
    default: "",
}
const i18nLanguages: I18nLanguages = new Map<string, I18nWords>()

// This plugin will replace i18n syntax.
// SettingsFile:
//   JavaScript Object files which has key and value like following.
//   export default {
//     settings: {
//       default: "jp",
//       fallback: "jp",
//     },
//     "jp": [
//       { title: "ブログです" },
//       { description: "ブログサイトです" },
//     ],
//     "en": [
//       { title: "Blog Site" },
//       { description: "This is blog site." },
//     ]
//   }
//  Or Yaml object file which has key and value like the bellow:
//    settings:
//      default: "jp"
//      fallback: "jp"
//    lang:
//      jp:
//        - title: ブログだよ
//        - description: ブログサイトです
//      en:
//        - title: Blog
//        - description: This is blog site.

export function spearI18n(settingsFile?: string): HookApi {
    // Use configuration and afterBuild hook for generating SEO.
    return {
        // Build internal variable for converting i18n
        configuration: async function(settings: SpearSettings, option: SpearOption) {
            if (settingsFile !== "") {
                try {
                    const settingFileContent = await option.fileUtil.loadFile(`${settings.rootDir}/${settingsFile}`)
                    if (settingFileContent) {
                        Object.keys(settingFileContent).forEach(key => {
                            if (key.toLowerCase() === "settings") {
                                i18nSettings.default = settingFileContent[key].default
                            } else if (key === "lang") {
                                // Collect the languages definition.
                                const languagesObject = settingFileContent[key]
                                Object.keys(languagesObject).forEach(lang => {
                                    const words = languagesObject[lang]
                                    const convWords: I18nWords = new Map<string, string>()
                                    words.forEach(w=> {
                                        Object.keys(w).forEach(subKey => {
                                            convWords.set(subKey, w[subKey])
                                        })
                                    })
                                    i18nLanguages.set(lang.toLowerCase(), convWords)
                                })
                            } else {
                                throw new Error(`invalid key name. [${key}]`)
                            }
                        })
                    } else {
                        throw new Error(`Specify the correct i18n file name. [${settingsFile}]`)
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
        afterBuild: generateI18nBeforeBundle,
        bundle: undefined,
    }
}

async function generateI18nBeforeBundle(state: SpearState): Promise<SpearState> {
    const generatedState = Object.assign({}, state) as SpearState
    const pageList = [] as Component[]
    const assetsFiles = [] as AssetFile[]

    console.log('  [Plugins] Spear i18n:')
    i18nLanguages.forEach((words, lang) => {
        for (const page of generatedState.pagesList) {
            console.log(`  [Plugins] Traverse i18n Tag on :${page.fname} in ${lang}`)
            // If target Node doesn't have <html> element,
            // wrap it by empty html.
            let indexNode: Element
            if (!page.node.innerHTML.includes("</html>")) {
                indexNode = parse(`<!DOCTYPE html><html lang=en><head><meta charset=UTF-8><meta content="IE=edge"http-equiv=X-UA-Compatible><meta content="width=device-width,initial-scale=1"name=viewport></head><body></body></html>`) as Element
                const body = indexNode.querySelector("body")
                if (!body) {
                    throw new Error("i18n Plugin: Internal Error. Fail converting the empty html.")
                }
                body.appendChild(parse(page.node.outerHTML))
            } else {
                indexNode = parse(page.node.outerHTML) as Element
            }

            // i18n attributes process
            // If we found the i18n attr, replace all of child to translate word
            const i18nAttrs = indexNode.querySelectorAll("[i18n]")
            i18nAttrs.forEach(i18nElement => {
                const key = i18nElement.getAttribute("i18n")
                if (!key) return

                const val = words.get(key)
                if (!val) return
                i18nElement.removeAttribute("i18n")
                i18nElement.set_content(val)
            })

            // spear-link process
            // If we found the spear-link, add lang path into href
            const spearLinkElements = indexNode.querySelectorAll("spear-link")
            spearLinkElements.forEach(linkElement => {
                const href = linkElement.getAttribute("href")
                // Replace only absolute path.
                if (href.startsWith("/")) {
                    linkElement.removeAttribute("href")
                    linkElement.setAttribute("href", `/${lang}${href}`)
                    linkElement.tagName = "a"
                }
            })

            // Replace {%= t() %} or {%= translate() %} syntax here.
            let htmlStr = indexNode.outerHTML
            const replacedTranslateMap = new Map<string, string>()
            const matchTranslateSyntax = htmlStr.match(/{%= (translate|t)\(.*?\) %}/g)
            if (matchTranslateSyntax) {
                matchTranslateSyntax.forEach(m => {
                    const tempKey = m.match(/\(.*?\)/g)[0]
                    const key = tempKey.substr(2, tempKey.length - 4)
                    const val = words.get(key)
                    if (!val) return
                    replacedTranslateMap.set(m, val)
                })
                replacedTranslateMap.forEach((v, k) => {
                    htmlStr = htmlStr.split(k).join(v)
                })
            }

            // Replace {%= l() %} or {%= localize() %} syntax.
            const replacedLocalizeMap = new Map<string, string>()
            const matchLocalizeSyntax = htmlStr.match(/{%= (localize|l)\(.*?\) %}/g)
            if (matchLocalizeSyntax) {
                matchLocalizeSyntax.forEach(m => {
                    const tempKey = m.match(/\(.*?\)/g)[0]
                    const url = tempKey.substr(2, tempKey.length - 4)
                    const val = url.startsWith("/") ? `/${lang}${url}` : `${lang}${url}`
                    replacedLocalizeMap.set(m, val)
                })
                replacedLocalizeMap.forEach((v, k) => {
                    htmlStr = htmlStr.split(k).join(v)
                })
            }

            pageList.push({
                fname: `/${lang}/${page.fname}`,
                tagName: page.tagName,
                rawData: htmlStr,
                node: parse(htmlStr) as Element,
                props: page.props,
            })
        }

        // copy asset file into lang page.
        for (const asset of generatedState.out.assetsFiles) {
            assetsFiles.push({
                filePath: `/${lang}/${asset.filePath}`,
                rawData: bufferDeepCopy(asset.rawData),
            })
        }
    })
    generatedState.pagesList = pageList
    generatedState.out.assetsFiles = assetsFiles
    return generatedState
}