import { gameDisplay, msgDisplay } from "../index.js";
import {
	entities,
	VARS,
	STATS,
	icons,
	world_items,
	player_entities,
	checkLight,
	projectiles,
} from "./engine.js";
import { world, world_grid } from "./map.js";
export var currentLoc = [0, 0];
export var drawPaths = [];

/**
 * Utility function to tint an image with a specific color.
 * @param {HTMLImageElement} image - The source image to tint.
 * @param {string} color - The color string (e.g., "#ff0000", "red").
 * @returns {HTMLCanvasElement} A new canvas element with the tinted image.
 */
function tintImage(image, color) {
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const ctx = canvas.getContext("2d");

	// Draw the original image
	ctx.drawImage(image, 0, 0);

	// Apply the tint color
	ctx.globalCompositeOperation = "source-atop";
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, image.width, image.height);

	// Restore to default composite operation
	ctx.globalCompositeOperation = "source-over";

	return canvas;
}

/**
 * Updates the game canvas, drawing the map, entities, items, and UI elements.
 * @param {CanvasRenderingContext2D} projectileCtx - The context for the overlay canvas.
 */
export function updateCanvas(projectileCtx) {
	gameDisplay.clear();
	if (projectileCtx) {
		// Clear the projectile canvas if it exists
		projectileCtx.clearRect(
			0,
			0,
			projectileCtx.canvas.width,
			projectileCtx.canvas.height
		);
	}
	drawMenu();

	// Calculate the visible area of the map based on the selected entity's position and zoom level.
	const drawInterval = calculateDrawInterval();

	updateFOV(VARS.SELECTED);

	// Draw the map tiles, entities, and items within the visible area.
	for (let j in world) {
		if (world[j].icon) {
			if (
				world[j].x >= drawInterval[0] &&
				world[j].y >= drawInterval[1] &&
				world[j].x < drawInterval[2] &&
				world[j].y < drawInterval[3]
			) {
				let drai = world[j].icon;
				let drac = world[j].icon.color;
				let drab = "#111";
				if (
					world[j].x == VARS.TARGET[0] &&
					world[j].y == VARS.TARGET[1]
				) {
					if (VARS.MODE == "targeting") {
						drai = [world[j].icon, icons["target"]];
						drab = ["#111", icons["target"].background];
						drac = [world[j].icon.color, icons["target"].color];
					} else if (VARS.MODE == "look") {
						drai = [world[j].icon, icons["cursor_look"]];
						drab = ["#111", icons["cursor_look"].background];
						drac = [
							world[j].icon.color,
							icons["cursor_look"].color,
						];
					} else if (VARS.MODE == "none") {
						drai = [world[j].icon, icons["cursor_square"]];
						drab = ["#111", icons["cursor_square"].background];
						drac = [
							world[j].icon.color,
							icons["cursor_square"].color,
						];
					}
				}
				if (world[j].seen == true) {
					if (world[j].visible == true) {
						gameDisplay.draw(
							world[j].x - drawInterval[0],
							world[j].y - drawInterval[1],
							drai,
							drac,
							drab
						);
					} else {
						gameDisplay.draw(
							world[j].x - drawInterval[0],
							world[j].y - drawInterval[1],
							drai,
							"#444",
							drab
						);
					}
				}
			}
		}
	}
	for (let k in world_items) {
		if (
			world_items[k].icon &&
			world_items[k].x >= 0 &&
			world_items[k].y >= 0
		) {
			if (
				world_items[k].x >= drawInterval[0] &&
				world_items[k].y >= drawInterval[1] &&
				world_items[k].x < drawInterval[2] &&
				world_items[k].y < drawInterval[3]
			) {
				let drai = [world_items[k].icon];
				let drac = [world_items[k].icon.color];
				let drab = ["#111"];

				if (
					world_items[k].x == VARS.TARGET[0] &&
					world_items[k].y == VARS.TARGET[1]
				) {
					if (VARS.MODE == "targeting") {
						drai.push(icons["target"]);
						drab.push(icons["target"].background);
						drac.push(icons["target"].color);
					} else if (VARS.MODE == "look") {
						drai.push(icons["cursor_look"]);
						drab.push(icons["cursor_look"].background);
						drac.push(icons["cursor_look"].color);
					} else if (VARS.MODE == "none") {
						drai.push(icons["cursor_square"]);
						drab.push(icons["cursor_square"].background);
						drac.push(icons["cursor_square"].color);
					}
				}
				for (var i = effects.length - 1; i >= 0; i--) {
					if (
						effects[i].x == world_items[k].x &&
						effects[i].y == world_items[k].y
					) {
						drai.push(effects[i].icon);
						drab.push(effects[i].background);
						drac.push(effects[i].color);
						effects.splice(i, 1);
					}
				}
				if (world_items[k].seen == true) {
					if (world_items[k].visible == true) {
						gameDisplay.draw(
							world_items[k].x - drawInterval[0],
							world_items[k].y - drawInterval[1],
							drai,
							drac,
							drab
						);
					} else {
						gameDisplay.draw(
							world_items[k].x - drawInterval[0],
							world_items[k].y - drawInterval[1],
							drai,
							"#444",
							drab
						);
					}
				}
			}
		}
	}
	for (let e in entities) {
		if (entities[e].mob && entities[e].mob.ai == "dead") {
			continue;
		}
		if (entities[e].icon) {
			if (
				entities[e].x >= drawInterval[0] &&
				entities[e].y >= drawInterval[1] &&
				entities[e].x < drawInterval[2] &&
				entities[e].y < drawInterval[3]
			) {
				let drai = [entities[e].icon];
				let drac = [entities[e].icon.color];
				let drab = ["#111"];
				if (
					entities[e].owner == "player" &&
					entities[e].mob.slots.ranged &&
					icons["player_" + entities[e].mob.slots.ranged.icon]
				) {
					drai = [
						icons["player_" + entities[e].mob.slots.ranged.icon],
					];
					drac = [
						icons["player_" + entities[e].mob.slots.ranged.icon]
							.color,
					];
				}
				if (
					entities[e].x == VARS.TARGET[0] &&
					entities[e].y == VARS.TARGET[1]
				) {
					if (VARS.MODE == "targeting") {
						drai.push(icons["target"]);
						drab.push(icons["target"].background);
						drac.push(icons["target"].color);
					} else if (VARS.MODE == "look") {
						drai.push(icons["cursor_look"]);
						drab.push(icons["cursor_look"].background);
						drac.push(icons["cursor_look"].color);
					} else if (VARS.MODE == "none") {
						drai.push(icons["cursor_square"]);
						drab.push(icons["cursor_square"].background);
						drac.push(icons["cursor_square"].color);
					}
				}
				for (var i = effects.length - 1; i >= 0; i--) {
					if (
						effects[i].x == entities[e].x &&
						effects[i].y == entities[e].y
					) {
						drai.push(effects[i].icon);
						drab.push(effects[i].background);
						drac.push(effects[i].color);
						effects.splice(i, 1);
					}
				}
				if (entities[e] == VARS.SELECTED) {
					drai.push(icons["overlay_selected"]);
					drab.push("transparent");
					drac.push("#ffff00");
				}
				if (entities[e].owner == "player") {
					let indx = player_entities.indexOf(entities[e]);
					let overlayIcon =
						icons["overlay_" + String(Number(indx + 1))];
					if (indx >= 0 && overlayIcon) {
						drai.push(overlayIcon);
						drab.push("transparent");
						drac.push(overlayIcon.color || "#fff");
					}
				}

				if (entities[e].visible == true) {
					gameDisplay.draw(
						entities[e].x - drawInterval[0],
						entities[e].y - drawInterval[1],
						drai,
						drac,
						drab
					);
				}
			}
		}
	}

	if (VARS.MODE == "none") {
		for (var dp of drawPaths) {
			gameDisplay.draw(dp[0], dp[1], dp[2], dp[3], dp[4]);
		}
	}
	drawEffects(drawInterval);

	// --- NEW Projectile Drawing Loop with Color ---
	if (projectileCtx) {
		const options = gameDisplay.getOptions();
		const tileWidth = options.tileWidth;
		const tileHeight = options.tileHeight;

		for (const projectile of projectiles) {
			if (!projectile.type) continue;

			const iconData = icons["projectile_" + projectile.dir];
			if (!iconData) continue;

			const tilesetImage = options.tileSet.find((img) =>
				img.src.endsWith(iconData.tileset.replace("./", "/"))
			);
			if (!tilesetImage || !tilesetImage.complete) continue;

			// Get the projectile's color, default to red if not specified
			let projColor = "#ff0000";
			if (projectile.type == "plasma") {
				projColor = "#ffa500";
			} else if (projectile.type == "projectile") {
				projColor = "#ccc";
			}
			// Use iconData's color if it has a direct one (single value)
			else if (typeof iconData.color === "string") {
				projColor = iconData.color;
			} else if (
				Array.isArray(iconData.color) &&
				iconData.color.length > 0
			) {
				// If it's an array, pick the first one or a random one if needed
				projColor = iconData.color[0]; // Or getRandomElement(iconData.color) if desired
			}

			// Create a tinted version of the projectile icon
			const sourceX = iconData.tcoords[0];
			const sourceY = iconData.tcoords[1];

			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = tileWidth;
			tempCanvas.height = tileHeight;
			const tempCtx = tempCanvas.getContext("2d");

			// Draw the specific projectile icon from the tileset onto the temp canvas
			tempCtx.drawImage(
				tilesetImage,
				sourceX, // sx
				sourceY, // sy
				tileWidth, // sWidth
				tileHeight, // sHeight
				0, // dx
				0, // dy
				tileWidth, // dWidth
				tileHeight // dHeight
			);

			// Now tint the image on the temporary canvas
			const tintedImage = tintImage(tempCanvas, projColor);

			// Calculate precise pixel coordinates for drawing on the main projectile canvas
			const drawX = (projectile.px - drawInterval[0]) * tileWidth;
			const drawY = (projectile.py - drawInterval[1]) * tileHeight;

			// Draw the tinted projectile onto the main projectile canvas
			projectileCtx.drawImage(tintedImage, drawX, drawY);
		}
	}
	// --- END NEW Projectile Drawing Loop ---
}

