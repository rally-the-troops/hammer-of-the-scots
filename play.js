"use strict";

const ENGLAND = "England";
const SCOTLAND = "Scotland";
const ENEMY = { Scotland: "England", England: "Scotland" }
const ENGLAND_BAG = "E. Bag";
const SCOTLAND_BAG = "S. Bag";

const NOBLES = [
	"Angus", "Argyll", "Atholl", "Bruce", "Buchan", "Comyn", "Dunbar",
	"Galloway", "Lennox", "Mar", "Mentieth", "Ross", "Steward"
];

let block_style = window.localStorage['hammer-of-the-scots/block-style'] || 'oldblocks';
document.querySelector("body").classList.remove("oldblocks");
document.querySelector("body").classList.remove("newblocks");
document.querySelector("body").classList.add(block_style);

function old_block_style() {
	block_style = 'oldblocks';
	document.querySelector("body").classList.remove("oldblocks");
	document.querySelector("body").classList.remove("newblocks");
	document.querySelector("body").classList.add(block_style);
	window.localStorage['hammer-of-the-scots/block-style'] = block_style;
	update_map();
}

function new_block_style() {
	block_style = 'newblocks';
	document.querySelector("body").classList.remove("oldblocks");
	document.querySelector("body").classList.remove("newblocks");
	document.querySelector("body").classList.add(block_style);
	window.localStorage['hammer-of-the-scots/block-style'] = block_style;
	update_map();
}

function toggle_blocks() {
	document.getElementById("map").classList.toggle("hide_blocks");
}

let ui = {
	cards: {},
	card_backs: {},
	areas: {},
	blocks: {},
	battle_menu: {},
	battle_block: {},
	present: new Set(),
}

function on_log(text) {
	let p = document.createElement("div");
	text = text.replace(/&/g, "&amp;");
	text = text.replace(/</g, "&lt;");
	text = text.replace(/>/g, "&gt;");

	text = text.replace(/\u2192 /g, "\u2192\xa0");

	text = text.replace(/^([A-Z]):/, '<span class="$1"> $1 </span>');

	if (text.match(/^Scenario: /))
		p.className = 'st', text = text.substring(10);
	else if (text.match(/^~ .* ~$/))
		p.className = 'br', text = text.substring(2, text.length-2);
	else if (text.match(/^Start England turn/))
		p.className = 'E';
	else if (text.match(/^Start Scotland turn/))
		p.className = 'S';
	else if (text.match(/^Start /))
		p.className = 'st', text = text.replace(/\.$/, "");
	else if (text.match(/^(Battle in|Defection battle in)/))
		p.className = 'bs';
	else if (text.match(/^.h1 /)) {
		p.className = 'st', text = text.substring(4);
	}
	else if (text.match(/^.turn England/)) {
		p.className = 'E', text = text.substring(6);
	}
	else if (text.match(/^.turn Scotland/)) {
		p.className = 'S', text = text.substring(6);
	}

	if (text.match(/^Start /))
		text = text.substring(6);

	p.innerHTML = text;
	return p;
}

function on_focus_area(evt) {
	let where = evt.target.area;
	document.getElementById("status").textContent = where;
}

function on_blur_area(evt) {
	document.getElementById("status").textContent = "";
}

function on_click_area(evt) {
	let where = evt.target.area;
	send_action('area', where);
}

const STEP_TEXT = [ 0, "I", "II", "III", "IIII" ];

function block_name(who) {
	if (who === "Edward")
		return view.edward === 1 ? "Edward I" : "Edward II";
	if (who === "King")
		return "Scottish King";
	return BLOCKS[who].name;
}

function is_known_block(b) {
	if (view.game_over && player === 'Observer')
		return true;
	return BLOCKS[b].owner === player;
}

function on_focus_map_block(evt) {
	let b = evt.target.block;
	let text;
	if (is_known_block(b)) {
		let s = BLOCKS[b].steps;
		text = block_name(b);
		text += " " + BLOCKS[b].move + "-" + STEP_TEXT[s] + "-" + BLOCKS[b].combat;
		if (BLOCKS[b].mortal)
			text += ' \u271d';
	} else {
		text = (BLOCKS[b].owner === ENGLAND) ? "English" : "Scottish";
	}
	document.getElementById("status").textContent = text;
}

