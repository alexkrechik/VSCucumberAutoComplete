Cucumber Autocomplete plugin

Howto Use:
1) cd glient
2) npm install
3) cd ../gserver
4) npm install
5) code . (or just open gserver folder in vscode)
6) attach server to the client (ex. via shift + command + B)
7) copy gclient folder in ~/.vscode/extensions/
8) reopen vscode with app, that should use this extensions
9) in the opened app root create (if absent) .vscode folder with settings.json file
10) add languageServerExample.steps var with array of files/folder pathes. Example of settings.json file:
{
    "languageServerExample.steps": [
        "test/features/step_definitions",
        "node_modules/@revjet/csp-qa/src/steps"
    ]
}