export let effects = [];

/**
 * Draws temporary visual effects on the canvas.
 * @param {Array} drawInterval - The visible area of the map.
 */
function drawEffects(drawInterval) {
	for (let i = effects.length - 1; i >= 0; i--) {
		if (
			effects[i].x >= drawInterval[0] &&
			effects[i].y >= drawInterval[1] &&
			effects[i].x < drawInterval[2] &&
			effects[i].y < drawInterval[3]
		) {
			gameDisplay.draw(
				effects[i].x - drawInterval[0],
				effects[i].y - drawInterval[1],
				effects[i].icon,
				effects[i].color,
				effects[i].background
			);
		}

		// Remove the effect after drawing it.
		effects.splice(i, 1);
	}
}

/**
 * Renders the main game menu panel, displaying player stats, equipment, logs, squad information, and controls.
 *
 * The menu adapts its content based on the current submenu selection, showing detailed information such as health, armour, oxygen, combat stats, equipment, recent logs, tile inspection, and squad status for all player-controlled units. It also draws interactive controls and contextual information about the current location and entities present.
 */
function drawMenu() {
	if (VARS.GAMEWINDOW == "MENU" || VARS.GAMEWINDOW == "LOST") {
		return;
	}
	const PANEL_WIDTH = 48; // Define a constant for the new width
	msgDisplay.clear();
	msgDisplay.drawText(
		0,
		1,
		"║ %c{orange}MENU%c{} ║%c{#35b59b}         COSMOTACTICS           %c{}║ %c{orange}OBJ %c{}" // Added spacing
	);
	msgDisplay.drawText(
		2,
		3,
		VARS.SELECTED.name +
			" [Alpha " +
			(player_entities.indexOf(VARS.SELECTED) + 1) +
			"]"
	);
	msgDisplay.drawText(2, 4, "%c{grey}" + VARS.SELECTED.typename);
	let phealth = Math.max(Math.floor(VARS.SELECTED.mob.stats.health / 5), 0);
	let shealth = "X".repeat(phealth);
	let shextra = 20 - phealth;
	let shextras = "%b{#580000}%c{#580000}" + "X".repeat(shextra);
	msgDisplay.drawText(
		2,
		5,
		"Health: %b{#9F0000}%c{#9f0000}" + shealth + shextras
	);
	msgDisplay.drawText(10, 5, "%c{#ccc}" + VARS.SELECTED.mob.stats.health);

	// Armor Bar
	let parmour = Math.max(Math.floor(VARS.SELECTED.mob.stats.defence / 5), 0);
	let sarmour = "X".repeat(parmour);
	let saextra = 20 - parmour;
	let saextras = "%b{#000058}%c{#000058}" + "X".repeat(saextra);
	msgDisplay.drawText(
		2,
		6,
		"Armour: %b{#00009f}%c{#00009f}" + sarmour + saextras
	);
	msgDisplay.drawText(10, 6, "%c{#ccc}" + VARS.SELECTED.mob.stats.defence);

	// Oxygen Bar
	let prad = Math.max(Math.floor(STATS.OXYGEN / 5), 0);
	let srad = "X".repeat(prad);
	let srextra = 20 - prad;
	let srextras = "%b{#005800}%c{#005800}" + "X".repeat(srextra);
	msgDisplay.drawText(
		2,
		7,
		"Oxygen: %b{#009f00}%c{#009f00}" + srad + srextras
	);
	msgDisplay.drawText(10, 7, "%c{#ccc}" + STATS.OXYGEN);

	// Gold and Turn
	msgDisplay.drawText(2, 8, "Gold: %c{yellow}" + STATS.GOLD);
	msgDisplay.drawText(
		PANEL_WIDTH - 2 - ("Turn: " + VARS.TURN).length,
		8,
		"Turn: %c{orange}" + VARS.TURN
	);

	// --- NEW: Core Combat Stats on the right of the bars ---
	const STATS_X_POS = 26; // X-coordinate for the new stats column
	// Ranged Damage
	let rangedDmgText = "%c{grey}N/A";
	if (VARS.SELECTED.mob.slots.ranged) {
		const rWpn = VARS.SELECTED.mob.slots.ranged;
		const minDmg = Math.floor(rWpn.stats.attack - rWpn.stats.attack * 0.1);
		const maxDmg = Math.ceil(rWpn.stats.attack + rWpn.stats.attack * 0.1);
		rangedDmgText = `%c{white}${minDmg}-${maxDmg} %c{grey}(${
			rWpn.itemtype.split(" ")[0]
		})`;
	}
	msgDisplay.drawText(STATS_X_POS, 5, `R-DMG: ${rangedDmgText}`);

	// Melee Damage
	let meleeDmgText = "%c{grey}N/A";
	let meleeAttack = VARS.SELECTED.mob.stats.attack; // Base attack
	if (VARS.SELECTED.mob.slots.melee) {
		meleeAttack = VARS.SELECTED.mob.slots.melee.stats.attack; // Weapon attack
	}
	const minMelee = Math.floor(meleeAttack - meleeAttack * 0.1);
	const maxMelee = Math.ceil(meleeAttack + meleeAttack * 0.1);
	meleeDmgText = `%c{white}${minMelee}-${maxMelee}`;
	msgDisplay.drawText(STATS_X_POS, 6, `M-DMG: ${meleeDmgText}`);

	// Speed
	msgDisplay.drawText(
		STATS_X_POS,
		7,
		`Speed: %c{white}${VARS.SELECTED.mob.stats.speed.toFixed(2)}`
	);

	// --- BORDERS AND TABS ---
	for (var i = 1; i < 40; i++) {
		msgDisplay.drawText(0, i, "║");
		msgDisplay.drawText(PANEL_WIDTH - 1, i, "║");
	}

	msgDisplay.drawText(
		0,
		0,
		"╔══════╦════════════════════════════════╦══════╗"
	); // Adjusted for new width
	msgDisplay.drawText(
		0,
		2,
		"╠══════╩════════════════════════════════╩══════╣"
	);
	msgDisplay.drawText(
		0,
		9,
		"╟────────────┬──────────┬──────────┬───────────╢"
	);
	let submenus =
		"║%c{#cc8400}%b{#ccc}1.%c{#000}EQUIPMENT %c{}%b{}│%c{orange}2.%c{}OBSERVE │%c{orange} 3.%c{}LOGS   %b{}%c{}│ %c{orange}4.%c{}SQUAD   ║";
	if (VARS.SUBMENU == "INSPECT") {
		submenus =
			"║%c{orange}1.%c{}EQUIPMENT │%c{#cc8400}%b{#ccc}2.%c{#000}OBSERVE %c{}%b{}│%c{orange} 3.%c{}LOGS   %b{}%c{}│ %c{orange}4.%c{}SQUAD   ║";
	} else if (VARS.SUBMENU == "LOGS") {
		submenus =
			"║%c{orange}1.%c{}EQUIPMENT │%c{orange}2.%c{}OBSERVE │%c{#cc8400}%b{#ccc} 3.%c{#000}LOGS   %b{}%c{}│ %c{orange}4.%c{}SQUAD   ║";
	} else if (VARS.SUBMENU == "SQUAD") {
		submenus =
			"║%c{orange}1.%c{}EQUIPMENT │%c{orange}2.%c{}OBSERVE │%c{orange} 3.%c{}LOGS   │%b{#ccc}%c{#000} 4.SQUAD   %b{}%c{}║";
	}
	msgDisplay.drawText(0, 10, submenus);
	msgDisplay.drawText(
		0,
		11,
		"╟────────────┴──────────┴──────────┴───────────╢"
	);
	if (VARS.SUBMENU == "LOGS") {
		let parsedlog = "";
		if (VARS.GAMELOG.length > 0) {
			for (var l = 0; l <= Math.min(8, VARS.GAMELOG.length - 1); l++) {
				parsedlog += VARS.GAMELOG[l] + "\n";
			}
		}
		msgDisplay.drawText(2, 13, parsedlog, 44);
	} else if (VARS.SUBMENU == "INSPECT") {
		if (
			!(
				VARS.TARGET[0] < 0 ||
				VARS.TARGET[1] < 0 ||
				VARS.TARGET[0] >= VARS.MAP_X ||
				VARS.TARGET[1] >= VARS.MAP_Y
			) &&
			world[VARS.TARGET[0] + "," + VARS.TARGET[1]].visible == true
		) {
			let dist = Math.round(
				Math.hypot(
					VARS.TARGET[0] - VARS.SELECTED.x,
					VARS.TARGET[1] - VARS.SELECTED.y
				)
			);
			msgDisplay.drawText(
				2,
				12,
				"%c{grey}Distance:%c{} " +
					dist +
					" tiles" +
					" (" +
					VARS.TARGET[0] +
					"," +
					VARS.TARGET[1] +
					")",
				28
			);
			let getpass = world_grid[VARS.TARGET[1]][VARS.TARGET[0]];
			if (getpass == 1) {
				getpass = "%c{green}PASSABLE";
			} else {
				getpass = "%c{red}NOT PASSABLE";
			}
			msgDisplay.drawText(
				2,
				13,
				"%c{grey}Terrain:%c{} " +
					world[VARS.TARGET[0] + "," + VARS.TARGET[1]].icon.name,
				28
			);
			msgDisplay.drawText(2, 14, getpass, 28);
			let br = "%c{green}SAFE";
			let notbr = "%c{red}NOT SAFE";
			msgDisplay.drawText(2, 15, "%c{grey}Atmosphere: " + notbr);
			msgDisplay.drawText(
				2,
				16,
				"%c{grey}Temperature: " + "%c{yellow}21°C"
			);

			let locEnt = [];
			for (var e of entities) {
				if (e.x == VARS.TARGET[0] && e.y == VARS.TARGET[1]) {
					if (!locEnt.includes(e)) {
						locEnt.push(e);
					}
				}
			}
			for (var e of world_items) {
				if (e.x == VARS.TARGET[0] && e.y == VARS.TARGET[1]) {
					if (!locEnt.includes(e)) {
						locEnt.push(e);
					}
				}
			}
			if (
				world[VARS.TARGET[0] + "," + VARS.TARGET[1]].icon.name ==
				"stairs (down)"
			) {
				locEnt.push({ name: "stairs (down)", type: "stairs" });
			}
			VARS.MENU_LENGTH = locEnt.length;
			msgDisplay.drawText(2, 18, "%c{grey}Tile Contents:");
			if (locEnt.length) {
				for (var i = 0; i < locEnt.length; i++) {
					let cl = "%c{}";
					let indx = "- ";
					if (VARS.MENU_ITEM == i + 1) {
						indx = "%c{orange}> ";

						if (locEnt[i] && locEnt[i].mob && locEnt[i].mob.desc) {
							msgDisplay.drawText(
								2,
								25,
								"%c{grey}" + locEnt[i].mob.desc,
								28
							); // Draw description at the bottom
						}
					}

					if (locEnt[i].type == "item") {
						cl = "%c{#66ffff}";
					} else if (locEnt[i].type == "stairs") {
						cl = "%c{#0000ff}";
					} else if (locEnt[i].owner && locEnt[i].owner == "player") {
						cl = "%c{#009f00}";
					} else if (locEnt[i].owner && locEnt[i].owner != "player") {
						cl = "%c{red}";
					}
					msgDisplay.drawText(2, 19 + i, indx + cl + locEnt[i].name);
				}
			}
		} else {
			msgDisplay.drawText(2, 12, "%c{grey}Location not visible", 28);
		}
	} else if (VARS.SUBMENU == "EQUIPMENT") {
		if (VARS.SELECTED.mob.slots.ranged) {
			msgDisplay.drawText(
				1,
				12,
				"%b{black}%c{white}(RANGD)%b{}%c{white} " +
					VARS.SELECTED.mob.slots.ranged.name
			);
			msgDisplay.drawText(
				4,
				13,
				"%c{grey}" + VARS.SELECTED.mob.slots.ranged.itemtype
			);
			msgDisplay.drawText(
				4,
				14,
				"%c{orange}Ammo %c{white}" +
					"%c{yellow}i".repeat(
						VARS.SELECTED.mob.slots.ranged.stats.ammo
					) +
					"%c{grey}i".repeat(
						VARS.SELECTED.mob.slots.ranged.stats.max_ammo -
							VARS.SELECTED.mob.slots.ranged.stats.ammo
					)
			);
			msgDisplay.drawText(
				4,
				15,
				"%c{#ff0000}DMG %c{white}" +
					Math.floor(
						VARS.SELECTED.mob.slots.ranged.stats.attack -
							VARS.SELECTED.mob.slots.ranged.stats.attack * 0.1
					) +
					"-" +
					Math.ceil(
						VARS.SELECTED.mob.slots.ranged.stats.attack +
							VARS.SELECTED.mob.slots.ranged.stats.attack * 0.1
					) +
					" %c{orange}FR %c{white}" +
					VARS.SELECTED.mob.slots.ranged.stats.delay +
					" %c{orange}REL %c{white}" +
					VARS.SELECTED.mob.slots.ranged.stats.reload
			);
		} else {
			msgDisplay.drawText(
				1,
				12,
				"%b{black}%c{white}(RANGD)%b{}%c{grey} <empty>"
			);
		}
		if (VARS.SELECTED.mob.slots.melee) {
			msgDisplay.drawText(
				1,
				17,
				"%b{black}%c{white}(MELEE)%b{}%c{white} " +
					VARS.SELECTED.mob.slots.melee.name
			);
			msgDisplay.drawText(
				4,
				18,
				"%c{grey}" + VARS.SELECTED.mob.slots.melee.itemtype
			);
			msgDisplay.drawText(
				4,
				19,
				"%c{#ff0000}DMG %c{white}" +
					Math.floor(
						VARS.SELECTED.mob.slots.melee.stats.attack -
							VARS.SELECTED.mob.slots.melee.stats.attack * 0.1
					) +
					"-" +
					Math.ceil(
						VARS.SELECTED.mob.slots.melee.stats.attack +
							VARS.SELECTED.mob.slots.melee.stats.attack * 0.1
					)
			);
		} else {
			msgDisplay.drawText(
				1,
				17,
				"%b{black}%c{white}(MELEE)%b{}%c{grey} <empty>"
			);
		}
		if (VARS.SELECTED.mob.slots.head) {
			msgDisplay.drawText(
				1,
				22,
				"%b{black}%c{white}(HEAD)%b{}%c{white} " +
					VARS.SELECTED.mob.slots.head.name
			);
			msgDisplay.drawText(
				4,
				23,
				"%c{#6666ff}ARMOUR %c{white}" +
					VARS.SELECTED.mob.slots.head.stats.defence
			);
		} else {
			msgDisplay.drawText(
				1,
				22,
				"%b{black}%c{white}(HEAD)%b{}%c{grey} <empty>"
			);
		}
		if (VARS.SELECTED.mob.slots.suit) {
			msgDisplay.drawText(
				1,
				26,
				"%b{black}%c{white}(SUIT)%b{}%c{white} " +
					VARS.SELECTED.mob.slots.suit.name
			);
			msgDisplay.drawText(
				4,
				27,
				"%c{#6666ff}ARMOUR %c{white}" +
					VARS.SELECTED.mob.slots.suit.stats.defence
			);
		} else {
			msgDisplay.drawText(
				1,
				26,
				"%b{black}%c{white}(SUIT)%b{}%c{grey} <empty>"
			);
		}
	}
	// --- NEW: SQUAD PANEL DRAWING LOGIC ---
	else if (VARS.SUBMENU == "SQUAD") {
		let yPos = 13;
		for (let i = 0; i < player_entities.length; i++) {
			const unit = player_entities[i];
			const isSelected = unit === VARS.SELECTED;
			const nameColor = isSelected ? "%c{yellow}" : "%c{white}";

			// Draw Name and Designation
			msgDisplay.drawText(
				2,
				yPos,
				`${nameColor}[Alpha ${i + 1}] ${unit.name}`
			);

			// Draw Health
			const hpText = `%c{grey}HP: %c{white}${unit.mob.stats.health}/${unit.originalHealth}`;
			msgDisplay.drawText(4, yPos + 1, hpText);

			// Draw Ammo
			let ammoText = "%c{grey}AMMO: --/--";
			if (unit.mob.slots.ranged) {
				const wpn = unit.mob.slots.ranged;
				ammoText = `%c{grey}AMMO: %c{white}${wpn.stats.ammo}/${wpn.stats.max_ammo}`;
			}
			msgDisplay.drawText(22, yPos + 1, ammoText);

			// Draw Stance and Autofire
			// Draw Stance and Autofire
			let tempcolor = "white";
			if (unit.mob.stance.toUpperCase() == "HOLD") {
				tempcolor = "#006aff";
			} else if (unit.mob.stance.toUpperCase() == "FOLLOW") {
				tempcolor = "#00FF7F";
			}
			let stanceText = `%c{grey}STANCE: %c{${tempcolor}}${unit.mob.stance.toUpperCase()}`;

			msgDisplay.drawText(4, yPos + 2, stanceText);

			let afText = unit.mob.autofire ? "%c{#00ff00}ON" : "%c{red}OFF";
			msgDisplay.drawText(22, yPos + 2, `%c{grey}AUTOFIRE: ${afText}`);

			yPos += 4; // Move to the next unit's position
		}
	}

	// --- BOTTOM CONTROL BAR ---

	//│║ ┬ ─ ┴ ╥ ╤ ╦ ╩
	msgDisplay.drawText(
		0,
		32,
		"╠══════════╦══════════╦══════════╦═════════════╣"
	); // Adjusted
	let sstring =
		"║   %c{orange}M%c{}OVE   ║   %c{orange}F%c{}IRE   ║   %c{orange}L%c{}OOK   ║  %c{orange}N%c{}EXT UNIT  ║"; // Adjusted
	if (VARS.MODE == "none") {
		sstring =
			"║%b{#ccc}   %c{#cc8400}M%c{#000}OVE   %b{}%c{}║   %c{orange}F%c{}IRE   ║   %c{orange}L%c{}OOK   ║  %c{orange}N%c{}EXT UNIT  ║";
	} else if (VARS.MODE == "look") {
		sstring =
			"║   %c{orange}M%c{}OVE   ║   %c{orange}F%c{}IRE   ║%b{#ccc}   %c{#cc8400}L%c{#000}OOK   %b{}%c{}║  %c{orange}N%c{}EXT UNIT  ║";
	} else if (VARS.MODE == "targeting") {
		sstring =
			"║   %c{orange}M%c{}OVE   ║%b{#ccc}%c{#cc8400}   F%c{#000}IRE   %c{}%b{}║   %c{orange}L%c{}OOK   ║  %c{orange}N%c{}EXT UNIT  ║";
	}
	msgDisplay.drawText(0, 33, sstring);
	msgDisplay.drawText(
		0,
		34,
		"╠══════════╬══════════╩═╦════════╩══╦══════════╣"
	); // Adjusted
	let autof = "%b{#9F0000}%c{#FFF}AUTOFIRE%b{}%c{orange}(O)%c{}";
	let behav = "FOLLOW";
	if (VARS.SELECTED && VARS.SELECTED.mob.autofire == true) {
		autof = "%b{#005800}%c{#FFF}AUTOFIRE%b{}%c{orange}(O)%c{}";
	}
	if (VARS.SELECTED && VARS.SELECTED.mob.stance == "follow") {
		behav = "%b{#005800}%c{#FFF}FOLLOW%b{}%c{orange}(P)%c{}";
	} else if (VARS.SELECTED && VARS.SELECTED.mob.stance == "hold") {
		behav = "%b{#00009f}%c{#FFF} HOLD %b{}%c{orange}(P)%c{}";
	}
	msgDisplay.drawText(
		0,
		35,
		"║   WAI%c{orange}T%c{}   ║ " +
			autof +
			"║ " +
			behav +
			" ║  %c{orange}R%c{}ELOAD  ║" // Adjusted
	);

	msgDisplay.drawText(
		0,
		36,
		"╠══════════╩════════════╩═══════════╩══════════╣"
	); // Adjusted

	let locs = world[Number(currentLoc[0]) + "," + Number(currentLoc[1])];

	for (var j of entities) {
		if (j.x == currentLoc[0] && j.y == currentLoc[1]) {
			msgDisplay.drawText(1, 37, "%c{white}" + j.name);
		}
	}
	if (locs) {
		let tmp = "21°C";
		let atmo = "%c{#35b59b}SAFE";
		let atmo_unsafe = "%c{#b53535}UNSAFE";
		if (locs.visible) {
			msgDisplay.drawText(
				1,
				38,
				"%c{grey}" + locs.icon.name + " (" + locs.x + "," + locs.y + ")"
			);
		}
		msgDisplay.drawText(
			PANEL_WIDTH - atmo_unsafe.length + 9,
			38,
			atmo_unsafe
		); // Adjusted
		msgDisplay.drawText(
			PANEL_WIDTH - tmp.length - 1,
			37,
			"%c{yellow}" + tmp
		); // Adjusted
	}

	msgDisplay.drawText(
		0,
		39,
		"╚══════════════════════════════════════════════╝"
	); // Adjusted
}

