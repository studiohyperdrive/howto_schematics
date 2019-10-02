import { Tree } from "@angular-devkit/schematics";

export const moduleExists = (tree: Tree, { root, module }: { root?: string; module: string; }): boolean => {
    // TODO: use proper module resolution
    return tree.exists(`${root}/app/atoms/${module}.module.ts`);
};