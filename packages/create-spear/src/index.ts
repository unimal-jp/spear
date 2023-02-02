import * as fs from "fs"
import * as path from "path"
import { ArgumentParser } from "argparse"
import { fileURLToPath } from "url"
import create from "./create.js"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const { version } = JSON.parse(fs.readFileSync(`${dirname}/package.json`, "utf-8"))
const parser = new ArgumentParser({
  description: "Spear CLI",
  exit_on_error: false,
})
const args = parser.parse_args()
parser.add_argument("-v", "--version", { action: "version", version })

export async function main() {
  console.log(args)

  create(args.projectName)
}