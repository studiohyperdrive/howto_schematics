import * as ts from 'typescript';
import { Rule, Tree, SchematicsException } from "@angular-devkit/schematics";
import { experimental } from '@angular-devkit/core';

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
import { ComponentTypes } from '../types/component';

export const setupComponent = (
    projectConfig: experimental.workspace.WorkspaceProject,
    {
        name,
        module,
        type,
    }: {
        module: string;
        project: string;
        name: string;
        type: ComponentTypes;
    },
): Rule => {
    return (tree: Tree): Tree => {
        const componentPath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.ts`;

        if (!tree.exists(componentPath)) {
            throw new SchematicsException(`Could not find root component for (${module})`);
        }

        let templateSource = readIntoSourceFile(tree, componentPath);
        let classProperties = findPropertyDeclarations(templateSource);
        let typeRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, `${type.toString()}s`);
        let result: Tree = tree;

        if (!typeRootNode) {
            result = writeChangesToTree(
                result,
                componentPath,
                [
                    insertBeforeFirstOccurrence(
                        [
                            ...findPropertyDeclarations(templateSource),
                            ...findConstructor(templateSource),
                            ...findMethodDeclarations(templateSource),
                        ],
                        `public ${type}s: Array<{ name: string; path: string; }> = [];\n\n  `,
                        componentPath,
                        0,
                    ),
                ],
            );

            templateSource = readIntoSourceFile(result, componentPath);
            classProperties = findPropertyDeclarations(templateSource);
            typeRootNode = findNode(classProperties, ts.SyntaxKind.Identifier, `${type}s`);
        }

        const [fallback] = findNodes(typeRootNode as ts.Node, ts.SyntaxKind.ArrayLiteralExpression);
        const items = findNodes(typeRootNode as ts.Node, ts.SyntaxKind.ObjectLiteralExpression);

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
};

// TODO: generate this with styleguide module
export const setupTemplate = (
    projectConfig: experimental.workspace.WorkspaceProject,
    {
        module,
        type,
    }: {
        module: string;
        project: string;
        name: string;
        type: ComponentTypes;
    }
): Rule => {
    return (tree: Tree): Tree => {
        const templatePath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.html`;

        if (!tree.exists(templatePath)) {
            throw new SchematicsException(`Could not find root component for (${module})`);
        }

        let result: Tree = tree;
        let templateSource = readIntoSourceFile(result, templatePath);
        const defaultTag = findElement(templateSource, `<p>${type}sworks!</p>`, { stripWhitespace: true });

        if (defaultTag) {
            result = writeChangesToTree(result, templatePath, [
                removeNode(defaultTag as ts.Node, templatePath),
                insertAfterLastOccurrence([], `<ul class="m-menu">
        <li *ngFor="let ${type} of ${type}s">
            <a [routerLink]="['./', ${type}.path]">{{ ${type}.name }}</a>
        </li>
    </ul>

    <router-outlet></router-outlet>`, templatePath, 0)
            ]);
        }

        return result;
    };
};

export const updateRootComponent = (
    options: {
        module: string;
        project: string;
        name: string;
        type: ComponentTypes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const { project } = options;

    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
        throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    return [
        setupComponent(projectConfig, options),
        setupTemplate(projectConfig, options),
    ];
};