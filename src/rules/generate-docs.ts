import {
    Rule,
    mergeWith,
    apply,
    applyTemplates,
    move,
    url,
    SchematicsException,
} from '@angular-devkit/schematics';
import {
    strings,
    join,
    Path,
    experimental,
} from '@angular-devkit/core';

import { ComponentPrefixes } from '../types/component';

export const generateDocs = ({
    name,
    path,
    project,
    prefix,
    type,
}: {
    name: string;
    path: string;
    prefix: string;
    project: string;
    type: string;
}, workspace: experimental.workspace.WorkspaceSchema,): Rule[] => {
    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
        throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    const componentPrefix = prefix || (ComponentPrefixes as any)[type];
    const componentPath = path || `${projectConfig.sourceRoot}/lib/${type}`;

    const templates = apply(url(`../templates/type`), [
        applyTemplates({
            ...strings,
            name,
            prefix: componentPrefix,
            project,
            type,
        }),
        move(join(componentPath as Path, name)),
    ]);

    return [
        mergeWith(templates),
    ];
};
