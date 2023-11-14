import { DefaultSettings } from "./SettingsInterfaces"
import { HTMLElement } from "node-html-parser"
import { FileUtil } from "../utils/file"
import { SpearLog } from "../utils/log"
import { SpearlyJSGenerator } from "@spearly/cms-js-core"

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
  jsGenerator: SpearlyJSGenerator
}

export interface SpearOption {
  fileUtil: FileUtil,
  logger: SpearLog
}

/**
 * Call after configuration has finished.
 * If you change the original settings value, you need to return 
 * SpearSetting object in this function.
 */
export interface ConfigurationHookFunction {
    (setting: SpearSettings, option: SpearOption): Promise<SpearSettings | null>
}

/**
 * Call before starting build process.
 * If you change the original state value, you need to return
 * SpearState object in this function.
 */
export interface BeforeBuildHookFunction {
    (state: SpearState, option: SpearOption): Promise<SpearState | null>
}

/**
 * Call after finishing build process.
 * If you change the original state value, you need to return
 * SpearState object in this function.
 */
export interface AfterBuildHookFunction {
    (state: SpearState, option: SpearOption): Promise<SpearState | null>
}

/**
 * Call before starting bundle process.
 * If you change the original state value, you need to return
 * SpearState object in this function.
 */
export interface BundleHookFunction {
    (state: SpearState, option: SpearOption): Promise<SpearState | null>
}

/**
 * Call when generating pagination navigation element.
 * If return empty string, generating default pagination navigation.
 * 
 * fname: file name including [pagination].
 * page: current page element.
 * loopId: loop id.
 * targetSource: target source object.
 * sources: all sources object.
 */
export interface PaginationHookFunction {
  (fname: string, page: Element, loopId: string, targetSource: {element: Element, count: number, currentPage: number}, sources: Array<{element: Element, count: number, currentPage: number}>):  string
}

/**
 * Call when generating routing pages.
 * E.g., [pagination].html, [alias].html, [tags].html... etc
 * If return empty or null, generating default routing pages.
 * 
 */
export interface RoutingHookFunction {
  (targetPage: Component): Promise<Component[]>
}

/**
 * Hook API structure.
 * You can specify this object into spear.config.mjs.
 */
export interface HookApi {
    pluginName: string,
    configuration?: ConfigurationHookFunction,
    beforeBuild?: BeforeBuildHookFunction,
    afterBuild? : AfterBuildHookFunction,
    bundle? : BundleHookFunction,
    pagination? : PaginationHookFunction,
    routing? : RoutingHookFunction,
}