/**
 * Updates the field of view (FOV) for player-controlled entities, marking visible and seen tiles, entities, and items.
 * 
 * Resets visibility for all tiles, entities, and items, then uses a shadowcasting algorithm to determine which map areas are visible to player entities. Marks tiles, entities, and items as visible or seen based on their presence within the computed FOV radius.
 */
function updateFOV(player) {
	for (var tile in world) {
		world[tile].visible = false;
	}
	for (var ent of entities) {
		if (ent.owner != "player") {
			ent.visible = false;
		} else {
			ent.visible = true;
		}
	}
	for (var it of world_items) {
		it.visible = false;
	}
	const fov = new ROT.FOV.PreciseShadowcasting(checkLight);
	for (var pl of player_entities) {
		fov.compute(pl.x, pl.y, 7, (x, y, _r, visibility) => {
			if (x >= 0 && x < VARS.MAP_X && y >= 0 && y < VARS.MAP_Y) {
				if (visibility == 1) {
					world[x + "," + y].visible = true;
					world[x + "," + y].seen = true;
				}
				for (var en of entities) {
					if (en.x == x && en.y == y) {
						en.visible = true;
					}
				}
				for (var it of world_items) {
					if (it.x == x && it.y == y) {
						it.visible = true;
						it.seen = true;
					}
				}
			}
		});
	}
}

/**
 * Calculates the visible area of the map based on the selected entity's position and zoom level.
 * @returns {Array} - An array representing the visible area [minX, minY, maxX, maxY].
 */
function calculateDrawInterval() {
	return [
		VARS.SELECTED.x - VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
		VARS.SELECTED.y - VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
		VARS.SELECTED.x + VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
		VARS.SELECTED.y + VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
	];
}
