# Howto schematics

These are the schematics used in the [Howto app](https://github.com/studiohyperdrive/howto-app). We tried to stay as close to base Angular schematics as possible, to limit the impact of future updates.

This is very much a work in progress and needs some polishing before being ready for production use.

## Specifications
This project has been generated using:
- `@angular-devkit/schematics-cli`: 0.803.9
- `nodejs`: 10.16.3
- `npm`: 6.9.0

## Project setup
### npm scripts
This project has the following npm scripts.

| Command        | Description
| -------------- | -----------
| start			 | Runs the TypeScript compiler with a watch flag.
| build			 | Runs the TypeScript compiler.
| test       | Run the tests.

All commands are executable by running `npm run [COMMAND-NAME]`.

**To get started**, don't forget a `nvm use` to activate the node version specified in the `.nvmrc` file of this project.

## Code Contribution ##
### Branches ###
We follow these naming conventions:
* **master**: Production-ready code, tagged for a production release, latest commit for development release.
* **release/***: Snapshot of a release.
* **feature/***: For developing new features.
* **bugfix/***: For bugs that are logged during testing.
* **hotfix/***: Only for hotfixing critical bugs from the `master`-branch.

### Team ###
List the team that has worked on this project, including the duration e.g.:
* [Tom Opdebeeck - Studio Hyperdrive](tom.opdebeeck@studiohyperdrive.be)
    * **Function**: JavaScript developer
    * **Period**: September 2019 -> ...
* [Denis Valcke - Studio Hyperdrive](denis.valcke@studiohyperdrive.be)
    * **Function**: JavaScript developer
    * **Period**: September 2019 -> ...
