import * as ts from 'typescript';
import { Rule, SchematicContext, Tree, SchematicsException } from '@angular-devkit/schematics';
import { join, Path } from '@angular-devkit/core';

import { readWorkspace } from '../utils/workspace';
import { findModule } from '../utils/module';
import { readIntoSourceFile } from '../utils/file';
import {
    findImports,
    findNgModuleDecorator,
    findNgModuleImports,
    findNodes,
    insertAfterLastOccurrence,
    writeChangesToTree,
} from '../utils/ast';

export const addUIModuleImport = ({ project, module }: { module: string; project: string; }): Rule => {
    return (tree: Tree, context: SchematicContext): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        const fileRoot = join(projectConfig.sourceRoot as Path, 'app', 'atoms') as string;
        const modulePath = findModule(tree, fileRoot, { module });

        let result: Tree = tree;
        const templateSource = readIntoSourceFile(tree, modulePath);
        const ngModule = findNgModuleDecorator(templateSource) as ts.Node;
        const imports = findNgModuleImports(ngModule) as ts.Node;

        const importStatements = findNodes(imports, ts.SyntaxKind.Identifier);

        if (importStatements.map((is) => is.getText()).includes('UIModule')) {
            context.logger.info('UIModule already imported');

            return result;
        }

        result = writeChangesToTree(
            tree,
            modulePath,
            [
                insertAfterLastOccurrence(
                    findImports(templateSource),
                    `\nimport { UIModule } from 'ui';`,
                    modulePath,
                    0,
                ),
                insertAfterLastOccurrence(
                    importStatements,
                    `,\n    UIModule`,
                    modulePath,
                    0,
                ),
            ],
        );

        return result;
    };
};