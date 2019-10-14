import {
  chain,
  externalSchematic,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

import { ComponentPrefixes } from '../types/component';
import { readWorkspace } from '../utils/workspace';

const updateLinter = (): Rule => {
  return (tree: Tree) => {
    const workspace = readWorkspace(tree);

    const projectConfig = workspace.projects['ui'];

    if (!projectConfig) {
      throw new SchematicsException(`Could not find project (ui) in workspace`);
    }

    const tslintConfigPath = `${projectConfig.root}/tslint.json`;

    if (!tree.exists(tslintConfigPath)) {
      return tree;
    }

    const tslintConfig = tree.read(tslintConfigPath) || '';
    const prefixes = [
      ComponentPrefixes.atom,
      ComponentPrefixes.molecule,
      ComponentPrefixes.organism,
      ComponentPrefixes.page,
    ].map(prefix => `"${prefix}"`).join(', ');

    tree.overwrite(tslintConfigPath, tslintConfig.toString().replace(/"ui"/g, `[${prefixes}]`));

    return tree;
  };
};

export function styleguideSchematic(_options: any): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    return chain([
      externalSchematic('@schematics/angular', 'application', {
        name: 'styleguide',
        prefix: ComponentPrefixes.styleguide,
      }),
      externalSchematic('@schematics/angular', 'library', {
        name: 'ui',
        prefix: 'ui',
      }),
      updateLinter(),
    ]);
  };
}
