import React from 'react'
import styled from 'styled-components'
import {
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Typography,
	CircularProgress,
} from '@material-ui/core'
import type { LiveBroadcastInfo } from '../../api/youtube/YouTubeLiveService'

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const BroadcastTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
	margin-top: 12px;
`

const Th = styled.th`
	text-align: left;
	padding: 6px 10px 6px 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.12);
	font-weight: 600;
	opacity: 0.7;
	white-space: nowrap;
`

const Td = styled.td`
	padding: 8px 10px 8px 0;
	border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	vertical-align: middle;
`

const ActionCell = styled(Td)`
	white-space: nowrap;
	display: flex;
	gap: 6px;
	align-items: center;
`

const StatusBadge = styled.span<{ $status: string }>`
	display: inline-block;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	background: ${(p) =>
		p.$status === 'active'
			? 'rgba(244, 67, 54, 0.25)'
			: p.$status === 'testing'
			? 'rgba(255, 152, 0, 0.25)'
			: 'rgba(255,255,255,0.08)'};
	color: ${(p) =>
		p.$status === 'active' ? '#f44336' : p.$status === 'testing' ? '#ff9800' : 'inherit'};
`

const Footer = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStartTime(iso: string): string {
	if (!iso) return '—'
	try {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	} catch {
		return iso
	}
}

// ---------------------------------------------------------------------------
// ResumeBroadcastDialog
// ---------------------------------------------------------------------------

interface ResumeBroadcastDialogProps {
	open: boolean
	broadcasts: LiveBroadcastInfo[]
	/** Called when the user clicks Resume on a row. */
	onResume: (broadcast: LiveBroadcastInfo) => void
	/** Called when the user clicks End on a row. Returns a promise so the row
	 *  can show a spinner while the API call completes. */
	onEnd: (broadcastId: string) => Promise<void>
	/** Called when the user clicks "Create new broadcast". */
	onCreateNew: () => void
	onCancel: () => void
}

export const ResumeBroadcastDialog = ({
	open,
	broadcasts,
	onResume,
	onEnd,
	onCreateNew,
	onCancel,
}: ResumeBroadcastDialogProps) => {
	const [endingIds, setEndingIds] = React.useState<Set<string>>(new Set())

	const handleEnd = async (broadcastId: string) => {
		setEndingIds((prev) => new Set([...prev, broadcastId]))
		try {
			await onEnd(broadcastId)
		} finally {
			setEndingIds((prev) => {
				const next = new Set(prev)
				next.delete(broadcastId)
				return next
			})
		}
	}

	return (
		<Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
			<DialogTitle>Existing YouTube broadcasts found</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					One or more YouTube broadcasts are already active. Resume one or end them before creating
					a new broadcast.
				</Typography>

				<BroadcastTable>
					<thead>
						<tr>
							<Th>Title</Th>
							<Th>Status</Th>
							<Th>Started</Th>
							<Th>Actions</Th>
						</tr>
					</thead>
					<tbody>
						{broadcasts.map((b) => {
							const isEnding = endingIds.has(b.broadcastId)
							return (
								<tr key={b.broadcastId}>
									<Td title={b.title} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{b.title || '(untitled)'}
									</Td>
									<Td>
										<StatusBadge $status={b.lifeCycleStatus}>
											{b.lifeCycleStatus}
										</StatusBadge>
									</Td>
									<Td>{formatStartTime(b.scheduledStartTime)}</Td>
									<ActionCell as="td" style={{ display: 'flex' }}>
										<Button
											size="small"
											variant="contained"
											color="primary"
											onClick={() => onResume(b)}
											disabled={isEnding}
										>
											Resume
										</Button>
										<Button
											size="small"
											variant="outlined"
											onClick={() => handleEnd(b.broadcastId)}
											disabled={isEnding}
											style={{ minWidth: 58 }}
										>
											{isEnding ? <CircularProgress size={14} /> : 'End'}
										</Button>
									</ActionCell>
								</tr>
							)
						})}
					</tbody>
				</BroadcastTable>

				<Footer>
					<Button variant="outlined" onClick={onCreateNew}>
						Create new broadcast
					</Button>
				</Footer>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCancel}>Cancel</Button>
			</DialogActions>
		</Dialog>
	)
}
