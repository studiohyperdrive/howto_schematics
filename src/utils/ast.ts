import * as ts from 'typescript';
import { Change } from '../types/change';
import { InsertChange, RemoveChange } from './change';
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
export function getSourceNodes(sourceFile: ts.SourceFile, kind?: ts.SyntaxKind): ts.Node[] {
    const nodes: ts.Node[] = [sourceFile];
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
}

export function findNode(nodes: ts.Node[], kind: ts.SyntaxKind, text?: string): ts.Node | null {
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

export const findPropertyDeclarations = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.PropertyDeclaration);
};

export const findMethodDeclarations = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.MethodDeclaration);
};

export const findConstructor = (sourceFile: ts.SourceFile) => {
    return getSourceNodes(sourceFile, ts.SyntaxKind.Constructor);
};

export const findElement = (sourceFile: ts.SourceFile, text: string, startsWith: boolean = true): ts.Node | null => {
    const nodes = getSourceNodes(sourceFile);

    return nodes.find((node) => {
        const nodeText = node.getText();

        return nodeText === text || (startsWith && nodeText.startsWith(text));
     }) || null;
};

/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
export const nodesByPosition = (first: ts.Node, second: ts.Node): number => {
    return first.getStart() - second.getStart();
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
