const { ParameterTypeRegistry, ParameterType } = require('cucumber-expressions');

const DictionaryParam = {
  EntryOne: '[a-zA-Z0-9_-]+ dictionary',
  EntryTwo: '"[^"]*"',
}

const registry = new ParameterTypeRegistry()

registry.defineParameterType(
  new ParameterType(
    'dictionaryObject',
    new RegExp(Object.values(DictionaryParam).join('|')),
    null,
    (arg) => arg,
    true,
    false
  )
)


registry.defineParameterType(
  new ParameterType(
    '/\{a.*\}/',
    'aa',
    null,
    (arg) => arg,
    true,
    false
  )
)

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = registry;
exports.default = _default;
