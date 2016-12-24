module.exports = function () {

	this.World = require('../support/world').World;

	this.When(/^Then I should have "aaa"$/, function (next) {
		var optionLocator = this.pages.adGroups.optionsInactive.replace("$dynamicId$", this.id);
		this.driver.waitFor(optionLocator,this.defaultTimeout).elements(optionLocator,function(err,res){
			for (i=0;i<res.value.length;i++) {
				this.driver.elementIdClick(res.value[i].ELEMENT);
			}
		}.bind(this)).call(next);
	});

	this.When(/^When I do something$/, function (next) {
		var optionLocator = this.pages.adGroups.optionsInactive.replace("$dynamicId$", this.id);
		this.driver.waitFor(optionLocator,this.defaultTimeout).elements(optionLocator,function(err,res){
			for (i=0;i<res.value.length;i++) {
				this.driver.elementIdClick(res.value[i].ELEMENT);
			}
		}.bind(this)).call(next);
	});

}