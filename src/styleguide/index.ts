import {
  apply,
  applyTemplates,
  chain,
  externalSchematic,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  url,
  MergeStrategy,
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';

import { ComponentPrefixes } from '../types/component';
import { readWorkspace } from '../utils/workspace';

const updateLinter = (): Rule => {
  return (tree: Tree) => {
    const workspace = readWorkspace(tree);

    const projectConfig = workspace.projects['ui'];

    if (!projectConfig) {
      throw new SchematicsException(`Could not find project (ui) in workspace`);
    }

    const tslintConfigPath = `${projectConfig.root}/tslint.json`;

    if (!tree.exists(tslintConfigPath)) {
      return tree;
    }

    const tslintConfig = tree.read(tslintConfigPath) || '';
    const prefixes = [
      ComponentPrefixes.atom,
      ComponentPrefixes.molecule,
      ComponentPrefixes.organism,
      ComponentPrefixes.page,
    ].map(prefix => `"${prefix}"`).join(', ');

    tree.overwrite(tslintConfigPath, tslintConfig.toString().replace(/"ui"/g, `[${prefixes}]`));

    return tree;
  };
};

const addDependencies = (): Rule => {
  return (tree: Tree) => {
    const packageJson = tree.read('package.json');

    if (!packageJson) {
      throw new SchematicsException(`Could not find a package.json in workspace`);
    }

    const packageJsonContents = JSON.parse(packageJson.toString());

    tree.overwrite('package.json', JSON.stringify({
      ...packageJsonContents,
      dependencies: {
        ...packageJsonContents.dependencies,
        "@angular/cdk": "^8.2.3",
        "@angular/material": "^8.2.3",
        "ngx-markdown": "8.2.1",
      },
    }, null, 2));

    return tree;
  };
};

const setupStyleguide = (): Rule => {
  return (tree: Tree) => {
    const workspace = readWorkspace(tree);

    const projectConfig = workspace.projects['styleguide'];

    if (!projectConfig) {
      throw new SchematicsException(`Could not find project (styleguide) in workspace`);
    }

    const templates = apply(url(`./files`), [
      applyTemplates({
        ...strings,
        project: workspace.defaultProject,
      }),
      move(projectConfig.sourceRoot as string),
    ]);

    return mergeWith(templates, MergeStrategy.Overwrite);
  };
};


// import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

// const installDependencies = (): Rule => {
//   return (_tree: Tree, context: SchematicContext) => {
//     const packages = [
//       "@angular/cdk@8.*",
//       "@angular/material@8.*",
//       "ngx-markdown@8.2.1",
//     ];

//     packages.forEach((packageName: string) => {
//       context.addTask(new NodePackageInstallTask({
//         packageName,
//       }));
//     })
//   };
// };

export function styleguideSchematic(_options: any): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    return chain([
      externalSchematic('@schematics/angular', 'application', {
        name: 'styleguide',
        prefix: ComponentPrefixes.styleguide,
        routing: true,
        style: 'scss',
        skipInstall: true,
      }),
      setupStyleguide(),
      externalSchematic('@schematics/angular', 'library', {
        name: 'ui',
        prefix: 'ui',
        skipInstall: true,
      }),
      updateLinter(),
      addDependencies(),
    ]);
  };
}
