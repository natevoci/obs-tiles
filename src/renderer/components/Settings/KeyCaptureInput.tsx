import React from 'react'
import styled, { css } from 'styled-components'

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const CaptureField = styled.div<{ $recording: boolean }>`
	display: inline-flex;
	align-items: center;
	min-width: 160px;
	height: 32px;
	padding: 0 10px;
	border-radius: 4px;
	border: 1px solid ${(p) => p.$recording ? p.theme.palette?.primary?.main ?? '#90caf9' : 'rgba(255,255,255,0.23)'};
	background: rgba(255,255,255,0.05);
	cursor: pointer;
	user-select: none;
	font-size: 13px;
	font-family: monospace;
	outline: none;
	transition: border-color 0.15s;

	${(p) => p.$recording && css`
		background: rgba(144, 202, 249, 0.08);
	`}

	&:hover {
		border-color: rgba(255,255,255,0.5);
	}
`

const Placeholder = styled.span`
	opacity: 0.4;
	font-style: italic;
	font-family: inherit;
`

// ---------------------------------------------------------------------------
// Key combo normalisation — same logic used at runtime in useKeyboardShortcuts
// ---------------------------------------------------------------------------

export function buildComboString(e: KeyboardEvent | React.KeyboardEvent): string | null {
	// Ignore bare modifier presses
	if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null

	const parts: string[] = []
	if (e.ctrlKey) parts.push('Ctrl')
	if (e.shiftKey) parts.push('Shift')
	if (e.altKey) parts.push('Alt')
	if (e.metaKey) parts.push('Meta')

	// Normalise the key: single letters → uppercase, special keys → readable name
	const KEY_DISPLAY_NAMES: Record<string, string> = {
		' ': 'Space',
		'ArrowUp': 'Up',
		'ArrowDown': 'Down',
		'ArrowLeft': 'Left',
		'ArrowRight': 'Right',
		'Enter': 'Enter',
		'Escape': 'Escape',
		'Backspace': 'Backspace',
		'Delete': 'Delete',
		'Insert': 'Insert',
		'Home': 'Home',
		'End': 'End',
		'PageUp': 'PageUp',
		'PageDown': 'PageDown',
		'Tab': 'Tab',
		'CapsLock': 'CapsLock',
		'PrintScreen': 'PrintScreen',
		'ScrollLock': 'ScrollLock',
		'Pause': 'Pause',
		'NumLock': 'NumLock',
	}
	const key = KEY_DISPLAY_NAMES[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
	parts.push(key)

	return parts.join('+')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface KeyCaptureInputProps {
	value: string
	onChange: (keys: string) => void
}

export const KeyCaptureInput = ({ value, onChange }: KeyCaptureInputProps) => {
	const [recording, setRecording] = React.useState(false)
	const fieldRef = React.useRef<HTMLDivElement>(null)

	const handleClick = () => {
		setRecording(true)
		fieldRef.current?.focus()
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.key === 'Escape') {
			setRecording(false)
			return
		}

		const combo = buildComboString(e)
		if (combo) {
			onChange(combo)
			setRecording(false)
		}
	}

	const handleBlur = () => {
		setRecording(false)
	}

	return (
		<CaptureField
			ref={fieldRef}
			$recording={recording}
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			title={recording ? 'Press a key combination… (Escape to cancel)' : 'Click to record a key combination'}
		>
			{value
				? value
				: <Placeholder>{recording ? 'Press keys…' : 'Click to record…'}</Placeholder>
			}
		</CaptureField>
	)
}
