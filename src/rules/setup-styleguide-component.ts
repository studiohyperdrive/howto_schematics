import { Rule, Tree, SchematicsException } from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { strings } from '@angular-devkit/core';

import { readWorkspace } from '../utils/workspace';
import { writeChangesToTree, insertAfterLastOccurrence, removeNode, findElement } from '../utils/ast';
import { readIntoSourceFile } from '../utils/file';
import { ComponentTypes, ComponentPrefixes } from '../types/component';

export const setupStyleguideComponent = (
    {
        project,
        name,
        type,
    }: {
        module: string;
        project: string;
        name: string;
        type: ComponentTypes;
    }
): Rule[] => {
    return [(tree: Tree): Tree => {
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        const templatePath = `${projectConfig.sourceRoot}/app/${type}s/${name}/${name}.component.html`;

        if (!tree.exists(templatePath)) {
            throw new SchematicsException(`Could not find component for (${name})`);
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(result, templatePath);
        const defaultTag = findElement(templateSource, `<p>${name}works!</p>`, { stripWhitespace: true });

        if (defaultTag) {
            result = writeChangesToTree(result, templatePath, [
                removeNode(defaultTag as ts.Node, templatePath),
            ]);
        }

        const prefix = ComponentPrefixes[type];

        result = writeChangesToTree(result, templatePath, [
            insertAfterLastOccurrence([], `<div class="m-component-overview">
    <h1>${strings.capitalize(type)}s - ${strings.capitalize(name)}</h1>
    <div class="m-component-overview__wrapper">
        <${prefix}-${strings.dasherize(name)}></${prefix}-${strings.dasherize(name)}>
    </div>
</div>`, templatePath, 0)
        ]);

        return result;
    }];
};
