import {
	icons,
	entities, // Note: This is the global entities array
	VARS,
	checkMoveOwned,
	player_entities,
	debugLog,
} from "../engine.js";
import { WIcon } from "./icons.js";
import { effects } from "../display.js";
import { Projectile } from "./projectile.js";
import { getNextUnit } from "../controls.js";
import { world, world_grid } from "../map.js";

/**
 * Helper function to select a random element from an array.
 * @param {Array} arr - The array to select from.
 * @returns {*} A random element from the array.
 */
function _getRandomElement(arr) {
	return arr[Math.floor(ROT.RNG.getUniform() * arr.length)]; // Use ROT.RNG for consistency
}

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

		// Apply random icon properties if applicable
		if (this.icon.color && this.icon.color.length > 1) {
			this.icon.color = _getRandomElement(this.icon.color);
		}
		if (
			this.icon.tcoords &&
			this.icon.tcoords.length > 1 &&
			Array.isArray(this.icon.tcoords[0])
		) {
			this.icon.tcoords = _getRandomElement(this.icon.tcoords);
		} else if (this.icon.tcoords && !Array.isArray(this.icon.tcoords[0])) {
			this.icon.tcoords = this.icon.tcoords[0]; // If it's just [x,y] or a single value, ensure it's correct
		}
	}

	/**
	 * Handles the entity's firing logic, including ranged attacks for AI and player-controlled entities.
	 * Checks for conditions like stance, autofire, and ammo before firing.
	 * Returns true if an action (fire or reload) was taken, false otherwise.
	 */
	processFire() {
		if (!this.mob || this.mob.ai === "dead") return false; // Return false if no action

		const mob = this.mob;
		const ranged = mob.slots.ranged;

		// Player unit: Reload if out of ammo. This is a special action that consumes a turn.
		if (this.owner === "player" && ranged && ranged.stats.ammo <= 0) {
			ranged.stats.ammo = ranged.stats.max_ammo;
			VARS.GAMELOG.unshift(
				`${VARS.TURN}: ${this.name} reloads the ${ranged.name}.`
			);
			debugLog(`${this.name} reloaded.`, "info");
			return true; // Reload consumes the turn
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
	 */
	performAITurn() {
		if (!this.mob || this.mob.ai === "dead" || this.owner === "player") {
			return; // Only AI-controlled, living, non-player units act here
		}
		if (VARS.TURN < this.nextMoveTurn) {
			// Check if unit is ready to act based on speed
			debugLog(
				`${this.name} (Speed: ${this.mob.stats.speed}) is recharging (nextMoveTurn: ${this.nextMoveTurn}, current: ${VARS.TURN})`,
				"debug"
			);
			return;
		}

		const mob = this.mob;
		const currentHealthPercent = mob.stats.health / this.originalHealth;

		// Morale Check: Retreat if health is very low and morale is low
		if (currentHealthPercent < 0.25 && mob.morale < 150) {
			// Example threshold
			debugLog(
				`${this.name} (${mob.ai} AI) is low on health (${mob.stats.health} HP) and considering retreat.`,
				"info"
			);
			this.handleRetreat();
			return; // Action taken, end turn
		}

		// Find a target based on AI type
		const target = this._findTarget();
		if (!target) {
			debugLog(
				`${this.name} (${mob.ai} AI) found no valid targets. Idling.`,
				"debug"
			);
			// If no target, simply pass the turn or wander randomly
			return;
		}

		// AI Decision Logic based on mob.ai type
		switch (mob.ai) {
			case "basic":
				this._handleBasicAI(target);
				break;
			case "aggressive":
				this._handleAggressiveAI(target);
				break;
			case "ranged":
				this._handleRangedAI(target);
				break;
			case "melee_aggressive":
				this._handleMeleeAggressiveAI(target);
				break;
			// Add more complex AI types here (e.g., "flanker", "support", "cautious")
			default:
				this._handleBasicAI(target); // Fallback
				break;
		}
	}

	/**
	 * Internal: Basic AI behavior - prioritizes ranged, then moves/melees.
	 * @param {object} target - The identified target.
	 */
	_handleBasicAI(target) {
		const mob = this.mob;
		const ranged = mob.slots.ranged;

		const canRangedAttack =
			ranged &&
			target.dist <= ranged.stats.range &&
			checkFire(this.x, this.y, target.x, target.y);
		const canMeleeAttack = target.dist <= 1.5; // Use same melee range as doMelee

		if (canRangedAttack) {
			this.doRanged(target);
		} else if (canMeleeAttack) {
			this.doMelee(target);
		} else {
			// If neither ranged nor melee, try to close distance
			this.doMove(target, mob.stats.speed);
		}
	}

	/**
	 * Internal: Aggressive AI behavior - always tries to close distance and attack.
	 * @param {object} target - The identified target.
	 */
	_handleAggressiveAI(target) {
		const mob = this.mob;
		const canMeleeAttack = target.dist <= 1.5;
		const ranged = mob.slots.ranged;
		const canRangedAttack =
			ranged &&
			target.dist <= ranged.stats.range &&
			checkFire(this.x, this.y, target.x, target.y);

		if (canMeleeAttack) {
			this.doMelee(target);
		} else if (canRangedAttack) {
			// If cannot melee, try to fire ranged
			this.doRanged(target);
		} else {
			// If neither, try to close distance
			this.doMove(target, mob.stats.speed);
		}
	}

	/**
	 * Internal: Ranged AI behavior - tries to maintain optimal range, fires if possible.
	 * @param {object} target - The identified target.
	 */
	_handleRangedAI(target) {
		const mob = this.mob;
		const ranged = mob.slots.ranged;

		if (!ranged) {
			// If no ranged weapon, fall back to basic movement
			this.doMove(target, mob.stats.speed);
			return;
		}

		const optimalRange = ranged.stats.range * 0.75; // Aim for 75% of max range
		const currentDistance = target.dist;
		const canFire =
			currentDistance <= ranged.stats.range &&
			checkFire(this.x, this.y, target.x, target.y);

		if (canFire) {
			// If too close, try to move away
			if (currentDistance < optimalRange * 0.5 && mob.stats.speed > 0) {
				// e.g., if closer than half optimal range
				this.doMove(target, mob.stats.speed * 0.5, true); // Move away
			} else if (currentDistance > optimalRange && mob.stats.speed > 0) {
				// If too far, try to move slightly closer (e.g., half speed toward target)
				this.doMove(target, mob.stats.speed * 0.5);
			}
			this.doRanged(target); // Always try to fire if within range and LOS
		} else {
			// Cannot fire (out of range or blocked), so move closer
			this.doMove(target, mob.stats.speed);
		}
	}

	/**
	 * Internal: Melee Aggressive AI behavior - always tries to close distance for melee.
	 * @param {object} target - The identified target.
	 */
	_handleMeleeAggressiveAI(target) {
		const mob = this.mob;
		const canMeleeAttack = target.dist <= 1.5; // Direct adjacency

		if (canMeleeAttack) {
			this.doMelee(target);
		} else {
			this.doMove(target, mob.stats.speed); // Always try to close distance
		}
	}

	/**
	 * Internal: Determines the best target for this entity based on its AI and current game state.
	 * @returns {object|null} An object with target details (dist, x, y, entity) or null if no target found.
	 */
	_findTarget() {
		// Prioritization order:
		// 1. Closest player unit (VARS.SELECTED - player's active unit)
		// 2. Player unit with lowest current health
		// 3. Any other visible player unit (closest)

		let bestTarget = null;
		let lowestHealth = Infinity;
		let closestDistance = Infinity;

		// Iterate through all player entities (assuming these are the targets)
		for (const playerUnit of player_entities) {
			if (playerUnit.mob.ai === "dead" || !playerUnit.visible) {
				// Only target living, visible units
				continue;
			}

			const dist = Math.hypot(
				this.x - playerUnit.x,
				this.y - playerUnit.y
			);

			// Check line of sight (only if unit's FOV is active, which is implied by 'visible')
			if (!checkFire(this.x, this.y, playerUnit.x, playerUnit.y)) {
				continue; // Cannot see or shoot target through obstacles
			}

			// Prioritize VARS.SELECTED if it's visible and not dead
			if (playerUnit === VARS.SELECTED && playerUnit.mob.ai !== "dead") {
				debugLog(
					`${this.name} prioritizing SELECTED player unit: ${playerUnit.name}`,
					"debug"
				);
				return {
					dist,
					x: playerUnit.x,
					y: playerUnit.y,
					entity: playerUnit,
				}; // Found immediate priority target
			}

			// Prioritize lowest health
			if (playerUnit.mob.stats.health < lowestHealth) {
				lowestHealth = playerUnit.mob.stats.health;
				bestTarget = {
					dist,
					x: playerUnit.x,
					y: playerUnit.y,
					entity: playerUnit,
				};
				closestDistance = dist; // Also update closest distance if new lowest health target is found
			} else if (
				playerUnit.mob.stats.health === lowestHealth &&
				dist < closestDistance
			) {
				// If health is same, pick closer one
				closestDistance = dist;
				bestTarget = {
					dist,
					x: playerUnit.x,
					y: playerUnit.y,
					entity: playerUnit,
				};
			} else if (dist < closestDistance && bestTarget === null) {
				// If no lowest health target yet, just pick closest
				closestDistance = dist;
				bestTarget = {
					dist,
					x: playerUnit.x,
					y: playerUnit.y,
					entity: playerUnit,
				};
			}
		}

		return bestTarget;
	}

	/**
	 * Handles general entity processing (health, death).
	 * The main AI logic is now in performAITurn() for enemies.
	 * This method is specifically for death checks.
	 */
	process() {
		if (!this.mob || this.mob.ai === "dead") return;

		// Handle death
		if (this.mob.stats.health <= 0) {
			this.icon = JSON.parse(JSON.stringify(icons["dead"]));
			this.icon.tcoords =
				this.icon.tcoords.length > 1
					? _getRandomElement(this.icon.tcoords)
					: this.icon.tcoords[0];
			this.mob.ai = "dead"; // Mark as dead, engine.js will remove from array
			this.passable = true; // Dead units become passable
			if (world[`${this.x},${this.y}`]) {
				// Use template literal for consistent key
				world[`${this.x},${this.y}`].icon = icons["dead"]; // Change map tile icon
				world_grid[this.y][this.x] = 1; // Make map tile passable
			}
			let precol =
				this.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
			VARS.GAMELOG.unshift(
				VARS.TURN + ": " + precol + this.name + "%c{} dies!"
			);
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

			if (this.mob.slots.melee && this.mob.slots.melee.stats.attack > 0) {
				dmg = this.mob.slots.melee.stats.attack; // Use weapon attack if equipped
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

					let precol =
						this.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
					let precol2 =
						en.entity.owner === "player"
							? "%c{#009f00}"
							: "%c{#ffa500}";

					VARS.GAMELOG.unshift(
						`${VARS.TURN}: ${precol}${
							this.name
						}%c{} hits ${precol2}${
							en.entity.name
						}%c{} for %c{red}${Math.round(finalDmg)} HP%c{}!`
					);
					debugLog(
						`${this.name} melees ${en.entity.name} for ${Math.round(
							finalDmg
						)} HP.`,
						"debug"
					);
				} else {
					let precol =
						this.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
					let precol2 =
						en.entity.owner === "player"
							? "%c{#009f00}"
							: "%c{#ffa500}";
					VARS.GAMELOG.unshift(
						`${VARS.TURN}: ${precol}${this.name}%c{} misses ${precol2}${en.entity.name}%c{}!`
					);
					debugLog(
						`${this.name} misses melee attack on ${en.entity.name}.`,
						"debug"
					);
				}
			} else {
				VARS.GAMELOG.unshift(
					`${VARS.TURN}: ${en.entity.name} blocks ${this.name}'s attack!`
				);
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
			let precol =
				this.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";
			let precol2 =
				en.entity.owner === "player" ? "%c{#009f00}" : "%c{#ffa500}";

			VARS.GAMELOG.unshift(
				`${VARS.TURN}: ${precol}${this.name}%c{} fires at ${precol2}${en.entity.name}%c{}!`
			);
			debugLog(`${this.name} fires at ${en.entity.name}.`, "debug");

			// Create projectile
			new Projectile(
				this.x,
				this.y,
				rangedWeapon,
				this.owner,
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
				if (checkMoveOwned(adjX, adjY, this)) {
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
		if (checkMoveOwned(nextTileX, nextTileY, this) === true) {
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

	/**
	 * Handles unit retreating behavior.
	 * Tries to move away from the closest visible enemy.
	 */
	handleRetreat() {
		const closestEnemy = this.getEnemy(10); // Find closest enemy within 10 tiles
		if (closestEnemy.entity) {
			debugLog(
				`${this.name} is retreating from ${closestEnemy.entity.name}.`,
				"info"
			);
			this.doMove(closestEnemy, this.mob.stats.speed, true); // Move away
		} else {
			debugLog(
				`${this.name} wants to retreat but found no enemies to retreat from.`,
				"debug"
			);
		}
	}
}

/**
 * Finds a mob entity at the specified coordinates.
 * @param {number} tgt_x - The target x-coordinate.
 * @param {number} tgt_y - The target y-coordinate.
 * @returns {WEntity|null} The mob entity if found and alive, otherwise null.
 */
export function findMobCoords(tgt_x, tgt_y) {
	for (const e of entities) {
		if (e.x === tgt_x && e.y === tgt_y && e.mob && e.mob.ai !== "dead") {
			return e;
		}
	}
	return null;
}

/**
 * Checks if there is a clear line of fire between two points, accounting for walls/impassable terrain.
 * @param {number} x1 - The starting x-coordinate.
 * @param {number} y1 - The starting y-coordinate.
 * @param {number} x2 - The target x-coordinate.
 * @param {number} y2 - The target y-coordinate.
 * @returns {boolean} True if there is a clear line of fire, otherwise false.
 */
function checkFire(x1, y1, x2, y2) {
	const pathfinder = new ROT.Path.Dijkstra(x2, y2, (px, py) => {
		if (px < 0 || px >= VARS.MAP_X || py < 0 || py >= VARS.MAP_Y) {
			return false;
		}
		return world_grid[py][px] === 1;
	});

	let hasLineOfSight = true;
	let path = [];
	pathfinder.compute(x1, y1, (px, py) => {
		path.push([px, py]);
	});

	if (
		path.length === 0 ||
		path[path.length - 1][0] !== x2 ||
		path[path.length - 1][1] !== y2
	) {
		hasLineOfSight = false;
	}

	return hasLineOfSight;
}

// getDir is not used within WEntity, but might be used elsewhere. Keeping for now.
function getDir(ox, oy, tx, ty) {
	let dir = null;
	if (Math.abs(ox - tx) >= Math.abs(oy - ty)) {
		if (ox < tx) {
			dir = "east";
		} else {
			dir = "west";
		}
	} else {
		if (oy < ty) {
			dir = "south";
		} else {
			dir = "north";
		}
	}
	return dir;
}
