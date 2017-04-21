# Cucumber Full Language Support
VSCode Cucumber (Gherkin) Language Support + Format + Steps/PageObjects Autocomplete

## This extension adds rich language support for the Cucumber (Gherkin) language to VS Code, including:
* Syntax highlight
* Basic Snippets support
* Auto-parsing of feature steps and page objects from pathes, provided in settings.json
* Autocomplete of steps, pages and page objects
* Ontype validation for all the steps and, if present, pages and page objects
* Definitions support for all the steps parts
* Document format support

All the steps and page objects will be re-populated after every `.feature` file opened or after every symbol in `.feature` file typed.

![](https://raw.githubusercontent.com/alexkrechik/VSCucumberAutoComplete/master/gclient/img/vscode.gif)
## How to use:
1. Open your app in vscode
2. Install cucumberautocomplete extension
3. In the opened app root create (if absent) .vscode folder with settings.json file or just run ```mkdir .vscode && touch .vscode/settings.json```
4. Add all the needed settings to the settings.json file
5. Reload app to apply all the extension changes
6. To get autocomplete working, `strings` var of `editor.quickSuggestions` setting should be set to true (because by default `string` suggestions will not appear)

### settings example:
```javascript
{
    "cucumberautocomplete.steps": [
        "test/features/step_definitions/**/*.js",
        "node_modules/qa-lib/src/step_definitions/*.js"
    ],
    "cucumberautocomplete.pages": {
        "users": "test/features/page_objects/users.storage.js",
        "pathes": "test/features/page_objects/pathes.storage.js",
        "main": "test/features/support/page_objects/main.page.js"
    },
    "editor.quickSuggestions": {
        "comments": false,
        "strings": true,
        "other": true
    }
}
```

Fill free to create app issues on [GitHub](https://github.com/alexkrechik/VSCucumberAutoComplete/issues)
