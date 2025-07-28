import _importedUnits from "../assets/datasets/units.json" with { type: "json" };
import _importedEnemies from "../assets/datasets/enemies.json" with { type: "json" };
import _importedIcons from "../assets/datasets/icons.json" with { type: "json" };
import _importedIcons_gui from "../assets/datasets/icons_gui.json" with { type: "json" };
import _importedIcons_objects from "../assets/datasets/icons_objects.json" with { type: "json" };
import _importedIcons_entities from "../assets/datasets/icons_entities.json" with { type: "json" };
import _importedItems from "../assets/datasets/items.json" with { type: "json" };
import _importedItems_equipment from "../assets/datasets/items_equipment.json" with { type: "json" };
import _importedItems_weapons from "../assets/datasets/items_weapons.json" with { type: "json" };

export let importedUnits = { ..._importedUnits, ..._importedEnemies };
export let importedIcons = {
	..._importedIcons_gui,
	..._importedIcons,
	..._importedIcons_entities,
	..._importedIcons_objects,
};
export let importedItems = {
	..._importedItems,
	..._importedItems_equipment,
	..._importedItems_weapons,
};

let unitstable = document.getElementById("unitstable");
let _row = unitstable.insertRow();
let counter1 = 0;
const headerList = [
	{ text: "Icon", tooltip: "" },
	{ text: "Name", tooltip: "" },
	{ text: "Description", tooltip: "" },
	{ text: "Health", tooltip: "Unit's Health Points" },
	{ text: "Attack", tooltip: "Base Melee Attack Damage" },
	{ text: "Armour", tooltip: "Damage Reduction from Attacks" },
	{ text: "Speed", tooltip: "Movement Speed (Turns per Tile)" },
	{ text: "Morale", tooltip: "Resistance to Fear and Retreat" },
];
headerList.forEach((h) => {
	let _header = _row.insertCell(counter1);

	if (h.text != "Description" && h.text != "Icon") {
		_header.outerHTML = "<th title='"+h.tooltip+"' class='order'>" + h.text + "</th>";
	} else {
		_header.outerHTML = "<th>" + h.text + "</th>";
	}
	counter1++;
});
for (var i of Object.keys(importedUnits)) {
	let counter = 0;
	let row = unitstable.insertRow();
	let _name = row.insertCell(counter);
	counter++;
	_name.innerHTML = importedUnits[i].name;
	let _icon = row.insertCell(counter);
	let iconSrc = importedIcons[importedUnits[i].icon];
	var canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32;
	const ctx = canvas.getContext("2d");
	let img2 = document.createElement("img");
	img2.src = iconSrc.tileset.replace("./", "../");
	img2.addEventListener("load", (e) => {
		ctx.drawImage(
			img2,
			iconSrc.tcoords[0][0] * 32,
			iconSrc.tcoords[0][1] * 32,
			32,
			32,
			0,
			0,
			32,
			32
		);
	});
	_icon.appendChild(canvas);
	counter++;
	let _desc = row.insertCell(counter);
	counter++;
	_desc.innerHTML = importedUnits[i].desc;
	for (var j of ["health", "attack", "defence", "speed", "morale"]) {
		let _stat = row.insertCell(counter);
		counter++;
		_stat.innerHTML = importedUnits[i].stats[j];
	}
}

