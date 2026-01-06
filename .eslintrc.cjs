module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	env: {
		'browser': true,
		'amd': true,
		'node': true,
		'es2021': true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:@typescript-eslint/recommended',
	],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'indent': ['warn', 'tab'],
		'linebreak-style': 'off',
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-types': 'off',
		'quote-props': 'off',
		'react/no-unescaped-entities': 'off',
		'react/prop-types': 'off',
		'react/display-name': 'off',
		'react-hooks/exhaustive-deps': 'off',
		'react/react-in-jsx-scope': 'off',
	},
	overrides: [
		{
			files: ['*.js'],
			rules: {
				'@typescript-eslint/no-var-requires': 'off',
				'react/jsx-key': 'off',
			}
		}
	],
	settings: {
		react: {
			version: 'detect',
		},
	},
};
