import {
	icons,
	entities, // Note: This is the global entities array
	VARS,
	player_entities,
	debugLog,
	log,
} from "../engine.js";
import { WIcon } from "./icons.js";
import { effects } from "../display.js";
import { Projectile } from "./projectile.js";
import { getNextUnit } from "../controls.js";
import { world, world_grid } from "../map.js";

// Import from new utils file
import {
	getRandomElement,
	findMobCoords,
	checkFire,
	isTilePassableForMovement,
} from "../utils/gameUtils.js";
// Import from new AI file
import { performAITurn as MobPerformAITurn } from "../ai/mobAI.js";

export class WEntity {
	/**
	 * Represents an entity in the game world.
	 *
	 * @param {string} name - The name of the entity.
	 * @param {string|WIcon} icon - The icon representing the entity.
	 * @param {number} x - The x-coordinate of the entity.
	 * @param {number} y - The y-coordinate of the entity.
	 * @param {string} owner - The owner of the entity (e.g., 'player', 'enemy').
	 * @param {boolean} drawable - Whether the entity should be drawn.
	 * @param {WMob} mob - The mob data associated with the entity.
	 * @param {boolean} passable - Whether the entity can be passed through (true/false).
	 * @param {string} type - The type of the entity (e.g., 'mob', 'item').
	 *
	 * @constructor
	 */
	constructor(
		name,
		icon = "?",
		x = 0,
		y = 0,
		owner = null,
		drawable = true,
		mob = null,
		passable = false, // Mobs are generally not passable unless dead
		type = "mob"
	) {
		if (icon instanceof WIcon) {
			this.icon = icon;
		} else if (icons[icon]) {
			this.icon = JSON.parse(JSON.stringify(icons[icon]));
		} else {
			debugLog(
				`Icon '${icon}' not found for entity '${name}'! Using default.`,
				"error"
			);
			this.icon = JSON.parse(JSON.stringify(icons["?"]));
		}
		this.name = name;
		this.owner = owner;
		this.x = x;
		this.y = y;
		this.drawable = drawable;
		this.mob = mob; // WMob instance
		this.passable = passable;
		this.nextMoveTurn = VARS.TURN; // When this unit can next move (based on speed/delay)
		this.type = type;
		this.typename = ""; // A more descriptive type name (e.g., "SEF Trooper")
		this.visible = false; // Visibility for FOV
		this.originalHealth = mob ? mob.stats.health : 0; // Store initial health for morale calcs
		this.statusEffects = [];
		// Apply random icon properties if applicable
		if (this.icon.color && this.icon.color.length > 1) {
			this.icon.color = getRandomElement(this.icon.color);
		}
		if (
			this.icon.tcoords &&
			this.icon.tcoords.length > 1 &&
			Array.isArray(this.icon.tcoords[0])
		) {
			this.icon.tcoords = getRandomElement(this.icon.tcoords);
		} else if (this.icon.tcoords && !Array.isArray(this.icon.tcoords[0])) {
			this.icon.tcoords = this.icon.tcoords[0]; // If it's just [x,y] or a single value, ensure it's correct
		}
	}

	/**
	 * Handles the entity's firing logic, including ranged attacks.
	 * This method can be called by AI or player controls.
	 * Checks for conditions like ammo before firing.
	 * Returns true if an action (fire or reload) was taken, false otherwise.
	 */
	processFire() {
		if (!this.mob || this.mob.ai === "dead") return false; // Return false if no action

		const mob = this.mob;
		const ranged = mob.slots.ranged;

		// If out of ammo, attempt to reload if player unit, or if AI reloads automatically
		if (ranged && ranged.stats.ammo <= 0) {
			// Player unit: Reload costs a turn
			if (this.owner === "player") {
				ranged.stats.ammo = ranged.stats.max_ammo;
				log({
					type: "action",
					source: this,
					action: "reloads",
					weapon: ranged,
				});
				debugLog(`${this.name} reloaded.`, "info");
				return true; // Reload consumes the turn
			} else {
				// AI units might just wait or switch to melee if out of ammo and no auto-reload defined
				// For now, AI simple reloads if it has a ranged weapon and is out of ammo.
				if (ranged.stats.reload > 0) {
					ranged.stats.ammo = ranged.stats.max_ammo;
					log({
						type: "action",
						source: this,
						action: "reloads",
						weapon: ranged,
					});
					debugLog(`${this.name} AI reloaded.`, "info");
					return true;
				}
				return false; // AI cannot reload or has no ranged weapon
			}
		}

		// Find a potential target for firing
		const target = this.getEnemy(ranged ? ranged.stats.range : 0); // Get enemy within weapon's range

		// If there's a valid target and we have a ranged weapon
		if (
			target.entity &&
			target.dist > 0 &&
			ranged &&
			target.dist <= ranged.stats.range
		) {
			// Check line of sight
			if (checkFire(this.x, this.y, target.x, target.y)) {
				this.doRanged(target);
				mob.lastFire = VARS.TURN; // Update last fire turn
				return true; // Action taken
			} else {
				debugLog(
					`${this.name} cannot fire at ${target.entity.name}: LOS blocked.`,
					"debug"
				);
			}
		} else {
			debugLog(
				`${this.name} cannot fire: No valid target or out of range.`,
				"debug"
			);
		}
		return false; // No action taken
	}