function on_blur_map_block(evt) {
	document.getElementById("status").textContent = "";
}

function on_click_map_block(evt) {
	let b = evt.target.block;
	if (!view.battle)
		send_action('block', b);
}

function is_battle_reserve(who, list) {
	for (let [b, s, m] of list)
		if (who === b)
			return true;
	return false;
}

function on_focus_battle_block(evt) {
	let b = evt.target.block;
	let msg = block_name(b);
	if (is_battle_reserve(b, view.battle.ER))
		msg = "English Reserve";
	if (is_battle_reserve(b, view.battle.SR))
		msg = "Scottish Reserve";
	if (view.actions && view.actions.battle_fire && view.actions.battle_fire.includes(b))
		msg = "Fire with " + msg;
	if (view.actions && view.actions.battle_hit && view.actions.battle_hit.includes(b))
		msg = "Take hit on " + msg;
	document.getElementById("status").textContent = msg;
}

function on_blur_battle_block(evt) {
	document.getElementById("status").textContent = "";
}

function on_click_battle_block(evt) {
	let b = evt.target.block;
	send_action('block', b);
}

function on_focus_battle_fire(evt) {
	document.getElementById("status").textContent =
		"Fire with " + block_name(evt.target.block);
}

function on_focus_battle_retreat(evt) {
	document.getElementById("status").textContent =
		"Retreat with " + block_name(evt.target.block);
}

function on_focus_battle_pass(evt) {
	document.getElementById("status").textContent =
		"Pass with " + block_name(evt.target.block);
}

function on_focus_battle_hit(evt) {
	document.getElementById("status").textContent =
		"Take hit on " + block_name(evt.target.block);
}

function on_blur_battle_button(evt) {
	document.getElementById("status").textContent = "";
}

function on_click_battle_hit(evt) { send_action('battle_hit', evt.target.block); }
function on_click_battle_fire(evt) { send_action('battle_fire', evt.target.block); }
function on_click_battle_retreat(evt) { send_action('battle_retreat', evt.target.block); }

function on_click_battle_pass(evt) {
	if (window.confirm("Are you sure that you want to PASS with " + block_name(evt.target.block) + "?"))
		send_action('battle_pass', evt.target.block);
}

function on_click_card(evt) {
	let c = evt.target.id.split("+")[1] | 0;
	send_action('play', c);
}

function on_herald(noble) {
	send_action('noble', noble);
}

function build_battle_button(menu, b, c, click, enter, img_src) {
	let img = new Image();
	img.draggable = false;
	img.classList.add("action");
	img.classList.add(c);
	img.setAttribute("src", img_src);
	img.addEventListener("click", click);
	img.addEventListener("mouseenter", enter);
	img.addEventListener("mouseleave", on_blur_battle_button);
	img.block = b;
	menu.appendChild(img);
}

function build_battle_block(b, block) {
	let element = document.createElement("div");
	element.classList.add("block");
	element.classList.add("known");
	element.classList.add(BLOCKS[b].owner);
	element.classList.add("block_" + block.image);
	element.addEventListener("mouseenter", on_focus_battle_block);
	element.addEventListener("mouseleave", on_blur_battle_block);
	element.addEventListener("click", on_click_battle_block);
	element.block = b;
	ui.battle_block[b] = element;

	let menu_list = document.createElement("div");
	menu_list.classList.add("battle_menu_list");
	build_battle_button(menu_list, b, "hit",
		on_click_battle_hit, on_focus_battle_hit,
		"/images/cross-mark.svg");
	build_battle_button(menu_list, b, "fire",
		on_click_battle_fire, on_focus_battle_fire,
		"/images/pointy-sword.svg");
	build_battle_button(menu_list, b, "retreat",
		on_click_battle_retreat, on_focus_battle_retreat,
		"/images/flying-flag.svg");
	build_battle_button(menu_list, b, "pass",
		on_click_battle_pass, on_focus_battle_pass,
		"/images/sands-of-time.svg");

	let menu = document.createElement("div");
	menu.classList.add("battle_menu");
	menu.appendChild(element);
	menu.appendChild(menu_list);
	menu.block = b;
	ui.battle_menu[b] = menu;
}