let weaponstable = document.getElementById("weaponstable");
let _wrow = weaponstable.insertRow();
let wcounter1 = 0;
const wheaderList = [
	{ text: "Name", tooltip: "" },
	{ text: "Icon", tooltip: "" },
	{ text: "Description", tooltip: "" },
	{ text: "Type", tooltip: "Weapon Type (e.g., Projectile Pistol)" },
	{ text: "Att.", tooltip: "Attack Damage per Shot" },
	{ text: "Rng.", tooltip: "Range (maximum tiles)" },
	{ text: "Fr.Rt.", tooltip: "Fire Rate (turns per attack)" },
	{ text: "Rel.", tooltip: "Reload Time (turns)" },
	{ text: "Acc.", tooltip: "Accuracy (base hit chance)" },
	{ text: "Ammo", tooltip: "Maximum Ammo Capacity" },
];
wheaderList.forEach((h) => {
	let _wheader = _wrow.insertCell(wcounter1);
	if (h.text != "Description") {
		_wheader.outerHTML = "<th title='"+h.tooltip+"' class='order'>" + h.text + "</th>";
	} else {
		_wheader.outerHTML = "<th>" + h.text + "</th>";
	}
	wcounter1++;
});
for (var i of Object.keys(_importedItems_weapons)) {
	let counter = 0;
	let row = weaponstable.insertRow();
	let _name = row.insertCell(counter);
	_name.innerHTML = _importedItems_weapons[i].name;
	counter++;
	let _icon = row.insertCell(counter);
	let iconSrc = importedIcons[_importedItems_weapons[i].icon];
	var canvas = document.createElement("canvas");
	canvas.width = 32;
	canvas.height = 32;
	const ctx = canvas.getContext("2d");
	var img = document.createElement("img");
	img.src = iconSrc.tileset.replace("./", "../");
	img.addEventListener("load", (e) => {
		ctx.drawImage(
			img,
			iconSrc.tcoords[0][0] * 32,
			iconSrc.tcoords[0][1] * 32,
			32,
			32,
			0,
			0,
			32,
			32
		);
	});
	_icon.appendChild(canvas);
	counter++;
	let _desc = row.insertCell(counter);
	_desc.innerHTML = _importedItems_weapons[i].desc;
	counter++;
	let _type = row.insertCell(counter);
	_type.innerHTML = _importedItems_weapons[i].itemtype.split(" ")[0]+" "+_importedItems_weapons[i].itemtype.split(" ")[1];
	counter++;
	for (var j of [
		"attack",
		"range",
		"delay",
		"reload",
		"accuracy",
		"max_ammo",
	]) {
		let _stat = row.insertCell(counter);
		_stat.innerHTML = _importedItems_weapons[i].stats[j];
		counter++;
	}
}

//table sorter
function table_sort() {
	const styleSheet = document.createElement("style");
	styleSheet.innerHTML = `
		  .order-inactive span {
			  visibility:hidden;
		  }
		  .order-inactive:hover span {
			  visibility:visible;
		  }
		  .order-active span {
			  visibility: visible;
		  }
	  `;
	document.head.appendChild(styleSheet);

	document.querySelectorAll("th.order").forEach((th_elem) => {
		let asc = true;
		const span_elem = document.createElement("span");
		span_elem.style = "font-size:0.8rem; margin-left:0.5rem";
		span_elem.innerHTML = "▼";
		th_elem.appendChild(span_elem);
		th_elem.classList.add("order-inactive");

		const index = Array.from(th_elem.parentNode.children).indexOf(th_elem);
		th_elem.addEventListener("click", (e) => {
			document.querySelectorAll("th.order").forEach((elem) => {
				elem.classList.remove("order-active");
				elem.classList.add("order-inactive");
			});
			th_elem.classList.remove("order-inactive");
			th_elem.classList.add("order-active");

			if (!asc) {
				th_elem.querySelector("span").innerHTML = "▲";
			} else {
				th_elem.querySelector("span").innerHTML = "▼";
			}
			const arr = Array.from(
				th_elem.closest("table").querySelectorAll("tbody tr")
			).slice(1);
			arr.sort((a, b) => {
				const a_val = a.children[index].innerText;
				const b_val = b.children[index].innerText;
				return asc ? a_val.localeCompare(b_val) : b_val.localeCompare(a_val);
			});
			arr.forEach((elem) => {
				th_elem.closest("table").querySelector("tbody").appendChild(elem);
			});
			asc = !asc;
		});
	});
}

table_sort();
//
