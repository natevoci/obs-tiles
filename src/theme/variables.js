const GRID_BASE = 8;
const gridUnitsToPixels = (val = 1) => `${val * GRID_BASE}px`;

// Names generated using
// https://www.color-blindness.com/color-name-hue/
const colors = {
	white: '#ffffff',
	offWhite: '#fcfcfc',
	greyF: '#F0F0F0',
	greyE: '#E0E0E0',
	greyD: '#D0D0D0',
	greyC: '#C0C0C0',
	greyB: '#B0B0B0',
	greyA: '#A0A0A0',
	grey9: '#909090',
	grey8: '#808080',
	grey7: '#707070',
	grey6: '#606060',
	grey5: '#505050',
	grey4: '#404040',
	grey3: '#303030',
	grey2: '#202020',
	grey1: '#101010',
	black: '#000000',
};

const swatches = {
	active: colors.greyE,
	background: colors.grey2,
	navBackground: colors.grey4,
	groupBackground: colors.grey4,
	border: colors.greyB,
	primary: '#538c61',
	secondary: '#9e3d3d',
	success: '#73E05E',
	error: '#DD5D5D',
	activeBackground: '#FF0000',
	buttonBackground: '#d5d5d5',
	disabledBackground: colors.grey7,
	disabledText: colors.greyA,
	text: colors.white,
	textLight: colors.greyC,
	sceneBackground: colors.black,
	sceneTextBackground: colors.grey2,
	sceneText: colors.offWhite,
	sceneBorder: colors.grey9,
	selectionHighlight: '#80a1ff',
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
