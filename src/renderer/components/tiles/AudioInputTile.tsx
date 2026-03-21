import * as React from 'react'
import styled from 'styled-components'
import { Slider } from '@material-ui/core'
import { VolumeUp, VolumeOff } from '@material-ui/icons'

import { useObs } from '~/api/obs'
import { useInputVolume, useInputMute, useInputVolumeMeters } from '~/api/obs/providers'
import { TileWrapper, TileContentArea, StyledCircularProgress } from './TileWrapper'
import { CheckboxTile } from './CheckboxTile'
import type { AudioInputTileConfig } from './Tiles'

// ============================================================================
// Styled Components
// ============================================================================

const MeterContainer = styled.div`
	width: 16px;
	height: 100%;
	background-color: ${p => p.theme.sceneBackground};
	border-radius: 2px;
	overflow: hidden;
	position: relative;
	flex-shrink: 0;
`

// Color constants for meter segments
const METER_GREEN = '#538C61'
const METER_ORANGE = '#c2a04c'
const METER_RED = '#c55769'

// dB thresholds converted to percentages (0-1)
// -60dB = 0%, -20dB = 66.7%, -8dB = 86.7%, 0dB = 100%
const THRESHOLD_ORANGE = (-20 + 60) / 60  // 0.667
const THRESHOLD_RED = (-8 + 60) / 60      // 0.867

interface MeterProps {
	$muted?: boolean
}

// Fixed color segments background (always visible)
const MeterSegments = styled.div<MeterProps>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 100%;
	background: linear-gradient(
		to top,
		${METER_GREEN} 0%,
		${METER_GREEN} ${THRESHOLD_ORANGE * 100}%,
		${METER_ORANGE} ${THRESHOLD_ORANGE * 100}%,
		${METER_ORANGE} ${THRESHOLD_RED * 100}%,
		${METER_RED} ${THRESHOLD_RED * 100}%,
		${METER_RED} 100%
	);
	opacity: 0.25;
	filter: ${p => p.$muted ? 'grayscale(1)' : 'none'};
	transition: filter 0.15s;
`

// Peak level fill with clipped color segments
// Uses clip-path instead of height so gradient colors stay at fixed positions
const MeterPeakFill = styled.div<MeterProps>`
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 100%;
	background: linear-gradient(
		to top,
		${METER_GREEN} 0%,
		${METER_GREEN} ${THRESHOLD_ORANGE * 100}%,
		${METER_ORANGE} ${THRESHOLD_ORANGE * 100}%,
		${METER_ORANGE} ${THRESHOLD_RED * 100}%,
		${METER_RED} ${THRESHOLD_RED * 100}%,
		${METER_RED} 100%
	);
	clip-path: inset(100% 0 0 0);
	will-change: clip-path;
    opacity: ${p => p.$muted ? '0.25' : '1'};
	filter: ${p => p.$muted ? 'grayscale(1)' : 'none'};
	transition: filter 0.15s;
`

const ControlsArea = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	gap: 8px;
`

const VolumeDisplay = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	padding: 4px 8px;
	border-radius: 4px;
	transition: background-color 0.15s;

	&:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}
`

const VolumeText = styled.span`
	font-size: ${p => p.theme.fontSize.large};
	font-weight: bold;
	min-width: 50px;
	text-align: center;
`

const MuteIcon = styled.div<{ $muted: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	color: ${p => p.$muted ? '#ef4444' : 'inherit'};
	
	svg {
		font-size: 28px;
	}
`

const SliderContainer = styled.div`
	width: 100%;
	padding: 0 8px;
`

const StyledSlider = styled(Slider)`
	color: ${p => p.theme.selectionHighlight};
	
	& .MuiSlider-thumb {
		width: 16px;
		height: 16px;
	}
	
	& .MuiSlider-rail {
		opacity: 0.3;
	}
`

// ============================================================================
// Component
// ============================================================================

