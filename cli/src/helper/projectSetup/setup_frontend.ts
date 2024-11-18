import { CLIENT_TEMPLATE_DIR, SCRIPT_TITLE } from "../../config/index.js";
import ProjectOptions from "../../@types/project.js";
import path from "path";
import { getPackageJsonDataFromPath } from "../../helper/getPackageJson.js";
import getCwd from "../../util/getCwd.js";
import getPkgVersion from "../../helper/getPkgVersion.js";
import { copyDirectoryToDestination, createFile, createFolder, readFileData, updateFileContent } from "../../helper/file-manager.js";
import pretty from "pretty"
import cleanUpProjectName from "../../util/cleanProjectName.js";
import sleep from "../../util/sleep.js";
import logger from "../../util/logger.js";
import showLoading from "../../util/loader.js";
import inquirer from "inquirer";
import installDependencies from "../../helper/installDependencies.js";
import chalk from "chalk";
import { VANILLA_CSS_CONTENT, VANILLA_HTML_CONTENT } from "../../data/template.js";
import { vanillSetupMessage } from "../../const/index.js";
import initializeGit from "../../helper/initGit.js";

/**
 * 
 * @param promptInput 
 * 
{
  projectName: 'prospark-project',
  projectType: 'Blank',
  architecture: 'Poly-repo',
  stack: 'frontend',
  variant: 'Javascript',
  frontendFramework: 'React',
  frontendStyling: 'tailwindcss (vanilla, nextjs, react, vue)'
}
*/

enum Variant{
    JS="javascript",
    TS="typescript"
}

class SetupFrontend{
    
    protected variant;
    protected scaffoldDesc = "Scaffolded using prospark"
    public constructor(promptInput: ProjectOptions){
        this.variant = promptInput.variant;
        this.variant.toLowerCase() === "javascript" && this.handleJavascriptSetup(promptInput);
        this.variant.toLowerCase() === "typescript" && this.handleTypescriptSetup(promptInput);
    }

    public async askDependenciesInstalled(){
        const ans = await inquirer.prompt([{
            type: 'confirm',
            name: 'shouldInstall',
            message: 'Install npm dependencies?:',
            prefix: chalk.greenBright("\n?")
        }])

        return ans.shouldInstall;
    }

    public async askForGitInit(){
        const ans = await inquirer.prompt([{
            type: 'confirm',
            name: 'shouldInit',
            message: 'Initialize git reppository?:',
            prefix: chalk.greenBright("\n?")
        }])

        return ans.shouldInit;
    }

    public async setupCssModule(promptInput: ProjectOptions, dest_path: string){
        const {frontendFramework, variant} = promptInput;
        const Loader = await showLoading();
        if(frontendFramework?.toLowerCase() === "vanilla" && variant.toLowerCase() === "javascript"){
            const styleDir = `${dest_path}/styles`;
            const styleFile = `main.css`;
            const styleContent = VANILLA_CSS_CONTENT;

            Loader.start("setting up css module...")
            // create directory
            await createFolder("styles", dest_path);
            // setup css module file
            createFile(styleDir, styleFile, styleContent);
            Loader.stop("css module setuped successfully.", null);
        }
        if(frontendFramework?.toLowerCase() === "vanilla" && variant.toLowerCase() === "typescript"){
            const styleDir = `${dest_path}/src/styles`;
            const styleFile = `main.css`;
            const styleContent = VANILLA_CSS_CONTENT;

            Loader.start("setting up css module...")
            // console.log(dest_path+"/src")
            // create directory
            await createFolder("styles", dest_path+"/src");
            // setup css module file
            createFile(styleDir, styleFile, styleContent);
            Loader.stop("css module setuped successfully.", null);
        }
    }

    public handleJavascriptSetup(promptInput: ProjectOptions){
        const {frontendFramework, frontendStyling} = promptInput;

        if(frontendFramework?.toLowerCase() === "vanilla" && frontendStyling?.toLowerCase() === "tailwindcss"){
            return this.isVanillaAndTailwind(promptInput)
        }
        if(frontendFramework?.toLowerCase() === "vanilla" && frontendStyling?.toLowerCase() === "css module"){
            return this.isVanillaAndCssModule(promptInput)
        } 
    }

    public handleTypescriptSetup(promptInput: ProjectOptions){
        const {frontendFramework, frontendStyling} = promptInput;

        if(frontendFramework?.toLowerCase() === "vanilla" && frontendStyling?.toLowerCase() === "tailwindcss"){
            return this.isVanillaAndTailwind(promptInput)
        }
        if(frontendFramework?.toLowerCase() === "vanilla" && frontendStyling?.toLowerCase() === "css module"){
            return this.isVanillaAndCssModule(promptInput)
        }
    }

