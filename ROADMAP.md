# 🗺️ CosmoTactics Development Roadmap

Welcome to the official development roadmap for CosmoTactics! This document outlines the planned progression of the game, detailing major features and milestones on the path to the 1.0.0 release.

My goal is to build a deep, engaging squad-based tactical roguelike. The roadmap is structured into major version updates, each focusing on a core aspect of the game. Please note that minor bug-fix and balance patches (e.g., v0.3.1, v0.4.5) will be released between these major updates.

---

### **v0.3.0: The Foundation Update**

_Focus: Solidifying the core game loop and adding essential quality-of-life features._

-   [x] **Persistent & Bidirectional Levels:** Implement a state-saving system for visited levels, allowing players to travel up and down between floors.
-   [ ] **Expanded Mission Objectives:** Introduce a basic "Objective & Evac" mission type where the squad must complete a goal and return to the shuttle to win.
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

---

### **v0.5.0: The Tactical Depth Update**

_Focus: Adding more layers to combat that reward careful planning and positioning._

-   [ ] **Cover System:** Introduce half and full cover mechanics, providing defensive bonuses and making flanking a critical tactic.
-   [ ] **Overwatch & Suppression System:**
    -   **Overwatch:** Allow units to end their turn by guarding an area, firing on the first enemy that moves into their line of sight.
    -   **Suppression:** Heavy weapons can pin down enemies, reducing their accuracy and movement.
-   [ ] **Status Effects System:** Formalize effects like Stun, Bleed, and Poison with clear visual indicators.
-   [ ] **Expanded Mission Variety:** Add new objective types like "Assassination" (eliminate a VIP target) and "Holdout" (survive against waves of enemies).

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
