import { SpearSettings, SpearOption, Content } from './APIInterface.js'

export interface ConfigurationHookFunction {
    (setting: SpearSettings, option: SpearOption): Promise<SpearSettings | null>
}

/**
 * Call before starting build process.
 * This function is implemented the collecting data from any sources.
 */
export interface CollectorFunction {
    (): Promise<Content[]>
}

export interface ContentCollectionAPI {
    configuration? : ConfigurationHookFunction,
    collector? : CollectorFunction,
}