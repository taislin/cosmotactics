import { updateCanvas, currentLoc, drawPaths, effects } from "./display.js";
import {
	VARS,
	STATS,
	processTurn,
	icons,
	entities,
	debugLog,
	player_entities,
	resetGame,
	world_items,
	log,
} from "./engine.js";
import {
	gameDisplay,
	menuDisplay,
	msgDisplay,
	gameDisplayConfig,
	menuDisplayConfig,
	msgDisplayConfig,
} from "../index.js";
import { world, world_grid, nextLevel } from "./map.js";
import { Projectile } from "./classes/projectile.js";
import { drawMainMenu, drawLostMenu } from "./mainmenu.js";
// Import from new utils file for shared logic
import { findMobCoords, isTilePassableForMovement } from "./utils/gameUtils.js";

let loaded = false;
let lastMoveTime = 0;
const MOVE_DELAY = 300; // 300ms delay between moves

export function setControls() {
	// Keyboard controls
	window.addEventListener("keydown", handleKeyDown);
	// Mouse controls
	window.addEventListener("click", handleClick);

	function handleKeyDown(e) {
		if (VARS.isAnimating) {
			return; // Block input if an animation is in progress
		}

		const code = e.code;
		const selected = VARS.SELECTED;
		// Font size controls
		if (e.key === "+" || e.key === "-") {
			msgDisplayConfig.fontSize = e.key === "+" ? 16 : 8;
			menuDisplayConfig.fontSize = e.key === "+" ? 32 : 16;
			msgDisplay.setOptions(msgDisplayConfig);
			menuDisplay.setOptions(menuDisplayConfig);
			updateCanvas();
			return;
		}
		// Lost screen
		if (VARS.GAMEWINDOW === "LOST") {
			sleep(2000);
			goToMainMenu();
			resetGame();
			return;
		}
		// Menu navigation
		if (VARS.GAMEWINDOW === "MENU") {
			if (code === "ArrowUp")
				VARS.MENU_ITEM = Math.max(VARS.MENU_ITEM - 1, 1);
			if (code === "ArrowDown")
				VARS.MENU_ITEM = Math.min(VARS.MENU_ITEM + 1, 2);
			if (code === "Enter" && VARS.MENU_ITEM === 1) {
				VARS.GAMEWINDOW = "GAME";
				loaded = true;
				document
					.getElementById("terminal")
					.removeChild(menuDisplay.getContainer());
				document
					.getElementById("terminal")
					.appendChild(gameDisplay.getContainer());
				// The game loop is now started in index.js, so no setInterval here
			}
			drawMainMenu(menuDisplay, gameDisplay, msgDisplay);
			return;
		}
		// Game controls
		if (!loaded) {
			loaded = true;
			// No setInterval needed
		}
		const draw_interval = [
			selected.x - VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
			selected.y - VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
			selected.x + VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
			selected.y + VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
		];
		// Navigation and actions
		switch (code) {
			case "Escape":
				goToMainMenu();
				break;
			case "Digit0":
				showObjs();
				break;
			case "ControlLeft":
			case "ControlRight":
				VARS.MENU_ITEM = Math.min(VARS.MENU_LENGTH, VARS.MENU_ITEM + 1);
				break;
			case "ShiftLeft":
			case "ShiftRight":
				VARS.MENU_ITEM = Math.max(1, VARS.MENU_ITEM - 1);
				break;
			case "KeyU":
				handleKeyU();
				break;
			case "ArrowUp":
				handleArrow("up", draw_interval);
				break;
			case "ArrowRight":
				handleArrow("right", draw_interval);
				break;
			case "ArrowDown":
				handleArrow("down", draw_interval);
				break;
			case "ArrowLeft":
				handleArrow("left", draw_interval);
				break;
			case "KeyW":
			case "Numpad8":
				if (VARS.MODE === "none")
					processMove(selected.x, selected.y - 1);
				break;
			case "KeyD":
			case "Numpad6":
				if (VARS.MODE === "none")
					processMove(selected.x + 1, selected.y);
				break;
			case "KeyS":
			case "Numpad2":
				if (VARS.MODE === "none")
					processMove(selected.x, selected.y + 1);
				break;
			case "KeyA":
			case "Numpad4":
				if (VARS.MODE === "none")
					processMove(selected.x - 1, selected.y);
				break;
			case "Enter":
			case "Space":
				const targetCoords = [VARS.TARGET[0], VARS.TARGET[1]];
				clicks(targetCoords, draw_interval, this);
				break;
			case "KeyQ":
			case "Numpad7":
				if (VARS.MODE === "none")
					processMove(selected.x - 1, selected.y - 1);
				break;
			case "KeyE":
			case "Numpad9":
				if (VARS.MODE === "none")
					processMove(selected.x + 1, selected.y - 1);
				break;
			case "KeyZ":
			case "Numpad1":
				if (VARS.MODE === "none")
					processMove(selected.x - 1, selected.y + 1);
				break;
			case "KeyC":
			case "Numpad3":
				if (VARS.MODE === "none")
					processMove(selected.x + 1, selected.y + 1);
				break;
			case "KeyF":
				if (VARS.MODE !== "targeting") VARS.MODE = "targeting";
				break;
			case "KeyR":
				reload(selected);
				processTurn();
				break;
			case "Digit1":
				VARS.SUBMENU = "EQUIPMENT";
				break;
			case "Digit2":
				VARS.MODE = "look";
				VARS.SUBMENU = "INSPECT";
				break;
			case "Digit3":
				VARS.SUBMENU = "LOGS";
				break;
			case "KeyM":
				VARS.MODE = "none";
				break;
			case "KeyL":
				VARS.MODE = "look";
				VARS.SUBMENU = "INSPECT";
				break;
			case "KeyN":
				getNextUnit();
				break;
			case "KeyP":
				if (selected)
					selected.mob.stance =
						selected.mob.stance === "follow" ? "hold" : "follow";
				break;
			case "KeyO":
				if (selected) selected.mob.autofire = !selected.mob.autofire;
				break;
			case "KeyT":
				processTurn();
				break;
			default:
				break;
		}
		// No need to call updateCanvas() here, the main loop handles it.
	}

	function handleArrow(direction, draw_interval) {
		if (VARS.TARGET[0] <= -1 || VARS.TARGET[1] <= -1) {
			VARS.TARGET = [VARS.SELECTED.x, VARS.SELECTED.y];
		}
		let currentLoc = [VARS.TARGET[0], VARS.TARGET[1]];
		switch (direction) {
			case "up":
				VARS.TARGET[1] = Math.max(VARS.TARGET[1] - 1, 0);
				break;
			case "right":
				VARS.TARGET[0] = Math.min(VARS.TARGET[0] + 1, VARS.MAP_X - 1);
				break;
			case "down":
				VARS.TARGET[1] = Math.min(VARS.TARGET[1] + 1, VARS.MAP_Y - 1);
				break;
			case "left":
				VARS.TARGET[0] = Math.max(VARS.TARGET[0] - 1, 0);
				break;
		}
		currentLoc = [VARS.TARGET[0], VARS.TARGET[1]];
		// Use the new, more robust passability check here
		const dijkstra = new ROT.Path.Dijkstra(
			currentLoc[0],
			currentLoc[1],
			(x, y) => isTilePassableForMovement(x, y, VARS.SELECTED) // Pass VARS.SELECTED so it can pathfind through its own square
		);
		if (VARS.MODE === "none") {
			drawPaths.length = 0;
			dijkstra.compute(VARS.SELECTED.x, VARS.SELECTED.y, function (x, y) {
				drawPathsFunc(x, y, draw_interval, currentLoc);
			});
		}
	}

	function handleKeyU() {
		let locEnt = [];
		for (const e of entities) {
			if (e.x === VARS.TARGET[0] && e.y === VARS.TARGET[1])
				if (!locEnt.includes(e)) {
					locEnt.push(e);
				}
		}
		for (const e of world_items) {
			if (e.x === VARS.TARGET[0] && e.y === VARS.TARGET[1])
				if (!locEnt.includes(e)) {
					locEnt.push(e);
				}
		}
		if (
			world[VARS.TARGET[0] + "," + VARS.TARGET[1]].icon.name ===
			"stairs (down)"
		) {
			locEnt.push({ name: "stairs (down)", type: "stairs" });
		}
		VARS.MENU_LENGTH = locEnt.length;
		if (VARS.MENU_LENGTH === 0) return;
		const sel = locEnt[VARS.MENU_ITEM - 1];
		if (VARS.SUBMENU === "INSPECT" && sel) {
			if (
				sel.type === "stairs" &&
				sel.name === "stairs (down)" &&
				canProceedToNextLevel()
			) {
				proceedToNextLevel();
			} else if (sel.type === "item") {
				if (sel.itemtype === "oxygen") {
					STATS.OXYGEN = Math.min(
						STATS.OXYGEN + sel.stats.oxygen,
						100
					);
				}
				if (sel.itemtype === "healing") {
					// Corrected from 'health' to 'healing' based on items.json
					for (const e of player_entities) {
						e.mob.stats.health = Math.min(
							e.mob.stats.health + sel.stats.health,
							e.originalHealth
						); // Cap health at originalHealth
					}
				}
				sel.x = -1;
				sel.y = -1;
				const index1 = locEnt.indexOf(sel);
				if (index1 > -1) locEnt.splice(index1, 1);
				const index = world_items.indexOf(sel);
				if (index > -1) world_items.splice(index, 1);
			}
		}
	}

	function handleClick(e) {
		// --- ADD THIS BLOCK ---
		if (VARS.isAnimating) {
			return; // Block input if an animation is in progress
		}
		// --- END BLOCK ---

		if (VARS.GAMEWINDOW === "LOST") {
			sleep(2000);
			goToMainMenu();
			resetGame();
			return;
		}
		if (VARS.GAMEWINDOW === "MENU") {
			const coordsm = menuDisplay.eventToPosition(e);
			if (coordsm[1] === 9 && coordsm[0] >= 5 && coordsm[0] <= 12) {
				gameDisplay._options.layout = "tile";
				VARS.GAMEWINDOW = "GAME";
				loaded = true;
				document
					.getElementById("terminal")
					.removeChild(menuDisplay.getContainer());
				document
					.getElementById("terminal")
					.appendChild(gameDisplay.getContainer());
				// No setInterval needed
			}
			return;
		}
		if (!loaded) {
			loaded = true;
			// No setInterval needed
		}
		const coordsm = msgDisplay.eventToPosition(e);
		if (
			coordsm[0] >= 0 &&
			coordsm[0] < 32 &&
			coordsm[1] >= 0 &&
			coordsm[1] < 40
		) {
			clickGUI(coordsm);
		}
		const coords = gameDisplay.eventToPosition(e);
		if (
			coords[0] < 0 ||
			coords[0] >= VARS.MAP_X ||
			coords[1] < 0 ||
			coords[1] >= VARS.MAP_Y
		)
			return;
		let draw_interval = [
			VARS.SELECTED.x - VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
			VARS.SELECTED.y - VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
			VARS.SELECTED.x + VARS.MAP_DISPLAY_X / VARS.ZOOM_LEVEL,
			VARS.SELECTED.y + VARS.MAP_DISPLAY_Y / VARS.ZOOM_LEVEL,
		];
		currentLoc[0] = coords[0] + draw_interval[0];
		currentLoc[1] = coords[1] + draw_interval[1];
		if (
			!world[currentLoc[0] + "," + currentLoc[1]] ||
			world[currentLoc[0] + "," + currentLoc[1]].visible === false
		)
			return;
		clicks(currentLoc, draw_interval, this);
		// No need to call updateCanvas() here
	}
}

