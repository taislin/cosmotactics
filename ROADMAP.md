# 🗺️ CosmoTactics Development Roadmap

Welcome to the official development roadmap for CosmoTactics! This document outlines the planned progression of the game, detailing major features and milestones on the path to the 1.0.0 release.

My goal is to build a deep, engaging squad-based tactical roguelike. The roadmap is structured into major version updates, each focusing on a core aspect of the game. Please note that minor bug-fix and balance patches (e.g., v0.3.1, v0.4.5) will be released between these major updates.

---

## Roadmap to 1.0.0

### **v0.3.0: The Foundation Update**

_Focus: Solidifying the core game loop and adding essential quality-of-life features._

-   [x] **Persistent & Bidirectional Levels:** Implement a state-saving system for visited levels, allowing players to travel up and down between floors.
-   [x] **Expanded Mission Objectives:** Introduce a basic "Objective & Evac" mission type where the squad must complete a goal and return to the shuttle to win.
-   [x] **In-Game Quick Guide:** Fully integrate the Quick Start guide into the main menu for easy access.
-   [x] **Thematic Level Start:** Add the squad's shuttle as a multi-tile, static object at the start of Level 0 for better immersion.
-   [ ] **Expanded Arsenal:** Add a selection of new weapons with unique mechanics (e.g., Shotguns, Stun Weapons) to increase tactical variety.

---

### **v0.4.0: The Squad Management Update**

_Focus: Making the "squad" aspect more meaningful by introducing persistent management between missions._

-   [ ] **Between-Missions Barracks Screen:**
    -   View a roster of all available operatives.
    -   Manually assign weapons, armor, and items to each squad member from a shared inventory.
    -   Recruit new troopers to replace fallen ones.
-   [ ] **Persistent Operative Health:** Wounded operatives will not fully heal between missions, encouraging squad rotation.
-   [ ] **Global Stash:** Items and gold found during missions are added to a shared stash for use in the Barracks.
-   [ ] **Save/Load:** The ability to save and load games, either on browser storage or locally.

---

### **v0.5.0: The Tactical Depth Update**

_Focus: Adding more layers to combat that reward careful planning and positioning._

-   [ ] **Cover System:** Introduce half and full cover mechanics, providing defensive bonuses and making flanking a critical tactic.
-   [ ] **Overwatch & Suppression System:**
    -   **Overwatch:** Allow units to end their turn by guarding an area, firing on the first enemy that moves into their line of sight.
    -   **Suppression:** Heavy weapons can pin down enemies, reducing their accuracy and movement.
-   [ ] **Status Effects System:** Formalize effects like Stun, Bleed, and Poison with clear visual indicators.
-   [ ] **Expanded Mission Variety:** Add new objective types like "Holdout" (survive against waves of enemies) - see Notes.
-   [ ] **More Biomes:** Add ice, etc.

---

### **v0.6.0: The Alien Menace Update**

_Focus: Making enemies smarter, more varied, and more threatening._

-   [ ] **Advanced Enemy AI:** Enemies will learn to use cover, coordinate their attacks, and exhibit more complex behaviors.
-   [ ] **New Enemy Archetypes:** Introduce specialized aliens like the "Controller" (buffs/debuffs), the "Ambusher" (stealth), and the "Spawner" (summons minions).
-   [ ] **Interactive Hazards:** Add more dynamic environmental elements like explosive containers and destructible cover.

---

### **v0.7.0: The "X-COM Base" Update**

_Focus: Expanding the between-missions gameplay loop with long-term strategic choices._

-   [ ] **Research & Development Lab Screen:** Research captured alien artifacts and tech to unlock new, more powerful equipment for your squad.
-   [ ] **Workshop/Fabrication Screen:** Once a technology is researched, spend resources to build copies of the item for your operatives.
-   [ ] **Operative Progression:** Operatives gain experience and level up, receiving small stat boosts or new passive abilities.

---

### **v0.8.0: The Campaign & Polish Update**

_Focus: Tying everything together with a narrative, sound, and a refined user experience._

-   [ ] **Campaign Structure:** Introduce a simple campaign map with a mix of story-critical and randomly generated missions.
-   [ ] **Sound Design:** Implement background music and sound effects for weapons, impacts, and UI interactions.
-   [ ] **UI/UX Overhaul:** Refine all UI elements for clarity, add tooltips, and improve the game log.
-   [ ] **Full Controller & Keyboard Support:** Ensure every action and menu is navigable without a mouse.

