import { Rule, apply, url, applyTemplates, move, mergeWith, MergeStrategy, SchematicContext } from '@angular-devkit/schematics';
import { experimental, strings, Path, join } from '@angular-devkit/core';

import { ComponentTypes, ComponentPrefixes } from '../types/component';
import { generateComponent } from './generate-component';
import * as stringUtils from '../utils/strings';
import { Tree } from '@angular-devkit/schematics/src/tree/interface';

const updateComponent = ({
    type,
    name,
    path,
    prefix,
}: {
    type: ComponentTypes;
    name: string;
    path: Path;
    prefix: ComponentPrefixes;
}): Rule => {
    return (tree: Tree, context: SchematicContext): Tree => {
        const templates = apply(url('../templates/type-page'), [
            applyTemplates({
                ...strings,
                ...stringUtils,
                type,
                name,
                prefix,
            }),
            move(join(path, name)),
        ]);

        return mergeWith(templates, MergeStrategy.Overwrite)(tree, context) as Tree;
    };
};

export const generateStyleguideComponent = (
    options: {
        name: string;
        type: ComponentTypes;
        prefix: ComponentPrefixes;
    },
    workspace: experimental.workspace.WorkspaceSchema,
): Rule[] => {
    const {
        name,
        type,
        prefix,
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
        updateComponent({
            type,
            name,
            path: `${styleguideConfig.sourceRoot}/app/${type}s` as Path,
            prefix,
        }),
    ];
};