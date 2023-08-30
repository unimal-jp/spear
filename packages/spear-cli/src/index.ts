#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { ArgumentParser } from "argparse"
import { fileURLToPath } from "url"
import magic from "./magic.js"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const parser = new ArgumentParser({
  description: "Spear CLI",
  exit_on_error: false,
})

const { version } = JSON.parse(fs.readFileSync(`${dirname}/../package.json`, "utf-8"))

parser.add_argument("-v", "--version", { action: "version", version })
parser.add_argument("-p", "--port", { required: false, type: "int" })
parser.add_argument("action", { help: "Action: create" })
parser.add_argument("projectName", { help: "Project name", nargs: "?" })
parser.add_argument("-s", "--src", { help: "Specify source directory. "})

const args = parser.parse_args()

if (args.action === "watch" || args.action === "build") {
  if (!magic(args)) {
    // Notify caller to magic fail.
    process.exit(1);
  }
}
