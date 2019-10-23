import {
    chain,
    Rule,
    SchematicsException,
    Tree,
} from '@angular-devkit/schematics';

import { readWorkspace } from '../utils/workspace';

import { generateComponent } from '../rules/generate-component';
import { ComponentTypes, ComponentPrefixes } from '../types/component';
import { generateStyleguide } from '../rules/generate-styleguide';
import { generateStyleguideComponent } from '../rules/generate-styleguide-component';
import { generateStyleguideRootComponent } from '../rules/generate-styleguide-root-component';
import { updateRoutes } from '../rules/update-routes';
import { generateDocs } from '../rules/generate-docs';

export const typeSchematic = (type: ComponentTypes) => ({
    name,
    module = 'ui',
    style = 'scss',
    spec = true,
}: {
    name: string;
    module?: string;
    style?: string;
    spec?: boolean;
}): Rule => {
    return (tree: Tree) => {
        if (!name) {
            throw new SchematicsException('Option (name) is required!');
        }

        const workspace = readWorkspace(tree);

        const projectConfig = workspace.projects['ui'];

        if (!projectConfig) {
            throw new SchematicsException(`Could not find project (ui) in workspace`);
        }

        const ruleOptions = {
            name,
            project: 'ui',
            module,
            path: `${projectConfig.sourceRoot}/lib/${type}s`,
            prefix: ComponentPrefixes[type],
            export: true,
            style,
            styleext: style,
            spec,
            type,
        };

        const styleguideOptions = {
            ...ruleOptions,
            project: 'styleguide',
            module: `${type}s`,
            prefix: ComponentPrefixes.styleguide,
        };

        return chain([
            ...generateComponent(ruleOptions, workspace),
            ...generateDocs(ruleOptions, workspace),
            ...generateStyleguide(styleguideOptions, workspace, tree), // setup the root module
            ...generateStyleguideRootComponent(styleguideOptions, workspace), // setup the root component
            ...generateStyleguideComponent(styleguideOptions, workspace), // setup the styleguide page
            ...updateRoutes(styleguideOptions),
        ]);
    }
}