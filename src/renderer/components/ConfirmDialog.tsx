import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@material-ui/core'

interface Props {
	open: boolean
	title: string
	message: string
	onConfirm: () => void
	onCancel: () => void
}

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }: Props) => (
	<Dialog open={open} onClose={onCancel}>
		<DialogTitle>{title}</DialogTitle>
		<DialogContent>
			<DialogContentText>{message}</DialogContentText>
		</DialogContent>
		<DialogActions>
			<Button onClick={onCancel}>Cancel</Button>
			<Button onClick={onConfirm} color="primary" variant="contained" autoFocus>
				Confirm
			</Button>
		</DialogActions>
	</Dialog>
)
