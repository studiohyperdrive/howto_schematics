import * as ts from 'typescript';
import { Rule, Tree, SchematicsException } from "@angular-devkit/schematics";
import { experimental } from '@angular-devkit/core';

import { readWorkspace } from "../utils/workspace";
import { readIntoSourceFile } from "../utils/file";
import {
    findConstructor,
    findElement,
    findMethodDeclarations,
    findNode,
    findNodes,
    findPropertyDeclarations,
    insertAfterLastOccurrence,
    insertBeforeFirstOccurrence,
    removeNode,
    writeChangesToTree,
}
from
"../utils/ast";

const setupComponent = (tree: Tree, projectConfig: experimental.workspace.WorkspaceProject, { name, module }: { module: string; project: string, name: string }): Tree => {
    const componentPath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.ts`;

    if (!tree.exists(componentPath)) {
        throw new SchematicsException(`Could not find root component for (${module})`);
    }

    let templateSource = readIntoSourceFile(tree, componentPath);
    let classProperties = findPropertyDeclarations(templateSource);
    let atomsRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, 'atoms');
    let result: Tree = tree;

    if (!atomsRootNode) {
        result = writeChangesToTree(
            tree,
            componentPath,
            [
                insertBeforeFirstOccurrence(
                    [
                        ...findPropertyDeclarations(templateSource),
                        ...findConstructor(templateSource),
                        ...findMethodDeclarations(templateSource),
                    ],
                    `public atoms: Array<{ name: string; path: string; }> = [];\n\n  `,
                    componentPath,
                    0,
                ),
            ],
        );

        templateSource = readIntoSourceFile(tree, componentPath);
        classProperties = findPropertyDeclarations(templateSource);
        atomsRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, 'atoms');
    }

    const [fallback] = findNodes(atomsRootNode as ts.Node, ts.SyntaxKind.ArrayLiteralExpression);
    const items = findNodes(atomsRootNode as ts.Node, ts.SyntaxKind.ObjectLiteralExpression);

    const fallbackPos = fallback ? fallback.end - 1 : 0;

    result = writeChangesToTree(
        result,
        componentPath,
        [
            insertAfterLastOccurrence(
                items,
                `\n    { name: '${name}', path: '${name}' },${items.length ? '' : '\n  '}`,
                componentPath,
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

// TODO: generate this with styleguide module
const setupTemplate = (tree: Tree, projectConfig: experimental.workspace.WorkspaceProject, { module }: { module: string; project: string, name: string }): Tree => {
    const templatePath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.html`;

    if (!tree.exists(templatePath)) {
        throw new SchematicsException(`Could not find root component for (${module})`);
    }

    let result: Tree = tree;
    let templateSource = readIntoSourceFile(tree, templatePath);
    const defaultTag = findElement(templateSource, '<p>atoms works!</p>');

    if (defaultTag) {
        result = writeChangesToTree(tree, templatePath, [
            removeNode(defaultTag as ts.Node, templatePath),
            insertAfterLastOccurrence([], `<ul class="m-menu">
    <li *ngFor="let atom of atoms">
        <a [routerLink]="['./', atom.path]">{{ atom.name }}</a>
    </li>
</ul>

<router-outlet></router-outlet>`, templatePath, 0)
        ]);
    }

    return result;
};

export const setupRootComponent = (options: { module: string; project: string, name: string }): Rule => {
    return (tree: Tree): Tree => {
        const { project } = options;
        const workspace = readWorkspace(tree);
        const projectConfig = workspace.projects[project];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (${project}) in workspace`);
        }

        return setupTemplate(setupComponent(tree, projectConfig, options), projectConfig, options);
    };
};