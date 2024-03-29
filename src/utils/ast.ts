import * as ts from 'typescript';
import { Change } from '../types/change';
import { InsertChange, RemoveChange, ReplaceChange } from './change';
import { Tree } from '@angular-devkit/schematics/src/tree/interface';

/**
 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
 * @param node
 * @param kind
 * @param max The maximum number of items to return.
 * @param recursive Continue looking for nodes of kind recursive until end
 * the last child even when node of kind has been found.
 * @return all nodes of kind, or [] if none is found
 */
export const findNodes = (node: ts.Node, kind: ts.SyntaxKind, max = Infinity, recursive = false): ts.Node[] => {
    if (!node || max == 0) {
        return [];
    }

    const nodes: ts.Node[] = [];

    if (node.kind === kind) {
        nodes.push(node);
        max -= 1;
    }

    if (max > 0 && (recursive || node.kind !== kind)) {
        const children = node.getChildren();

        for (const child of children) {
            findNodes(child, kind, max).forEach((childNode) => {
                if (max > 0) {
                    nodes.push(childNode);
                }

                max -= 1;
            });

            if (max <= 0) {
                break;
            }
        }
    }

    return nodes;
};

/**
 * Get all the nodes from a source.
 * @param sourceFile The source file object.
 * @returns {Observable<ts.Node>} An observable of all the nodes in the source.
 */
export const getSourceNodes = (sourceFile: ts.SourceFile, kind?: ts.SyntaxKind): ts.Node[] => {
    const nodes: ts.Node[] = [sourceFile];

    return filterNodesByKind(nodes, kind, sourceFile);
};

export const filterNodesByKind = (nodes: ts.Node[], kind?: ts.SyntaxKind, sourceFile?: ts.SourceFile): ts.Node[] => {
    const result = [];

    while (nodes.length > 0) {
        const node = nodes.shift();

        if (node) {
            result.push(node);
            if (node.getChildCount(sourceFile) >= 0) {
                nodes.unshift(...node.getChildren());
            }
        }
    }

    if (kind) {
        return result.filter((node: ts.Node) => node.kind === kind);
    }

    return result;
};

export const findNode = (nodes: ts.Node[], kind: ts.SyntaxKind, text?: string): ts.Node | null => {
    return nodes.find((node: ts.Node) => {
        if (node.kind === kind && (!text || node.getText() === text)) {
            // throw new Error(node.getText());
            return node;
        }

        const childNodes = node.getChildren();

        if (childNodes.length) {
            return findNode(childNodes, kind, text);
        }
    }) || null;
};

export const findNodeByIdentifier = (nodes: ts.Node[], identifier: string): ts.Node | null => {
    const identifiers = filterNodesByKind(nodes, ts.SyntaxKind.Identifier);

    return identifiers.find((node) => node.getText() === identifier) || null;
};

export const findPropertyDeclarations = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.PropertyDeclaration);
};

export const findVariableDeclarations = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.VariableDeclaration);
};

export const findMethodDeclarations = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.MethodDeclaration);
};

export const findIdentifiers = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.Identifier);
};

export const findConstructor = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.Constructor);
};

export const findElement = (sourceFile: ts.SourceFile, text: string, {
    startsWith = true,
    stripWhitespace = false,
}: {
    startsWith?: boolean;
    stripWhitespace?: boolean;
} = {}): ts.Node | null => {
    const nodes = getSourceNodes(sourceFile);

    return nodes.find((node) => {
        const nodeText = stripWhitespace ? node.getText().replace(/\s/gm, '') : node.getText();

        return nodeText === text || (startsWith && nodeText.startsWith(text));
    }) || null;
};

export const findImports = (sourceFile: ts.SourceFile): ts.Node[] => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.ImportDeclaration);
};

export const findNgModuleDecorator = (sourceFile: ts.SourceFile): ts.Node | null => {
    const decorators = getSourceNodes(sourceFile, ts.SyntaxKind.Decorator);

    // TODO: clean this up

    return decorators.find((node) => node.getText().startsWith('@NgModule')) || null;
};

export const findNgModuleImports = (decoratorNode: ts.Node): ts.Node | null => {
    const properties = findNodes(decoratorNode, ts.SyntaxKind.PropertyAssignment);

    return properties.find((prop) => prop.getText().startsWith('imports')) || null;
};

/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
export const nodesByPosition = (first: ts.Node, second: ts.Node): number => {
    return first.getStart() - second.getStart();
};

export const replaceOccurence = (
    node: ts.Node,
    newText: string,
    file: string,
): Change => {
    return new ReplaceChange(file, node.getStart(), node.getText(), newText);
};

export const insertAfterLastOccurrence = (
    nodes: ts.Node[],
    toInsert: string,
    file: string,
    fallbackPos: number,
    {
        syntaxKind,
        offset = 0
    }: {
        syntaxKind?: ts.SyntaxKind;
        offset?: number;
    } = {}
): Change => {
    let lastItem: ts.Node | undefined;

    for (const node of nodes) {
        if (!lastItem || lastItem.getStart() < node.getStart()) {
            lastItem = node;
        }
    }

    if (syntaxKind && lastItem) {
        lastItem = findNodes(lastItem, syntaxKind).sort(nodesByPosition).pop();
    }

    if (!lastItem && fallbackPos == undefined) {
        throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
    }

    const lastItemPosition: number = lastItem ? lastItem.getEnd() + offset : fallbackPos;

    return new InsertChange(file, lastItemPosition, toInsert);
};

export const insertBeforeFirstOccurrence = (
    nodes: ts.Node[],
    toInsert: string,
    file: string,
    fallbackPos: number,
    {
        syntaxKind,
        offset = 0
    }: {
        syntaxKind?: ts.SyntaxKind;
        offset?: number;
    } = {}
): Change => {
    let firstItem: ts.Node | undefined;

    for (const node of nodes) {
        if (!firstItem || firstItem.getStart() > node.getStart()) {
            firstItem = node;
        }
    }

    if (syntaxKind && firstItem) {
        firstItem = findNodes(firstItem, syntaxKind).sort(nodesByPosition).shift();
    }

    if (!firstItem && fallbackPos == undefined) {
        throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
    }

    const firstItemPosition: number = firstItem ? firstItem.getStart() - offset : fallbackPos;

    return new InsertChange(file, firstItemPosition, toInsert);
}

export const removeNode = (
    toRemove: ts.Node,
    file: string,
): Change => {
    return new RemoveChange(file, toRemove.getStart(), toRemove.getFullText());
}

export const writeChangesToTree = (tree: Tree, sourcePath: string, changes: Change[]): Tree => {
    const changeRecorder = tree.beginUpdate(sourcePath);

    for (const change of changes) {
        if (change instanceof InsertChange) {
            changeRecorder.insertLeft(change.pos, change.toAdd);
        }

        if (change instanceof RemoveChange) {
            changeRecorder.remove(change.pos, change.toRemove.length);
        }
    }

    tree.commitUpdate(changeRecorder);

    return tree;
};
