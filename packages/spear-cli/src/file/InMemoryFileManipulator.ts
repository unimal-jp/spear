import { FileManipulatorInterface, InMemoryFile } from "../interfaces/FileManipulatorInterface";


export class InMemoryFileManipulator implements FileManipulatorInterface {
    files: InMemoryFile[]
    constructor(files: InMemoryFile[]) {
        this.files = files
    }

    // In memory environment, we don't care the file encoding.
    // These files is based on UTF-8.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readFileSync(path: string, encode: string): string {
        for (const file of this.files) {
            if (file.path === path) return file.content
        }
        return ""
    }

    readFileSyncAsBuffer(path: string): Buffer {
        for (const file of this.files) {
            if (file.path === path) return Buffer.from(file.content, 'base64')
        }
        return Buffer.from("", 'base64')
    }

    readdirSync(path: string): string[] {
        const ret = [] as string[]
        this.files.forEach(file => {
            if (file.path.includes(path)) ret.push(file.path.replace(path, ""))
        })
        return ret
    }

    existsSync(path: string): boolean {
        for (const file of this.files) {
            if (file.path === path) return true
        }
        return false
    }

    isDirectory(path: string): boolean {
        for (const file of this.files) {
            if (file.path === path && file.content === "") return true
        }
        return false
    }

    mkDirSync(path: string, option: any): void {
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
            // TODO: This condition is incompletely.
            //  We should care the 
            if ((option.recursive && file.path.includes(path)) || file.path == path) {
                files.push(file)
            }
        }
        this.files = files
    }

    writeFileSync(path: string, content: string): void {
        // If file path is exists, override content.
        for (const file of this.files) {
            if (file.path === path) {
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
    loadFile: (path: string) => any;
}