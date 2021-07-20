import { ViewColumn } from '@material-ui/icons';
import React from 'react';
import { useContext } from 'react';

import { SettingsContext } from './SettingsContext';

export const SettingsProvider = ({ children }) => {
	const [settings, setSettings] = React.useState(window.localStorage.getItem(`settings`) || {
		connections: {
			localhost: {
				address: '192.168.10.101:4444',
			},
			liveStream: {
				address: '192.168.12.56:4444',
			},
			projector: {
				// address: 'laptop-2:4444',
				address: '192.168.10.114:4444',
			},
		},

		tileSize: 12,
		direction: 'column',
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
					{
						group: 'Cameras',
						// connection: 'localhost',
						connection: 'projector',
						direction: 'row',
						tiles: [
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'NDI - AuditoriumCamcorder',
								} ,
								title: 'Camcorder',
							},
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'VLC - Tablet camera',
								} ,
								title: 'Tablet',
							},
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'Fake Camera',
								} ,
								title: 'Front',
							},
						],
					},
				],
			},
			{
				group: 'Projector',
				connection: 'projector',
				direction: 'row',
				tiles: [
					{
						scene: '0 - Black',
					},
					{
						scene: '1 - Screen',
					},
					{
						scene: '3 - Cameras'
					},
					{
						scene: '5 - Video Call'
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
						text: 'stats',
					},
					{
						group: 'Cameras',
						direction: 'row',
						tiles: [
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'NDI - Camcorder',
								} ,
								title: 'Camcorder',
							},
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'VLC - Tablet camera',
								} ,
								title: 'Tablet',
							},
							{
								sceneItem: {
									scene: 'Cameras',
									item: 'Fake Camera',
								} ,
								title: 'Front',
							},
						],
					},
				],
			},
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