    // if the frontend framework choosen is vanilla and styling used is tailwindcss
    protected async isVanillaAndTailwind(promptInput: ProjectOptions){
        const {projectName, projectType, architecture, stack, variant, frontendFramework, frontendStyling} = promptInput;
        const templatePath = variant.toLowerCase() === Variant.JS ? `/js_support/vanilla` : `/ts_support/vanilla`
        const vanillaDir = path.join("./",CLIENT_TEMPLATE_DIR, templatePath);
        const cleanProjectName = cleanUpProjectName(projectName)

        const dest_path = getCwd();

        if(cleanProjectName !== "."){
            await createFolder(cleanProjectName, dest_path)
        }
        
        try {
            const projDirPath = `${getCwd()}/${cleanProjectName}`;
            const from = vanillaDir;
            const to = projDirPath;
            
            // copy template folder to cwd where this command is been initiated.
            await copyDirectoryToDestination(from, to);

            let pkgJsonData = getPackageJsonDataFromPath(to+"/package.json");
            pkgJsonData["name"] = projectName === "." ? SCRIPT_TITLE : projectName
            pkgJsonData["description"] = this.scaffoldDesc;
            
            // update index.html file in 'vanilla' client template
            const htmlFilePath = variant.toLowerCase() === "typescript" ? path.join(to, `/index.html`) : path.join(to, `/index.html`)
            const scriptPath = variant.toLowerCase() === "typescript" ? "./src/main.ts" : "./main.js";
            const newHtmlData = VANILLA_HTML_CONTENT
                .replace("{{projectName}}", projectName)
                .replace("{{script_logic}}", `${
                    projectType.toLowerCase() === "blank" ?
                    "Blank Project"
                    :
                    "Starter Project" 
                }`)
                .replace("{{styling_logic}}", `<script src="https://cdn.tailwindcss.com" defer></script>`)
                .replace("{{script_tag}}", `<script type="module" src="${scriptPath}"></script>`)
                .replace(
                    "{{vanilla_markup_content}}", 
                    `
                    <div class="w-full h-[100vh] bg-[#123468] text-[#fff] flex flex-col items-center justify-center text-center">
                        <h3 class="text-white-200 text-[25px] font-extrabold">Vanilla(${variant}) + Tailwindcss</h3>
                        <br />
                        <button id="counter" class="px-3 py-2 rounded-md bg-blue-400 text-white-100" type="button">Counter</button>
                    </div>
                    `
                )

            // update html file to include tailwindcss config
            await updateFileContent(htmlFilePath, pretty(newHtmlData,{ocd: true}));
            // update package.json
            await updateFileContent(to+"/package.json", JSON.stringify(pkgJsonData, null, 2));
            

            // ask for packages to be installed
            const shouldInstall = await this.askDependenciesInstalled();
            let hasInstalled = false;

            if(shouldInstall){
                const devDep = Object.keys(pkgJsonData["devDependencies"]);
                // start installation
                await installDependencies(to, true, devDep);
                hasInstalled = true;
            }

            // ask for git initialization
            const shouldInitializeGit = await this.askForGitInit();
            
            if(shouldInitializeGit){
                await initializeGit(to);
            }

            // show welcome message
            console.log(chalk.cyanBright(
                hasInstalled ? 
                vanillSetupMessage
                .replace("{{to}}", to)
                .replace("{{projectName}}", projectName)
                .replace("{{command}}", "npm run dev")
                :
                vanillSetupMessage
                .replace("{{to}}", to)
                .replace("{{projectName}}", projectName)
                .replace("{{command}}", `npm install\nnpm run dev`)
            ))

        } catch (e: any) {
            logger.error(e)
        }
    }

