import * as ts from 'typescript';
import { Tree, DirEntry, Rule, SchematicContext, SchematicsException } from '@angular-devkit/schematics';
import { Path, join } from '@angular-devkit/core';

import { readWorkspace } from './workspace';
import { readIntoSourceFile } from './file';
import { findNgModuleDecorator, findNgModuleImports, findNodes, writeChangesToTree, insertAfterLastOccurrence, findImports } from './ast';

export const moduleExists = (tree: Tree, { root, module }: { root?: string; module: string; }): boolean => {
    // TODO: use proper module resolution
    return tree.exists(`${root}/app/atoms/${module}.module.ts`);
};

/**
 * Function to find the 'closest' module to a generated file's path.
 */
export const findModule = (
    host: Tree,
    generateDir: string,
    {
        moduleExt = '.module.ts',
        routingModuleExt = '-routing.module.ts',
        module,
    }: {
        moduleExt?: string;
        routingModuleExt?: string;
        module?: string;
    }
): Path => {
    let dir: DirEntry | null = host.getDir('/' + generateDir);
    let foundRoutingModule = false;

    while (dir) {
        const allMatches = dir.subfiles.filter(p => p.endsWith(module ? `${module}${moduleExt}` : moduleExt));
        const filteredMatches = allMatches.filter(p => !p.endsWith(module ? `${module}${routingModuleExt}` : routingModuleExt));

        foundRoutingModule = foundRoutingModule || allMatches.length !== filteredMatches.length;

        if (filteredMatches.length == 1) {
            return join(dir.path, filteredMatches[0]);
        } else if (filteredMatches.length > 1) {
            throw new Error(
                'More than one module matches.'
            );
        }

        dir = dir.parent;
    }

    const errorMsg = foundRoutingModule ? 'Could not find a non Routing NgModule.'
        + `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.`
        : 'Could not find an NgModule.';

    throw new Error(errorMsg);
};

export const addModuleImport = (
    { targetProject, targetModule }: { targetModule: string; targetProject: string; },
    { sourceModule, sourceProject }: { sourceModule: string; sourceProject: string; },
): Rule => {
    return (tree: Tree, context: SchematicContext): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[targetProject];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${targetProject}) in workspace`);
        }

        const fileRoot = join(projectConfig.sourceRoot as Path, 'app', 'atoms') as string;
        const modulePath = findModule(tree, fileRoot, { module: targetModule });

        let result: Tree = tree;
        const templateSource = readIntoSourceFile(tree, modulePath);
        const ngModule = findNgModuleDecorator(templateSource) as ts.Node;
        const imports = findNgModuleImports(ngModule) as ts.Node;

        const importStatements = findNodes(imports, ts.SyntaxKind.Identifier);

        if (importStatements.map((is) => is.getText()).includes(sourceModule)) {
            context.logger.info(`${sourceModule} already imported`);

            return result;
        }

        result = writeChangesToTree(
            tree,
            modulePath,
            [
                insertAfterLastOccurrence(
                    findImports(templateSource),
                    `\nimport { ${sourceModule} } from '${sourceProject}';`,
                    modulePath,
                    0,
                ),
                insertAfterLastOccurrence(
                    importStatements,
                    `,\n    ${sourceModule}`,
                    modulePath,
                    0,
                ),
            ],
        );

        return result;
    };
};