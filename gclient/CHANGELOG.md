## 2.2.0 / 2017-05-12
### MAIN CHANGES
* All the steps suggestions are sorted by their using count
* Warning message will appear for steps setting, which match no files
### Features/Improvements:
* [#45](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/45) All the suggestions should be sorted by their using count.
* [#66](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/66) Cannot work with some build-in/custom parameter types
* [#65](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/65) Step def with ruby interpolation aren't detect
* [#30](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/30) Add some error popup if wrong pathes in settings provided
* [#38](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/38) TypeScript PageObjects are not supported
### Bugfixes:
* [#64](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/64) A trailing space gives "unable to find step"
* [#73](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/73) Fix source in diagnostic warnings
* [#63](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/63) Highlighting as a comment when the # is after text

## 2.1.0 / 2017-04-20
### MAIN CHANGES
* Gherkin steps definitions in all the languages should be supported by default
* cucumber.regexpstart and cucumber.regexpend settings were removed due to this
### Features/Improvements:
* [#51](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/51) Add missing symbols after pages and page objects completion resolve
* [#39](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/39) Add all the languages steps support by default + refactoring
* [#35](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/35) support steps defined with strings instead of regexes
* [#54](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/54) App behaviour should be correct if some options were not provided
### Bugfixes:
* [#49](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/49) Unable to parse some step definitions from feature files
* [#62](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/62) Go to Definition throws error File not found with wrong path
* [#60](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/60) Wrong settings path broke app
* [#57](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/57) Steps implementation path can not be opened
* [#53](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/53) Page objects suggestions doesnt work with new VSCode
* [#40](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/40) Objects from commented lines should not be added as steps and page objects

## 2.0.0 / 2017-01-21
### MAIN CHANGES
* cucumberautocomplete.steps setting format was changed to glob style due to [#24](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/24)
### Features/Improvements:
* [#24](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/24) Settings config file does not consider files on multiple levels
* [#29](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/29) Snippets support
* [#28](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/28) Multi - language extension support
* [#26](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/26) Add support for Cucumber-TSFlow
### Bugfixes:
* [#25](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/25) Add support for Cucumber-TSFlow

## 1.1.0 / 2017-01-13
### MAIN CHANGES
* All the steps and page objects will be updated automatically after any key in any feature file pressing
### Features:
* [#15](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/15) Add some 'Steps and Page Objects refreshing' command
### Bugfixes:
* [#18](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/18) Wrong pageObjects detecting
* [#17](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/17) Pick definition for the page/page objects if step is not completed
* [#21](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/21) Allow '/' in step definitions
* [#20](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/20) Added extension configuration
* [#16](https://github.com/alexkrechik/VSCucumberAutoComplete/issues/16) fix - Gherkin-style comments with #
