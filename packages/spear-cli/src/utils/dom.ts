import { Component, Element, PaginationElement, State } from "../interfaces/MagicInterfaces";
import { parse } from "node-html-parser";
import mime from "mime-types";
import { minify } from "html-minifier-terser";
import { GetContentOption, SpearlyJSGenerator } from "@spearly/cms-js-core"
import { generateAPIOptionMap } from "./util.js";
import { SpearSettings } from "../interfaces/HookCallbackInterface";
import { DefaultSettings } from "../interfaces/SettingsInterfaces";

function extractProps(state: State, node: Element) {
  const { key, value, scoped } = node.attributes;

  if (scoped !== undefined) {
    state.globalProps[key] = value;
  } else {
    node.props[key] = value;
  }
}

export async function parseElements(state: State, nodes: Element[], jsGenerator: SpearlyJSGenerator, settings: SpearSettings) {
  const res = parse("") as Element;

  //nodes.forEach((node) => {
  for (const node of nodes) {
    const tagName = node.rawTagName;
    const isTextNode = node.nodeType === 3;
    const component = state.componentsList.find(
      (c) => c.tagName === tagName
    ) as Component;

    if (component) {
      // Regenerate node since node-html-parser's HTMLElement doesn't have deep copy.
      // If we consumed this element once, this HTML node might release on memory.
      const minified = await minify(component.rawData, {
        collapseWhitespace: true,
      });
      const deepCopyNode = parse(minified) as Element;
      const componentNode = parse(
        insertComponentSlot(deepCopyNode, node as Element)
      ) as Element;
      componentNode.childNodes.forEach((child) =>
        res.appendChild(child.clone())
      );
      continue;
    }

    // Inject CMS loop
    if (
      !isTextNode && node.getAttribute("cms-loop") !== undefined &&
      node.getAttribute("cms-ignore-static") === undefined &&
      node.getAttribute("cms-tag-loop") === undefined
    ) {
      const contentType = node.getAttribute("cms-content-type");
      const apiOption = generateAPIOptionMap(node);
      removeCMSAttributes(node);
      if (settings.debugMode) {
        node.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
        node.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
      }
      const generatedStr = await jsGenerator.generateList(
        node.outerHTML,
        contentType,
        "",
        apiOption,
        settings.debugMode
      );
      const generatedNode = parse(generatedStr) as Element;
      res.appendChild(generatedNode);
      continue;
    }

    // Inject CMS single page(Specified cms-content)
    if (
      !isTextNode &&
      node.getAttribute("cms-item") !== undefined &&
      node.getAttribute("cms-ignore-static") === undefined &&
      node.getAttribute("cms-content-type") !== undefined &&
      node.getAttribute("cms-content") !== undefined
    ) {
      const contentType = node.getAttribute("cms-content-type");
      const contentId = node.getAttribute("cms-content");
      removeCMSAttributes(node);
      if (settings.debugMode) {
        node.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
        node.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
      }
      const [ generatedStr ] = await jsGenerator.generateContent(
        node.outerHTML,
        contentType,
        contentId,
        {} as GetContentOption,
        settings.debugMode
      );
      const generatedNode = parse(generatedStr) as Element;
      res.appendChild(generatedNode);
      continue;
    }

    if (!isTextNode && !component) {
      node.props = {};
      extractProps(state, node);
    }

    // Todo: Check better way to do this, components are being parsed twice
    if (node.childNodes.length > 0) {
      node.childNodes = await parseElements(
        state,
        node.childNodes as Element[],
        jsGenerator,
        settings
      );
    }

    // console.log("  append node", node.outerHTML)
    res.appendChild(node);
  }

  return res.childNodes;
}

