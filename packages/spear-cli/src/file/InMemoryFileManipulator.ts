import { fs, vol } from "memfs";
import { FileManipulatorInterface, InMemoryFile } from "../interfaces/FileManipulatorInterface";
import { SiteMapURL } from "../interfaces/MagicInterfaces";
import { DefaultSettings } from "../interfaces/SettingsInterfaces";
import * as sass from "sass"

export class InMemoryFileManipulator implements FileManipulatorInterface {
    files: InMemoryFile[]
    settingsObject: DefaultSettings
    constructor(files: InMemoryFile[], settingsObject) {
        // Convert InMemoryFile array to falt JSON array.
        const jsonObject = this.extractInMemoryFilesToObject(files, "/")
        vol.fromJSON(jsonObject, '/')

        this.files = files
        this.settingsObject = settingsObject
    }

    extractInMemoryFilesToObject(files: InMemoryFile[], path: string): { [key: string]: string } {
        const ret = {} as { [key: string]: string }
        files.forEach(file => {
            if (file.children && file.children.length > 0) {
                const children = this.extractInMemoryFilesToObject(file.children, path + "/" + file.path)
                Object.assign(ret, children)
            } else {
                ret[path + "/" + file.path] = file.content
            }
        })
        return ret
    }

    getInMemoryFile(path: string): InMemoryFile {
        if (!this.existsSync(path)) return null
        const content = this.readFileSync(path, 'utf8')
        const ext = path.split('.').pop()

        return {
            id: path,
            path: path,
            content: content,
            language: ext,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    }

    // In memory environment, we don't care the file encoding.
    // These files is based on UTF-8.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readFileSync(path: string, encode: string): string {
        return fs.readFileSync(path, encode) as string
    }

    readFileSyncAsBuffer(path: string): Buffer {
        return Buffer.from(fs.readFileSync(path) as string, 'base64')
    }

    // Read file list in specified directory.
    readdirSync(path: string): string[] {
        return fs.readdirSync(path) as string[]
    }

    existsSync(path: string): boolean {
        return fs.existsSync(path)
    }

    isDirectory(path: string): boolean {
        return fs.lstatSync(path).isDirectory()
    }

    mkDirSync(path: string, option: { recursive: boolean } | null): void {
        if (option && option.recursive) {
            fs.mkdirSync(path, { recursive: true })
        } else {
            fs.mkdirSync(path)
        }
    }

    rmSync(path: string, option: { recursive: boolean } | null): void {
        if (!this.existsSync(path)) return
        if (option.recursive && this.isDirectory(path)) {
            const files = this.readdirSync(path)
            files.forEach(file => {
                this.rmSync(path + "/" + file, option)
            })
            return fs.rmdirSync(path)
        }
        return fs.unlinkSync(path)
    }

    writeFileSync(path: string, content: string): void {
        return fs.writeFileSync(path, content)
    }

    loadFile(): Promise<DefaultSettings> {
        return Promise.resolve(this.settingsObject)
    }

    // Use Salesforce Light SCSS parser on in-browser mode.
  compileSASS(path: string): string {
    const fileContent = fs.readFileSync(path, 'utf8');
    const filePrefix = 'file:/'
    try {
      const result = sass.compileString(fileContent.toString(),{
        importers: [{
          canonicalize(url)  {
            if (url.startsWith(filePrefix) && url.endsWith('.scss')) {
              return new URL(url);
            }

            // basename to url
            const basename = url.split('/').pop().split('.').shift() ?? url

            // generate SCSS full path
            const targetPath = path.split('/').slice(0, -1).join('/') + '/' + basename + ".scss"

            if (fs.existsSync(targetPath)) {
              return new URL(`${filePrefix}${targetPath}`);
            }

            const partialPath = path.split('/').slice(0, -1).join('/') + '/_' + basename + ".scss"

            if (fs.existsSync(partialPath)) {
              return new URL(`${filePrefix}${partialPath}`);
            }

            return null;
          },
          load(canonicalUrl) {
            // remove file:/ prefix
            const data = fs.readFileSync(canonicalUrl.toString().slice(filePrefix.length), 'utf8');

            return {
              contents: data.toString(),
              syntax: 'scss'
            };
          }
        }]
      });

      return result.css.replace(/:root/g, ':host');
    } catch (error) {
      console.error(error);
    }
    return fileContent.toString()
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
}
