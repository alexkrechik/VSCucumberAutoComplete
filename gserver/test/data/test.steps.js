this.When(/^I do something$/, function (next) {
    next;
});

this.When(/^I do another thing$/, function (next) {
    next;
});

//Comments test
//this.When(/^I check one line commets doesn't affect steps$/, function (next) {next;});

/*
this.When(/^I check multi line commets doesn't affect steps$$/, function (next) {
    next;
});
*/

//Duplicates tests 
this.When(/^I do something$/, function (next) {
    next;
});

//Or test
this.When(/^I say (a|b)$/, function (next) {
    next;
});

//Multi-lines test
this.When(
    /I do some multi-lines test/,
    function(next) {
        next;
    }
);

//Outlines test
this.When(/^I test outline using "[0-9]*" variable$/, function (next) {
    next;
});

//Lower Case step definition test
this.when(/I test lower case step definition/, function(next){})
