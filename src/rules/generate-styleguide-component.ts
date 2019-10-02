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
    } = options;

    const styleguideConfig = workspace.projects['styleguide'];

    if (!styleguideConfig) {
        return [];
    }

    return [
        ...generateComponent({
            name,
            project: 'styleguide',
            module: 'atoms',
            path: `${styleguideConfig.sourceRoot}/app/atoms`,
            type: ComponentTypes.page,
            prefix: 'sg',
        }, workspace),
    ];
};