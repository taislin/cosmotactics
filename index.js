// Import modules and functions
import { setControls } from "./assets/controls.js";
import { loadIcons, _tileMap } from "./assets/classes/icons.js";
import { loadWorld_maze } from "./assets/map.js";
import { loadItems } from "./assets/classes/items.js";
import { drawMainMenu } from "./assets/mainmenu.js";
import { icons } from "./assets/engine.js";

// Preload tile sets
function preloadTileSets() {
	const sources = [
		"./icons/terrain.png",
		"./icons/gui.png",
		"./icons/entities.png",
		"./icons/icon.png",
	];
	return sources.map((src) => {
		const img = document.createElement("img");
		img.src = src;
		return img;
	});
}
export const tileSets = preloadTileSets();

// Seed management
export let seed = Math.random();
export function setSeed(value) {
	seed = value;
	ROT.RNG.setSeed(value);
}

// Display configuration
export const gameDisplayConfig = {
	width: 20,
	height: 20,
	forceSquareRatio: false,
	fontSize: 16,
	fontFamily: "Noto Sans Mono, monospace",
	layout: "tile-gl",
	bg: "#222",
	tileWidth: 32,
	tileHeight: 32,
	tileSet: tileSets,
	tileMap: _tileMap,
	tileColorize: true,
};
export const msgDisplayConfig = {
	width: 32,
	height: 40,
	forceSquareRatio: false,
	fontSize: 16,
	bg: "#222",
	fg: "#fff",
	fontFamily: "Noto Sans Mono, monospace",
	spacing: 1,
};
export const menuDisplayConfig = {
	width: 20,
	height: 20,
	forceSquareRatio: true,
	fontSize: 32,
	bg: "#222",
	fg: "#fff",
	fontFamily: "Arcade, Noto Sans Mono, monospace",
};

// Display instances
export const gameDisplay = new ROT.Display(gameDisplayConfig);
export const menuDisplay = new ROT.Display(menuDisplayConfig);
export const msgDisplay = new ROT.Display(msgDisplayConfig);

// Attach displays to DOM
function attachDisplays() {
	document.getElementById("terminal").appendChild(menuDisplay.getContainer());
	document.getElementById("msg").appendChild(msgDisplay.getContainer());
}

// Game initialization
function initializeGame() {
	loadIcons();
	loadItems();
	ROT.RNG.setSeed(seed);
	loadWorld_maze(0);
	setControls();
	drawMainMenu(menuDisplay, gameDisplay, msgDisplay);
}

// Run setup
attachDisplays();
initializeGame();
