import { SpearSettings, SpearOption, SpearState } from './APIInterface.js'

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
 * Hook API structure.
 * You can specify this object into spear.config.mjs.
 */
export interface HookApi {
    configuration?: ConfigurationHookFunction,
    beforeBuild?: BeforeBuildHookFunction,
    afterBuild? : AfterBuildHookFunction,
    bundle? : BundleHookFunction,
}
