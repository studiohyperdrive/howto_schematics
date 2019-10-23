import {
    Rule, apply, url, applyTemplates, move, mergeWith, MergeStrategy, Tree, SchematicContext, externalSchematic,
  } from '@angular-devkit/schematics';
  import { experimental, strings, Path, join } from '@angular-devkit/core';

import { ComponentTypes, ComponentPrefixes } from '../types/component';
import * as stringUtils from '../utils/strings';

const generateComponent = ({
    type,
    path
}: {
    type: ComponentTypes;
    path: Path;
}): Rule => {
    return (tree: Tree) => {
        const componentPath = join(path, `${type}s`, `${type}s.component.ts`);

        if (tree.exists(componentPath)) {
            return tree;
        }

        return externalSchematic('@schematics/angular', 'component', {
            name: `${type}s`,
            project: 'styleguide',
            module: `${type}s`,
            prefix: ComponentPrefixes.styleguide,
            export: true,
            style: 'scss',
            styleext: 'scss',
            spec: true,
        });
    };
};

const updateComponent = ({
    type,
    path,
}: {
    type: ComponentTypes;
    path: Path;
}): Rule => {
    return (tree: Tree, context: SchematicContext): Tree => {
        const typeRoot = join(path, 'app', `${type}s`);

        if (tree.exists(join(typeRoot, `${type}s.component.ts`))) {
            const templateSource = tree.read(join(typeRoot, `${type}s-routing.module.ts`));

            // TODO: check this properly
            if ((templateSource as Buffer).toString().includes(`${stringUtils.upper(type)}S_ROUTES`)) {
                return tree;
            }
        }

        const templates = apply(url('../templates/type-module'), [
            applyTemplates({
                ...strings,
                ...stringUtils,
                type,
            }),
            move(typeRoot),
        ]);

        return mergeWith(templates, MergeStrategy.Overwrite)(tree, context) as Tree;
    };
};

export const generateStyleguideRootComponent = (
    options: {
        name: string;
        type: ComponentTypes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const {
        type,
    } = options;

    const styleguideConfig = workspace.projects['styleguide'];

    if (!styleguideConfig) {
        return [];
    }

    return [
        generateComponent({
            type,
            path: styleguideConfig.sourceRoot as Path,
        }),
        updateComponent({
            type,
            path: styleguideConfig.sourceRoot as Path,
        }),
    ];
};