export interface EditorFile {
  type: string
  name: string
  path: string
  content: string
  language: string
  children?: EditorFile[]
}
