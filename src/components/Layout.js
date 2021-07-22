import React from 'react';
import styled from 'styled-components';

import { Header } from './Header/Header';
import { Content } from './Content';

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	overflow: auto;
	position: relative;
	top: 0;
	height: 100%;
	margin: 0;
	background-color: ${p => p.theme.background};
	font-family: ${p => p.theme.fontFamily};
	font-size: ${p => p.theme.fontSize.medium};
	font-weight: ${p => p.theme.fontWeight.regular};
	color: ${p => p.theme.text};
`;

export const Layout = () => {
	return (
		<Wrapper>
			<Content />
			<Header />
		</Wrapper>
	);
};
