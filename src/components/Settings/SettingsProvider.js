import React from 'react';
import { useContext } from 'react';

import { SettingsContext } from './SettingsContext';

export const SettingsProvider = ({ children }) => {
	const [settings, setSettings] = React.useState(window.localStorage.getItem(`settings`) || {
		connections: {
			localhost: {
				address: '192.168.10.101:4444',
				password: '',
			},
			liveStream: {
				address: 'streamingauditorium:4444',
				password: '',
			},
			projector: {
				// address: 'laptop02:4444',
				address: '192.168.10.101:4444',
				password: '',
			},
		},

		tileSize: 18,
		tiles: [
			{
				group: 'Live Stream',
				connection: 'localhost',
				direction: 'row',
				tiles: [
					{
						scene: '0 - Black',
					},
					{
						scene: '1 - Projector',
					},
					{
						scene: '3 - Cameras'
					},
					{
						scene: '7 - 20-80'
					},
					{
						scene: '8 - Side by Side'
					},
					{
						scene: '9 - 80-20'
					},
					{
						scene: 'Video Call (Zoom)'
					},
					{
						direction: 'column',
						tiles: [
							{
								button: 'toggleStreaming',
							},
							{
								button: 'toggleRecording',
							},
							{
								text: 'stats',
							},
						],
					},
				],
			},
			// {
			// 	group: 'Projector',
			// 	connection: 'projector',
			// 	tiles: [
			// 		{
			// 			scene: '0 - Black',
			// 		},
			// 		{
			// 			scene: '3 - Cameras'
			// 		},
			// 		{
			// 			scene: '7 - 20-80'
			// 		},
			// 		{
			// 			scene: '8 - Side by Side'
			// 		},
			// 		{
			// 			scene: '9 - 80-20'
			// 		},
			// 		{
			// 			scene: '1 - Projector',
			// 		},
			// 	]
			// },
		]
	});

	return (
		<SettingsContext.Provider
			value={{
				settings,
				setSettings,
			}}
		>
			{children}
		</SettingsContext.Provider>
	);
}