function build_map_block(b, block) {
	let element = document.createElement("div");
	element.classList.add("block");
	element.classList.add("known");
	element.classList.add(BLOCKS[b].owner);
	element.classList.add("block_" + block.image);
	element.addEventListener("mouseenter", on_focus_map_block);
	element.addEventListener("mouseleave", on_blur_map_block);
	element.addEventListener("click", on_click_map_block);
	element.block = b;
	ui.blocks[b] = element;
}

function build_map() {
	let svgmap = document.getElementById("svgmap");

	ui.blocks_element = document.getElementById("blocks");
	ui.offmap_element = document.getElementById("offmap");

	for (let c = 1; c <= 25; ++c) {
		ui.cards[c] = document.getElementById("card+"+c);
		ui.cards[c].addEventListener("click", on_click_card);
	}

	for (let c = 1; c <= 5; ++c)
		ui.card_backs[c] = document.getElementById("back+"+c);

	for (let name in AREAS) {
		let area = AREAS[name];
		let element = svgmap.getElementById("area+"+name);
		if (element) {
			element.area = name;
			element.addEventListener("mouseenter", on_focus_area);
			element.addEventListener("mouseleave", on_blur_area);
			element.addEventListener("click", on_click_area);
			ui.areas[name] = element;
		}
	}

	for (let b in BLOCKS) {
		let block = BLOCKS[b];
		build_battle_block(b, block);
		build_map_block(b, block);
	}
}

build_map();

function update_steps(b, steps, element) {
        element.classList.remove("r1");
        element.classList.remove("r2");
        element.classList.remove("r3");
	element.classList.add("r"+(BLOCKS[b].steps - steps));
}

function layout_blocks(location, north, south) {
	let wrap = 4;
	let s = north.length;
	let k = south.length;
	let n = s + k;
	let row, rows = [];
	let i = 0;

	switch (location) {
	case ENGLAND_BAG:
	case SCOTLAND_BAG:
		wrap = 28;
		break;
	case "Selkirk":
	case "Lothian":
	case "Dunbar":
	case "Lanark":
	case "Lennox":
	case "Argyll":
	case "Garmoran":
	case "Mentieth":
		wrap = 3;
		break;
	case "England":
		wrap = 5;
	}

	function new_line() {
		rows.push(row = []);
		i = 0;
	}

	new_line();

	while (north.length > 0) {
		if (i === wrap)
			new_line();
		row.push(north.shift());
		++i;
	}

	// Break early if north and south fit in exactly two rows
	if (s > 0 && s <= wrap && k > 0 && k <= wrap)
		new_line();

	while (south.length > 0) {
		if (i === wrap)
			new_line();
		row.push(south.shift());
		++i;
	}

	for (let j = 0; j < rows.length; ++j)
		for (i = 0; i < rows[j].length; ++i)
			position_block(location, j, rows.length, i, rows[j].length, rows[j][i]);
}

function position_block(location, row, n_rows, col, n_cols, element) {
	let area = AREAS[location];
	let block_size = 60+6;
	let padding = 4;
	let offset = block_size + padding;
	let row_size = (n_rows-1) * offset;
	let col_size = (n_cols-1) * offset;
	let x = area.x - block_size/2;
	let y = area.y - block_size/2;

	let layout_major = 0.5;
	let layout_minor = 0.5;
	switch (location) {
	case ENGLAND_BAG:
	case SCOTLAND_BAG:
		layout_major = 0;
		layout_minor = 0;
		break;
	case ENGLAND:
		layout_major = 1;
		layout_minor = 1;
		break;
	case "Argyll":
		layout_major = 0.5;
		layout_minor = 1.0;
		break;
	case "Carrick":
		layout_major = 0.75;
		layout_minor = 0.5;
		break;
	case "Dunbar":
		layout_major = 0.25;
		layout_minor = 0.75;
		break;
	case "Fife":
		layout_major = 0.25;
		layout_minor = 0.5;
		break;
	case "Lennox":
		layout_major = 0.75;
		layout_minor = 0.75;
		break;
	case "Mentieth":
		layout_major = 0.5;
		layout_minor = 0.25;
		break;
	}

	x -= col_size * layout_major;
	y -= row_size * layout_minor;

	x += col * offset;
	y += row * offset;

	element.style.left = (x|0)+"px";
	element.style.top = (y|0)+"px";
}

