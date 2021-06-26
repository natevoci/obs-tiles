import React from 'react';
import styled from 'styled-components';

import { Header } from './Header/Header';
import { Content } from './Content';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    top: 0;
    height: 100%;
    margin: 0;
    background-color: ${p => p.theme.background};
    font-family: ${p => p.theme.fontFamily};
    font-size: ${p => p.theme.fontSize.small};
    font-weight: ${p => p.theme.fontWeight.regular};
`;

export const Layout = ({ children }) => {
    return (
        <Wrapper>
            <Header />
            <Content />
        </Wrapper>
    );
};