export async function generateAliasPagesFromPagesList(
  state: State,
  jsGenerator: SpearlyJSGenerator,
  settings: SpearSettings
): Promise<Component[]> {
  const replacePagesList: Component[] = [];
  for (const page of state.pagesList) {
    if (page.fname.includes("[pagination]")) {
      // Pagination Routing
      const loopElement = page.node.querySelector("[cms-loop]");
      if (!loopElement) {
        throw new Error("You should specify the cms-loop");
      }
      const hasTagLoop  = loopElement.hasAttribute("cms-tag-loop");
      const paginationSize = parseInt(loopElement.getAttribute("cms-pagination-size")) || 10;

      if (loopElement && hasTagLoop) {
        // Routing Hook
        for (const plugin of settings.plugins) {
          if (plugin.routing) {
            try {
              const pages = await plugin.routing(page);
              if (pages) {
                replacePagesList.push(...pages);
              }
            } catch (e) {
              console.warn(` plugin process failed. [${plugin.pluginName}]`)
            }
          }
        }
        // combination of pagination and tag
        const tagFieldName = loopElement.getAttribute("cms-tag-loop");
        const contentType  = loopElement.getAttribute("cms-content-type");
        const loopId       = loopElement.getAttribute("cms-loop-id");
        if (!tagFieldName) throw new Error("You should specify the cms-tag-loop");
        if (!contentType)  throw new Error("You should specify the cms-content-type");

        const apiOption = generateAPIOptionMap(loopElement as Element);
        apiOption.set('limit', settings.maxPaginationCount);
        removeCMSAttributes(loopElement as Element);
        if (settings.debugMode) {
          loopElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
          loopElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
        }
        const generatedContents = await jsGenerator.generateEachContentFromList(
          loopElement.outerHTML,
          contentType,
          apiOption,
          tagFieldName,
          settings.debugMode
        );
        const targetLoopElementHTMLTemplate = loopElement.outerHTML;
        const targetPageHTMLTemplate = page.node.innerHTML;
        const tagElements: Map<string, PaginationElement[]> = new Map();
        generatedContents.forEach((c) => {
          const tags = c.tag;
          tags.forEach(tag => {
            if (!tagElements.has(tag)) {
              const newElement = parse("") as Element;
              tagElements.set(tag, [{ element: newElement, count: 0, currentPage: 1 }]);
            }
            const obj = tagElements.get(tag);
            const element = obj[obj.length - 1].element;
            const count = obj[obj.length - 1].count;
            const currentPage = obj[obj.length - 1].currentPage;
            const generatedHTML = c.generatedHtml;
            element.innerHTML += generatedHTML;
            obj[obj.length - 1] = { element: element, count: count + 1, currentPage: currentPage };
            if ((count + 1 ) >  paginationSize) {
              const newElement = parse("") as Element;
              newElement.innerHTML = "";
              obj.push({ element: newElement, count: 0, currentPage: currentPage + 1 });
            }
            tagElements.set(tag, obj);
          });
        });
        tagElements.forEach((v, tag) => {
          v.forEach((obj) => {
            const element = obj.element;
            const currentPage = obj.currentPage;
            const html = targetPageHTMLTemplate.replace(
              targetLoopElementHTMLTemplate,
              element.outerHTML
            );
            const replacedPaginationHTML = replacePaginationTag(
              settings,
              page.fname.split("[tag]").join(tag),
              parse(html) as Element,
              loopId,
              obj,
              v
            );
            replacePagesList.push({
              fname: page.fname.split("[tag]").join(tag).split("[pagination]").join(currentPage.toString()),
              node: parse(replacedPaginationHTML) as Element,
              props: page.props,
              tagName: page.tagName,
              rawData: html,
            });
          });
        });
      } else if (loopElement) {
        // Routing Hook
        for (const plugin of settings.plugins) {
          if (plugin.routing) {
            try {
              const pages = await plugin.routing(page);
              if (pages) {
                replacePagesList.push(...pages);
              }
            } catch (e) {
              console.warn(` plugin process failed. [${plugin.pluginName}]`)
            }
          }
        }
        // pagination
        const contentType  = loopElement.getAttribute("cms-content-type");
        if (!contentType)  throw new Error("You should specify the cms-content-type");
        const loopId       = loopElement.getAttribute("cms-loop-id");

        const apiOption = generateAPIOptionMap(loopElement as Element)
        apiOption.set('limit', settings.maxPaginationCount);
        removeCMSAttributes(loopElement as Element);
        if (settings.debugMode) {
          loopElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
          loopElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
        }
        const generatedContents = await jsGenerator.generateEachContentFromList(
          loopElement.outerHTML,
          contentType,
          apiOption,
          "",
          settings.debugMode
        );

        const targetLoopElementHTMLTemplate = loopElement.outerHTML;
        const targetPageHTMLTemplate = page.node.innerHTML;
        const elements: PaginationElement[] = [{ element: parse("") as Element, count: 0, currentPage: 1}];
        generatedContents.forEach((c) => {
          const lastItem = elements[elements.length - 1];
          const element  = lastItem.element;
          const count    = lastItem.count;
          const currentPage = lastItem.currentPage;
          const generatedHTML = c.generatedHtml;
          element.innerHTML += generatedHTML;

          lastItem.element = element;
          lastItem.count = count + 1;
          lastItem.currentPage = currentPage;
          if ((lastItem.count + 1) >  paginationSize) {
            const newElement = parse("") as Element;
            newElement.innerHTML = "";
            elements.push({ element: parse("") as Element, count: 0, currentPage: currentPage + 1});
          }
        });
        elements.forEach((v) => {
          const element = v.element;
          const currentPage = v.currentPage;
          const html = targetPageHTMLTemplate.replace(
            targetLoopElementHTMLTemplate,
            element.outerHTML
          );
          const replacedPaginationHTML = replacePaginationTag(
            settings,
            page.fname,
            parse(html) as Element,
            loopId,
            v,
            elements
          );
          replacePagesList.push({
            fname: page.fname.split("[pagination]").join(currentPage.toString()),
            node: parse(replacedPaginationHTML) as Element,
            props: page.props,
            tagName: page.tagName,
            rawData: html,
          });
        });
      } else {
        // [pagination] page doesn't have [cms-loop]. So we need to treat this file as item file.
        replacePagesList.push({
          fname: page.fname,
          node: parse(page.node.innerHTML) as Element,
          props: page.props,
          tagName: page.tagName,
          rawData: page.rawData,
        })
      }

    } else if (page.fname.includes("[tags]")) {
      // Path has [tags].
      const tagAndAliasLoopElement = page.node.querySelector("[cms-item][cms-tag-loop]");
      const tagAndLoopElement = page.node.querySelector("[cms-loop][cms-tag-loop]");
      // In [alias].html, cms-item should be treat as cms-loop.
      const aliasLoopElement = page.node.querySelector("[cms-item]");
      if (tagAndAliasLoopElement && !tagAndAliasLoopElement.getAttribute("cms-ignore-static")) {
        const tagFieldName = tagAndAliasLoopElement.getAttribute("cms-tag-loop");
        const contentType  = tagAndAliasLoopElement.getAttribute("cms-content-type");
        if (!tagFieldName) throw new Error("You should specify the cms-tag-loop");
        if (!contentType)  throw new Error("You should specify the cms-content-type");

        //alias routing
        if (page.fname.includes("[alias]")) {
          // Routing Hook
          for (const plugin of settings.plugins) {
            if (plugin.routing) {
              try {
                const pages = await plugin.routing(page);
                if (pages) {
                  replacePagesList.push(...pages);
                }
              } catch (e) {
                console.warn(` plugin process failed. [${plugin.pluginName}]`)
              }
            }
          }
          const apiOption = generateAPIOptionMap(tagAndAliasLoopElement as Element);
          removeCMSAttributes(tagAndAliasLoopElement as Element);
          if (settings.debugMode) {
            tagAndAliasLoopElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
            tagAndAliasLoopElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
          }
          const generatedContents = await jsGenerator.generateEachContentFromList(
            tagAndAliasLoopElement.innerHTML,
            contentType,
            apiOption,
            tagFieldName,
            settings.debugMode
          );
          generatedContents.forEach(c => {
            tagAndAliasLoopElement.innerHTML = c.generatedHtml;
            const html = page.node.innerHTML.replace(
              tagAndAliasLoopElement.innerHTML,
              c.generatedHtml
            );
            if (c.tag.length > 0) {
              c.tag.forEach(tag => {
                replacePagesList.push({
                  fname: page.fname.split("[tags]").join(tag).split("[alias]").join(c.alias),
                  node: parse(html) as Element,
                  props: page.props,
                  tagName: page.tagName,
                  rawData: html,
                })
              })
            } else {
              // In this case, content doesn't have tag.
                replacePagesList.push({
                  fname: page.fname.split("[alias]").join(c.alias),
                  node: parse(html) as Element,
                  props: page.props,
                  tagName: page.tagName,
                  rawData: html,
                })
            }
          })
        } else {
          // In this case, target file doesn't have [alias] path.
          throw new Error(`You specified the cms-tag-loop attribute in ${page.fname}. However, this path doesn't include [tags] directory.`);
        }
      } else if (tagAndLoopElement && !tagAndLoopElement.getAttribute("cms-ignore-static")) {
        // Routing Hook
        for (const plugin of settings.plugins) {
          if (plugin.routing) {
            try {
              const pages = await plugin.routing(page);
              if (pages) {
                replacePagesList.push(...pages);
              }
            } catch (e) {
              console.warn(` plugin process failed. [${plugin.pluginName}]`)
            }
          }
        }
        // In this case, target file has cms-tag-loop and cms-loop.
        const tagFieldName = tagAndLoopElement.getAttribute("cms-tag-loop");
        const contentType  = tagAndLoopElement.getAttribute("cms-content-type");
        if (!tagFieldName) throw new Error("Yous should specify the cms-tag-loop");
        if (!contentType) throw new Error("You should specify the cms-content-type");

        if (page.fname.includes("[tags]")) {
          const apiOption = generateAPIOptionMap(tagAndLoopElement as Element);
          removeCMSAttributes(tagAndLoopElement as Element);
          if (settings.debugMode) {
            tagAndLoopElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
            tagAndLoopElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
          }

          const generatedLists = await jsGenerator.generateListGroupByTag(
            tagAndLoopElement.innerHTML,
            contentType,
            apiOption,
            tagFieldName,
            "",
            settings.debugMode
          )
          generatedLists.forEach(c => {
            tagAndLoopElement.innerHTML = c.generatedHtml;
            const html = page.node.innerHTML.replace(
              tagAndLoopElement.innerHTML,
              c.generatedHtml
            )
            replacePagesList.push({
              fname: page.fname.split("[tags]").join(c.tag),
              node: parse(html) as Element,
              props: page.props,
              tagName: page.tagName,
              rawData: html
            })
          })
        } else {
          // In this case, target file doesn't have [tags] path.
          throw new Error(`You specified the cms-tag-loop attribute in ${page.fname}. However, this path doesn't include [tags] directory.`);
        }
      } else if (aliasLoopElement && !aliasLoopElement.getAttribute("cms-ignore-static")) {
        // Routing Hook
        for (const plugin of settings.plugins) {
          if (plugin.routing) {
            try {
              const pages = await plugin.routing(page);
              if (pages) {
                replacePagesList.push(...pages);
              }
            } catch (e) {
              console.warn(` plugin process failed. [${plugin.pluginName}]`)
            }
          }
        }
        // In this case, target file has cms-item. (This mean we need to treat this file as loop if path contain the [alias].)
        if (page.fname.includes("[alias]")) {
          // path contain [alias]
          const contentType = aliasLoopElement.getAttribute("cms-content-type");
          if (!contentType) throw new Error("You should specify the cms-content-type in alias page with cms-item");

          const apiOption = generateAPIOptionMap(aliasLoopElement as Element);
          removeCMSAttributes(aliasLoopElement as Element);
          if (settings.debugMode) {
            aliasLoopElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
            aliasLoopElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
          }
          const generatedContents = await jsGenerator.generateEachContentFromList(
            aliasLoopElement.innerHTML,
            contentType,
            apiOption,
            "",
            settings.debugMode
          );
          generatedContents.forEach(c => {
            aliasLoopElement.innerHTML = c.generatedHtml;
            const html = page.node.innerHTML.replace(
              aliasLoopElement.innerHTML,
              c.generatedHtml
            );
            replacePagesList.push({
              fname: page.fname.split("[alias]").join(c.alias),
              node: parse(html) as Element,
              props: page.props,
              tagName: page.tagName,
              rawData: html,
            })
          })
        } else {
          // path doesn't contain [alias]. So we need to treat this file as item file.
          replacePagesList.push({
            fname: page.fname,
            node: parse(page.node.innerHTML) as Element,
            props: page.props,
            tagName: page.tagName,
            rawData: page.rawData,
          })
        }
      }
    } else if (page.fname.includes("[alias]")) {
      // Routing Hook
      for (const plugin of settings.plugins) {
        if (plugin.routing) {
          try {
            const pages = await plugin.routing(page);
            if (pages) {
              replacePagesList.push(...pages);
            }
          } catch (e) {
            console.warn(` plugin process failed. [${plugin.pluginName}]`)
          }
        }
      }
      const targetElement = page.node.querySelector("[cms-item]");
      if (!targetElement) continue;

      if (targetElement.getAttribute("cms-ignore-static")) continue;
      // [alias].html only (This mean path doesn't be included the [tags].)
      const contentType = targetElement.getAttribute("cms-content-type");
      if (!contentType) throw new Error("You should specify the cms-content-type in alias page with cms-item.");

      const apiOption = generateAPIOptionMap(targetElement as Element);
      removeCMSAttributes(targetElement as Element);
      if (settings.debugMode) {
        targetElement.setAttribute("data-spear-content-type", `{%= ${contentType}_#content_type %}`);
        targetElement.setAttribute("data-spear-content", `{%= ${contentType}_#alias %}`);
      }
      const generatedContents = await jsGenerator.generateEachContentFromList(
        targetElement.innerHTML,
        contentType,
        apiOption,
        "",
        settings.debugMode
      );
      generatedContents.forEach((c) => {
        targetElement.innerHTML = c.generatedHtml;
        const html = page.node.innerHTML.replace(
          targetElement.innerHTML,
          c.generatedHtml
        );
        replacePagesList.push({
          fname: page.fname.split("[alias]").join(c.alias),
          node: parse(html) as Element,
          props: page.props,
          tagName: page.tagName,
          rawData: html,
        });
      });
    } else {
      replacePagesList.push(page);
    }
  }
  return replacePagesList;
}


