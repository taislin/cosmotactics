import { icons } from "../engine.js";
import { gameDisplay, gameDisplayConfig } from "../../index.js";
import { importedIcons } from "./../datasets/imports.js";

/**
 * Represents a World Icon with visual and behavioral properties.
 */
export class WIcon {
	constructor(
		/** The name of the icon. */
		name = "",
		/** The character(s) representing the icon. */
		icon = ["?"],
		/** The color(s) of the icon. */
		color = ["#FFF"],
		background = [null],
		passable = true,
		tileset = "./icons/gui.png",
		tcoords = [0, 3]
	) {
		this.icon = icon;
		this.name = name;
		this.color = color;
		this.background = background;
		this.passable = passable;
		this.tileset = tileset;
		this.tcoords = tcoords;
		this._adjustCoordinates();
	}

	/**
	 * Adjusts the tile coordinates by multiplying them with the scale factor.
	 */
	_adjustCoordinates() {
		const scaleFactor = 32;

		if (typeof this.tcoords[0] === "number") {
			this.tcoords[0] *= scaleFactor;
		}
		if (typeof this.tcoords[1] === "number") {
			this.tcoords[1] *= scaleFactor;
		}
		this.tcoords.forEach((t) => {
			if (Array.isArray(t)) {
				t[0] *= scaleFactor;
				t[1] *= scaleFactor;
			}
		});
	}
}

/**
 * Loads icons from imported data and updates the tile map.
 * @returns {Object} The loaded icons object.
 */
export function loadIcons() {
	for (const tmp_icon in importedIcons) {
		// Create WIcon instances from imported data.
		icons[tmp_icon] = new WIcon(...Object.values(importedIcons[tmp_icon]));
	}
	for (const ico in icons) {
		// Populate the tile map with icon coordinates.
		_tileMap[ico] = icons[ico].coords;
	}
	// Update the game display's tile map.
	gameDisplayConfig.tileMap = gameDisplay._options.tileMap = _tileMap;
	return icons;
}
export const _tileMap = {};
