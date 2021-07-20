import React from "react";
import ReactDOM from "react-dom";

import { App } from "~/src/components/App";

if ('serviceWorker' in navigator) {
	try {
		navigator.serviceWorker.register(new URL('service-worker.js', import.meta.url))
		.then((registration) => {
			console.log(`Registration successful, scope is: ${registration.scope}`);
		})
		.catch((error) => {
			console.log(`Service worker registration failed, error: ${error}`);
		});
	}
	catch (error) {
		console.log(`Service worker registration exception, error: ${error}`);
	}
}

var mountNode = document.getElementById("app");
ReactDOM.render(<App />, mountNode);
