import { SpearlyJSGenerator } from "@spearly/cms-js-core";
import parse from "node-html-parser";
import { FileUtil } from "../utils/file.js";
import { includeComponentsDir, isSamePath, stateDeepCopy } from "../utils/util.js";
import { embedAssets, generateAliasPagesFromPagesList, parseElements } from "../utils/dom.js";
import { InMemoryFile, Settings } from "../interfaces/FileManipulatorInterface";
import { Component, Element, State } from "../interfaces/MagicInterfaces";
import { InMemoryFileManipulator } from "../file/InMemoryFileManipulator";
import { SpearLog } from "../utils/log.js";

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
  // Initial Settings
  settings.quiteMode = settings.quiteMode || false;
  const logger = new SpearLog(settings.quiteMode);
  settings.targetPagesPathList = settings.targetPagesPathList || [];
  settings.generateComponents = settings.generateComponents || false;

  let state: State = {
    pagesList: [],
    componentsList: [],
    body: parse("") as Element,
    globalProps: {},
    out: {
      assetsFiles: [],
    },
    jsGenerator: new SpearlyJSGenerator(
      settings.spearlyAuthKey,
      settings.apiDomain,
      settings.analysysDomain || "analytics.spearly.com",
    )
  };

  // If directory has the same name of components directory, remove it from srcDir
  settings.srcDir = settings.srcDir.filter((srcDir) => {
    return !settings.srcDir.some((srcDir2) => {
      if (srcDir !== srcDir2 && includeComponentsDir(settings.componentsFolder, srcDir)) return false
      return srcDir !== srcDir2 && srcDir.startsWith(srcDir2)
    })
  })

  // Template file
  const templateIndex = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{{projectName}}</title>
    </head>
    <body>
    </body>
  </html>
  `;
  inputFiles.push({
    content: templateIndex,
    id: "0",
    language: "",
    path: "/lib/templates/index.html",
    children: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const fileUtil = new FileUtil(new InMemoryFileManipulator(inputFiles, settings), logger);

  // Hook API: beforeBuild
  for (const plugin of settings.plugins) {
    if (plugin.beforeBuild) {
      try {
        const newState = await plugin.beforeBuild(state, { fileUtil, logger });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        console.warn(` plugin process failed. ${plugin.pluginName}}}`)
      }
    }
  }

  // Create dist folder
  fileUtil.createDir(settings);

  // First parse components from the /components folder
  try {
    for (const componentsFolder of settings.componentsFolder) {
      await fileUtil.parseComponents(state, componentsFolder, settings);
    }
  } catch (e) {
    logger.log(e);
    return false;
  }

  try {
    for (const srcDir of settings.srcDir) {
      await fileUtil.parsePages(state, srcDir, settings);
    }
  } catch (e) {
    logger.log(e);
    return false;
  }

  // Run list again to parse children of the components
  const componentsList = [] as Component[];
  for (const component of state.componentsList) {
    const parsedNode = (await parseElements(
      state,
      component.node.childNodes as Element[],
      state.jsGenerator,
      settings
    )) as Element[];
    componentsList.push({
      fname: component.fname,
      rawData: parsedNode[0].outerHTML,
      tagName: component.tagName,
      node: parsedNode[0],
      props: {},
    });
  }
  state.componentsList = componentsList;

  // Run list again to parse children of the pages
  for (const page of state.pagesList) {
    page.node.childNodes = await parseElements(
      state,
      page.node.childNodes as Element[],
      state.jsGenerator,
      settings
    );
  }

  // This process is only for the in-browser mode.
  // If specified targetPagesPathList is not empty, replace the state.pagesList with the specified pages.
  if (settings.targetPagesPathList.length > 0) {
    const targetPagesList = [] as State["pagesList"];
    for (const targetPagePath of settings.targetPagesPathList) {
      const targetPage = state.pagesList.find(
        (page) => isSamePath(page.fname, targetPagePath)
      )
      if (targetPage) {
        targetPagesList.push(targetPage);
      }
      // Support components preview
      const targetComponent = state.componentsList.find(
        (component) => {
          return "/components/" + component.fname === targetPagePath
        }
      )
      if (targetComponent) {
        targetPagesList.push({
          fname: targetComponent.fname,
          tagName: targetComponent.tagName,
          node: targetComponent.node,
          props: {},
        });
      }
    }
    state.pagesList = targetPagesList;
  }

  // generate static routing files.
  state.pagesList = await generateAliasPagesFromPagesList(state, state.jsGenerator, settings);

  // Embed assets
  const asettsUrlAndRaw: {[key: string]: string} = {};
  for (const assetFile of state.out.assetsFiles) {
    const orgPath = assetFile.filePath.replace(settings.srcDir[0], "").replace(/\/\//, "/").replace(/^\//, "");
    const orgURL = new URL(orgPath, window.location.href).href;
    asettsUrlAndRaw[orgURL] = assetFile.rawData.toString();
  }
  const embedPageList = [] as Component[];
  for (const page of state.pagesList) {
    const parsedNode = embedAssets(
      `.${page.fname}.html`,
      state,
      asettsUrlAndRaw,
      page.node.childNodes as Element[]
    ) as Element[];
    embedPageList.push({
      fname: page.fname,
      // If page html has <!DOCTYPE html>, it will be removed.
      rawData: parsedNode[parsedNode.length - 1].outerHTML,
      tagName: page.tagName,
      node: parsedNode[parsedNode.length - 1],
      props: {},
    });
  }
  state.pagesList = embedPageList;

  // Hook API: afterBuild
  for (const plugin of settings.plugins) {
    if (plugin.afterBuild) {
      try {
        const newState = await plugin.afterBuild(state, { fileUtil, logger });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        console.warn(` plugin process failed. ${plugin.pluginName}}}`)
      }
    }
  }

  // Dump pages
  await fileUtil.dumpPages(state, "/lib", settings);
  fileUtil.manipulator.rmSync("/lib", { recursive: true });
  
  // Hook API: bundle
  for (const plugin of settings.plugins) {
    if (plugin.bundle) {
      try {
        const newState = await plugin.bundle(state, { fileUtil, logger });
        if (newState) {
          state = stateDeepCopy(newState);
        }
      } catch (e) {
        console.warn(` plugin process failed. ${plugin.pluginName}}}`)
      }
    }
  }

  // Pick up the target files.
  const getTargetFiles = (dirPath: string): InMemoryFile[] => {
    const dirFiles = fileUtil.manipulator.readdirSync(dirPath);
    let retFiles = [] as InMemoryFile[];
    for (const file of dirFiles) {
      if (file === "src") continue;
      if (!file || file === '') continue;
      if (fileUtil.manipulator.isDirectory(`${dirPath}/${file}`)) {
        retFiles = retFiles.concat(getTargetFiles(`${dirPath}/${file}`));
      } else {
        retFiles.push((fileUtil.manipulator as InMemoryFileManipulator).getInMemoryFile(`${dirPath}/${file}`));
      }
    }
    return retFiles
  }
  return getTargetFiles(`${settings.distDir}`);
}
