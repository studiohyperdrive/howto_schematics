import * as ts from 'typescript';
import { strings, join, Path } from '@angular-devkit/core';
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
import { upper } from '../utils/strings';
import { classify } from '@angular-devkit/core/src/utils/strings';
import { ComponentTypes } from '../types/component';

const updateStyleguideRoutes = ({
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

        const routingModulePath = join(projectConfig.sourceRoot as Path, 'app', module, `${module}-routing.module.ts`);

        if (!tree.exists(routingModulePath)) {
            return tree;
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(result, routingModulePath);
        let variableDeclarations = findVariableDeclarations(templateSource);
        // TODO: clean this up so we don't have to use parent
        let routesDeclaration = findNodeByIdentifier(variableDeclarations, `${upper(module)}_ROUTES`) as ts.Node;

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
                    `  { path: '${name}', component: ${strings.classify(name)}Component, data: { title: '${classify(name)}' } },${routeConfigs.length ? '' : '\n'}`,
                    routingModulePath,
                    routesDeclaration.getEnd() + 12, // TODO: fix this properly
                ),
            ],
        );

        return result;
    };
};

const updateNavigation = ({
    type,
    project,
}: {
    type: ComponentTypes;
    project: string;
}): Rule => {
    return (tree: Tree): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        const appComponentPath = join(projectConfig.sourceRoot as Path, 'app', 'app.component.ts');

        if (!tree.exists(appComponentPath)) {
            return tree;
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(result, appComponentPath);
        let navItems = findNodes(templateSource, ts.SyntaxKind.VariableDeclarationList);
        let items = findNodes(navItems[0], ts.SyntaxKind.ArrayLiteralExpression);

        if (navItems.find((item) => item.getFullText().includes(`${type}s`))) {
            return result;
        }

        result = writeChangesToTree(
            result,
            appComponentPath,
            [
                insertAfterLastOccurrence(
                    items,
                    `\n  { path: '${type}s', label: '${classify(type)}s' },\n`,
                    appComponentPath,
                    items[0].getEnd() - 2,
                    {
                        offset: -1
                    }
                ),
            ],
        );

        return result;
    };
};

export const updateRoutes = (options: {
    module: string;
    name: string;
    project: string;
    type: ComponentTypes;
}): Rule[] => {
    return [
        updateStyleguideRoutes(options),
        updateNavigation(options),
    ];
};