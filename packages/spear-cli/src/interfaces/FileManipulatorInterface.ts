import { SiteMapURL } from "./MagicInterfaces";
import { DefaultSettings } from "./SettingsInterfaces";

export interface FileManipulatorInterface {
  readFileSync: (path: string, encode: string) => string;
  readFileSyncAsBuffer: (path: string) => Buffer;
  readdirSync: (path: string) => string[];
  existsSync: (path: string) => boolean;
  isDirectory: (path: string) => boolean;
  mkDirSync: (path: string, option: { recursive: boolean } | null) => void;
  rmSync: (path: string, option: { recursive: boolean } | null) => void;
  writeFileSync: (path: string, content: string) => void;
  loadFile: (path: string) => Promise<DefaultSettings>;
  compileSASS: (path: string) => string;
  generateSiteMap: (linkList: Array<SiteMapURL>, siteURL: string) => Promise<string>;
  debug: () => void;
}

export type InMemoryFile = {
  id: string;
  path: string;
  content: string;
  language: string;
  children: InMemoryFile[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type Settings = DefaultSettings;