---

### **v0.9.0: Pre-Release Candidate**

_Focus: Extensive playtesting, balancing, and bug fixing before the official launch._

-   [ ] **Final Balancing Pass:** Adjust all weapon stats, enemy health, and mission difficulties based on comprehensive feedback.
-   [ ] **New Player Experience:** Implement a tutorial or a guided first mission to ease new players into the game's mechanics.
-   [ ] **Performance Optimization:** Profile and optimize the code to ensure a smooth experience.

---

### **v1.0.0: Official Release**

_The culmination of all previous updates, resulting in a stable, feature-rich, and well-balanced tactical roguelike experience._

---

## Notes

1. Defensive & Endurance Missions
   These missions flip the script from offense to defense, forcing players to manage positioning and resources over time.
   Holdout / Defend the LZ: The squad must defend a specific area (like the shuttle landing zone or a vital piece of equipment) for a set number of turns against incoming waves of enemies. Success isn't about killing everyone, but simply surviving the onslaught. This emphasizes positioning, overwatch, and ammo conservation.
   Escort / Rescue: The squad must locate a friendly NPC (a downed pilot, a scientist, a VIP) and safely escort them back to the extraction zone. The NPC would be vulnerable and might have unique AI (e.g., panics, follows poorly), making them a liability to protect. This tests the player's ability to protect a weak point in their formation.
   Rearguard Action: A variation of Holdout where the squad must cover the retreat of another (off-screen) force. They must hold a chokepoint for X turns and then successfully fall back to their own extraction point, facing enemies that are actively trying to push past them.
2. Stealth & Sabotage Missions
   These missions reward careful, quiet advancement and punish loud mistakes.
   Infiltration / Data Heist: The squad must reach a specific terminal or object deep within an enemy-controlled level without raising a general alarm. Raising the alarm (e.g., being spotted by a specific "Watcher" enemy, firing loud weapons) could trigger infinite enemy spawns or a mission failure timer, forcing a frantic escape.
   Sabotage: The squad must plant a beacon or explosive on several (e.g., 3-5) key objectives scattered across the map. The challenge is reaching all of them before being overwhelmed. Once the last charge is set, a timer starts for extraction.
   Capture / Abduction: Instead of killing an HVT, the mission is to subdue it. This would require a special non-lethal weapon (like a stun rifle or tranquilizer). The "captured" alien would then need to be physically carried back to the shuttle, encumbering one of your soldiers and making the retreat much more difficult.
3. Exploration & Puzzle Missions
   These missions focus less on direct combat and more on exploration and environmental interaction.
   Survey / Exploration: The objective is to reach and scan several "points of interest" on the map. These points might be in difficult-to-reach locations or guarded by environmental hazards rather than hordes of enemies. The challenge is traversal and resource management (especially oxygen) over a large, potentially confusing map.
   Reactivation: The squad must find a central power generator and several consoles across the map. They need to turn on the generator first, which might alert enemies, and then activate the consoles in a specific sequence to complete the mission. This adds a light puzzle element to the tactical layer.
   Recovery Under Pressure: A "smash and grab" mission. The artifact or objective is located in a highly hazardous area (e.g., a room that fills with acid, a collapsing cavern). The player has a very limited number of turns to get in, grab the item, and get out before the environment itself becomes lethal.
4. Dynamic & Multi-Stage Missions
   These are more complex scenarios that could combine elements from other mission types.
   The Bait & Switch: The initial objective is simple (e.g., "Retrieve Data"). Upon reaching the objective, it's revealed to be a trap. The mission instantly changes to a "Holdout" or "Escape to a new, distant extraction point" while being ambushed from all sides.
   Chain Mission: Completing an objective on one level (e.g., finding a keycard) is required to unlock the objective on the next level down. This would require players to delve multiple levels deep and then successfully extract all the way back up.
   Pursuit: The squad is tasked with chasing a specific, fast-moving enemy HVT across the map. The HVT doesn't fight but actively flees, potentially leading the squad through ambushes and environmental hazards. The goal is to corner and eliminate it before it escapes off the edge of the map.
