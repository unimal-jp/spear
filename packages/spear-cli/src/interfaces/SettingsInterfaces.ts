import { HookApi } from "./HookCallback"

export interface DefaultSettings {
  projectName?: string
  settingsFile?: string
  pagesFolder?: string
  componentsFolder?: string
  srcDir?: string
  distDir?: string
  entry?: string
  template?: string
  spearlyAuthKey?: string
  port?: number
  host?: string
  apiDomain: string,
  generateSitemap: boolean,
  siteURL: string,
  plugins: HookApi[]
}
