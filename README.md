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
    "cucumberautocomplete.steps": [
        "test/features/step_definitions",
        "node_modules/@revjet/csp-qa/src/steps"
    ],
    "cucumberautocomplete.pages": {
        "users": "test/features/support/page_objects/users.storage.js",
        "pathes": "test/features/support/page_objects/pathes.storage.js",
        "login": "test/features/support/page_objects/login.page.js",
        "storymode": "test/features/support/page_objects/storymode.page.js",
        "main": "test/features/support/page_objects/main.page.js",
        "adProperties": "test/features/support/page_objects/ad.properties.storage.js"
    }
}