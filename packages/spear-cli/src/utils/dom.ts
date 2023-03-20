import { Component, Element, State } from "../interfaces/MagicInterfaces";
import { parse } from "node-html-parser";
import { minify } from "html-minifier-terser";
import { SpearlyJSGenerator } from "@spearly/cms-js-core"
import { generateAPIOptionMap } from "./util.js";

function extractProps(state: State, node: Element) {
  const { key, value, scoped } = node.attributes;

  if (scoped !== undefined) {
    state.globalProps[key] = value;
  } else {
    node.props[key] = value;
  }
}

export async function parseElements(state: State, nodes: Element[], jsGenerator: SpearlyJSGenerator) {
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
    if (!isTextNode && node.getAttribute("cms-loop") !== undefined) {
      const contentType = node.getAttribute("cms-content-type");
      const apiOption = generateAPIOptionMap(node);
      removeCMSAttributes(node);
      const generatedStr = await jsGenerator.generateList(
        node.outerHTML,
        contentType,
        "",
        apiOption
      );
      const generatedNode = parse(generatedStr) as Element;
      res.appendChild(generatedNode);
      continue;
    }

    // Inject CMS single page(Specified cms-content)
    if (
      !isTextNode &&
      node.getAttribute("cms-item") !== undefined &&
      node.getAttribute("cms-content-type") !== undefined &&
      node.getAttribute("cms-content") !== undefined
    ) {
      const contentType = node.getAttribute("cms-content-type");
      const contentId = node.getAttribute("cms-content");
      removeCMSAttributes(node);
      const generatedStr = await jsGenerator.generateContent(
        node.outerHTML,
        contentType,
        contentId
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
        jsGenerator
      );
    }

    // console.log("  append node", node.outerHTML)
    res.appendChild(node);
  }

  return res.childNodes;
}

export async function generateAliasPagesFromPagesList(
  state: State,
  jsGenerator: SpearlyJSGenerator
): Promise<Component[]> {
  const replacePagesList: Component[] = [];
  for (const page of state.pagesList) {
    const targetElement = page.node.querySelector("[cms-item]");
    if (page.fname.includes("[alias]") && targetElement) {
      const contentId = targetElement.getAttribute("cms-content-type");
      const apiOption = generateAPIOptionMap(targetElement as Element);
      removeCMSAttributes(targetElement as Element);
      const generatedContents = await jsGenerator.generateEachContentFromList(
        targetElement.innerHTML,
        contentId,
        apiOption
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
    console.log(`parentElement: [${parentElement.innerHTML}]`);
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

function removeCMSAttributes(node: Element) {
  for (const key in node.attributes) {
    if (key.startsWith("cms-")) {
      node.removeAttribute(key);
    }
  }
}
