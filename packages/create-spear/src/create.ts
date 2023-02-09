import * as fs from "fs"
import { copy, remove } from 'fs-extra';
import * as https from "https"
import chalk from "chalk"
import gradient from "gradient-string"
import * as path from "path"
import inquirer from "inquirer"
import { fileURLToPath } from "url"

const SpearlyGradient = gradient(["#F639D1", "#AB2EFF", "#00C7FF"])

const libFilename = fileURLToPath(import.meta.url)
const libDirname = path.dirname(libFilename)
const dirname = process.cwd()

const settings = {
  answers: {
    projectName: "",
    templateType: "basic",
    useCMS: "",
    spearlyCMSApiKey: "",
    generateSitemap: "",
    siteURL: "",
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
    {
      name: "templateType",
      type: "list",
      message: "Choose template type",
      default: "basic",
      choices: ["basic", "empty"],
    },
    {
      name: "generateSitemap",
      message: "Generate Sitemap?",
      type: "list",
      default: "No",
      choices: ["Yes", "No"],
    },
    {
      name: "siteURL",
      message: "Enter your hosting URL (Example: https://foobar.netlify.app/)",
      type: "input",
      default: "",
      validate: (input) => {
        try {
          new URL(input)
        } catch (e) {
          return "input correct URL syntax. (Example: https://foobar.netlify.app/foo/";
        }
        return true;
      },
      when: (answer) => answer.generateSitemap === "Yes",
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
  const vscodePath = `${basePath}/.vscode`

  fs.mkdirSync(vscodePath)

  try {
    await copy(`${templatesPath}/${settings.answers.templateType}`, basePath);
  } catch(e) {
    console.log(`Failed copying boilerplate. :(`);
    return false;
  }

  // create package.json file
  const packageJson = JSON.parse(fs.readFileSync(`${basePath}/package.json`, "utf-8"))
  packageJson.name = settings.answers.projectName
  const cliVersion = await getSpearCliVersion()
  if (cliVersion) {
    packageJson.dependencies["@spearly/spear-cli"] = `^${cliVersion}`
  }
  fs.writeFileSync(`${basePath}/package.json`, JSON.stringify(packageJson, null, 2))


  // Create config file if needed
  const settingsFile: any = {}
  if (settings.answers.spearlyCMSApiKey) {
    settingsFile.spearlyAuthKey = settings.answers.spearlyCMSApiKey
  }
  settingsFile.projectName = settings.answers.projectName
  settingsFile.generateSitemap = settings.answers.generateSitemap === "Yes"
  settingsFile.siteURL = settings.answers.siteURL
  if (Object.keys(settingsFile).length) {
    fs.writeFileSync(
      `${basePath}/spear.config.mjs`,
      `export default ${JSON.stringify(settingsFile, null, 2)};`
    )
  }

  return true
}

function getSpearCliVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: "registry.npmjs.org",
      port: 443,
      path: "/@spearly/spear-cli",
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
