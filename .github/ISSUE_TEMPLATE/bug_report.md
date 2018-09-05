---
name: Bug report
about: Create a report to help us improve

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Cucumberautocomplete part of VSCode settings:**
```
{
  "cucumberautocomplete.steps": [
      "features/step_definitions/*.js",
      "node_modules/@revjet/csp-qa/src/steps/*.js"
  ],
  "cucumberautocomplete.skipDocStringsFormat": true,
  "cucumberautocomplete.syncfeatures": "features/*.feature",
  "cucumberautocomplete.strictGherkinCompletion": true,
  "cucumberautocomplete.smartSnippets": true,
  "cucumberautocomplete.stepsInvariants": true,
  "cucumberautocomplete.onTypeFormat": false,
  "cucumberautocomplete.formatConfOverride": {
      "And": 0,
  }
}
```

**Step definition:**
If applicable, add example of step definition:
```
When(/^I rename the run to "([^"]*)"$/, (name) =>
  // ... whatever
);
```

**Gherkin step line**
If applicable, add step line from gherkin file
`When I rename the run to "([^"]*)"`
