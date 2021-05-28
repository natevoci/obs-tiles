import React from 'react';
import styled from 'styled-components';

import { Header } from '~/components/Header';

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

const Content = styled.main`
    height: calc(100% - ${p => p.theme.grid(8)});
    margin-top: ${p => p.theme.grid(8)};
`;

export const Layout = ({ children }) => {
    return (
        <Wrapper>
            <Header />
            <Content>
                TODO
            </Content>
        </Wrapper>
    );
};
