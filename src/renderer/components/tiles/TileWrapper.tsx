import * as React from 'react'
import styled from 'styled-components'
import { CircularProgress } from '@material-ui/core'

// ============================================================================
// Styled Components
// ============================================================================

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	position: relative;
	align-items: center;
	color: ${p => p.theme.sceneText};
	background-color: ${p => p.theme.sceneBackground};
`

interface SelectionIndicatorProps {
	$isSelected: boolean
	$isDeselecting?: boolean
}

const SelectionIndicator = styled.div<SelectionIndicatorProps>`
	position: absolute;
	width: 100%;
	height: 100%;
	border: 1px solid ${p => p.theme.sceneBorder};
	box-shadow: 0 0 15px 10px ${p => p.theme.selectionHighlight};
	opacity: ${p => !p.$isSelected ? 0.0 : p.$isDeselecting ? 0.6 : 1.0};
	z-index: ${p => !p.$isSelected || p.$isDeselecting ? 5 : 10};
	pointer-events: none;
	transition: box-shadow 0.25s ease-in-out 0s, opacity 0.5s ease-in-out 0s;
`

interface SizeProps {
	$size: number
}

const TextOverlay = styled.div<SizeProps>`
	position: absolute;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	font-size: ${p => p.theme.fontSize.small};
	pointer-events: none;

	> p:not(:first-child) {
		margin-top: ${p => p.theme.fontSize.small};
	}
`

const ImgOverlay = styled.div<SizeProps>`
	position: absolute;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	box-shadow: inset 0 -7px 3px -5px ${p => p.theme.sceneTextBackground};
	pointer-events: none;
`

const Label = styled.p<SizeProps>`
	text-align: center;
	font-size: ${p => p.theme.fontSize.large};
	width: 100%;
	height: 25px;
	background-color: ${p => p.theme.sceneTextBackground};
`

export const StyledCircularProgress = styled(CircularProgress)`
	z-index: 10;
`

// ============================================================================
// Component
// ============================================================================

export interface TileWrapperProps {
	/** Tile size multiplier (default: 10) */
	size: number
	/** Label text shown at bottom of tile */
	label: string
	/** Content to render in the main tile area */
	children: React.ReactNode
	/** Optional overlay content (shown over the content area) */
	overlay?: React.ReactNode
	/** Click handler for the tile */
	onClick?: () => void
	/** Additional event handlers (e.g., for long press) */
	eventHandlers?: React.HTMLAttributes<HTMLDivElement>
	/** Whether the tile is selected (shows selection indicator) */
	isSelected?: boolean
	/** Whether the tile is deselecting (dimmed selection indicator) */
	isDeselecting?: boolean
	/** data-elementtype attribute for debugging */
	elementType?: string
}

export const TileWrapper = ({
	size,
	label,
	children,
	overlay,
	onClick,
	eventHandlers,
	isSelected = false,
	isDeselecting = false,
	elementType = 'TileWrapper',
}: TileWrapperProps) => {
	const showSelectionIndicator = isSelected || isDeselecting

	return (
		<>
			{showSelectionIndicator && (
				<SelectionIndicator
					data-elementtype='SelectionIndicator'
					$isSelected={isSelected}
					$isDeselecting={isDeselecting}
				/>
			)}
			<Wrapper
				data-elementtype={elementType}
				onClick={onClick}
				{...eventHandlers}
			>
				<TextOverlay $size={size}>
					<div style={{ display: 'contents' }}>{overlay}</div>
				</TextOverlay>
				<div style={{ display: 'contents' }}>{children}</div>
				<ImgOverlay $size={size} />
				<Label $size={size}>{label}</Label>
			</Wrapper>
		</>
	)
}

// ============================================================================
// Re-exported Styled Components (for custom content areas)
// ============================================================================

export const TileImage = styled.img<SizeProps>`
	display: block;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	opacity: 0;
	&[src] {
		opacity: 1;
	}
`

export const TileContentArea = styled.div<SizeProps>`
	display: flex;
	flex-direction: row;
	width: ${p => p.$size * 16}px;
	height: ${p => p.$size * 9}px;
	padding: 8px;
	box-sizing: border-box;
	gap: 8px;
`
