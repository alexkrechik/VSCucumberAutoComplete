# Cucumber Autocomplete extension
VSCode Cucumber (Gherkin) Language Support + Steps/PageObjects Autocomplete

## This extension adds rich language support for the Cucumber (Gherkin) language to VS Code, including:
* Syntax highlight
* Auto-parsing of feature steps and page objects from pathes, provided in settings.json
* Autocomplete of steps, pages and page objects
* Ontype validation for all the steps and, if present, pages and page objects
* Definitions support for all the steps parts
* Document format support

All the steps and page objects will be re-populated after every .feature file opened or after every symbol in .featyre file typed.

![](https://raw.githubusercontent.com/alexkrechik/VSCucumberAutoComplete/master/gclient/img/vscode.gif)
## How to use:
1. Open your app in vscode
2. Install cucumberautocomplete extension
3. In the opened app root create (if absent) .vscode folder with settings.json file or just run ```mkdir .vscode && touch .vscode/settings.json```
4. Add all the needed settings to the settings.json file
5. Reload app to apply all the extension changes

## Cucumberautocomplete settings:
1. **cucumberautocomplete.steps** array of files/folders, which contains steps_definition files. All the regexps, which will be found in these files, will be used as steps.
2. **cucumberautocomplete.pages** - object, which consists of "page name" => "page object file path" pairs. All the variables-like words will be used as page objects.

### settings example:
```javascript
{
    "cucumberautocomplete.steps": [
        "test/features/step_definitions",
        "node_modules/qa-lib/src/step_definitions"
    ],
    "cucumberautocomplete.pages": {
        "users": "test/features/page_objects/users.storage.js",
        "pathes": "test/features/page_objects/pathes.storage.js",
        "main": "test/features/support/page_objects/main.page.js"
    }
}
```

Fill free to create app issues on [GitHub](https://github.com/alexkrechik/VSCucumberAutoComplete/issues)
