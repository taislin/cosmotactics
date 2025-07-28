import { items, icons } from "../engine.js";
import { WIcon } from "./icons.js";
import { importedItems } from "../datasets/imports.js";

/**
 * Represents an item in the game.
 */
export class WItem {
	static defaultStats = {
		attack: 0,
		defence: 0,
		health: 0,
		speed: 0,
		range: 0,
		delay: 0,
		morale: 0,
		reload: 0,
		ammo: 0,
		max_ammo: 0,
		accuracy: 0,
		oxygen: 0,
	};

	/**
	 * Ensures the item has all necessary stats, using defaults if not provided.
	 * @param {Object} stats - The item's stats.
	 * @returns {Object} - The item's stats, with defaults applied if necessary.
	 */
	#ensureStats(stats) {
		return Object.assign({}, WItem.defaultStats, stats);
	}

	constructor(
		name,
		desc = "",
		icon = "?",
		stats = {},
		slot = "extra",
		x = -1,
		y = -1,
		itemtype = "item"
	) {
		this.name = name;
		this.desc = desc || "";
		this.stats = this.#ensureStats(stats);
		this.slot = slot || "extra";
		this.itemtype = itemtype;
		this.type = "item";
		this.icon = assignIcon(icon);
	}

	action() {
		// Placeholder for item actions.
		return true;
	}
}

/**
 * Loads item data from importedItems and creates WItem instances.
 */
export function loadItems() {
	let keys1 = Object.keys(importedItems);
	keys1.forEach((tmp_item) => {
		items[tmp_item] = new WItem(
			importedItems[tmp_item].name,
			importedItems[tmp_item].desc,
			importedItems[tmp_item].icon,
			importedItems[tmp_item].stats,
			importedItems[tmp_item].slot,
			-1,
			-1,
			importedItems[tmp_item].itemtype
		);
	});
}
// Helper to assign icon to item, handling missing or invalid icons.
function assignIcon(icon) {
	if (icon instanceof WIcon) {
		return icon;
	} else if (icons[icon]) {
		return JSON.parse(JSON.stringify(icons[icon]));
	} else {
		console.log("\x1b[31mERROR:\x1b[0m " + "icon " + icon + " not found!");
		return JSON.parse(JSON.stringify(icons["?"]));
	}
}
