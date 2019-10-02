import { Tree, DirEntry } from "@angular-devkit/schematics";
import { Path, join } from "@angular-devkit/core";

export const moduleExists = (tree: Tree, { root, module }: { root?: string; module: string; }): boolean => {
    // TODO: use proper module resolution
    return tree.exists(`${root}/app/atoms/${module}.module.ts`);
};

/**
 * Function to find the "closest" module to a generated file's path.
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
