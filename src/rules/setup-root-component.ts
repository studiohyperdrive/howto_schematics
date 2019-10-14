import { Rule, Tree, SchematicsException, externalSchematic } from '@angular-devkit/schematics';
import { experimental } from '@angular-devkit/core';

import { ComponentTypes, ComponentPrefixes } from '../types/component';

export const setupRootComponent = (
    options: {
        module: string;
        project: string;
        name: string;
        type: ComponentTypes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const { project, module } = options;

    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
        throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    return [(tree: Tree) => {
        const componentPath = `${projectConfig.sourceRoot}/app/${module}/${module}.component.ts`;

        if (tree.exists(componentPath)) {
            return tree;
        }

        return externalSchematic('@schematics/angular', 'component', {
            name: module,
            project,
            module,
            // path: path || `${projectConfig.sourceRoot}/lib/${type}`,
            prefix: ComponentPrefixes.styleguide,
            export: true,
            style: 'scss',
            styleext: 'scss',
            spec: true,
        });
    }];
};