function replacePaginationTag(settings: DefaultSettings, fname: string, page: Element, loopId: string, targetSource: PaginationElement, sources: PaginationElement[]): string {
  // TODO: Hook pagination
  for(const plugin of settings.plugins) {
    if (plugin.pagination) {
      try {
        const html = plugin.pagination(fname, page, loopId, targetSource, sources);
        if (html) return html;
      } catch (e) {
        console.warn(` plugin process failed. ${plugin.pluginName}}`);
      }
    }
  }
  const paginationElement = page.querySelector("[cms-pagination]");
  if (!paginationElement) return page.innerHTML;
  const targetLoopId = paginationElement.getAttribute("cms-loop-id");
  if (targetLoopId !== loopId) return page.innerHTML;

  if (paginationElement.innerHTML === "") {
    // Generate pagination navigation
    // T.B.D: We should implement pagination navigation generator.
  } else {
    // Replace pagination string
    // {%= pagination_prev %} is prebvous page link
    // {%= pagination_next %} is next page link
    // {%= pagination_current_page %} is current page number
    // {%= pagination_total %} is total page number
    const totalPage   = sources.length;
    const currentPage = targetSource.currentPage;
    const prevPageNum = currentPage - 1;
    const nextPageNum = currentPage + 1;
    const prevPage    = fname.split("[pagination]").join(prevPageNum.toString());
    const nextPage    = fname.split("[pagination]").join(nextPageNum.toString());
    const replaceHTML = paginationElement.outerHTML
      .split("{%= pagination_prev %}").join(prevPage)
      .split("{%= pagination_next %}").join(nextPage)
      .split("{%= pagination_current_page %}").join(currentPage.toString())
      .split("{%= pagination_total %}").join(totalPage.toString());
    return page.innerHTML.replace(paginationElement.outerHTML, replaceHTML);
  }
  return "";
}

