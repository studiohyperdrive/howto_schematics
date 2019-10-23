import { experimental } from '@angular-devkit/core';
import { Rule, SchematicsException, externalSchematic } from '@angular-devkit/schematics';

import { ComponentTypes, ComponentPrefixes } from '../types/component';

export const generateComponent = (
    options: {
        project: string;
        name: string;
        module?: string;
        style?: string;
        spec?: boolean;
        type?: ComponentTypes;
        prefix?: ComponentPrefixes | string;
        path?: string;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const {
        project = 'ui',
        name,
        module = 'ui',
        style = 'scss',
        spec = true,
        type = 'atom',
        prefix,
        path,
    } = options;
    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
        throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    const componentPrefix = prefix || (ComponentPrefixes as any)[type];
    const componentPath = path || `${projectConfig.sourceRoot}/lib/${type}`;

    return [
        externalSchematic('@schematics/angular', 'component', {
            name,
            project,
            module,
            path: componentPath,
            prefix: componentPrefix,
            export: true,
            style,
            styleext: style,
            spec,
        }),
    ];
};
