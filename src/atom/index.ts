import {
  Rule,
  Tree,
  chain,
  SchematicsException,
  externalSchematic,
} from '@angular-devkit/schematics';
import { experimental } from '@angular-devkit/core';

import { readWorkspace } from '../utils/workspace';
import { moduleExists } from '../utils/module';
import { setupRootComponent } from './root-component';

const generateProject = (options: any, workspace: experimental.workspace.WorkspaceSchema): Rule[] => {
  const {
    project = 'ui',
    name,
    module = 'ui',
    style = 'scss',
    spec = true,
  } = options;
  const projectConfig = workspace.projects[project];

  if (!projectConfig) {
    throw new SchematicsException(`Could not find project (${project}) in workspace`);
  }

  return [
    externalSchematic('@schematics/angular', 'component', {
      name,
      project,
      module,
      path: `${projectConfig.sourceRoot}/lib/atoms`,
      prefix: 'a',
      style,
      styleext: style,
      spec,
    }),
  ];
};

const generateStyleguide = (options: any, workspace: experimental.workspace.WorkspaceSchema, tree: Tree): Rule[] => {
  const {
    name,
  } = options;

  const styleguideConfig = workspace.projects['styleguide'];

  if (!styleguideConfig) {
    return [];
  }

  const rules: Rule[] = [
    externalSchematic('@schematics/angular', 'component', {
      name,
      project: 'styleguide',
      module: 'atoms',
      path: `${styleguideConfig.sourceRoot}/app/atoms`,
      style: 'scss',
      spec: true,
    }),
  ];

  if (!moduleExists(tree, { root: styleguideConfig.root, module: 'atoms' })) {
    rules.unshift(
      externalSchematic('@schematics/angular', 'module', {
        name: 'atoms',
        project: 'styleguide',
        module: 'app',
        route: 'atoms',
        routing: true,
      }),
      setupRootComponent({
        module: 'atoms',
        project: 'styleguide',
        name,
      }),
    );
  }

  return rules;
};

export function atomSchematic(options: any): Rule {
  return (tree: Tree) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required!');
    }

    const workspace = readWorkspace(tree);

    const projectRules = generateProject(options, workspace);
    const styleguideRules = generateStyleguide(options, workspace, tree);

    return chain([
      ...projectRules,
      ...styleguideRules,
    ]);
  }
}