function insertComponentSlot(
  componentElement: Element,
  parentElement: Element
): string {
  const slotElements = componentElement.querySelectorAll("slot");
  // If component has not <Slot> element, return component html string as is.
  if (slotElements.length <= 0) return componentElement.innerHTML;
  if (slotElements.length === 1) {
    // Single Slot
    const slotElement = slotElements[0];
    if (parentElement.innerHTML !== "") {
      slotElement.insertAdjacentHTML("afterend", parentElement.innerHTML);
      slotElement.remove();
    } else {
      // Fallback. remove slot element and insert inner of SLot
      slotElement.insertAdjacentHTML("afterend", slotElement.innerHTML);
      slotElement.remove();
    }
    return componentElement.innerHTML;
  } else {
    // Multiple Slot(Mean named slot)
    for (const slotElement of slotElements) {
      const slotName = slotElement.getAttribute("name");
      // TODO: We need to conditional process for slotname is undefined.
      const parentSlotReplaceElement = parentElement.querySelector(
        `[slot="${slotName}"]`
      );
      if (parentSlotReplaceElement) {
        parentSlotReplaceElement.removeAttribute("slot");
        slotElement.insertAdjacentHTML(
          "afterend",
          parentSlotReplaceElement.outerHTML
        );
        slotElement.remove();
      } else {
        slotElement.insertAdjacentHTML("afterend", slotElement.innerHTML);
        slotElement.remove();
      }
    }
    return componentElement.innerHTML;
  }
}

