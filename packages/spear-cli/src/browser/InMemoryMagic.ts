import { DefaultSettings } from "../interfaces/SettingsInterfaces";

export type InMemoryFile = {
  id: string;
  path: string;
  content: string;
  language: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type Settings = DefaultSettings

/**
 * inMemoryMagic
 * This function will generate the static site from specified source.
 * This function should be receive the specified source code structure and build option parameter like spear.config.mjs.
 * 
 */
export default function inMemoryMagic(inputFiles: InMemoryFile[], settings: Settings) {
    console.log("helle")
    console.log(inputFiles, settings)

    // Alternative for parsing component and page.
    // We should prepare the component and page structure here.

    // Make instance of cms-js-core generator.

    // Inserting Component into component here.

    // Inserting CMS Content 

    // Dump the result of generated code.
}