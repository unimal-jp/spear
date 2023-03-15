export interface FileManipulatorInterface {
    readFileSync: (path: string, encode: string) => string,
    readFileSyncAsBuffer: (path: string) => Buffer,
    readdirSync: (path: string) => string[],
    existsSync: (path: string) => boolean,
    isDirectory: (path: string) => boolean,
    mkDirSync: (path: string, option: any) => void,
    writeFileSync: (path: string, content: string) => void,
    loadFile: (path: string) => any,
}