	/**
	 * Executes the AI turn for this entity.
	 * This method is called by the game engine for non-player entities.
	 * It delegates the actual AI logic to `mobAI.js`.
	 */
	performAITurn() {
		MobPerformAITurn(this); // Delegate to the AI module
	}

	/**
	 * Handles general entity processing (health, death).
	 * This method is primarily for death checks.
	 */
	process() {
		if (!this.mob || this.mob.ai === "dead") return;
		let canAct = true;
		for (let i = this.statusEffects.length - 1; i >= 0; i--) {
			const effect = this.statusEffects[i];

			if (effect.effect === "stunned") {
				canAct = false; // Stunned entities cannot act
			}

			effect.duration--;
			if (effect.duration <= 0) {
				log({
					type: "info",
					text: `%c{cyan}${this.name}%c{} is no longer ${effect.effect}.`,
				});
				this.statusEffects.splice(i, 1);
			}
		}

		if (!canAct) {
			this.nextMoveTurn = VARS.TURN + 1; // Skip this turn but can act next turn
			effects.push({
				x: this.x,
				y: this.y,
				icon: icons["overlay_idle"],
				color: "#FFFF00",
				background: "transparent",
			});
			return; // Exit processing for this entity
		}
		// Handle death
		if (this.mob.stats.health <= 0) {
			this.icon = JSON.parse(JSON.stringify(icons["dead"]));
			this.icon.tcoords =
				this.icon.tcoords.length > 1
					? getRandomElement(this.icon.tcoords)
					: this.icon.tcoords[0];
			this.mob.ai = "dead"; // Mark as dead, engine.js will remove from array
			this.passable = true; // Dead units become passable
			if (world[`${this.x},${this.y}`]) {
				world[`${this.x},${this.y}`].icon = icons["dead"]; // Change map tile icon
				world_grid[this.y][this.x] = 1; // Make map tile passable
			}
			log({ type: "death", source: this });
			if (
				this.owner === "player" &&
				VARS.SELECTED === this &&
				player_entities.length > 0
			) {
				getNextUnit(); // Auto-select next player unit
			}
			debugLog(`${this.name} has died.`, "info");
			this.name = "dead " + this.name; // Prepend "dead" to name
			return; // Entity is dead, no further processing this turn
		}
	}

	/**
	 * Executes a melee attack.
	 * @param {object} en - The target object found by getEnemy/getPlayer.
	 * @returns {boolean} True if a melee attack was attempted, false otherwise.
	 */
	doMelee(en) {
		let enEntity = en.entity;
		if (
			en &&
			en.dist <= 1.5 && // Adjusted slightly from 2 to be more strictly adjacent
			enEntity &&
			this.mob &&
			enEntity.mob &&
			enEntity.owner !== this.owner // Ensure it's an enemy
		) {
			let dmg = this.mob.stats.attack; // Base melee attack
			let meleeWeapon = this.mob.slots.melee;

			if (meleeWeapon && meleeWeapon.stats.attack > 0) {
				dmg = meleeWeapon.stats.attack; // Use weapon attack if equipped
			}

			let finalDmg = Math.max(0, dmg - enEntity.mob.stats.defence); // Apply defence

			if (finalDmg > 0) {
				if (ROT.RNG.getUniform() <= 0.8) {
					// Base hit chance for melee (use ROT.RNG)
					enEntity.mob.stats.health -= Math.round(finalDmg);
					enEntity.mob.stats.health = Math.max(
						0,
						enEntity.mob.stats.health
					); // Ensure non-negative health

					log({
						type: "damage",
						source: this,
						target: en.entity,
						amount: Math.round(finalDmg),
						weapon: meleeWeapon,
					});
					debugLog(
						`${this.name} melees ${en.entity.name} for ${Math.round(
							finalDmg
						)} HP.`,
						"debug"
					);
				} else {
					log({ type: "miss", source: this, target: en.entity });
					debugLog(
						`${this.name} misses melee attack on ${en.entity.name}.`,
						"debug"
					);
				}
			} else {
				log({ type: "block", source: this, target: en.entity });
				debugLog(
					`${en.entity.name} blocks ${this.name}'s melee attack.`,
					"debug"
				);
			}
			return true; // Action taken
		}
		return false; // No action taken
	}

