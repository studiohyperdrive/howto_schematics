import { Rule, Tree, SchematicsException } from '@angular-devkit/schematics';
import * as ts from 'typescript';

import { readWorkspace } from '../utils/workspace';
import { writeChangesToTree, insertAfterLastOccurrence, removeNode, findElement } from '../utils/ast';
import { strings } from '@angular-devkit/core';
import { readIntoSourceFile } from '../utils/file';

export const setupStyleguideComponent = ({ project, name }: { module: string; project: string, name: string }): Rule => {
    return (tree: Tree): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        const templatePath = `${projectConfig.sourceRoot}/app/atoms/${name}/${name}.component.html`;

        if (!tree.exists(templatePath)) {
            throw new SchematicsException(`Could not find component for (${name})`);
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(tree, templatePath);
        const defaultTag = findElement(templateSource, `<p>${name} works!</p>`);

        if (defaultTag) {
            result = writeChangesToTree(tree, templatePath, [
                removeNode(defaultTag as ts.Node, templatePath),
            ]);
        }

        result = writeChangesToTree(tree, templatePath, [
            insertAfterLastOccurrence([], `<div class="m-component-overview">
    <h1>Atoms - ${strings.capitalize(name)}</h1>
    <div class="m-component-overview__wrapper">
        <a-${strings.dasherize(name)}></a-${strings.dasherize(name)}>
    </div>
</div>`, templatePath, 0)
        ]);

        return result;
    };
};
