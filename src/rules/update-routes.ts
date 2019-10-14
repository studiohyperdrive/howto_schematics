import * as ts from 'typescript';
import { strings } from '@angular-devkit/core';
import { Tree, Rule, SchematicsException } from '@angular-devkit/schematics';

import { readWorkspace } from '../utils/workspace';
import { readIntoSourceFile } from '../utils/file';
import {
    findNodeByIdentifier,
    findNodes,
    insertAfterLastOccurrence,
    writeChangesToTree,
    findImports,
    findVariableDeclarations,
} from '../utils/ast';

export const updateRoutes = ({
    module,
    name,
    project,
}: {
    module: string;
    name: string;
    project: string;
}): Rule[] => {
    return [(tree: Tree): Tree => {
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
        let templateSource = readIntoSourceFile(result, routingModulePath);
        let variableDeclarations = findVariableDeclarations(templateSource);
        // TODO: clean this up so we don't have to use parent
        let routesDeclaration = findNodeByIdentifier(variableDeclarations, 'routes') as ts.Node;
        let routeConfigs = findNodes(routesDeclaration, ts.SyntaxKind.ObjectLiteralExpression);

        result = writeChangesToTree(
            result,
            routingModulePath,
            [
                insertAfterLastOccurrence(
                    findImports(templateSource),
                    `\nimport { ${strings.classify(name)}Component } from './${name}/${name}.component';`,
                    routingModulePath,
                    0,
                ),
                insertAfterLastOccurrence(
                    routeConfigs,
                    `\n  { path: '${name}', component: ${strings.classify(name)}Component },${routeConfigs.length ? '' : '\n'}`,
                    routingModulePath,
                    routesDeclaration.getEnd() + 12, // TODO: fix this properly
                ),
            ],
        );

        return result;
    }];
};