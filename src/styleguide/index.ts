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
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

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

const updateWorkspace = (): Rule => {
  return (tree: Tree) => {
    const workspace = tree.read('angular.json');

    if (!workspace) {
      throw new SchematicsException(`Could not find an angular.json in workspace`);
    }

    const workspaceContents = JSON.parse(workspace.toString());

    tree.overwrite('angular.json', JSON.stringify({
      ...workspaceContents,
      projects: {
        ...workspaceContents.projects,
        styleguide: {
          ...workspaceContents.projects.styleguide,
          architect: {
            ...workspaceContents.projects.styleguide.architect,
            build: {
              ...workspaceContents.projects.styleguide.architect.build,
              options: {
                ...workspaceContents.projects.styleguide.architect.build.options,
                assets: [
                  ...workspaceContents.projects.styleguide.architect.build.options.assets,
                  {
                    glob: '**/readme.md',
                    input: 'projects/ui/src/lib',
                    output: '/assets',
                  },
                ],
              },
            },
          },
        },
      },
    }, null, 2));

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

const installDependencies = ({ skipInstall }: { skipInstall?: boolean; }): Rule => {
  return (tree: Tree, context: SchematicContext) => {
    if (skipInstall) {
      return tree;
    }

    context.addTask(new NodePackageInstallTask());
  };
};

export function styleguideSchematic(options: any): Rule {
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
      updateWorkspace(),
      addDependencies(),
      installDependencies(options),
    ]);
  };
}
