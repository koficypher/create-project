import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import execa from 'execa';
import Listr from 'listr';
import  {URL}  from 'url';
import { projectInstall } from 'pkg-install';

//making fs and ncp return promises for easier consumption
const access = promisify(fs.access);
const copy = promisify(ncp);

//function that does the actual copying without overwriting existing files
async function copyTemplateFiles(options) {
 return copy(options.templateDirectory, options.targetDirectory, {
   clobber: false,
 });
}

//function to run git init
async function initGit(options) {
    const result = await execa('git', ['init'], {
      cwd: options.targetDirectory,
    });
    if (result.failed) {
      return Promise.reject(new Error('Failed to initialize git'));
    }
    return;
   }

// parsing options and setting target directory
export async function createProject(options) {
 options = {
   ...options,
   targetDirectory: options.targetDirectory || process.cwd(),
 };

 //setting the currenting url for locating the template files
 const currentFileUrl = import.meta.url;
 const templateDir = path.resolve(
   new URL(currentFileUrl).pathname,
   '../../templates',
   options.template.toLowerCase()
 );
 options.templateDirectory = templateDir.slice(3); //optional .slice(3) to get rid of windows bug

 //checking to see if file exist and can be read
 try {
     console.log(new URL(currentFileUrl).pathname);
   await access(templateDir.slice(3), fs.constants.R_OK);
 } catch (err) {
   console.log(err);
   console.error('%s Invalid template name', chalk.red.bold('ERROR'));
   process.exit(1);
 }

 //task lister
 const tasks = new Listr([
    {
      title: 'Copy project files',
      task: () => copyTemplateFiles(options),
    },
    {
      title: 'Initialize git',
      task: () => initGit(options),
      enabled: () => options.git,
    },
    {
      title: 'Installing dependencies',
      task: () =>
        projectInstall({
          cwd: options.targetDirectory,
        }),
      skip: () =>
        !options.runInstall
          ? 'Pass --install to automatically install dependencies'
          : undefined,
    },
  ]);

  //run tasks
  await tasks.run();
 //alert user on completion
 console.log('%s Project ready', chalk.green.bold('DONE'));
 return true;
}