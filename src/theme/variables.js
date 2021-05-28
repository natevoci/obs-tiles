const GRID_BASE = 8;
const gridUnitsToPixels = (val = 1) => `${val * GRID_BASE}px`;

// Names generated using
// https://www.color-blindness.com/color-name-hue/
const colors = {
	white: '#ffffff',
	offWhite: '#fcfcfc',
	whiteSmoke: '#f9f9f9',
	gainsboro: '#e0e0e0',
	solitude: '#dde0e9',
	gimblet: '#b79f65',
	nevada: '#6f7070',
	froly: '#e57373',
	turquoise: '#5ee2a0',
	nero: '#231f20',
	black: '#000000',
};

const swatches = {
	active: colors.gainsboro,
	background: colors.whiteSmoke,
	navBackground: colors.white,
	border: colors.solitude,
	primary: colors.gimblet,
	secondary: colors.nero,
	success: colors.turquoise,
	error: colors.froly,
	text: colors.nero,
	textLight: colors.nevada,
};

const typography = {
	fontFamily: "'Roboto', sans-serif",
	fontWeight: {
		light: 300,
		regular: 400,
		medium: 500,
		bold: 700,
	},
	fontSize: {
		xsmall: '12px',
		small: '14px',
		medium: '16px',
		large: '18px',
		xlarge: '20px',
		xxlarge: '24px',
	},
};

const misc = {
	iconSize: {
		small: '24px',
		medium: '32px',
		large: '48px',
		xlarge: '64px',
	},
};

export default {
	grid: gridUnitsToPixels,
	...swatches,
	...typography,
	...misc,
};