	/**
	 * Executes a ranged attack.
	 * @param {object} en - The target object found by getEnemy/getPlayer.
	 * @returns {boolean} True if a ranged attack was attempted, false otherwise.
	 */
	doRanged(en) {
		const rangedWeapon = this.mob.slots.ranged;
		// Check if ranged weapon exists, target is in range, and line of sight is clear
		if (
			en.dist > 0 &&
			rangedWeapon &&
			en.dist <= rangedWeapon.stats.range &&
			checkFire(this.x, this.y, en.x, en.y) === true
		) {
			debugLog(`${this.name} fires at ${en.entity.name}.`, "debug");

			// Create projectile
			new Projectile(
				this.x,
				this.y,
				rangedWeapon,
				this,
				[en.x, en.y],
				rangedWeapon.itemtype.split(" ")[0] // e.g., "projectile", "plasma", "laser"
			);

			// Consume ammo for player units
			if (this.owner === "player" && rangedWeapon) {
				rangedWeapon.stats.ammo--;
			}

			// Visual effect at shooter's position
			effects.push({
				x: this.x,
				y: this.y,
				icon: icons["cursor_square"], // Yellow square icon
				color: "#FFFF00",
				background: "transparent",
			});
			return true; // Action taken
		} else {
			debugLog(
				`${this.name} cannot fire at ${en.entity.name} (Range: ${
					en.dist
				}/${
					rangedWeapon ? rangedWeapon.stats.range : "N/A"
				}, LOS: ${checkFire(this.x, this.y, en.x, en.y)}).`,
				"warn"
			);
			return false; // No action taken
		}
	}

