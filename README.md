# Cucumber Autocomplete extension
VSCode Cucumber (Gherkin) Language Support + Steps/PageObjects Autocomplete

## This extension adds rich language support for the Cucumber (Gherkin) language to VS Code, including:
* .feature files syntax highlight
* Auto-parsing of provided in settings files/folder to found all the regexp to use them as cucumber steps
* Auto-parsing of provided in settings files to found all the vars-like strings to use them as page objects
* Autocomplete of steps, page and page objects
* Validation all the steps strings (beggining from 'Given', 'When', 'Then', 'And') for the correct 'steps' part
* Validation of all the pages/page objects (if present)
* Definitions support for all the steps parts

## How to use:
1. Open your app in vscode
2. Install cucumberautocomplete extension
3. In the opened app root create (if absent) .vscode folder with settings.json file or just run mkdir .vscode && touch .vscode/settings.json
4. Add all the needed settings to the settings.json file
5. Reload app to apply all the extension changes

## Cucumberautocomplete settings:
1. **cucumberautocomplete.steps** array of files/folders, which contains steps_definition files. All the regexps, which will be found in these files, will be used as steps.
2. **cucumberautocomplete.pages** - object, which contains of "page name" => "page object file path" pairs. All the variables-like words will be used as page objects.

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
