import * as ts from 'typescript';

import {
  Rule,
  Tree,
  // apply,
  // url,
  // applyTemplates,
  // move,
  chain,
  // mergeWith,
  // SchematicContext,
  SchematicsException,
  // branchAndMerge,
  externalSchematic,
} from '@angular-devkit/schematics';
import { experimental } from '@angular-devkit/core';

import { readWorkspace } from '../utils/workspace';
import { moduleExists } from '../utils/module';
import {
  findPropertyDeclarations,
  findNode,
  insertAfterLastOccurrence,
  findNodes,
  insertBeforeFirstOccurrence,
  findMethodDeclarations,
  findConstructor,
  writeChangesToTree,
} from '../utils/ast';
import { readIntoSourceFile } from '../utils/file';

// import {
//   strings,
//   normalize,
//   template,
// } from '@angular-devkit/core';

// import { RunSchematicTask} from '@angular-devkit/schematics/tasks';

// import { Schema as ClassOptions } from './schema';

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
    // externalSchematic('@schematics/angular', 'component', {
    //   name,
    //   project: 'styleguide',
    //   module: 'atoms',
    //   path: `${styleguideConfig.sourceRoot}/app/atoms`,
    //   style: 'scss',
    //   spec: true,
    // }),
  ];

  if (!moduleExists(tree, { root: styleguideConfig.root, module: 'atoms' })) {
    rules.unshift(
      // externalSchematic('@schematics/angular', 'module', {
      //   name: 'atoms',
      //   project: 'styleguide',
      //   module: 'app',
      //   route: '/atoms',
      //   routing: true,
      // }),
      setupRootComponent({
        module: 'atoms',
        project: 'styleguide',
        name,
      }),
    );
  }

  return rules;
};

const setupRootComponent = ({ module, project, name }: { module: string; project: string, name: string }): Rule => {
  return (tree: Tree): Tree => {
    const workspace = readWorkspace(tree);

    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
      throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    const rootComponentPath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.ts`;

    if (!tree.exists(rootComponentPath)) {
      throw new SchematicsException(`Could not find root component for (${module})`);
    }

    let templateSource = readIntoSourceFile(tree, rootComponentPath);
    let classProperties = findPropertyDeclarations(templateSource);
    let atomsRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, 'atoms');
    let result: Tree = tree;

    if (!atomsRootNode) {
      result = writeChangesToTree(
        tree,
        rootComponentPath,
        [
          insertBeforeFirstOccurrence(
            [
              ...findPropertyDeclarations(templateSource),
              ...findConstructor(templateSource),
              ...findMethodDeclarations(templateSource),
            ],
            `\npublic atoms: Array<{ name: string; path: string; }> = [];\n\n`,
            rootComponentPath,
            0,
          ),
        ],
      );

      templateSource = readIntoSourceFile(tree, rootComponentPath);
      classProperties = findPropertyDeclarations(templateSource);
      atomsRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, 'atoms');
    }

    const [fallback] = findNodes(atomsRootNode as ts.Node, ts.SyntaxKind.ArrayLiteralExpression);
    const items = findNodes(atomsRootNode as ts.Node, ts.SyntaxKind.ObjectLiteralExpression);

    const fallbackPos = fallback ? fallback.end - 1 : 0;

    result = writeChangesToTree(
      result,
      rootComponentPath,
      [
        insertAfterLastOccurrence(
          items,
          `\n{ name: '${name}', path: '/${name}' },${items.length ? '' : '\n'}`,
          rootComponentPath,
          fallbackPos,
          {
            syntaxKind: ts.SyntaxKind.ObjectLiteralExpression,
            offset: 1,
          },
        ),
      ],
    );

    return result;
  };
};

export function atomSchematic(options: any): Rule {
  return (
    tree: Tree,
    // context: SchematicContext,
  ) => {
    // verify options
    if (!options.name) {
      throw new SchematicsException('Option (name) is required!');
    }

    const workspace = readWorkspace(tree);

    const projectRules = generateProject(options, workspace);
    const styleguideRules = generateStyleguide(options, workspace, tree);
    const shouldGenerateProject = false;

    return chain([
      ...(shouldGenerateProject ? projectRules : []),
      ...styleguideRules,
    ]);
  }
}