import { HookApi } from "./HookCallbackInterface"

export interface DefaultSettings {
  projectName?: string
  settingsFile?: string
  pagesFolder?: string
  componentsFolder?: string[]
  srcDir?: string[]
  distDir?: string
  entry?: string
  template?: string
  spearlyAuthKey?: string
  port?: number
  host?: string
  crossOriginIsolation: boolean,
  apiDomain: string,
  analysysDomain: string,
  generateSitemap: boolean,
  siteURL: string,
  rootDir: string,
  plugins: HookApi[],
  // This option is for the in-browser mode option.
  targetPagesPathList?: string[],
  quiteMode?: boolean,
  embedMode? : boolean,
  debugMode? : boolean,
  generateComponents?: boolean,
  maxPaginationCount?: number,
}