function show_block(element) {
	if (element.parentElement !== ui.blocks_element)
		ui.blocks_element.appendChild(element);
}

function hide_block(element) {
	if (element.parentElement !== ui.offmap_element)
		ui.offmap_element.appendChild(element);
}

function update_map() {
	let overflow = { England: [], Scotland: [] };
	let layout = {};

	document.getElementById("turn").setAttribute("class", "turn year_" + view.year);

	for (let area in AREAS)
		layout[area] = { north: [], south: [] };

	for (let b in view.location) {
		let info = BLOCKS[b];
		let element = ui.blocks[b];
		let area = view.location[b];
		if (area in AREAS) {
			let moved = view.moved[b] ? " moved" : "";
			if (is_known_block(b)) {
				let image = " block_" + info.image;
				let steps = " r" + (info.steps - view.steps[b]);
				let known = " known";
				element.classList = info.owner + known + " block" + image + steps + moved;
			} else {
				element.classList = info.owner + " block" + moved;
			}
			if (info.owner === SCOTLAND)
				layout[area].north.push(element);
			else
				layout[area].south.push(element);
			show_block(element);
		} else {
			hide_block(element);
		}
	}

	for (let area in AREAS)
		layout_blocks(area, layout[area].north, layout[area].south);

	// Mark selections and highlights

	for (let where in AREAS) {
		if (ui.areas[where]) {
			ui.areas[where].classList.remove('highlight');
			ui.areas[where].classList.remove('where');
		}
	}
	if (view.actions && view.actions.area)
		for (let where of view.actions.area)
			ui.areas[where].classList.add('highlight');
	if (view.where)
		ui.areas[view.where].classList.add('where');

	for (let b in BLOCKS) {
		ui.blocks[b].classList.remove('highlight');
		ui.blocks[b].classList.remove('selected');
	}
	if (!view.battle) {
		if (view.actions && view.actions.block)
			for (let b of view.actions.block)
				ui.blocks[b].classList.add('highlight');
		if (view.who)
			ui.blocks[view.who].classList.add('selected');
	}
}

function update_cards() {
	let cards = view.hand;
	for (let c = 1; c <= 25; ++c) {
		ui.cards[c].classList.remove('enabled');
		if (cards && cards.includes(c))
			ui.cards[c].classList.add('show');
		else
			ui.cards[c].classList.remove('show');
	}

	let n = view.hand.length;
	for (let c = 1; c <= 5; ++c)
		if (c <= n && player === 'Observer')
			ui.card_backs[c].classList.add("show");
		else
			ui.card_backs[c].classList.remove("show");

	if (view.actions && view.actions.play) {
		for (let c of view.actions.play)
			ui.cards[c].classList.add('enabled');
	}

	if (!view.e_card)
		document.getElementById("england_card").className = "show card card_back";
	else
		document.getElementById("england_card").className = "show card " + CARDS[view.e_card].image;
	if (!view.s_card)
		document.getElementById("scotland_card").className = "show card card_back";
	else
		document.getElementById("scotland_card").className = "show card " + CARDS[view.s_card].image;
}

function compare_blocks(a, b) {
	let aa = BLOCKS[a].combat;
	let bb = BLOCKS[b].combat;
	if (aa === bb)
		return (a < b) ? -1 : (a > b) ? 1 : 0;
	return (aa < bb) ? -1 : (aa > bb) ? 1 : 0;
}

function insert_battle_block(root, node, block) {
	for (let i = 0; i < root.children.length; ++i) {
		let prev = root.children[i];
		if (compare_blocks(prev.block, block) > 0) {
			root.insertBefore(node, prev);
			return;
		}
	}
	root.appendChild(node);
}

