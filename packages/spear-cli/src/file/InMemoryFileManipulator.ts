import { FileManipulatorInterface, InMemoryFile } from "../interfaces/FileManipulatorInterface";
import { SiteMapURL } from "../interfaces/MagicInterfaces";
import { DefaultSettings } from "../interfaces/SettingsInterfaces";

export class InMemoryFileManipulator implements FileManipulatorInterface {
    files: InMemoryFile[]
    settingsObject: DefaultSettings
    constructor(files: InMemoryFile[], settingsObject) {
        this.files = files
        this.settingsObject = settingsObject
    }

    getInMemoryFile(path: string): InMemoryFile {
        for (const file of this.files) {
            if (this.isSamePath(file.path, path)) return file
        }
        return null
    }

    // In memory environment, we don't care the file encoding.
    // These files is based on UTF-8.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readFileSync(path: string, encode: string): string {
        for (const file of this.files) {
            if (this.isSamePath(file.path, path)) return file.content
        }
        return ""
    }

    readFileSyncAsBuffer(path: string): Buffer {
        for (const file of this.files) {
            if (this.isSamePath(file.path, path)) return Buffer.from(file.content, 'base64')
        }
        return Buffer.from("", 'base64')
    }

    readdirSync(path: string): string[] {
        const ret = [] as string[]
        this.files.forEach(file => {
            if (file.path.includes(path)) ret.push(file.path.replace(path, "").replace("/", ""))
        })
        return ret
    }

    existsSync(path: string): boolean {
        for (const file of this.files) {
            if (file.path.includes(path)) return true
        }
        return false
    }

    isDirectory(path: string): boolean {
        for (const file of this.files) {
            if (this.isSamePath(file.path, path) && (file.content === null || file.content === ""))
                return true
        }
        return false
    }

    mkDirSync(path: string): void {
        this.files.push({
            id: (Date.now()).toString(),
            path,
            content: "",
            language: "",
            createdAt: new Date(),
            updatedAt: new Date(),
        })
    }

    rmSync(path: string, option: any): void {
        const files = [] as InMemoryFile[]
        for (const file of this.files) {
            if ((option.recursive && !file.path.includes(path)) && file.path !== path) {
                files.push(file)
            }
        }
        this.files = files
    }

    writeFileSync(path: string, content: string): void {
        // If file path is exists, override content.
        for (const file of this.files) {
            if (this.isSamePath(file.path, path)) {
                file.content = content
                return
            }
        }

        const lastDotPosition = path.lastIndexOf('.')
        const language = path.substring(lastDotPosition + 1)
        this.files.push({
            id: (Date.now()).toString(),
            path,
            content,
            language,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
    }

    loadFile(pathPattern: string): any {
        return Promise.resolve(this.settingsObject)
    }

    compileSASS(path: string):string {
        return ""
    }

    async generateSiteMap(linkList: Array<SiteMapURL>, siteURL: string): Promise<string> {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${linkList.map(item => `
    <url>
      <loc>${siteURL}/${item.url}</loc>
      <changefreq>${item.changefreq}</changefreq>
      <priority>${item.priority}</priority>
    </url>
  `).join('')}
</urlset>`;
        return Promise.resolve(xml)
    }

    debug(): void {
      console.log("InMemoryFileManipulator debug");
      console.log(this.files);
    }

    isSamePath(path1: string, path2: string): boolean {
      return path1.replace('//', '/') === path2.replace('//', '/');
    }
}