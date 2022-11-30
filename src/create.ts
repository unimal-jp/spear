import fs from "fs"
import https from "https"
import chalk from "chalk"
import gradient from "gradient-string"
import path from "path"
import inquirer from "inquirer"
import { fileURLToPath } from "url"

const SpearlyGradient = gradient(["#F639D1", "#AB2EFF", "#00C7FF"])

const libFilename = fileURLToPath(import.meta.url)
const libDirname = path.dirname(libFilename)
const dirname = process.cwd()

const settings = {
  answers: {
    projectName: "",
    useCMS: "",
    spearlyCMSApiKey: "",
  },
  projectDir: dirname.split("/").slice(-1)[0],
}

const prompt = inquirer.createPromptModule()

async function askQuestions() {
  console.log(` ### Welcome to ${SpearlyGradient("Spear CLI")} ###\n\r\n\r`)

  const questions = [
    {
      name: "projectName",
      type: "input",
      message: "Name of your project",
      default: settings.answers.projectName,
    },
    {
      name: "useCMS",
      type: "list",
      message: "Use Spearly CMS",
      default: "Yes",
      choices: ["Yes", "No"],
    },
    {
      name: "spearlyCMSApiKey",
      type: "input",
      message: "Enter your Spearly CMS API KEY",
      when: (answers) => answers.useCMS === "Yes",
    },
  ]

  settings.answers = await prompt(questions)

  if (settings.answers.useCMS === "No") {
    console.log(
      `  ❤️  If you want to learn more about ${SpearlyGradient(
        "Spearly CMS"
      )}: https://cms.spearly.com/`
    )
  }

  console.log(`
  ## Your project was created 🎉

  To start using, run the following command:
      cd ${settings.answers.projectName}
      yarn install

  To start local server, run
      yarn dev

  To build static sources, run
      yarn build

  `)
}

function createProjectFolder() {
  try {
    fs.mkdirSync(`${dirname}/${settings.answers.projectName}`)
    settings.projectDir = settings.answers.projectName
  } catch (error) {
    if (error.code === "EEXIST") {
      console.log(`The folder ${chalk.blue(settings.answers.projectName)} already exists :(`)
    }
    return false
  }

  return true
}

async function createBoilerplate() {
  const templatesPath = `${libDirname}/templates`
  const basePath = `${dirname}/${settings.projectDir}`
  // const publicPath = `${basePath}/public`
  const srcPath = `${basePath}/src`
  const vscodePath = `${basePath}/.vscode`
  const srcPagesPath = `${basePath}/src/pages`
  const srcComponentsPath = `${basePath}/src/components`

  // fs.mkdirSync(publicPath)
  fs.mkdirSync(srcPath)
  fs.mkdirSync(srcPagesPath)
  fs.mkdirSync(srcComponentsPath)
  fs.mkdirSync(vscodePath)

  const templates = [
    // { source: `${templatesPath}/index.html`, target: `${publicPath}/index.html` },
    { source: `${templatesPath}/index.spear`, target: `${srcPagesPath}/index.spear` },
    { source: `${templatesPath}/main.spear`, target: `${srcComponentsPath}/main.spear` },
    { source: `${templatesPath}/header.spear`, target: `${srcComponentsPath}/header.spear` },
    { source: `${templatesPath}/vscodeSettings.json`, target: `${vscodePath}/settings.json` },
  ]

  templates.forEach((f) => {
    fs.writeFileSync(f.target, fs.readFileSync(f.source, "utf8"))
  })

  // create package.json file
  const packageJson = JSON.parse(fs.readFileSync(`${templatesPath}/package_template.json`, "utf-8"))
  packageJson.name = settings.answers.projectName
  const cliVersion = await getSpearCliVersion()
  if (cliVersion) {
    packageJson.dependencies["spear-cli"] = `^${cliVersion}`
  }
  fs.writeFileSync(`${basePath}/package.json`, JSON.stringify(packageJson, null, 2))

  // Create config file if needed
  const settingsFile: any = {}
  if (settings.answers.spearlyCMSApiKey) {
    settingsFile.spearlyCMSApiKey = settings.answers.spearlyCMSApiKey
  }
  if (Object.keys(settingsFile).length) {
    fs.writeFileSync(
      `${basePath}/spear.config.json`,
      `${JSON.stringify(settingsFile, null, 2)}`
    )
  }

  return true
}

function getSpearCliVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: "registry.npmjs.org",
      port: 443,
      path: "/spear-cli",
      method: "GET",
    }

    const req = https.request(options, (res) => {
      res.setEncoding("utf8")

      const chunks = []

      res.on("data", (chunk) => {
        chunks.push(chunk)
      })

      res.on("end", () => {
        const data = JSON.parse(chunks.join(""))
        resolve(data["dist-tags"].latest)
      })
    })

    req.on("error", (error) => {
      throw new Error(error.message)
    })

    req.end()
  })
}

export default async function main(projectName: string) {
  settings.answers.projectName = projectName || settings.projectDir

  await askQuestions()

  if (!createProjectFolder()) {
    return
  }

  if (!createBoilerplate()) {
    return
  }
}