	/**
	 * Executes movement towards or away from a target.
	 * @param {object} target - The target object (with x, y, dist).
	 * @param {number} speed - The entity's movement speed.
	 * @param {boolean} [moveAway=false] - If true, tries to move away from the target.
	 * @returns {boolean} True if a move was attempted, false otherwise.
	 */
	doMove(target, speed, moveAway = false) {
		if (VARS.TURN < this.nextMoveTurn || speed <= 0) {
			debugLog(
				`${this.name} (Speed: ${speed}) cannot move this turn (nextMoveTurn: ${this.nextMoveTurn}, current: ${VARS.TURN})`,
				"debug"
			);
			return false; // Not enough speed or already acted
		}

		// Calculate next turn for movement based on speed
		this.nextMoveTurn = VARS.TURN + 1 / speed;

		// If at target and not moving away, no need to move
		if (!moveAway && target.dist <= 1.5) {
			// Use a slightly larger radius to prevent getting stuck
			debugLog(
				`${this.name} already at target, no move needed.`,
				"debug"
			);
			return false;
		}

		let nextTileX, nextTileY;
		let path = this.getPath(target.x, target.y, false); // Get path considering other units

		if (moveAway) {
			// To move away, find the tile furthest from the target within path options, or adjacent tiles.
			// Simplified: get all walkable neighbors and pick one that increases distance.
			const adjacentTiles = ROT.DIRS[8].map((dir) => [
				this.x + dir[0],
				this.y + dir[1],
			]);
			let bestEscapeTile = null;
			let maxDistIncrease = -Infinity; // Find tile that maximizes distance increase

			for (const [adjX, adjY] of adjacentTiles) {
				if (isTilePassableForMovement(adjX, adjY, this)) {
					// Use the new utility for movement checks
					const newDist = Math.hypot(
						adjX - target.x,
						adjY - target.y
					);
					const distIncrease = newDist - target.dist;
					if (distIncrease > maxDistIncrease) {
						maxDistIncrease = distIncrease;
						bestEscapeTile = [adjX, adjY];
					}
				}
			}
			if (bestEscapeTile) {
				nextTileX = bestEscapeTile[0];
				nextTileY = bestEscapeTile[1];
			} else {
				debugLog(
					`${this.name} wants to move away but found no suitable escape tile.`,
					"debug"
				);
				return false; // Cannot move away
			}
		} else {
			// Move towards target (first step in the path)
			if (path.length < 2) {
				// path[0] is current pos, so need at least path[1] for movement
				debugLog(
					`${this.name} pathfinding failed or no path to target.`,
					"warn"
				);
				return false; // No path found or already at target (path[0] is current pos)
			}
			nextTileX = path[1][0];
			nextTileY = path[1][1];
		}

		// Check if the next tile is valid and not occupied by another non-passable entity
		if (isTilePassableForMovement(nextTileX, nextTileY, this) === true) {
			// Use the new utility
			this.x = nextTileX;
			this.y = nextTileY;
			debugLog(`${this.name} moved to (${this.x},${this.y}).`, "debug");
			return true; // Action taken
		} else {
			debugLog(
				`${this.name} attempted to move to (${nextTileX},${nextTileY}) but path blocked.`,
				"warn"
			);
			return false; // No action taken
		}
	}
	addStatusEffect(effect, duration) {
		// Prevent stacking the same effect; refresh its duration instead
		const existingEffect = this.statusEffects.find(
			(e) => e.effect === effect
		);
		if (existingEffect) {
			existingEffect.duration = Math.max(
				existingEffect.duration,
				duration
			);
		} else {
			this.statusEffects.push({ effect, duration });
			log({
				type: "info",
				text: `%c{orange}${this.name}%c{} is now ${effect}!`,
			});
		}
	}
	/**
	 * Calculates a path from the entity's current position to a target location (tx, ty).
	 * Uses Dijkstra's algorithm to find the shortest path, considering passable terrain and other entities.
	 * @param {number} tx The target x-coordinate.
	 * @param {number} ty The target y-coordinate.
	 * @param {boolean} [direct=false] Whether to calculate a direct path ignoring obstacles (for LOS check mostly).
	 * @returns {Array<Array<number>>} An array of [x, y] coordinates representing the path.
	 */
	getPath(tx, ty, direct = false) {
		const unit = this; // Capture 'this' for use in callback
		const pathCallback = (x, y) => {
			if (!world_grid[y] || world_grid[y][x] === undefined) return false; // Out of bounds

			// If direct path (for LOS), only care about world_grid passability (walls)
			if (direct) {
				return world_grid[y][x] === 1;
			}

			// For actual movement, also consider other entities
			if (world_grid[y][x] === 1) {
				for (const e of entities) {
					// If entity is at this spot, is not dead, is not passable, and is not THIS unit
					if (
						e.x === x &&
						e.y === y &&
						e.mob &&
						e.mob.ai !== "dead" &&
						!e.passable &&
						e !== unit
					) {
						return false; // Blocked by another living, impassable entity
					}
				}
				return true; // Tile is passable
			}
			return false; // Tile is a wall (0) or invalid
		};

		const dijkstra = new ROT.Path.Dijkstra(tx, ty, pathCallback);
		let path = [];
		dijkstra.compute(this.x, this.y, (x, y) => path.push([x, y]));
		return path;
	}

	/**
	 * Finds the closest enemy entity within a given range that is visible.
	 * Used by player squad AI (autofire, follow) and enemy AI.
	 * @param {number} range - The maximum search range.
	 * @returns {Object} An object containing information about the closest enemy, including distance, coordinates, and entity reference.
	 */
	getEnemy(range) {
		let closest_entity = { dist: -1, x: -1, y: -1, entity: null };
		for (const e of entities) {
			if (
				e.mob &&
				e.owner !== this.owner &&
				e.mob.ai !== "dead" &&
				e.visible
			) {
				const currdist = Math.hypot(this.x - e.x, this.y - e.y);
				if (
					currdist > 0 &&
					currdist <= range &&
					checkFire(this.x, this.y, e.x, e.y)
				) {
					if (
						currdist < closest_entity.dist ||
						closest_entity.dist < 0
					) {
						closest_entity.dist = currdist;
						closest_entity.x = e.x;
						closest_entity.y = e.y;
						closest_entity.entity = e;
					}
				}
			}
		}
		return closest_entity;
	}

	/**
	 * Finds the player-controlled entity (VARS.SELECTED).
	 * Used by player squad AI (follow).
	 * @returns {Object} An object containing information about the player entity, including distance, coordinates, and entity reference.
	 */
	getPlayer() {
		let target_entity = { dist: -1, x: -1, y: -1, entity: null };
		if (
			VARS.SELECTED &&
			VARS.SELECTED.mob &&
			VARS.SELECTED.mob.ai !== "dead"
		) {
			const currdist = Math.hypot(
				this.x - VARS.SELECTED.x,
				this.y - VARS.SELECTED.y
			);
			target_entity.dist = currdist;
			target_entity.x = VARS.SELECTED.x;
			target_entity.y = VARS.SELECTED.y;
			target_entity.entity = VARS.SELECTED;
		}
		return target_entity;
	}
}