export const AudioInputTile = ({
	connection,
	audioInput,
	title,
	tileSize = '10',
	fontSize,
	viewType = 'preview',
}: AudioInputTileConfig) => {
	const size = parseInt(String(tileSize))
	const labelFontSize = parseInt(String(fontSize ?? tileSize))
	const { inputName } = audioInput

	const obs = useObs({ connection })
	
	// Get volume and mute state from providers
	const volumeData = useInputVolume(obs, { inputName })
	const muteData = useInputMute(obs, { inputName })
    const isMuted = muteData?.inputMuted ?? false

	// High-performance meter handling using refs
	const meterPeakRef = React.useRef<HTMLDivElement>(null)
	const latestMeterData = React.useRef<{ peakOutput: number, peakInput: number }>({
        peakOutput: 0,
		peakInput: 0,
	})
	const animationFrameRef = React.useRef<number>()

	/**
	 * Convert linear multiplier to display percentage (0-1)
	 * OBS volume meters range from -60dB to 0dB
	 * Formula: percentage = (dB + 60) / 60
	 */
	const mulToDisplayPercent = (mul: number): number => {
		if (mul <= 0) return 0
		const dB = 20 * Math.log10(mul)
		// Clamp to -60dB to 0dB range and convert to 0-1
		return Math.max(0, Math.min(1, (dB + 60) / 60))
	}

	/**
	 * Convert display percentage (0-1) back to linear multiplier
	 * Inverse of mulToDisplayPercent
	 * Formula: mul = 10^((percentage * 60 - 60) / 20)
	 */
	const displayPercentToMul = (percent: number): number => {
		if (percent <= 0) return 0
		const dB = percent * 60 - 60
		return Math.pow(10, dB / 20)
	}

	// Callback for meter updates (bypasses React state)
	const handleMeterUpdate = React.useCallback((levels: number[][]) => {
		if (levels.length > 0 && levels[0].length >= 3) {
			// Get max values across all channels
			let maxPeakOutput = 0
			let maxPeakInput = 0
			
			for (const channel of levels) {
                if (channel[1] > maxPeakOutput) maxPeakOutput = channel[1]
                if (channel[2] > maxPeakInput) maxPeakInput = channel[2]
			}
			
			// Convert linear mul to display percentages
			latestMeterData.current = {
				peakOutput: mulToDisplayPercent(maxPeakOutput),
                peakInput: mulToDisplayPercent(maxPeakInput),
			}
		}
	}, [])

	// Subscribe to volume meters (will only work on v5)
	useInputVolumeMeters(obs, { 
		inputName, 
		onMeterUpdate: handleMeterUpdate,
	})

	// Animation loop for smooth meter updates
	React.useEffect(() => {
		if (obs.apiVersion !== 5) return

		const updateMeter = () => {
			const { peakInput, peakOutput } = latestMeterData.current
			
			// Update peak fill using clip-path (clip from top)
			// inset(top right bottom left) - we clip from top down
			if (meterPeakRef.current) {
				const clipTop = 100 - ((isMuted ? peakInput : peakOutput) * 100)
				meterPeakRef.current.style.clipPath = `inset(${clipTop}% 0 0 0)`
			}
			
			animationFrameRef.current = requestAnimationFrame(updateMeter)
		}

		animationFrameRef.current = requestAnimationFrame(updateMeter)

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [obs.apiVersion, isMuted])

	// Handle volume change from slider
	const handleVolumeChange = (_event: any, newValue: number | number[]) => {
		if (obs.adapter && typeof newValue === 'number') {
			// Convert slider value (0-100) to volume multiplier using dB scale
			const volumeMul = displayPercentToMul(newValue / 100)
			obs.adapter.setInputVolume(inputName, volumeMul)
		}
	}

	// Handle mute toggle
	const handleMuteToggle = () => {
		if (obs.adapter) {
			obs.adapter.toggleInputMute(inputName)
		}
	}

	// Calculate display values using dB-based percentage
	const currentVolumeMul = volumeData?.inputVolumeMul ?? 0
	const displayPercent = Math.round(mulToDisplayPercent(currentVolumeMul) * 100)
	const sliderValue = Math.min(displayPercent, 100)

	const overlay = !obs.connected ? (
		<>
			{obs.failedConnection ?? 'Connecting...'}
			{obs.connecting ? <StyledCircularProgress /> : null}
		</>
	) : null

	const content = obs.connected ? (
		<>
			{/* Volume meter (v5 only) */}
			{obs.apiVersion === 5 && (
				<MeterContainer>
					{/* Background segments (dimmed) */}
					<MeterSegments $muted={isMuted} />
					{/* Peak level fill */}
					<MeterPeakFill ref={meterPeakRef} $muted={isMuted} />
				</MeterContainer>
			)}
			
			<ControlsArea>
				{/* Mute button + volume display */}
				<VolumeDisplay onClick={handleMuteToggle}>
					<MuteIcon $muted={isMuted}>
						{isMuted ? <VolumeOff /> : <VolumeUp />}
					</MuteIcon>
					<VolumeText>
						{isMuted ? 'Muted' : `${displayPercent}%`}
					</VolumeText>
				</VolumeDisplay>
				
				{/* Volume slider */}
				<SliderContainer>
					<StyledSlider
						value={sliderValue}
						onChange={handleVolumeChange}
						min={0}
						max={100}
						disabled={isMuted}
					/>
				</SliderContainer>
			</ControlsArea>
		</>
	) : null

	if (viewType === 'checkbox') {
		return (
			<CheckboxTile
				size={size}
				fontSize={labelFontSize}
				label={title ?? inputName}
				checked={!isMuted}
				eventHandlers={{ onClick: handleMuteToggle }}
				icon={
					<MuteIcon $muted={isMuted}>
						{isMuted ? <VolumeOff /> : <VolumeUp />}
					</MuteIcon>
				}
			/>
		)
	}

	return (
		<TileWrapper
			size={size}
			fontSize={labelFontSize}
			label={title ?? inputName}
			elementType='AudioInputWrapper'
			overlay={overlay}
		>
			<TileContentArea $size={size}>
				{content}
			</TileContentArea>
		</TileWrapper>
	)
}
