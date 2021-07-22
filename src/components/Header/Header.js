import React from 'react';
import styled from 'styled-components';

// import { MainNav } from './MainNav';
import { SettingsButton } from '../Settings/SettingsButton';
import OBSLogo from 'url:/src/assets/obslogo.png';

const Wrapper = styled.div`
    height: ${p => p.theme.grid(8)};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${p => p.theme.grid(4)} ${p => p.theme.grid(2)};
    background-color: ${p => p.theme.navBackground};
`;

const Logo = styled.img`
    max-height: ${p => p.theme.grid(6.75)};
`;

export const Header = () => (
    <Wrapper>
        <Logo src={OBSLogo} alt="OBS logo" />
        {/* <MainNav /> */}
        <SettingsButton />

    </Wrapper>
);
