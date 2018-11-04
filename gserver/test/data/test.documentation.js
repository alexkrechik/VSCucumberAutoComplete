this.When(/I write named functions/, function namedFunction(next) {
    next;
});

this.When(/I write named async functions/, async function namedAsyncFunction(next) {
    next;
});

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