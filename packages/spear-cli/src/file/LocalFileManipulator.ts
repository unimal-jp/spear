import fs from "fs";
import glob from "glob";
import path from "path";
import { parse as yamlParse } from "yaml";
import { FileManipulatorInterface } from "../interfaces/FileManipulatorInterface";
import sass from "sass"
import { SiteMapURL } from "../interfaces/MagicInterfaces";
import { SitemapStream, streamToPromise } from "sitemap";
import { Readable } from "stream";

export class LocalFileManipulator implements FileManipulatorInterface {
    loadFile(filePath: string): any {
        return new Promise((resolve, reject) => {
          glob(filePath, null, async (er, files) => {
            if (er) {
              reject(er);
              return;
            }
    
            if (files.length > 0) {
              const ext = path.extname(files[0]);
    
              if (ext === ".js" || ext === ".mjs") {
                const data = await import(
                  files[0],
                  files[0].indexOf("json") > -1
                    ? { assert: { type: "json" } }
                    : undefined
                );
                resolve(data.default);
              } else if (ext === ".json") {
                const data = this.readFileSync(files[0], "utf8");
                resolve(JSON.parse(data));
              } else if (ext === ".yaml") {
                const data = this.readFileSync(files[0], "utf8");
                resolve(yamlParse(data));
              } else {
                resolve(this.readFileSync(files[0], "utf8"));
              }
            } else {
              resolve(null);
            }
          });
        });

    }
    readFileSync(filePath: string, encode: string): string {
        return fs.readFileSync(filePath, encode as BufferEncoding)
    }
    readFileSyncAsBuffer(filePath: string): Buffer {
        return fs.readFileSync(filePath)
    }
    readdirSync(filePath: string): string[] {
        return fs.readdirSync(filePath)
    }
    existsSync(filePath: string): boolean {
        return fs.existsSync(filePath)
    }
    isDirectory(filePath: string): boolean {
        return fs.lstatSync(filePath).isDirectory()
    }
    mkDirSync(filePath: string, option: any): void {
        fs.mkdirSync(filePath, option)
        return
    }
    rmSync(filePath: string, option: any): void {
      fs.rmSync(filePath, option)
      return
    }
    writeFileSync(filePath: string, content: string): void {
        return fs.writeFileSync(filePath, content)
    }

    compileSASS(filePath: string): string {
      const result = sass.compile(filePath);
      return result.css;
    }

    async generateSiteMap(linkList: Array<SiteMapURL>, siteURL: string): Promise<string> {
      try {
        const data = await streamToPromise(
          Readable.from(linkList).pipe(
            new SitemapStream({ hostname: siteURL })
          )
        );
        return data.toString()
      } catch (e) {
        console.log(e);
      }
    }

    debug(): void {
      console.log("LocalFileManipulator");
    }
}