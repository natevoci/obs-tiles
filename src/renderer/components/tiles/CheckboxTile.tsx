import * as React from 'react'
import styled from 'styled-components'
import { Checkbox } from '@material-ui/core'

// ============================================================================
// Styled Components
// ============================================================================

interface ContainerProps {
	$size: number
}

const Container = styled.div<ContainerProps>`
	display: flex;
	flex-direction: row;
	align-items: center;
	width: ${p => p.$size * 16}px;
	min-height: 36px;
	cursor: pointer;
	padding: 2px 8px 2px 2px;
	border-radius: 4px;
	background-color: ${p => p.theme.sceneBackground};
	color: ${p => p.theme.sceneText};
	user-select: none;
	box-sizing: border-box;
	transition: background-color 0.15s;

	&:hover {
		background-color: rgba(255, 255, 255, 0.08);
	}
`

const Label = styled.span`
	font-size: ${p => p.theme.fontSize.large};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
`

/** Wrapper that gives a custom icon the same footprint as a small MUI Checkbox */
const iconSlotStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: 38,
	height: 38,
	flexShrink: 0,
}

/**
 * MUI Checkbox with an explicit unchecked color so it is visible against the
 * black tile background (MUI v4 default unchecked color is near-black).
 */
const StyledCheckbox = styled(Checkbox)`
	&.MuiCheckbox-root:not(.Mui-checked) {
		color: ${p => p.theme.sceneBorder};
	}
`

// ============================================================================
// Component
// ============================================================================

export interface CheckboxTileProps {
	/** Tile size multiplier — checkbox width = size * 16px */
	size: number
	/** Label shown to the right of the checkbox */
	label: string
	/** Whether the checkbox is checked */
	checked: boolean
	/** Event handlers spread onto the container (supports onClick, onMouseDown, onMouseUp, etc. for long-press) */
	eventHandlers: React.HTMLAttributes<HTMLDivElement>
	/**
	 * Optional custom icon node to render instead of the default MUI Checkbox.
	 * Use this to substitute domain-specific icons (e.g. mute/unmute icons for audio tiles).
	 */
	icon?: React.ReactNode
}

/**
 * Compact checkbox tile — same width as a button tile at the same tileSize,
 * but renders as a checkbox row rather than the full preview tile.
 * The checkbox state reflects the tile's "selected" state from Preview mode.
 */
export const CheckboxTile = ({ size, label, checked, eventHandlers, icon }: CheckboxTileProps) => {
    return (
        <Container $size={size} {...eventHandlers}>
            {icon !== undefined ? (
                <div style={iconSlotStyle}>{icon}</div>
            ) : (
                <StyledCheckbox
                    checked={checked}
                    color="primary"
                    size="small"
                    // Controlled — suppress native toggle; interaction is handled by the container
                    onChange={() => {}}
                />
            )}
            <Label>{label}</Label>
        </Container>
    )
}
