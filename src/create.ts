import fs from "fs"
import chalk from "chalk"
import readline from "readline"
import path from "path"
import { fileURLToPath } from "url"

declare module "readline" {
  export function question(input: any, callback: any): void
  export function close(): void
}

const SPEARLY = "7963F0"
const SPEARLY_SECONDARY = "a0a0a0"

const libFilename = fileURLToPath(import.meta.url)
const libDirname = path.dirname(libFilename)
const dirname = process.cwd()

const settings = {
  questions: [
    {
      key: "spearlyAuthKey",
      question: `Will you use ${chalk.hex(SPEARLY)("Spearly CMS")}? ${chalk
        .hex(SPEARLY_SECONDARY)
        .dim("enter your API KEY")}: `,
      hasAnswer: true,
    },
  ],
  answers: {
    projectName: "",
    spearlyAuthKey: "",
  },
  projectDir: dirname.split("/").slice(-1)[0],
}

const read = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

function showMessage(message: string) {
  process.stdout.write(message)
}

function promptQuestion(message: any, preAnswer?: string): Promise<string> {
  return new Promise((resolve) => {
    let formattedPreAnswer = ""
    if (preAnswer) {
      formattedPreAnswer = ` ${chalk.hex(SPEARLY_SECONDARY).dim(`(${preAnswer}) `)}`
    }

    read.question(`${message} ${formattedPreAnswer}`, (answer) => {
      process.stdout.moveCursor(0, -1)
      process.stdout.clearLine(1)
      process.stdout.write(`${message} ${chalk.hex(SPEARLY)(answer || preAnswer || "")}`)
      process.stdout.write("\n\r")
      resolve(answer || preAnswer || "")
    })
  })
}

async function askQuestions() {
  showMessage(` ### Welcome to ${chalk.hex(SPEARLY)("Spear CLI")} ###\n\r\n\r`)

  settings.answers.projectName = await promptQuestion("Project name:", settings.answers.projectName)

  settings.answers.spearlyAuthKey = await promptQuestion(
    `Will you use ${chalk.hex(SPEARLY)("Spearly CMS")}? ${chalk
      .hex(SPEARLY_SECONDARY)
      .dim("enter your API KEY")}: `
  )

  showMessage("\n\rDone 🚀\n\r")
  showMessage("To start using:\n\r")
  showMessage(chalk.green(`    cd ${settings.answers.projectName} \n\r`))
  showMessage(chalk.green("    yarn install \n\r\n\r"))
}

function createProjectFolder() {
  if (!settings.answers.projectName) {
    if (fs.readdirSync(dirname).length) {
      showMessage(`The folder ${chalk.blue(settings.projectDir)} is not empty :(\n\r`)
      return false
    }
    settings.answers.projectName = settings.projectDir
  } else {
    try {
      fs.mkdirSync(`${dirname}/${settings.answers.projectName}`)
      settings.projectDir = settings.answers.projectName
    } catch (error) {
      if (error.code === "EEXIST") {
        showMessage(`The folder ${chalk.blue(settings.answers.projectName)} already exists :(\n\r`)
      }
      return false
    }
  }

  return true
}

function createBoilerplate() {
  const templatesPath = `${libDirname}/templates`
  const basePath = `${dirname}/${settings.projectDir}`
  const publicPath = `${basePath}/public`
  const srcPath = `${basePath}/src`
  const srcComponentsPath = `${basePath}/src/components`

  fs.mkdirSync(publicPath)
  fs.mkdirSync(srcPath)
  fs.mkdirSync(srcComponentsPath)

  const templates = [
    { source: `${templatesPath}/index.html`, target: `${publicPath}/index.html` },
    { source: `${templatesPath}/index.spear`, target: `${srcPath}/index.spear` },
    { source: `${templatesPath}/main.spear`, target: `${srcComponentsPath}/main.spear` },
    { source: `${templatesPath}/header.spear`, target: `${srcComponentsPath}/header.spear` },
  ]

  templates.forEach((f) => {
    fs.writeFileSync(f.target, fs.readFileSync(f.source, "utf8"))
  })

  const packageJson = JSON.parse(fs.readFileSync(`${templatesPath}/package_template.json`, "utf-8"))
  packageJson.name = settings.answers.projectName
  fs.writeFileSync(`${basePath}/package.json`, JSON.stringify(packageJson, null, 2))

  return true
}

export default async function main(projectName: string) {
  settings.answers.projectName = projectName

  await askQuestions()

  if (!createProjectFolder()) {
    read.close()
    return
  }

  if (!createBoilerplate()) {
    read.close()
    return
  }

  read.close()
}
