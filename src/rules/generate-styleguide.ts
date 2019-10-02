import {
    externalSchematic,
    Rule,
    Tree,
  } from '@angular-devkit/schematics';
  import { experimental } from '@angular-devkit/core';

import { moduleExists } from '../utils/module';
import { ComponentTypes } from '../types/component';
import { addModuleImport } from './add-module-import';

export const generateStyleguide = (
    options: {
        name: string;
        type: ComponentTypes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
    tree: Tree,
): Rule[] => {
    const {
        type,
    } = options;

    const styleguideConfig = workspace.projects['styleguide'];

    if (!styleguideConfig) {
        return [];
    }

    if (moduleExists(tree, { root: styleguideConfig.sourceRoot, module: `${type}s` })) {
        return [];
    }

    return [
        externalSchematic('@schematics/angular', 'module', {
            name: `${type}s`,
            project: 'styleguide',
            module: 'app',
            route: `${type}s`,
            routing: true,
        }),
        ...addModuleImport({
            targetProject: 'styleguide',
            targetModule: `${type}s`,
        }, {
            sourceProject: 'ui',
            sourceModule: 'UIModule',
        }, options),
    ];
};