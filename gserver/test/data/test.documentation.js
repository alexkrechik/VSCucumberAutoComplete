/**
 * unstructured description
 */
this.When(/I write documented functions with unstructured description/, function (next) {
    next;
});

/**
 * @description structured description
 */
this.When(/I write documented functions with structured description/, function (next) {
    next;
});

/**
 * @desc structured name
 */
this.When(/I write documented functions with structured desc/, function (next) {
    next;
});

/**
 * Overriding description
 */
this.When(/I write documented named functions/, function nameToOverride(next) {
    next;
});