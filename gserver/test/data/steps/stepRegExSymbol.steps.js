this.When(/I test back slashed step/)

this.When('I test quotes step')

this.When("I test double quotes step")

// Non-standard strings tests
// Used non-standard strings tests cases

this.Given('I do "aa" something');
this.When('I do \' something');
    this.When('I do \' something different');
this.Given('/^Me and "([^"]*)"$/');
this.Given('the test cookie is set', () => cy.setCookie('TEST_COOKIE', 'true'));