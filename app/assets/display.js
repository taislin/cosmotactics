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
 * Updates the game canvas, drawing the map, entities, items, and UI elements.
 */
export function updateCanvas() {
	gameDisplay.clear();
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
	for (let p in projectiles) {
		if (projectiles[p].type) {
			let projcolor = "#ff0000";
			if (projectiles[p].type == "plasma") {
				projcolor = "#ffa500";
			} else if (projectiles[p].type == "projectile") {
				projcolor = "#ccc";
			}
			gameDisplay.draw(
				projectiles[p].x - drawInterval[0],
				projectiles[p].y - drawInterval[1],
				icons["projectile_" + projectiles[p].dir],
				projcolor,
				"transparent"
			);
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

function drawMenu() {
	if (VARS.GAMEWINDOW == "MENU" || VARS.GAMEWINDOW == "LOST") {
		return;
	}
	msgDisplay.clear();
	msgDisplay.drawText(
		0,
		1,
		"║ %c{orange}MENU%c{} ║%c{#35b59b}  COSMOTACTICS   %c{}║ %c{orange}OBJ %c{}"
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
	let parmour = Math.max(Math.floor(VARS.SELECTED.mob.stats.defence / 5), 0);
	let shealth = "X".repeat(phealth);
	let sarmour = "X".repeat(parmour);
	if (!shealth) {
		shealth = "";
	}
	if (!sarmour) {
		sarmour = "";
	}
	let shextra = 20 - phealth;
	let saextra = 20 - parmour;
	let shextras = "%b{#580000}%c{#580000}" + "X".repeat(shextra);
	let saextras = "%b{#000058}%c{#000058}" + "X".repeat(saextra);
	msgDisplay.drawText(
		2,
		5,
		"Health: %b{#9F0000}%c{#9f0000}" + shealth + shextras
	);
	msgDisplay.drawText(10, 5, "%c{#ccc}" + VARS.SELECTED.mob.stats.health);
	msgDisplay.drawText(
		2,
		6,
		"Armour: %b{#00009f}%c{#00009f}" + sarmour + saextras
	);
	msgDisplay.drawText(10, 6, "%c{#ccc}" + VARS.SELECTED.mob.stats.defence);
	let prad = Math.max(Math.floor(STATS.OXYGEN / 5), 0);
	let srad = "X".repeat(prad);
	if (!srad) {
		srad = "";
	}
	let srextra = 20 - prad;
	let srextras = "%b{#005800}%c{#005800}" + "X".repeat(srextra);

	msgDisplay.drawText(
		2,
		7,
		"Oxygen: %b{#009f00}%c{#009f00}" + srad + srextras
	);
	msgDisplay.drawText(10, 7, "%c{#ccc}" + STATS.OXYGEN);
	msgDisplay.drawText(2, 8, "Gold: %c{yellow}" + STATS.GOLD);
	msgDisplay.drawText(
		24 - VARS.TURN.toString().length,
		8,
		"Turn: %c{orange}" + VARS.TURN
	);

	for (var i = 1; i < 40; i++) {
		msgDisplay.drawText(0, i, "║");
		msgDisplay.drawText(31, i, "║");
	}

	msgDisplay.drawText(0, 0, "╔══════╦═════════════════╦═════╗");
	msgDisplay.drawText(0, 2, "╠══════╩═════════════════╩═════╣");
	msgDisplay.drawText(0, 9, "╟───────────┬─────────┬────────╢");
	let submenus =
		"║%c{#cc8400}%b{#ccc}1.%c{#000}EQUIPMENT%c{}%b{}│%c{orange}2.%c{}OBSERVE│%c{orange} 3.%c{}LOGS ║";
	if (VARS.SUBMENU == "INSPECT") {
		submenus =
			"║%c{orange}1.%c{}EQUIPMENT│%c{#cc8400}%b{#ccc}2.%c{#000}OBSERVE%c{}%b{}│%c{orange} 3.%c{}LOGS ║";
	} else if (VARS.SUBMENU == "LOGS") {
		submenus =
			"║%c{orange}1.%c{}EQUIPMENT│%c{orange}2.%c{}OBSERVE│%c{#cc8400}%b{#ccc} 3.%c{#000}LOGS %c{}%b{}║";
	}
	msgDisplay.drawText(0, 10, submenus);
	msgDisplay.drawText(0, 11, "╟───────────┴─────────┴────────╢");
	if (VARS.SUBMENU == "LOGS") {
		let parsedlog = "";
		if (VARS.GAMELOG.length > 0) {
			for (var l = 0; l <= Math.min(7, VARS.GAMELOG.length - 1); l++) {
				if (Number(VARS.GAMELOG[l].split(":")[0]) == VARS.TURN - 1) {
					parsedlog += "%c{yellow}> %c{}" + VARS.GAMELOG[l] + "\n\n";
				} else {
					parsedlog += VARS.GAMELOG[l] + "\n";
				}
			}
		}
		msgDisplay.drawText(2, 13, parsedlog, 29);
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

	//│║ ┬ ─ ┴ ╥ ╤ ╦ ╩
	msgDisplay.drawText(0, 32, "╠══════╦══════╦══════╦═════════╣");
	let sstring =
		"║ %c{orange}M%c{}OVE ║ %c{orange}F%c{}IRE ║ %c{orange}L%c{}OOK ║I%c{orange}N%c{}TERACT ║";
	if (VARS.MODE == "none") {
		sstring =
			"║%b{#ccc} %c{#cc8400}M%c{#000}OVE %b{}%c{}║ %c{orange}F%c{}IRE ║ %c{orange}L%c{}OOK ║%c{orange}N%c{}EXT UNIT║";
	} else if (VARS.MODE == "look") {
		sstring =
			"║ %c{orange}M%c{}OVE ║ %c{orange}F%c{}IRE ║%b{#ccc} %c{#cc8400}L%c{#000}OOK %b{}%c{}║%c{orange}N%c{}EXT UNIT║";
	} else if (VARS.MODE == "targeting") {
		sstring =
			"║ %c{orange}M%c{}OVE ║%b{#ccc}%c{#cc8400} F%c{#000}IRE %c{}%b{}║ %c{orange}L%c{}OOK ║%c{orange}N%c{}EXT UNIT║";
	}
	msgDisplay.drawText(0, 33, sstring);
	msgDisplay.drawText(0, 34, "╠══════╬══════╩═╦════╩═╦═══════╣");
	let autof = "AUTOFIRE";
	let behav = "FOLLOW";
	if (VARS.SELECTED && VARS.SELECTED.mob.autofire == true) {
		autof = "%b{#ccc}%c{#000}AUTOFIRE%b{}%c{}";
	}
	if (VARS.SELECTED && VARS.SELECTED.mob.stance == "follow") {
		behav = "%b{#ccc}%c{#000}FOLLOW%b{}%c{}";
	} else if (VARS.SELECTED && VARS.SELECTED.mob.stance == "hold") {
		behav = "%b{#ccc}%c{#000} HOLD %b{}%c{}";
	}
	msgDisplay.drawText(
		0,
		35,
		"║ WAI%c{orange}T%c{} ║" +
			autof +
			"║" +
			behav +
			"║%c{orange}R%c{}ELOAD ║"
	);

	msgDisplay.drawText(0, 36, "╠══════╩════════╩══════╩═══════╣");

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
		msgDisplay.drawText(31 - atmo_unsafe.length + 11, 38, atmo_unsafe);
		msgDisplay.drawText(31 - tmp.length, 37, "%c{yellow}" + tmp);
	}

	msgDisplay.drawText(0, 39, "╚══════════════════════════════╝");
}

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
