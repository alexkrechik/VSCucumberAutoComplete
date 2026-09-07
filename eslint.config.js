const js = require('@eslint/js');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

module.exports = [
    js.configs.recommended,
    ...typescriptEslint.configs['flat/recommended'],
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            indent: ['error', 4],
            quotes: ['error', 'single', { avoidEscape: true }],
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
];
