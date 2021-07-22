module.exports = {
	parser: 'babel-eslint',
	env: {
		'browser': true,
		'amd': true,
		'node': true,
		'es6': true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
	],
	rules: {
		'indent': ['warn', "tab"],
		'linebreak-style': 'off',
		'no-unused-vars': ['warn', { ignoreRestSiblings: true }],
		'quote-props': 'off',
		'react/no-unescaped-entities': 'off',
		'react/prop-types': 'off',
		'react/display-name': 'off',
		'react-hooks/exhaustive-deps': 'off',
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
};
