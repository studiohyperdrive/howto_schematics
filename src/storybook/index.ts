import { Rule, Tree, SchematicContext, chain, externalSchematic, SchematicsException, apply, url, applyTemplates, move, mergeWith, MergeStrategy } from "@angular-devkit/schematics";
import { NodePackageInstallTask } from "@angular-devkit/schematics/tasks";
import { strings } from "@angular-devkit/core";
import { readWorkspace } from "../utils/workspace";
import { parseJSON } from "../utils/json";

const setupStorybook = (): Rule => {
    return () => {
        const templates = apply(url(`./files`), [
            applyTemplates(strings),
            move('/'),
        ]);

        return mergeWith(templates, MergeStrategy.Overwrite);
    };
};

const updateTsConfig = (): Rule => {
    return (tree: Tree) => {
        const workspace = readWorkspace(tree);
        const projects = Object.keys(workspace.projects);

        projects.forEach((project) => {
            const projectConfig = workspace.projects[project];

            if (!projectConfig) {
                throw new SchematicsException(`Could not find project (${project}) in workspace`);
            }

            const tsConfigPath = `${projectConfig.root}/tsconfig.app.json`;

            if (!tree.exists(tsConfigPath)) {
                return;
            }

            const tsConfigData = tree.read(tsConfigPath) || '';
            const tsConfig = parseJSON(tsConfigData.toString());

            if (!tsConfig) {
                return;
            }

            if (!tsConfig.exclude) {
                tsConfig.exclude = [];
            }

            tsConfig.exclude.push('**/*.stories.ts');

            tree.overwrite(tsConfigPath, JSON.stringify(tsConfig, null, 2));
        });

        return tree;
    };
};

const addDependencies = (): Rule => {
    return (tree: Tree) => {
        const packageJson = tree.read('package.json');

        if (!packageJson) {
            throw new SchematicsException(`Could not find a package.json in workspace`);
        }

        const packageJsonContents = JSON.parse(packageJson.toString());

        tree.overwrite('package.json', JSON.stringify({
            ...packageJsonContents,
            devDependencies: {
                ...packageJsonContents.devDependencies,
                "@storybook/addon-actions": "5.2.5",
                "@storybook/addon-knobs": "5.2.6",
                "@storybook/addon-links": "5.2.5",
                "@storybook/addon-notes": "5.2.5",
                "@storybook/addons": "5.2.5",
                "@storybook/angular": "5.2.5",
                "babel-loader": "8.0.6",
            },
        }, null, 2));

        return tree;
    };
};

const installDependencies = ({ skipInstall }: { skipInstall?: boolean; }): Rule => {
    return (tree: Tree, context: SchematicContext) => {
        if (skipInstall) {
            return tree;
        }

        context.addTask(new NodePackageInstallTask());
    };
};

const updatePackageJSON = (): Rule => {
    return (tree: Tree) => {
        const packageJson = tree.read('package.json');

        if (!packageJson) {
            throw new SchematicsException(`Could not find a package.json in workspace`);
        }

        const packageJsonContents = JSON.parse(packageJson.toString());

        tree.overwrite('package.json', JSON.stringify({
            ...packageJsonContents,
            scripts: {
                ...packageJsonContents.scripts,
                "build:storybook": "npm run build && build-storybook -c .storybook -o dist/storybook",
                "storybook": "start-storybook -p 4302",
            },
        }, null, 2));

        return tree;
    };
};

export function storybookSchematic(options: any): Rule {
    return (_tree: Tree, _context: SchematicContext) => {
        return chain([
            setupStorybook(),
            externalSchematic('@schematics/angular', 'library', {
                name: 'ui',
                prefix: 'ui',
                skipInstall: true,
            }),
            updateTsConfig(),
            addDependencies(),
            installDependencies(options),
            updatePackageJSON(),
        ]);
    };
}
