import { Tree, SchematicsException } from "@angular-devkit/schematics";
import { experimental } from "@angular-devkit/core";

export const readWorkspace = (tree: Tree): experimental.workspace.WorkspaceSchema => {
    const workspaceConfig = tree.read('/angular.json');

    if (!workspaceConfig) {
        throw new SchematicsException('Could not find Angular workspace configuration');
    }

    // convert workspace to string
    const workspaceContent = workspaceConfig.toString();

    // parse workspace string into JSON object
    const workspace: experimental.workspace.WorkspaceSchema = JSON.parse(workspaceContent);

    return workspace;
};