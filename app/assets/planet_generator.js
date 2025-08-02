import generationData from "./datasets/planet_generation_data.json" with { type: "json" };
import { getRandomElement } from "./utils/gameUtils.js";
import { generatePlanetName } from "./namegen.js";

export function generatePlanet() {
	let planet = {};

	// ===== STAGE 1: PLANET ARCHETYPE & CONSTITUTION =====
	// This is the most important choice, determining the sprite.
	const archetypeKey = getRandomElement(
		Object.keys(generationData.archetypes)
	);
	const archetype = generationData.archetypes[archetypeKey];
	planet.archetype = archetype.name;

	// Pick a random sprite number from the available count for this archetype
	const spriteNum = ROT.RNG.getUniformInt(1, archetype.sprite_count);
	planet.spriteIcon = `planet_${archetypeKey}_${spriteNum}`; // e.g., "planet_terran_3"

	planet.isHabitable = true; // All our archetypes are habitable
	planet.constitution = getRandomElement(["Silicate", "Ferrous", "Carbon"]); // Simplified
	planet.name = generatePlanetName();

	// ===== STAGE 2: BIOME, TEMPERATURE, ATMOSPHERE =====
	planet.biome = getRandomElement(archetype.valid_biomes);
	planet.temperature = getRandomElement(archetype.valid_temperatures);

	// Barren planets are much more likely to have no atmosphere
	let atmosphereKey;
	if (archetypeKey === "barren" && ROT.RNG.getUniform() < 0.8) {
		atmosphereKey = "none";
	} else {
		atmosphereKey = getRandomElement(
			Object.keys(generationData.atmospheres)
		);
	}
	const atmosphere = generationData.atmospheres[atmosphereKey];
	planet.atmosphere = atmosphere.name;
	planet.gameplayAtmosphere = atmosphere.gameplay_effect;
	planet.needsOxygen = atmosphere.oxygen_mission;

	// ===== STAGE 3: LIFE =====
	let lifeKey = "none";
	if (ROT.RNG.getUniform() < archetype.life_chance) {
		lifeKey = getRandomElement(Object.keys(generationData.life_levels));
		// Prevent complex life in a vacuum
		if (
			atmosphereKey === "none" &&
			lifeKey !== "none" &&
			lifeKey !== "microbial"
		) {
			lifeKey = "microbial";
		}
	}
	const life = generationData.life_levels[lifeKey];
	planet.life = life.name;
	planet.enemyTags = life.enemy_tags;

	// ===== STAGE 4: FINAL ASSEMBLY =====
	return planet;
}