    // if framework choosen is vanilla and css module
    protected async isVanillaAndCssModule(promptInput: ProjectOptions){
        const {projectName, projectType, architecture, stack, variant, frontendFramework, frontendStyling} = promptInput;
        const templatePath = variant.toLowerCase() === Variant.JS ? `/js_support/vanilla` : `/ts_support/vanilla`
        const vanillaDir = path.join("./",CLIENT_TEMPLATE_DIR, templatePath);
        const cleanProjectName = cleanUpProjectName(projectName)

        // create project directory from project name
        const dest_path = getCwd();

        if(cleanProjectName !== "."){
            await createFolder(cleanProjectName, dest_path)
        }

        try {
            const projDirPath = `${getCwd()}/${cleanProjectName}`;
            const from = vanillaDir;
            const to = projDirPath;
            
            // copy template folder to cwd where this command is been executed.
            await copyDirectoryToDestination(from, to);

            let pkgJsonData = getPackageJsonDataFromPath(to+"/package.json");
            pkgJsonData["name"] = projectName === "." ? SCRIPT_TITLE : projectName
            pkgJsonData["description"] = this.scaffoldDesc;
            
            // update index.html file in 'vanilla' client template
            const htmlFilePath = variant.toLowerCase() === "typescript" ? path.join(to, `/index.html`) : path.join(to, `/index.html`)
            const stylePath = variant.toLowerCase() === "typescript" ? "./src/styles/main.css" : "./styles/main.css";
            const scriptPath = variant.toLowerCase() === "typescript" ? "./src/main.ts" : "./main.js";
            const newHtmlData = VANILLA_HTML_CONTENT
                .replace("{{projectName}}", projectName)
                .replace("{{script_logic}}", `${
                    projectType.toLowerCase() === "blank" ?
                    "Blank Project"
                    :
                    "Starter Project" 
                }`)
                .replace("{{styling_logic}}", `<link rel="stylesheet" href="${stylePath}" />`)
                .replace("{{script_tag}}", `<script type="module" src="${scriptPath}"></script>`)
                .replace(
                    "{{vanilla_markup_content}}", 
                    `
                    <div>
                        <h3 class="heading">Vanilla(${variant}) + CssModule</h3>
                        <div class="card">
                            <button id="counter" type="button">Counter</button>
                        </div>
                    </div>
                    `
                )

            // update html file to include tailwindcss config
            await updateFileContent(htmlFilePath, pretty(newHtmlData,{ocd: true}));
            // update package.json
            await updateFileContent(to+"/package.json", JSON.stringify(pkgJsonData, null, 2));

            // setup css module
            await this.setupCssModule(promptInput, to);

            // ask for packages to be installed
            const shouldInstall = await this.askDependenciesInstalled();
            let hasInstalled = false;
            
            if(shouldInstall){
                const devDep = Object.keys(pkgJsonData["devDependencies"]);
                // start installation
                await installDependencies(to, true, devDep);
                hasInstalled = true;
            }
            
            // ask for git initialization
            const shouldInitializeGit = await this.askForGitInit();
            
            if(shouldInitializeGit){
                await initializeGit(to);
            }

            // show welcome message
            console.log(chalk.cyanBright(
                hasInstalled ? 
                vanillSetupMessage
                .replace("{{to}}", to)
                .replace("{{projectName}}", projectName)
                .replace("{{command}}", "npm run dev")
                :
                vanillSetupMessage
                .replace("{{to}}", to)
                .replace("{{projectName}}", projectName)
                .replace("{{command}}", `npm install\nnpm run dev`)
            ))

        } catch (e: any) {
            logger.error(e)
        }
    }

    protected isReactAndTailwind(promptInput: ProjectOptions){
        const {projectName, projectType, architecture, stack, variant, frontendFramework, frontendStyling} = promptInput;
        const templatePath = variant.toLowerCase() === Variant.JS ? `/js_support/react/` : `/ts_support/react/`
        const reactDir = path.join(getCwd(),CLIENT_TEMPLATE_DIR, templatePath);
        let pkgJsonData = getPackageJsonDataFromPath(reactDir+"package.json");
        pkgJsonData["name"] = projectName === "." ? SCRIPT_TITLE : projectName
        pkgJsonData["description"] = this.scaffoldDesc;
        // get package versions
        // let tailwindVersion = getPkgVersion("tailwindcss"),
        // postcss = getPkgVersion("postcss"),
        // autoprefixer = getPkgVersion("autoprefixer")

        // setup tailwindcss for vanilla js and html


        // update dependencies
        // pkgJsonData["devDependencies"] = {
        //     ...pkgJsonData["devDependencies"], 
        //     "tailwindcss" : tailwindVersion,
        //     "postcss" : postcss,
        //     "autoprefixer" : autoprefixer,
        // }
    }

    protected createTailwindcssFiles(){
        // files and file content
        let postcssFilename = `postcss.config.js`,
        postcssCont = `
        module.exports = {
            plugins: {
              tailwindcss: {},
              autoprefixer: {},
            }
        }
        `,
        tailwindFilename = `tailwind.config.js`,
        tailwindCont = `
        module.exports = {
            content: ["./src/**/*.{html,js}"],
            theme: {
                extend: {},
            },
            plugins: [],
        }
        `,
        mainCssname = `main.css`,
        mainCssCont = `
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
        `
    }
}

export default SetupFrontend
