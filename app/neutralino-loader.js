(function () {
	// Neutralino injects global variables (NL_PORT, NL_TOKEN) into the window object
	// when the app is running in the Neutralino environment.
	// We check for these to determine if we are in Neutralino.
	if (window.NL_PORT && window.NL_TOKEN) {
		console.log(
			"Neutralino environment detected. Dynamically loading neutralino.js..."
		);

		const script = document.createElement("script");

		script.src = "./assets/neutralino.js";
		// If neutralino.js is in cosmotactics/resources/neutralino.js:

		script.defer = true; // Use defer to ensure it doesn't block HTML parsing

		script.onload = () => {
			console.log("neutralino.js loaded successfully.");
			// You can dispatch a custom event here if your game needs to know
			// exactly when Neutralino is ready, beyond just checking for its presence.
			// window.dispatchEvent(new Event('neutralinoReady'));
		};

		script.onerror = (e) => {
			console.error("Failed to load neutralino.js:", e);
		};

		document.head.appendChild(script); // Append to head for early loading

		// Optionally set a global flag that your other game scripts can easily check
		window.isNeutralinoApp = true;
	} else {
		console.log("Not running in Neutralino environment.");
		window.isNeutralinoApp = false;
	}
})();
