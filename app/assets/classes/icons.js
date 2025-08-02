import { icons } from "../engine.js";
import { importedIcons } from "./../datasets/imports.js";

/**
 * Represents a World Icon with visual and behavioral properties.
 */
export class WIcon {
	constructor({
		/** The name of the icon. */
		name = "",
		/** The character(s) representing the icon. */
		icon = ["?"],
		/** The color(s) of the icon. */
		color = ["#FFF"],
		/** The background color(s) of the icon. */
		background = [null],
		/** Whether the icon is passable. */
		passable = true,
		/** The tileset URL for the icon. */
		tileset = "./icons/gui.png",
		/** The tile coordinates [x, y] or array of coordinates [[x,y], ...]. */
		tcoords = [0, 3],
		/** Whether the icon is transparent to light for FOV calculations. */
		transparent = false,
	} = {}) {
		this.icon = icon;
		this.name = name;
		this.color = color;
		this.background = background;
		this.passable = passable;
		this.tileset = tileset;
		this.tcoords = tcoords;
		this.transparent = transparent;
		this._adjustCoordinates();
	}

	/**
	 * Adjusts the tile coordinates by multiplying them with the scale factor.
	 * This is done once at creation time.
	 */
	_adjustCoordinates() {
		const scaleFactor = 32;

		// Check if tcoords is an array of coordinate pairs or a single pair
		if (Array.isArray(this.tcoords[0])) {
			// It's an array of arrays, like [[x1, y1], [x2, y2]]
			this.tcoords.forEach((t) => {
				if (Array.isArray(t)) {
					t[0] *= scaleFactor;
					t[1] *= scaleFactor;
				}
			});
		} else if (typeof this.tcoords[0] === "number") {
			// It's a single pair, like [x, y]
			this.tcoords[0] *= scaleFactor;
			this.tcoords[1] *= scaleFactor;
		}
	}
}

/**
 * Instantiates and registers world icon objects from imported icon data.
 * @returns {Object} An object mapping icon names to their corresponding WIcon instances.
 */
export function loadIcons() {
	for (const tmp_icon in importedIcons) {
		// Create WIcon instances from imported data.
		// Passing the object directly is safer than relying on Object.values() order.
		icons[tmp_icon] = new WIcon(importedIcons[tmp_icon]);
	}
	// The _tileMap logic was buggy (using .coords instead of .tcoords) and appears
	// to be unused by the Tile backend, which gets coordinates directly from the
	// icon objects passed to gameDisplay.draw(). It has been removed.
	return icons;
}