/**
 * Checks if all player entities are close enough to the target to proceed to the next level.
 * @returns {boolean} True if all player entities are within 5 tiles of the target, false otherwise.
 */
function canProceedToNextLevel() {
	for (const entity of player_entities) {
		// Check if entity is more than 5 tiles away from the target in either x or y direction
		const distanceX = Math.abs(entity.x - VARS.TARGET[0]);
		const distanceY = Math.abs(entity.y - VARS.TARGET[1]);
		if (distanceX >= 5 || distanceY >= 5) {
			return false;
		}
	}
	return true;
}

/**
 * Proceeds to the next level by calling nextLevel with the incremented level number.
 */
function proceedToNextLevel() {
	nextLevel(VARS.LEVEL + 1);
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function clicks(currentLoc, draw_interval, O) {
	if (VARS.MODE == "targeting") {
		if (
			VARS.TARGET[0] == currentLoc[0] &&
			VARS.TARGET[1] == currentLoc[1]
		) {
			debugLog("double click");
			drawPaths.length = 0;
			if (VARS.SELECTED.owner == "player") {
			}
			if (VARS.SELECTED.mob.slots.ranged.stats.ammo > 0) {
				log({
					type: "action",
					source: VARS.SELECTED,
					action: "fires",
					weapon: VARS.SELECTED.mob.slots.ranged,
				});
				new Projectile(
					VARS.SELECTED.x,
					VARS.SELECTED.y,
					VARS.SELECTED.mob.slots.ranged,
					VARS.SELECTED,
					VARS.TARGET,
					VARS.SELECTED.mob.slots.ranged.itemtype.split(" ")[0]
				);
				effects.unshift({
					x: VARS.SELECTED.x,
					y: VARS.SELECTED.y,
					icon: icons["cursor_square"],
					color: "#FFFF00",
					background: "transparent",
				});
				VARS.SELECTED.mob.slots.ranged.stats.ammo--;
				processTurn();
			} else {
				log({ type: "info", text: "No ammo!" });
			}
		} else {
			VARS.TARGET[0] = currentLoc[0];
			VARS.TARGET[1] = currentLoc[1];
			// No updateCanvas() call needed
		}
	} else if (VARS.MODE == "none") {
		// Use the new, more robust passability check for Dijkstra
		var dijkstra = new ROT.Path.Dijkstra(
			currentLoc[0],
			currentLoc[1],
			(x, y) => isTilePassableForMovement(x, y, VARS.SELECTED)
		);
		if (
			VARS.TARGET[0] == currentLoc[0] &&
			VARS.TARGET[1] == currentLoc[1]
		) {
			debugLog("double click");
			drawPaths.length = 0;
			if (
				!VARS.TARGET ||
				world_grid[VARS.TARGET[1]][VARS.TARGET[0]] == 0 // Check raw map grid for impassable tiles
			) {
				debugLog("Rejected! Impassible tile at destination");
				return;
			}
			// This part is crucial: check if the target tile is blocked by an *impassable* entity (excluding self)
			let entityAtTarget = findMobCoords(VARS.TARGET[0], VARS.TARGET[1]);
			if (
				entityAtTarget &&
				!entityAtTarget.passable && // Is the entity at target impassable?
				entityAtTarget !== VARS.SELECTED // Is it not the selected unit itself?
			) {
				if (entityAtTarget.mob && entityAtTarget.mob.ai == "dead") {
					// Dead entities are passable, so allow move. No rejection.
				} else {
					debugLog("Rejected! Entity at destination is impassable.");
					return;
				}
			}

			O.path = [];
			dijkstra.compute(VARS.SELECTED.x, VARS.SELECTED.y, function (x, y) {
				path.push([x, y]);
			});
			doMoves(path);
		} else {
			VARS.TARGET[0] = currentLoc[0];
			VARS.TARGET[1] = currentLoc[1];
			if (VARS.MODE == "none") {
				drawPaths.length = 0;
				dijkstra.compute(
					VARS.SELECTED.x,
					VARS.SELECTED.y,
					function (x, y) {
						drawPathsFunc(x, y, draw_interval, currentLoc);
					}
				);
			}
		}
	} else if (VARS.MODE == "look") {
		VARS.TARGET[0] = currentLoc[0];
		VARS.TARGET[1] = currentLoc[1];
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
		// No updateCanvas() call needed
	}
}
export function reload(unit) {
	if (unit.mob.slots.ranged) {
		if (
			unit.mob.slots.ranged.stats.max_ammo >
			unit.mob.slots.ranged.stats.ammo
		) {
			if (
				unit.mob.slots.ranged.stats.reload > 0 &&
				VARS.SELECTED == unit
			) {
				unit.mob.slots.ranged.stats.ammo =
					unit.mob.slots.ranged.stats.max_ammo;
			}
			log({
				type: "action",
				source: unit,
				action: "reloads",
				weapon: unit.mob.slots.ranged,
			});
		}
	}
	processTurn();
}
function clickGUI(coords) {
	debugLog("GUI: " + coords);
	if (coords[1] == 10) {
		if (coords[0] >= 1 && coords[0] <= 11) {
			VARS.SUBMENU = "EQUIPMENT";
		} else if (coords[0] >= 13 && coords[0] <= 21) {
			VARS.MODE = "look";
			VARS.SUBMENU = "INSPECT";
		} else if (coords[0] >= 23 && coords[0] <= 30) {
			VARS.SUBMENU = "LOGS";
		}
		//click the list
	} else if (coords[1] >= 19 && coords[1] <= 19 && VARS.MODE == "look") {
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
		if (VARS.MENU_LENGTH == 0) {
			return;
		}
		for (var i = 0; i < locEnt.length; i++) {
			if (VARS.MENU_ITEM == i + 1) {
				if (
					locEnt[i].type == "stairs" &&
					locEnt[i].name == "stairs (down)" &&
					canProceedToNextLevel()
				) {
					proceedToNextLevel();
				}
			}
		}
	} else if (coords[1] == 33) {
		if (coords[0] >= 1 && coords[0] <= 6) {
			VARS.MODE = "none";
		} else if (coords[0] >= 8 && coords[0] <= 13) {
			VARS.MODE = "targeting";
		} else if (coords[0] >= 15 && coords[0] <= 20) {
			VARS.MODE = "look";
		} else if (coords[0] >= 22 && coords[0] <= 30) {
			//next unit
			getNextUnit();
		}
	} else if (coords[1] == 35) {
		if (coords[0] >= 1 && coords[0] <= 6) {
			processTurn();
		} else if (coords[0] >= 8 && coords[0] <= 15) {
			//autofire toggle
			if (VARS.SELECTED) {
				VARS.SELECTED.mob.autofire = !VARS.SELECTED.mob.autofire;
			}
		} else if (coords[0] >= 17 && coords[0] <= 22) {
			//stance
			if (VARS.SELECTED) {
				if (VARS.SELECTED.mob.stance == "follow") {
					VARS.SELECTED.mob.stance = "hold";
				} else if (VARS.SELECTED.mob.stance == "hold") {
					VARS.SELECTED.mob.stance = "follow";
				}
			}
		} else if (coords[0] >= 24 && coords[0] <= 30) {
			reload(VARS.SELECTED);
			processTurn();
		}
	} else if (coords[1] == 1) {
		if (coords[0] >= 1 && coords[0] <= 6) {
			goToMainMenu();
		} else if (coords[0] >= 26 && coords[0] <= 30) {
			// goToMap is not defined in the provided files.
			// If it's intended to navigate somewhere, define it or remove this branch.
		}
	}
	// No updateCanvas() call needed
}
async function doMoves(path) {
	let curr = path.shift();
	if (!curr) {
		return;
	}
	VARS.SELECTED.x = curr[0];
	VARS.SELECTED.y = curr[1];
	VARS.TARGET[0] = curr[0];
	VARS.TARGET[1] = curr[1];
	currentLoc[0] = curr[0];
	currentLoc[1] = curr[1];
	processTurn();
	// No updateCanvas() call needed
	await sleep(200);
	if (path.length > 0) {
		doMoves(path);
	}
}

function goToMainMenu() {
	VARS.GAMEWINDOW = "MENU";
	loaded = false;
	if (
		document.getElementById("terminal").contains(gameDisplay.getContainer())
	) {
		document
			.getElementById("terminal")
			.removeChild(gameDisplay.getContainer());
		document
			.getElementById("terminal")
			.appendChild(menuDisplay.getContainer());
	}
	// No interval to clear
	drawMainMenu(menuDisplay, gameDisplay, msgDisplay);
}
export function goToLostMenu() {
	VARS.GAMEWINDOW = "LOST";
	loaded = false;
	if (
		document.getElementById("terminal").contains(gameDisplay.getContainer())
	) {
		document
			.getElementById("terminal")
			.removeChild(gameDisplay.getContainer());
		document
			.getElementById("terminal")
			.appendChild(menuDisplay.getContainer());
	}
	// No interval to clear
	drawLostMenu(menuDisplay, gameDisplay, msgDisplay);
}
function showObjs() {
	//TODO
}

function drawPathsFunc(x, y, draw_interval, currentLoc) {
	if (
		Math.round(
			Math.hypot(
				VARS.TARGET[0] - VARS.SELECTED.x,
				VARS.TARGET[1] - VARS.SELECTED.y
			) > 10
		)
	) {
		return;
	}
	if (x != VARS.SELECTED.x || y != VARS.SELECTED.y) {
		let ent = findMobCoords(x, y); // Use findMobCoords from gameUtils
		if (ent) {
			drawPaths.push([
				x - draw_interval[0],
				y - draw_interval[1],
				[icons["cursor"], ent.icon], // Use entity's icon
				[icons["cursor"].color, ent.icon.color],
				["transparent", "transparent"],
			]);
		} else {
			drawPaths.push([
				x - draw_interval[0],
				y - draw_interval[1],
				[icons["cursor"], world[x + "," + y].icon],
				[icons["cursor"].color, world[x + "," + y].icon.color],
				["transparent", "transparent"],
			]);
		}
	}
	if (
		x == currentLoc[0] &&
		y == currentLoc[1] &&
		(x != VARS.SELECTED.x || y != VARS.SELECTED.y)
	) {
		let ent = findMobCoords(x, y); // Use findMobCoords from gameUtils
		if (ent) {
			drawPaths.push([
				x - draw_interval[0],
				y - draw_interval[1],
				[icons["cursor_square"], ent.icon], // Use entity's icon
				[icons["cursor_square"].color, ent.icon.color],
				["transparent", "transparent"],
			]);
		} else {
			drawPaths.push([
				x - draw_interval[0],
				y - draw_interval[1],
				[icons["cursor_square"], world[x + "," + y].icon],
				[icons["cursor_square"].color, world[x + "," + y].icon.color],
				["transparent", "transparent"],
			]);
		}
	}
}

export function getNextUnit() {
	let indx = player_entities.indexOf(VARS.SELECTED);
	let found = false;
	for (var i = 0; i < player_entities.length; i++) {
		if (i > indx) {
			VARS.SELECTED = player_entities[i];
			found = true;
			break;
		}
	}
	if (!found) {
		VARS.SELECTED = player_entities[0];
		found = true;
	}
}

function processMove(_x, _y) {
	// --- FIX: Add a delay to prevent rapid movement ---
	const now = Date.now();
	if (now - lastMoveTime < MOVE_DELAY) {
		return; // Not enough time has passed, so we exit early.
	}
	// If enough time has passed, record the time of this move and proceed.
	lastMoveTime = now;

	VARS.TARGET = [-1, -1];
	drawPaths.length = 0;

	// Check if target tile is passable for the selected unit, considering terrain and other entities
	const targetEntity = findMobCoords(_x, _y); // Find any living mob at the target coordinates
	const isTargetTilePassable = isTilePassableForMovement(
		_x,
		_y,
		VARS.SELECTED
	);

	if (isTargetTilePassable && !targetEntity) {
		// Target tile is empty and passable for movement, proceed with direct move
		VARS.SELECTED.x = _x;
		VARS.SELECTED.y = _y;
		VARS.TARGET[0] = _x;
		VARS.TARGET[1] = _y;
		currentLoc[0] = _x;
		currentLoc[1] = _y;
		processTurn();
	} else if (targetEntity) {
		// There is a living entity at the target location
		if (targetEntity.owner === VARS.SELECTED.owner) {
			// Swap places with a friendly unit
			let o1x = VARS.SELECTED.x;
			let o1y = VARS.SELECTED.y;
			let o2x = targetEntity.x;
			let o2y = targetEntity.y;

			VARS.SELECTED.x = o2x;
			VARS.SELECTED.y = o2y;
			VARS.TARGET[0] = o2x;
			VARS.TARGET[1] = o2y;
			currentLoc[0] = o2x;
			currentLoc[1] = o2y;

			targetEntity.x = o1x;
			targetEntity.y = o1y;
			processTurn();
		} else {
			// Attack an enemy unit
			VARS.SELECTED.doMelee({
				dist: 1, // Assume adjacent for direct attack
				x: _x,
				y: _y,
				dir: null,
				entity: targetEntity,
			});
			processTurn();
		}
	} else {
		debugLog(
			"Move rejected: Impassable tile or unknown reason (e.g., dead entity that isn't truly passable).",
			"warn"
		);
	}
}
