import { expect } from 'chai';
import * as objectsGetter from '../src/objects.getter';

describe('Gserver unit tests', function () {

    it('validate regular expression for getting steps', function () {
        expect(objectsGetter.getStepRegExp().toString()).to.equal(
            (/^(.*)(Given|When|Then)[^'|^"|^\/]*('|"|\/)([^\3]+)\3/i).toString());
    });

});
