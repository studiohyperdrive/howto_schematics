
import { Tree, Rule, SchematicsException } from '@angular-devkit/schematics';

import { readWorkspace } from '../utils/workspace';
import { readIntoSourceFile } from '../utils/file';
import {
    findNodeByIdentifier,
    findNodes,
    findVariableDeclarations,
    insertAfterLastOccurrence,
    writeChangesToTree,
    findImports,
} from '../utils/ast';
import ts = require('typescript');
import { strings } from '@angular-devkit/core';

export const updateRoutes = ({
    module,
    name,
    project,
}: {
    module: string;
    name: string;
    project: string;
}): Rule => {
    return (tree: Tree): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        const routingModulePath = `${projectConfig.sourceRoot}/app/${module}/${module}-routing.module.ts`;

        if (!tree.exists(routingModulePath)) {
            return tree;
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(tree, routingModulePath);
        let variableDeclarations = findVariableDeclarations(templateSource);
        // TODO: clean this up so we don't have to use parent
        let routesDeclaration = findNodeByIdentifier(variableDeclarations, 'routes') as ts.Node;

        result = writeChangesToTree(
            tree,
            routingModulePath,
            [
                insertAfterLastOccurrence(
                    findImports(templateSource),
                    `\nimport { ${strings.classify(name)}Component } from './${name}/${name}.component';`,
                    routingModulePath,
                    0,
                ),
                insertAfterLastOccurrence(
                    findNodes(routesDeclaration.parent, ts.SyntaxKind.ObjectLiteralExpression),
                    `,\n  { path: '${name}', component: ${strings.classify(name)}Component }`,
                    routingModulePath,
                    0,
                ),
            ],
        );

        return result;
    };
};