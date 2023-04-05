import { SpearlyJSGenerator } from "@spearly/cms-js-core";
import parse from "node-html-parser";
import { FileUtil } from "../utils/file.js";
import { stateDeepCopy } from "../utils/util.js";
import { generateAliasPagesFromPagesList, parseElements } from "../utils/dom.js";
import { InMemoryFile, Settings } from "../interfaces/FileManipulatorInterface";
import { Component, Element, State } from "../interfaces/MagicInterfaces";
import { InMemoryFileManipulator } from "../file/InMemoryFileManipulator";

/**
 * inMemoryMagic
 * This function will generate the static site from specified source.
 * This function should be receive the specified source code structure and build option parameter like spear.config.mjs.
 * (For security, this package could not load setting js file dynamically.)
 */
export default async function inMemoryMagic(
  inputFiles: InMemoryFile[],
  settings: Settings
) {
  console.log("helle");
  console.log(inputFiles, settings);

  const jsGenerator = new SpearlyJSGenerator(
    settings.spearlyAuthKey,
    settings.apiDomain
  );
  let state: State = {
    pagesList: [],
    componentsList: [],
    body: parse("") as Element,
    globalProps: {},
    out: {
      assetsFiles: [],
    },
  };
  const fileUtil = new FileUtil(new InMemoryFileManipulator(inputFiles, settings));

  // Hook API: beforeBuild
  for (const plugin of settings.plugins) {
    if (plugin.beforeBuild) {
      try {
        const newState = await plugin.beforeBuild(state, { fileUtil });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `);
      }
    }
  }

  // Create dist folder
  fileUtil.createDir(settings);
  console.log("------------------:1");
  fileUtil.debug();

  // First parse components from the /components folder
  try {
    for (const componentsFolder of settings.componentsFolder) {
      console.log(`componentsFolder: ${componentsFolder}`);
      await fileUtil.parseComponents(state, componentsFolder);
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  try {
    for (const srcDir of settings.srcDir) {
      await fileUtil.parsePages(state, srcDir);
    }
  } catch (e) {
    console.log(e);
    return false;
  }

  console.log("------------------:2");
  console.log(state);
  
  // Run list again to parse children of the components
  const componentsList = [] as Component[];
  for (const component of state.componentsList) {
    const parsedNode = (await parseElements(
      state,
      component.node.childNodes as Element[],
      jsGenerator
    )) as Element[];
    console.log("------------------:2.1");
    console.log(parsedNode);
    componentsList.push({
      fname: component.fname,
      rawData: parsedNode[0].outerHTML,
      tagName: component.tagName,
      node: parsedNode[0],
      props: {},
    });
  }
  state.componentsList = componentsList;

  console.log("------------------:3");
  console.log(state);

  // Run list again to parse children of the pages
  for (const page of state.pagesList) {
    page.node.childNodes = await parseElements(
      state,
      page.node.childNodes as Element[],
      jsGenerator
    );
  }

  console.log("------------------:4");
  console.log(state);

  // generate static routing files.
  state.pagesList = await generateAliasPagesFromPagesList(state, jsGenerator);

  console.log("------------------:5");
  console.log(state);
  // Hook API: afterBuild
  for (const plugin of settings.plugins) {
    if (plugin.afterBuild) {
      try {
        const newState = await plugin.afterBuild(state, { fileUtil });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `);
      }
    }
  }

  console.log("------------------:6");
  console.log(state);
  // Dump pages
  fileUtil.dumpPages(state, "/", settings);

  // Hook API: bundle
  for (const plugin of settings.plugins) {
    if (plugin.bundle) {
      try {
        const newState = await plugin.bundle(state, { fileUtil });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        // TODO. This error should have a plugin information.
        // For more information, see the https://github.com/unimal-jp/spear/issues/111
        console.warn(` plugin process failed. `);
      }
    }
  }
}