export function embedAssets(filepath: string, state: State, assets: {[key:string]: string}, nodes: Element[], parent?: Element) {
  const res = parse("") as Element;

  for (const node of nodes) {
    const tagName = node.rawTagName;
    const isTextNode = node.nodeType === 3;

    if (!isTextNode) {
      const currentURL = new URL(filepath, location.href);
      switch(tagName) {
        case "img": {
          const imgURL = new URL(node.getAttribute("src"), currentURL).href;
          if (assets[imgURL]) {
            // Get the extension of image.
            // (We need to specify the extension for data url.)
            const ext = imgURL.split(".").pop();
            const mimeType = mime.lookup(ext) || "image/png";
            node.setAttribute("src", `data:${mimeType};base64,${assets[imgURL]}`);
          }
          break;
        }
        case "link": {
          const linkURL = new URL(node.getAttribute("href").replace(/\.scss$/, '.css'), currentURL).href;
          if (assets[linkURL]) {
            // Replace link tag to style tag
            if (parent) {
              const styleNode = parse(`<style>${assets[linkURL]}</style>`) as Element;
              parent.appendChild(styleNode.childNodes[0]);
              node.remove();
            }
          }
          break;
        }
        case "script": {
          const scriptURL = new URL(node.getAttribute("src"), currentURL).href;
          if (assets[scriptURL]) {
            node.innerHTML = assets[scriptURL];
            node.removeAttribute("src");
          }
          break;
        }
        default:
      }
    }

    if (node.childNodes.length > 0) {
      node.childNodes = embedAssets(
        filepath,
        state,
        assets,
        node.childNodes as Element[],
        node
      );
    }

    res.appendChild(node);
  }

  return res.childNodes;
}

function removeCMSAttributes(node: Element) {
  for (const key in node.attributes) {
    if (key.startsWith("cms-")) {
      node.removeAttribute(key);
    }
  }
}