function update_battle() {
	function fill_cell(name, list, reserve) {
		let cell = window[name];

		ui.present.clear();

		for (let block of list) {
			ui.present.add(block);

			if (!cell.contains(ui.battle_menu[block]))
				insert_battle_block(cell, ui.battle_menu[block], block);

			if (block === view.who)
				ui.battle_block[block].classList.add("selected");
			else
				ui.battle_block[block].classList.remove("selected");

			ui.battle_block[block].classList.remove("highlight");
			ui.battle_menu[block].classList.remove('hit');
			ui.battle_menu[block].classList.remove('fire');
			ui.battle_menu[block].classList.remove('retreat');
			ui.battle_menu[block].classList.remove('pass');

			if (view.actions && view.actions.block && view.actions.block.includes(block))
				ui.battle_block[block].classList.add("highlight");
			if (view.actions && view.actions.battle_fire && view.actions.battle_fire.includes(block))
				ui.battle_menu[block].classList.add('fire');
			if (view.actions && view.actions.battle_retreat && view.actions.battle_retreat.includes(block))
				ui.battle_menu[block].classList.add('retreat');
			if (view.actions && view.actions.battle_pass && view.actions.battle_pass.includes(block))
				ui.battle_menu[block].classList.add('pass');
			if (view.actions && view.actions.battle_hit && view.actions.battle_hit.includes(block))
				ui.battle_menu[block].classList.add('hit');

			update_steps(block, view.steps[block], ui.battle_block[block]);
			if (reserve)
				ui.battle_block[block].classList.add("secret");
			else
				ui.battle_block[block].classList.remove("secret");
			if (view.moved[block])
				ui.battle_block[block].classList.add("moved");
			else
				ui.battle_block[block].classList.remove("moved");
			if (reserve)
				ui.battle_block[block].classList.remove("known");
			else
				ui.battle_block[block].classList.add("known");
		}

		for (let b in BLOCKS) {
			if (!ui.present.has(b)) {
				if (cell.contains(ui.battle_menu[b]))
					cell.removeChild(ui.battle_menu[b]);
			}
		}
	}

	if (player === ENGLAND) {
		fill_cell("FR", view.battle.ER, true);
		fill_cell("FF", view.battle.EF, false);
		fill_cell("EF", view.battle.SF, false);
		fill_cell("ER", view.battle.SR, true);
	} else {
		fill_cell("ER", view.battle.ER, true);
		fill_cell("EF", view.battle.EF, false);
		fill_cell("FF", view.battle.SF, false);
		fill_cell("FR", view.battle.SR, true);
	}
}

function on_update() {
	action_button("crown_bruce", "Crown Bruce");
	action_button("crown_comyn", "Crown Comyn");
	action_button("return_of_the_king", "Return of the King");
	action_button("play_event", "Play event");
	action_button("winter", "Winter");
	action_button("eliminate", "Eliminate");
	action_button("disband", "Disband");
	action_button("end_move_phase", "End move phase");
	action_button("end_regroup", "End regroup");
	action_button("end_retreat", "End retreat");
	action_button("end_disbanding", "End disbanding");
	action_button("end_builds", "End builds");
	action_button("end_pillage", "End pillage");
	action_button("pass", "Pass");
	action_button("undo", "Undo");

	document.getElementById("england_vp").textContent = view.e_vp;
	document.getElementById("scotland_vp").textContent = view.s_vp;
	document.getElementById("turn_info").textContent = `Turn ${view.turn} of Year ${view.year}`;

	update_cards();
	update_map();

	if (view.actions && view.actions.noble) {
		document.getElementById("herald").classList.add("show");
		for (let noble of NOBLES) {
			let element = document.getElementById("herald+" + noble);
			if (view.actions.noble.includes(noble))
				element.classList.add("show");
			else
				element.classList.remove("show");
		}
	} else {
		document.getElementById("herald").classList.remove("show");
	}

	if (view.battle) {
		document.getElementById("battle_header").textContent = view.battle.title;
		document.getElementById("battle_message").textContent = view.battle.flash;
		document.getElementById("battle").classList.add("show");
		update_battle();
	} else {
		document.getElementById("battle").classList.remove("show");
	}
}

drag_element_with_mouse("#battle", "#battle_header");
drag_element_with_mouse("#herald", "#herald_header");
scroll_with_middle_mouse("main", 2);
