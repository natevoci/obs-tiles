import React from 'react';
import styled from 'styled-components';

// import { MainNav } from './MainNav';
import { SettingsDialog } from '../Settings/SettingsDialog';
import OBSLogo from 'url:/src/assets/obslogo.png';

const Wrapper = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    height: ${p => p.theme.grid(8)};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${p => p.theme.grid(4)} ${p => p.theme.grid(2)};
    border-bottom: 1px solid ${p => p.theme.border};
    background-color: ${p => p.theme.navBackground};
`;

const Logo = styled.img`
    max-height: ${p => p.theme.grid(6.75)};
`;

export const Header = () => (
    <Wrapper>
        <Logo src={OBSLogo} alt="OBS logo" />
        {/* <MainNav /> */}
        <SettingsDialog />

    </Wrapper>
);
