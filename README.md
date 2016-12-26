# Cucumber Autocomplete plugin

## How to install

1. `git clone https://github.com/alexkrechik/VSCucumberAutoComplete.git`
1. `cd VSCucumberAutoComplete/gclient/ && npm install`
1. `cd ../gserver/ && npm install`
1. `code .` (or just open gserver folder as a separate project in vscode)
1. Attach server to the client (for ex. via `shift + command + B`)
1. Copy gclient folder to `~/.vscode/extensions/` or just run
    `cp -a gclient ~/.vscode/extensions/`
1. Reopen vscode with app, that should use this extension
1. In the opened app root create (if absent) `.vscode` folder with
    `settings.json` file or just run `mkdir .vscode && touch .vscode/setting.json`
1. Add `languageServerExample.steps` var with array of files/folder pathes to
    your step definitions. Example of `settings.json` file:

```javascript
{
    "languageServerExample.steps": [
        "test/features/step_definitions",
        "node_modules/@revjet/csp-qa/src/steps"
    ]
}
```
