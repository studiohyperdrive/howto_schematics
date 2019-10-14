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
import { setupStyleguideComponent } from '../rules/setup-styleguide-component';
import { updateRootComponent } from '../rules/update-root-component';
import { updateRoutes } from '../rules/update-routes';
import { setupRootComponent } from '../rules/setup-root-component';

export function moleculeSchematic({
  name,
  project = 'ui',
  module = 'ui',
  style = 'scss',
  spec = true,
}: {
  name: string;
  project?: string;
  module?: string;
  style?: string;
  spec?: boolean;
}): Rule {
  return (tree: Tree) => {
    if (!name) {
      throw new SchematicsException('Option (name) is required!');
    }

    const workspace = readWorkspace(tree);

    const projectConfig = workspace.projects[project];

    if (!projectConfig) {
      throw new SchematicsException(`Could not find project (${project}) in workspace`);
    }

    const ruleOptions = {
      name,
      project,
      module,
      path: `${projectConfig.sourceRoot}/lib/molecules`,
      prefix: ComponentPrefixes.molecule,
      export: true,
      style,
      styleext: style,
      spec,
      type: ComponentTypes.molecule,
    };

    const styleguideOptions = {
      ...ruleOptions,
      project: 'styleguide',
      module: 'molecules',
      prefix: 'sg',
    };

    // TODO: figure out how to trigger build after generation
    return chain([
      ...generateComponent(ruleOptions, workspace),
      ...generateStyleguide(styleguideOptions, workspace, tree),
      ...generateStyleguideComponent(styleguideOptions, workspace),
      ...setupStyleguideComponent(styleguideOptions),
      ...setupRootComponent(styleguideOptions, workspace),
      ...updateRootComponent(styleguideOptions, workspace),
      ...updateRoutes(styleguideOptions),
    ]);
  }
}