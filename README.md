# CosmoTactics

<p align="center">
<img src="https://github.com/taislin/cosmotactics/raw/master/app/icons/icon.png" alt="logo" height="128"/>
</p>

![GitHub package.json version](https://img.shields.io/github/package-json/v/taislin/cosmotactics)
![GitHub Release Date](https://img.shields.io/github/release-date/taislin/cosmotactics)
<a href="https://creativecommons.org/licenses/by-nc/4.0/"><img src="https://img.shields.io/badge/License-CC%20BY%20NC-blue" alt="License"></a>
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/taislin/cosmotactics)

A squad-based tactical roguelike game set in a gritty sci-fi universe. Lead your **_Space Expeditionary Force_** (SEF) squad through hostile alien planets, navigating treacherous environments and battling myriad lifeforms in unique simultaneous turn-based combat.

<p align="center">
<a href="https://taislin.github.io/cosmotactics/app/">>><b>🎮 PLAY GAME 🎮</b><<</a>&nbsp;┃&nbsp;
<a href="https://taislin.github.io/cosmotactics/docs/quick-start.html">>><b>📖 QUICK START 📖</b><<</a>
</p>

## 📖 Table of Contents

-   [CosmoTactics](#cosmotactics)
    -   [📖 Table of Contents](#-table-of-contents)
    -   [📜 Features](#-features)
    -   [🚀 Getting Started](#-getting-started)
    -   [🎮 How to Play](#-how-to-play)
    -   [🛠 Technologies Used](#-technologies-used)
    -   [🤝 Contributing](#-contributing)
    -   [📄 License](#-license)
    -   [🙏 Credits and Attributions](#-credits-and-attributions)
        -   [⚙️ Core Development](#️-core-development)
        -   [🛠 Libraries \& Engines](#-libraries--engines)
        -   [🎨 Graphics \& Tilesets](#-graphics--tilesets)

## 📜 Features

<p align="center">
<img src="https://github.com/taislin/cosmotactics/raw/master/docs/screen.png" alt="gameplay screenshot" height="250"/><img src="https://github.com/taislin/cosmotactics/raw/master/docs/screen2.png" alt="gameplay screenshot" height="250"/>
</p>

-   🚀 **Simultaneous Turn System:** Make every decision count as all units (friendly and hostile) act concurrently after you issue an order to your selected operative.
-   👥 **Squad Command:** Control one unit directly while the rest of your squad operates autonomously based on assigned Stances (Follow/Hold) and Autofire settings.
-   🌍 **Dynamic Environments:** Explore procedurally generated maze-like dungeons with varying terrain types and environmental hazards.
-   🌫️ **Fog of War:** Uncover hidden areas and spot lurking threats using your squad's combined field of view.
-   🛠️ **Resource Management:** Keep an eye on your squad's oxygen supply and scavenge for valuable gold and supplies.
-   👾 **Diverse Roster:** Encounter various alien enemies and command different SEF Trooper archetypes, each with unique stats and equipment.
-   🔍 **Deep Mechanics:** Engage with detailed unit stats, weapon systems, and consumable items.

## 🚀 Getting Started

To run CosmoTactics locally, just download a release and run the executable for your operating system (MacOS, Windows, Linux). They are all included in the repository.

|          Filename          |   OS    | CPU architecture |             Type              |
| :------------------------: | :-----: | :--------------: | :---------------------------: |
|   cosmotactics-linux_x64   |  Linux  |      x86_64      |      Application binary       |
|  cosmotactics-linux_armhf  |  Linux  |      armhf       |      Application binary       |
|  cosmotactics-linux_arm64  |  Linux  |      arm64       |      Application binary       |
|    cosmotactics-mac_x64    |  macOS  |      x86_64      |  Application binary (Intel)   |
| cosmotactics-mac_universal |  macOS  | x86_64 and arm64 |      Application binary       |
|   cosmotactics-mac_arm64   |  macOS  |      arm64       | Application binary (M1/M2/M3) |
|    cosmotactics-win_x64    | Windows |      x86_64      |      Application binary       |

> [!NOTE]
> If for some reason you are using Windows 32bit, you won't be able to use the executable. You will need to follow the development steps below.

## 🎮 How to Play

CosmoTactics is fully playable using either keyboard, mouse, or a combination.

For a comprehensive guide on game mechanics, controls, units, and items, please refer to the **Operator's Manual** (which is also hosted on GitHub Pages):

[**CosmoTactics Operator's Manual**](https://taislin.github.io/cosmotactics/docs/)

## 🛠 Technologies Used

-   **HTML5, CSS3, JavaScript:** Core web technologies.
-   **ROT.js:** Robust roguelike toolkit for display, map generation, FOV, pathfinding, and RNG.
-   **Neutralino.js:** Used for the executable, basically a small, self-contained browser app.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for new features, bug fixes, or improvements to the codebase, please open an issue or submit a pull request.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/taislin/cosmotactics.git
    cd CosmoTactics
    ```

2.  **Install Server:**
    This project has no dependencies (the only real dependency is [rot.js](https://ondras.github.io/rot.js/hp/), which is included in a minified version). All you need is a webserver, three options below:

    -   You can install Node.js from [the official website](https://nodejs.org/en/download), then run the game on the console:

        `node server.js`

    -   If you have Python installed, you can run it with:

        `python -m http.server -b localhost 8125`

    -   Download one of the many webserver tools around (they're small executables), and put it on the main directory.

    This will start a server, usually accessible at `http://127.0.0.1:8125/`. Open this URL in your web browser.

## 📄 License

This project is licensed under the **Creative Commons BY NC 4.0 License**.

This license enables reusers to distribute, remix, adapt, and build upon the material in any medium or format for noncommercial purposes only, and only so long as attribution is given to the creator.

See the [LICENSE](LICENSE) file for details.

## 🙏 Credits and Attributions

CosmoTactics is made possible by the hard work of its creator and the generous contributions of the open-source and creative communities.

### ⚙️ Core Development

-   **Game Design, Programming, and Art:** [taislin](https://github.com/taislin) _(Unless specified otherwise)_. Licensed under [CC BY-NC 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/).

### 🛠 Libraries & Engines

-   **[ROT.js](https://ondras.github.io/rot.js/hp/)** by Ondřej Žára - The core roguelike toolkit. Licensed under [BSD-3-Clause](https://opensource.org/license/bsd-3-clause).
-   **[Neutralino.js](https://neutralino.js.org/)** - For the cross-platform desktop application wrapper. Licensed under [MIT License](https://opensource.org/license/mit).

### 🎨 Graphics & Tilesets

-   **[Hexany's Roguelike Tiles](https://hexany-ives.itch.io/hexanys-roguelike-tiles)** by _Hexany_. Licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

-   **[Kenney's 1-bit pack](https://www.kenney.nl/assets/1-bit-pack)** by _Kenney_. Licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

-   **[Urizen 1-bit tileset](https://vurmux.itch.io/urizen-onebit-tileset)** by _Varmux_. Licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

-   **[32Rogues](https://sethbb.itch.io/32rogues)** by _Seth_. Licensed under a Proprietary License (open-source), see files for more information.
