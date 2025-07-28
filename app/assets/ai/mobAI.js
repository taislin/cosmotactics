// src/ai/mobAI.js

import { VARS, debugLog, player_entities } from "./../engine.js";
import { checkFire } from "./../utils/gameUtils.js"; // Import checkFire

/**
 * Internal: Determines the best target for this entity based on its AI and current game state.
 * @param {WEntity} entity - The entity performing the AI action.
 * @returns {object|null} An object with target details (dist, x, y, entity) or null if no target found.
 */
function _findTarget(entity) {
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
			entity.x - playerUnit.x,
			entity.y - playerUnit.y
		);

		// Check line of sight
		if (!checkFire(entity.x, entity.y, playerUnit.x, playerUnit.y)) {
			continue; // Cannot see or shoot target through obstacles
		}

		// Prioritize VARS.SELECTED if it's visible and not dead
		if (playerUnit === VARS.SELECTED && playerUnit.mob.ai !== "dead") {
			debugLog(
				`${entity.name} prioritizing SELECTED player unit: ${playerUnit.name}`,
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
 * Handles unit retreating behavior.
 * Tries to move away from the closest visible enemy.
 * @param {WEntity} entity - The entity performing the AI action.
 */
function handleRetreat(entity) {
	const closestEnemy = entity.getEnemy(10); // Find closest enemy within 10 tiles
	if (closestEnemy.entity) {
		debugLog(
			`${entity.name} is retreating from ${closestEnemy.entity.name}.`,
			"info"
		);
		entity.doMove(closestEnemy, entity.mob.stats.speed, true); // Move away
	} else {
		debugLog(
			`${entity.name} wants to retreat but found no enemies to retreat from.`,
			"debug"
		);
	}
}

/**
 * Internal: Basic AI behavior - prioritizes ranged, then moves/melees.
 * @param {WEntity} entity - The entity performing the AI action.
 * @param {object} target - The identified target.
 */
function _handleBasicAI(entity, target) {
	const mob = entity.mob;
	const ranged = mob.slots.ranged;

	const canRangedAttack =
		ranged &&
		target.dist <= ranged.stats.range &&
		checkFire(entity.x, entity.y, target.x, target.y);
	const canMeleeAttack = target.dist <= 1.5; // Use same melee range as doMelee

	if (canRangedAttack) {
		entity.doRanged(target);
	} else if (canMeleeAttack) {
		entity.doMelee(target);
	} else {
		// If neither ranged nor melee, try to close distance
		entity.doMove(target, mob.stats.speed);
	}
}

/**
 * Internal: Aggressive AI behavior - always tries to close distance and attack.
 * @param {WEntity} entity - The entity performing the AI action.
 * @param {object} target - The identified target.
 */
function _handleAggressiveAI(entity, target) {
	const mob = entity.mob;
	const canMeleeAttack = target.dist <= 1.5;
	const ranged = mob.slots.ranged;
	const canRangedAttack =
		ranged &&
		target.dist <= ranged.stats.range &&
		checkFire(entity.x, entity.y, target.x, entity.y);

	if (canMeleeAttack) {
		entity.doMelee(target);
	} else if (canRangedAttack) {
		// If cannot melee, try to fire ranged
		entity.doRanged(target);
	} else {
		// If neither, try to close distance
		entity.doMove(target, mob.stats.speed);
	}
}

/**
 * Internal: Ranged AI behavior - tries to maintain optimal range, fires if possible.
 * @param {WEntity} entity - The entity performing the AI action.
 * @param {object} target - The identified target.
 */
function _handleRangedAI(entity, target) {
	const mob = entity.mob;
	const ranged = mob.slots.ranged;

	if (!ranged) {
		// If no ranged weapon, fall back to basic movement
		entity.doMove(target, mob.stats.speed);
		return;
	}

	const optimalRange = ranged.stats.range * 0.75; // Aim for 75% of max range
	const currentDistance = target.dist;
	const canFire =
		currentDistance <= ranged.stats.range &&
		checkFire(entity.x, entity.y, target.x, target.y);

	if (canFire) {
		// If too close, try to move away
		if (currentDistance < optimalRange * 0.5 && mob.stats.speed > 0) {
			entity.doMove(target, mob.stats.speed * 0.5, true); // Move away
		} else if (currentDistance > optimalRange && mob.stats.speed > 0) {
			// If too far, try to move slightly closer (e.g., half speed toward target)
			entity.doMove(target, mob.stats.speed * 0.5);
		}
		entity.doRanged(target); // Always try to fire if within range and LOS
	} else {
		// Cannot fire (out of range or blocked), so move closer
		entity.doMove(target, mob.stats.speed);
	}
}

/**
 * Internal: Melee Aggressive AI behavior - always tries to close distance for melee.
 * @param {WEntity} entity - The entity performing the AI action.
 * @param {object} target - The identified target.
 */
function _handleMeleeAggressiveAI(entity, target) {
	const mob = entity.mob;
	const canMeleeAttack = target.dist <= 1.5; // Direct adjacency

	if (canMeleeAttack) {
		entity.doMelee(target);
	} else {
		entity.doMove(target, mob.stats.speed); // Always try to close distance
	}
}

/**
 * Orchestrates the AI turn for a given entity.
 * This is the main entry point for enemy AI actions.
 * @param {WEntity} entity - The entity performing the AI turn.
 */
export function performAITurn(entity) {
	if (!entity.mob || entity.mob.ai === "dead" || entity.owner === "player") {
		return; // Only AI-controlled, living, non-player units act here
	}
	if (VARS.TURN < entity.nextMoveTurn) {
		debugLog(
			`${entity.name} (Speed: ${entity.mob.stats.speed}) is recharging (nextMoveTurn: ${entity.nextMoveTurn}, current: ${VARS.TURN})`,
			"debug"
		);
		return;
	}

	const mob = entity.mob;
	const currentHealthPercent = mob.stats.health / entity.originalHealth;

	// Morale Check: Retreat if health is very low and morale is low
	if (currentHealthPercent < 0.25 && mob.morale < 150) {
		// Example threshold
		debugLog(
			`${entity.name} (${mob.ai} AI) is low on health (${mob.stats.health} HP) and considering retreat.`,
			"info"
		);
		handleRetreat(entity); // Use the moved handleRetreat function
		return; // Action taken, end turn
	}

	// Find a target based on AI type
	const target = _findTarget(entity);
	if (!target) {
		debugLog(
			`${entity.name} (${mob.ai} AI) found no valid targets. Idling.`,
			"debug"
		);
		return; // No target, unit idles
	}

	// AI Decision Logic based on mob.ai type
	switch (mob.ai) {
		case "basic":
			_handleBasicAI(entity, target);
			break;
		case "aggressive":
			_handleAggressiveAI(entity, target);
			break;
		case "ranged":
			_handleRangedAI(entity, target);
			break;
		case "melee_aggressive":
			_handleMeleeAggressiveAI(entity, target);
			break;
		default:
			_handleBasicAI(entity, target); // Fallback
			break;
	}
}

/**
 * Handles the AI for non-selected player squad members (follow, hold, autofire).
 * @param {WEntity} entity - The player squad entity to process.
 */
export function processPlayerSquadAI(entity) {
	const mob = entity.mob;
	let actionTakenThisTurn = false; // Flag to ensure only one main action is taken

	// Priority 1: Autofire (if enabled)
	if (mob.autofire || mob.stance === "hold") {
		// Units on 'hold' also try to fire
		actionTakenThisTurn = entity.processFire(); // processFire returns true if it fired/reloaded
	}

	// Priority 2: Melee (if not already acted and enemy is in range)
	if (!actionTakenThisTurn) {
		const en = entity.getEnemy(1.5); // Check for enemies in melee range
		if (en.entity && en.dist <= 1.5) {
			actionTakenThisTurn = entity.doMelee(en); // doMelee returns true if it attacked
		}
	}

	// Priority 3: Follow (if not already acted and in 'follow' stance)
	if (!actionTakenThisTurn && mob.stance === "follow") {
		const pl = entity.getPlayer();
		if (pl.entity && pl.dist > 1.5) {
			// Only move if player is not directly adjacent
			entity.doMove(pl, mob.stats.speed); // doMove updates nextMoveTurn
			actionTakenThisTurn = true;
		} else {
			// If player is adjacent, they've "caught up", so recharge their turn
			entity.nextMoveTurn = VARS.TURN + 1 / mob.stats.speed;
		}
	}
}
