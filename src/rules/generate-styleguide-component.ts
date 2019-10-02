import {
    Rule,
  } from '@angular-devkit/schematics';
  import { experimental } from '@angular-devkit/core';

import { ComponentTypes } from '../types/component';
import { generateComponent } from './generate-component';

export const generateStyleguideComponent = (
    options: {
        name: string;
        type: ComponentTypes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const {
        name,
        type,
    } = options;

    const styleguideConfig = workspace.projects['styleguide'];

    if (!styleguideConfig) {
        return [];
    }

    return [
        ...generateComponent({
            name,
            project: 'styleguide',
            module: `${type}s`,
            path: `${styleguideConfig.sourceRoot}/app/${type}s`,
            type: ComponentTypes.page,
            prefix: 'sg',
        }, workspace),
    ];
};