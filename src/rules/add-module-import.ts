import * as ts from 'typescript';
import { Tree, Rule, SchematicContext, SchematicsException } from '@angular-devkit/schematics';
import { Path, join } from '@angular-devkit/core';

import { readWorkspace } from '../utils/workspace';
import { readIntoSourceFile } from '../utils/file';
import { findNgModuleDecorator, findNgModuleImports, findNodes, writeChangesToTree, insertAfterLastOccurrence, findImports } from '../utils/ast';
import { findModule } from '../utils/module';

export const addModuleImport = (
    { targetProject, targetModule }: { targetModule: string; targetProject: string; },
    { sourceModule, sourceProject }: { sourceModule: string; sourceProject: string; },
): Rule[] => {
    return [(tree: Tree, context: SchematicContext): Tree => {
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
    }];
};