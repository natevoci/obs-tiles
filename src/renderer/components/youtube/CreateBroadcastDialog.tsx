import React from 'react'
import styled from 'styled-components'
import {
	Button,
	TextField,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from '@material-ui/core'
import type { CreateBroadcastOptions } from '../../api/youtube/YouTubeLiveService'
import type { YouTubeConfig } from '../../../shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
	return new Date().toISOString().slice(0, 10)
}

function applyTitleTemplate(template: string): string {
	return template.replace(/\{date\}/g, todayIso())
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const FieldGroup = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding-top: 8px;
`

// ---------------------------------------------------------------------------
// CreateBroadcastDialog
// ---------------------------------------------------------------------------

interface CreateBroadcastDialogProps {
	open: boolean
	config: Pick<
		YouTubeConfig,
		| 'defaultTitle'
		| 'defaultDescription'
		| 'defaultPrivacyStatus'
		| 'defaultLatency'
		| 'allowPrivacyOverride'
		| 'allowLatencyOverride'
	>
	onConfirm: (opts: CreateBroadcastOptions) => void
	onCancel: () => void
}

export const CreateBroadcastDialog = ({
	open,
	config,
	onConfirm,
	onCancel,
}: CreateBroadcastDialogProps) => {
	const [title, setTitle] = React.useState(() =>
		applyTitleTemplate(config.defaultTitle || '{date} Stream'),
	)
	const [description, setDescription] = React.useState(config.defaultDescription ?? '')
	const [privacy, setPrivacy] = React.useState<CreateBroadcastOptions['privacyStatus']>(
		config.defaultPrivacyStatus,
	)
	const [latency, setLatency] = React.useState<CreateBroadcastOptions['latencyPreference']>(
		config.defaultLatency,
	)

	// Re-seed when dialog opens
	React.useEffect(() => {
		if (open) {
			setTitle(applyTitleTemplate(config.defaultTitle || '{date} Stream'))
			setDescription(config.defaultDescription ?? '')
			setPrivacy(config.defaultPrivacyStatus)
			setLatency(config.defaultLatency)
		}
	}, [open, config])

	const handleConfirm = () => {
		if (!title.trim()) return
		onConfirm({ title: title.trim(), description, privacyStatus: privacy, latencyPreference: latency })
	}

	return (
		<Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
			<DialogTitle>Create YouTube Broadcast</DialogTitle>
			<DialogContent>
				<FieldGroup>
					<TextField
						label="Title *"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						variant="outlined"
						size="small"
						fullWidth
						autoFocus
					/>
					<TextField
						label="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						variant="outlined"
						size="small"
						fullWidth
						multiline
						minRows={2}
					/>
					{config.allowPrivacyOverride && (
						<FormControl variant="outlined" size="small" fullWidth>
							<InputLabel>Privacy</InputLabel>
							<Select
								label="Privacy"
								value={privacy}
								onChange={(e) => setPrivacy(e.target.value as any)}
							>
								<MenuItem value="public">Public</MenuItem>
								<MenuItem value="unlisted">Unlisted</MenuItem>
								<MenuItem value="private">Private</MenuItem>
							</Select>
						</FormControl>
					)}
					{config.allowLatencyOverride && (
						<FormControl variant="outlined" size="small" fullWidth>
							<InputLabel>Latency</InputLabel>
							<Select
								label="Latency"
								value={latency}
								onChange={(e) => setLatency(e.target.value as any)}
							>
								<MenuItem value="ultraLow">Ultra Low</MenuItem>
								<MenuItem value="low">Low</MenuItem>
								<MenuItem value="normal">Normal</MenuItem>
							</Select>
						</FormControl>
					)}
				</FieldGroup>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
				<Button
					onClick={handleConfirm}
					color="primary"
					variant="contained"
					disabled={!title.trim()}
				>
					Go Live →
				</Button>
			</DialogActions>
		</Dialog>
	)
}
