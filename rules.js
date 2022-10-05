"use strict"

exports.scenarios = [
	"Braveheart",
	"The Bruce",
	"Campaign",
]

exports.roles = [
	"England",
	"Scotland",
]

const { CARDS, BLOCKS, AREAS, BORDERS, block_index, area_index } = require('./data')

const block_count = BLOCKS.length
const area_count = AREAS.length
const first_map_area = 3

const ENEMY = { Scotland: "England", England: "Scotland" }

const OBSERVER = "Observer"
const BOTH = "Both"
const ENGLAND = "England"
const SCOTLAND = "Scotland"

const NOWHERE = 0
const E_BAG = area_index["E. Bag"]
const S_BAG = area_index["S. Bag"]

const AREA_ENGLAND = area_index["England"]
const AREA_ROSS = area_index["Ross"]
const AREA_GARMORAN = area_index["Garmoran"]
const AREA_MORAY = area_index["Moray"]
const AREA_STRATHSPEY = area_index["Strathspey"]
const AREA_BUCHAN = area_index["Buchan"]
const AREA_LOCHABER = area_index["Lochaber"]
const AREA_BADENOCH = area_index["Badenoch"]
const AREA_MAR = area_index["Mar"]
const AREA_ANGUS = area_index["Angus"]
const AREA_ARGYLL = area_index["Argyll"]
const AREA_ATHOLL = area_index["Atholl"]
const AREA_LENNOX = area_index["Lennox"]
const AREA_MENTIETH = area_index["Mentieth"]
const AREA_FIFE = area_index["Fife"]
const AREA_CARRICK = area_index["Carrick"]
const AREA_LANARK = area_index["Lanark"]
const AREA_LOTHIAN = area_index["Lothian"]
const AREA_SELKIRK = area_index["Selkirk"]
const AREA_DUNBAR = area_index["Dunbar"]
const AREA_GALLOWAY = area_index["Galloway"]
const AREA_ANNAN = area_index["Annan"]
const AREA_TEVIOT = area_index["Teviot"]

const NOBODY = -1
const B_EDWARD = block_index["Edward"]
const B_KING = block_index["King"]
const B_MORAY = block_index["Moray"]
const B_WALLACE = block_index["Wallace"]
const B_NORSE = block_index["Norse"]
const B_FRENCH_KNIGHTS = block_index["French Knights"]
const B_BRUCE_E = block_index["Bruce/E"]
const B_BRUCE_S = block_index["Bruce/S"]
const B_COMYN_E = block_index["Comyn/E"]
const B_COMYN_S = block_index["Comyn/S"]

const ENGLISH_NOBLES = {
	"Angus": block_index["Angus/E"],
	"Argyll": block_index["Argyll/E"],
	"Atholl": block_index["Atholl/E"],
	"Bruce": block_index["Bruce/E"],
	"Buchan": block_index["Buchan/E"],
	"Comyn": block_index["Comyn/E"],
	"Dunbar": block_index["Dunbar/E"],
	"Galloway": block_index["Galloway/E"],
	"Lennox": block_index["Lennox/E"],
	"Mar": block_index["Mar/E"],
	"Mentieth": block_index["Mentieth/E"],
	"Ross": block_index["Ross/E"],
	"Steward": block_index["Steward/E"],
}

const SCOTTISH_NOBLES = {
	"Angus": block_index["Angus/S"],
	"Argyll": block_index["Argyll/S"],
	"Atholl": block_index["Atholl/S"],
	"Bruce": block_index["Bruce/S"],
	"Buchan": block_index["Buchan/S"],
	"Comyn": block_index["Comyn/S"],
	"Dunbar": block_index["Dunbar/S"],
	"Galloway": block_index["Galloway/S"],
	"Lennox": block_index["Lennox/S"],
	"Mar": block_index["Mar/S"],
	"Mentieth": block_index["Mentieth/S"],
	"Ross": block_index["Ross/S"],
	"Steward": block_index["Steward/S"],
}

// serif cirled numbers
const DIE_HIT = [ 0, '\u2776', '\u2777', '\u2778', '\u2779', '\u277A', '\u277B' ]
const DIE_MISS = [ 0, '\u2460', '\u2461', '\u2462', '\u2463', '\u2464', '\u2465' ]

const ATTACK_MARK = "*"
const RESERVE_MARK = ""

let states = {}

let game = null

function random(n) {
	if (game.rng === 1)
		return Math.floor(((game.seed = game.seed * 48271 % 0x7fffffff) / 0x7fffffff) * n)
	return (game.seed = game.seed * 200105 % 34359738337) % n
}

function log(s) {
	game.log.push(s)
}

function logi(s) {
	game.log.push(">" + s)
}

function log_battle(s) {
	game.log.push(game.active[0] + ": " + s)
}

function print_turn_log_no_count(text) {
	log(text)
	if (game.turn_log.length > 0) {
		game.turn_log.sort()
		for (let entry of game.turn_log)
			logi(entry.join(" \u2192 "))
	} else {
		logi("nothing.")
	}
	delete game.turn_log
}


function print_turn_log_no_active(text) {
	game.turn_log.sort()
	log(text)
	let last = game.turn_log[0]
	let n = 0
	for (let entry of game.turn_log) {
		if (entry.toString() !== last.toString()) {
			logi(n + " " + last.join(" \u2192 "))
			n = 0
		}
		++n
		last = entry
	}
	if (n > 0)
		logi(n + " " + last.join(" \u2192 "))
	else
		logi("nothing.")
	delete game.turn_log
}

function print_turn_log(verb) {
	print_turn_log_no_active(game.active + " " + verb + ":")
}

function is_inactive_player(current) {
	return current === OBSERVER || (game.active !== current && game.active !== BOTH)
}

function remove_from_array(array, item) {
	let i = array.indexOf(item)
	if (i >= 0)
		array.splice(i, 1)
}

function gen_action_undo(view) {
	if (!view.actions)
		view.actions = {}
	if (game.undo && game.undo.length > 0)
		view.actions.undo = 1
	else
		view.actions.undo = 0
}

function gen_action(view, action, argument) {
	if (!view.actions)
		view.actions = {}
	if (argument !== undefined) {
		if (!(action in view.actions))
			view.actions[action] = [ argument ]
		else
			view.actions[action].push(argument)
	} else {
		view.actions[action] = 1
	}
}

function gen_action_battle(view, action, b) {
	gen_action(view, action, b)
}

function gen_action_block(view, b) {
	gen_action(view, 'block', b)
}

function gen_action_area(view, a) {
	gen_action(view, 'area', a)
}

function roll_d6() {
	return random(6) + 1
}

function shuffle_deck() {
	let deck = []
	for (let c = 1; c <= 25; ++c)
		deck.push(c)
	return deck
}

function deal_cards(deck, n) {
	let hand = []
	for (let i = 0; i < n; ++i) {
		let k = random(deck.length)
		hand.push(deck[k])
		deck.splice(k, 1)
	}
	return hand
}

function area_name(where) {
	return AREAS[where].name
}

function area_tag(where) {
	return "#" + where
}

function block_name(who) {
	if (who === B_EDWARD)
		return game.edward === 1 ? "Edward I" : "Edward II"
	if (who === B_KING)
		return "Scottish King"
	return BLOCKS[who].name
}

function block_owner(who) {
	return BLOCKS[who].owner
}

function block_type(who) {
	return BLOCKS[who].type
}

function block_move(who) {
	return BLOCKS[who].move
}

function block_max_steps(who) {
	return BLOCKS[who].steps
}

function block_is_mortal(who) {
	return BLOCKS[who].mortal
}

function block_initiative(who) {
	return BLOCKS[who].initiative
}

function block_printed_fire_power(who) {
	return BLOCKS[who].fire_power
}

function block_fire_power(who, where) {
	let area = AREAS[where]
	let combat = block_printed_fire_power(who)
	if (is_defender(who)) {
		if (block_type(who) === 'nobles' && area.home === block_name(who))
			++combat
		else if (who === B_MORAY && where === AREA_MORAY)
			++combat
	}
	return combat
}

function is_coastal_area(where) {
	return AREAS[where].coastal
}

function is_cathedral_area(where) {
	return AREAS[where].cathedral
}

function is_friendly_coastal_area(where) {
	return is_coastal_area(where) && is_friendly_area(where)
}

function is_in_friendly_coastal_area(who) {
	let where = game.location[who]
	if (where && where !== E_BAG && where !== S_BAG)
		return is_friendly_coastal_area(where)
	return false
}

function is_on_map(who) {
	let where = game.location[who]
	if (where !== NOWHERE && where !== E_BAG && where !== S_BAG)
		return true
	return false
}

function count_blocks_in_area(where) {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === where)
			++count
	return count
}

function count_blocks_in_area_excluding(where, exc) {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === where && !exc.includes(b))
			++count
	return count
}

function castle_limit(where) {
	if (game.active === SCOTLAND && is_cathedral_area(where))
		return AREAS[where].limit + 1
	return AREAS[where].limit
}

function is_within_castle_limit(where) {
	return count_blocks_in_area(where) <= castle_limit(where)
}

function is_under_castle_limit(where) {
	return count_blocks_in_area(where) < castle_limit(where)
}

function count_english_nobles() {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (block_owner(b) === ENGLAND && block_type(b) === 'nobles')
			if (is_on_map(b))
				++count
	return count
}

function count_scottish_nobles() {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (block_owner(b) === SCOTLAND && block_type(b) === 'nobles')
			if (is_on_map(b))
				++count
	if (is_on_map(B_MORAY))
		++count
	return count
}

function find_noble(owner, name) {
	if (owner === ENGLAND)
		return ENGLISH_NOBLES[name]
	return SCOTTISH_NOBLES[name]
}

function border_id(a, b) {
	return (a < b) ? a * 100 + b : b * 100 + a
}

function border_was_last_used_by_enemy(from, to) {
	return game.last_used[border_id(from, to)] === ENEMY[game.active]
}

function border_type(a, b) {
	return BORDERS[border_id(a,b)]
}

function border_limit(a, b) {
	return game.border_limit[border_id(a,b)] || 0
}

function reset_border_limits() {
	game.border_limit = {}
}

function count_friendly(where) {
	let p = game.active
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === where && block_owner(b) === p)
			++count
	return count
}

function count_enemy(where) {
	let p = ENEMY[game.active]
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === where && block_owner(b) === p)
			++count
	return count
}

function is_friendly_area(where) { return count_friendly(where) > 0 && count_enemy(where) === 0 }
function is_enemy_area(where) { return count_friendly(where) === 0 && count_enemy(where) > 0 }
function is_neutral_area(where) { return count_friendly(where) === 0 && count_enemy(where) === 0 }
function is_contested_area(where) { return count_friendly(where) > 0 && count_enemy(where) > 0 }
function is_friendly_or_neutral_area(where) { return is_friendly_area(where) || is_neutral_area(where) }

function have_contested_areas() {
	for (let where = first_map_area; where < area_count; ++where)
		if (is_contested_area(where))
			return true
	return false
}

function count_pinning(where) {
	return count_enemy(where)
}

function count_pinned(where) {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === where && block_owner(b) === game.active)
			if (!set_has(game.reserves, b))
				++count
	return count
}

function is_pinned(from) {
	if (game.active === game.p2) {
		if (count_pinned(from) <= count_pinning(from))
			return true
	}
	return false
}

function can_block_use_border(who, from, to) {
	if (border_type(from, to) === 'major')
		return border_limit(from, to) < 6
	return border_limit(from, to) < 2
}

function can_block_move_to(who, from, to) {
	// No group moves across Anglo-Scottish border
	if (from === AREA_ENGLAND || to === AREA_ENGLAND)
		if (game.moves === 0)
			return false
	if (game.active === SCOTLAND && game.truce === SCOTLAND && to === AREA_ENGLAND)
		return false
	if (can_block_use_border(who, from, to)) {
		if (count_pinning(from) > 0) {
			if (border_was_last_used_by_enemy(from, to))
				return false
		}
		if (game.truce === game.active && is_enemy_area(to))
			return false
		return true
	}
	return false
}

function can_block_move(who) {
	if (who === B_NORSE)
		return false
	if (block_owner(who) === game.active && !set_has(game.moved, who)) {
		let from = game.location[who]
		if (from) {
			if (is_pinned(from))
				return false
			for (let to of AREAS[from].exits)
				if (can_block_move_to(who, from, to))
					return true
		}
	}
	return false
}

function can_block_continue(who, from, here) {
	if (here === AREA_ENGLAND)
		return false
	if (is_contested_area(here))
		return false
	if (border_type(from, here) === 'minor')
		return false
	if (game.distance >= block_move(who))
		return false
	for (let to of AREAS[here].exits)
		if (to !== game.last_from && can_block_move_to(who, here, to))
			return true
	return false
}

function can_block_retreat_to(who, to) {
	if (is_friendly_area(to) || is_neutral_area(to)) {
		let from = game.location[who]
		if (block_owner(who) === ENGLAND && from === AREA_ENGLAND)
			return false
		if (block_owner(who) === SCOTLAND && to === AREA_ENGLAND)
			return false
		if (can_block_use_border(who, from, to)) {
			if (border_was_last_used_by_enemy(from, to))
				return false
			return true
		}
	}
	return false
}

function can_block_retreat(who) {
	if (block_owner(who) === game.active) {
		if (who === B_NORSE)
			return true
		let from = game.location[who]
		for (let to of AREAS[from].exits)
			if (can_block_retreat_to(who, to))
				return true
	}
	return false
}

function can_block_regroup_to(who, to) {
	if (is_friendly_area(to) || is_neutral_area(to)) {
		let from = game.location[who]
		if (block_owner(who) === ENGLAND && from === AREA_ENGLAND)
			return false
		if (block_owner(who) === SCOTLAND && to === AREA_ENGLAND)
			return false
		if (can_block_use_border(who, from, to))
			return true
	}
	return false
}

function can_block_regroup(who) {
	if (block_owner(who) === game.active) {
		let from = game.location[who]
		for (let to of AREAS[from].exits)
			if (can_block_regroup_to(who, to))
				return true
	}
	return false
}

function is_battle_reserve(b) {
	return set_has(game.reserves, b)
}

function is_attacker(b) {
	if (game.location[b] === game.where && block_owner(b) === game.attacker[game.where])
		return !set_has(game.reserves, b)
	return false
}

function is_defender(b) {
	if (game.location[b] === game.where && block_owner(b) !== game.attacker[game.where])
		return !set_has(game.reserves, b)
	return false
}

function swap_blocks(old) {
	let bo = ENEMY[block_owner(old)]
	let b = find_noble(bo, block_name(old))
	game.location[b] = game.location[old]
	game.steps[b] = game.steps[old]
	game.location[old] = NOWHERE
	game.steps[old] = block_max_steps(old)
	return b
}

function disband(who) {
	game.location[who] = block_owner(who) === ENGLAND ? E_BAG : S_BAG
	game.steps[who] = block_max_steps(who)
}

function eliminate_block(who, reason) {
	if (block_type(who) === 'nobles') {
		if (reason === 'retreat') {
			game.turn_log.push([area_tag(game.location[who]), "Captured"])
		} else if (reason === 'combat') {
			game.flash = block_name(who) + " was captured."
			log(block_name(who) + " was captured.")
		} else {
			log(block_name(who) + " was captured.")
		}
	} else {
		if (reason === 'retreat') {
			game.turn_log.push([area_tag(game.location[who]), "Eliminated"])
		} else if (reason === 'combat') {
			game.flash = block_name(who) + " was eliminated."
			log(block_name(who) + " was eliminated.")
		} else {
			if (block_owner(who) === ENGLAND)
				log("English block was eliminated.")
			else
				log("Scottish block was eliminated.")
		}
	}

	// TODO: clean up and check all combinations
	if (who === B_EDWARD) {
		if (reason === 'combat' || reason === 'retreat') {
			if (game.edward === 1) {
				game.edward = 2
				disband(who)
			} else {
				game.location[who] = NOWHERE
				if (reason === 'combat') {
					game.victory = "Scotland won because king Edward II has died in battle!"
					game.result = SCOTLAND
				}
			}
		} else {
			disband(who)
		}
	} else if (who === B_KING) {
		game.location[who] = NOWHERE
		if (reason === 'combat' || reason === 'retreat') {
			game.victory = "England won because the Scottish king has died in battle!"
			game.result = ENGLAND
		}
	} else if (block_is_mortal(who) && (reason === 'combat' || reason === 'retreat')) {
		game.location[who] = NOWHERE
	} else if (block_type(who) === 'nobles') {
		who = swap_blocks(who)
		game.steps[who] = 1 // flip at strength 1 if eliminated
		if (reason === 'combat' || reason === 'retreat')
			set_add(game.reserves, who)
	} else {
		disband(who)
	}
}

function reduce_block(who, reason) {
	if (game.steps[who] === 1) {
		eliminate_block(who, reason)
	} else {
		--game.steps[who]
	}
}

function count_attackers() {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (is_attacker(b))
			++count
	return count
}

function count_defenders() {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (is_defender(b))
			++count
	return count
}

const CELTIC_BLOCKS = [
	block_index["Ulster Infantry"],
	block_index["Wales Archers"],
	block_index["Wales Infantry"],
]

function celtic_unity_roll(who) {
	let die = roll_d6()
	if (die >= 5) {
		log(block_name(who) + " rolled " + DIE_HIT[die] + " for Celtic unity and returned to the draw pool.")
		disband(who)
	} else {
		log(block_name(who) + " rolled " + DIE_MISS[die] + " for Celtic unity \u2013 no effect.")
	}
}

// SETUP

function reset_blocks() {
	for (let b = 0; b < block_count; ++b) {
		game.steps[b] = block_max_steps(b)
		if (block_type(b) === 'nobles')
			game.location[b] = NOWHERE
		else if (block_owner(b) === ENGLAND)
			game.location[b] = E_BAG
		else
			game.location[b] = S_BAG
	}
}

function deploy_noble(owner, area, name) {
	if (name in block_index) {
		game.location[block_index[name]] = area
	} else {
		let friend = find_noble(owner, name)
		let enemy = find_noble(ENEMY[owner], name)
		game.location[friend] = area
		game.location[enemy] = NOWHERE
	}
}

function deploy_block(area, block) {
	block = block_index[block]
	game.location[block] = area
}

function draw_from_bag(bag, exclude_list) {
	let list = []
	for (let b = 0; b < block_count; ++b) {
		if (exclude_list && exclude_list.includes(b))
			continue
		if (game.location[b] === bag)
			list.push(b)
	}
	if (list.length === 0)
		return NOBODY
	return list[random(list.length)]
}

function deploy_english(count) {
	let list = []
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === E_BAG)
			list.push(b)
	for (let i = 0; i < count; ++i) {
		let x = random(list.length)
		let b = list[x]
		list.splice(x,1)
		game.location[b] = AREA_ENGLAND
		game.steps[b] = block_max_steps(b)
	}
}

function deploy_off_map(block) {
	block = block_index[block]
	game.location[block] = NOWHERE
}

function setup_braveheart() {
	reset_blocks()

	deploy_noble("England", AREA_BADENOCH, "Comyn")
	deploy_noble("England", AREA_ANGUS, "Angus")
	deploy_noble("England", AREA_ARGYLL, "Argyll")
	deploy_noble("England", AREA_MAR, "Mar")
	deploy_noble("England", AREA_LENNOX, "Lennox")
	deploy_noble("England", AREA_BUCHAN, "Buchan")
	deploy_noble("England", AREA_ROSS, "Ross")
	deploy_noble("England", AREA_ATHOLL, "Atholl")
	deploy_noble("England", AREA_DUNBAR, "Dunbar")
	deploy_noble("England", AREA_MENTIETH, "Mentieth")
	deploy_noble("England", AREA_LANARK, "Steward")

	deploy_block(AREA_LOTHIAN, "Cumbria Infantry")
	deploy_block(AREA_MENTIETH, "Northumber Infantry")

	deploy_english(4)

	deploy_noble("Scotland", AREA_ANNAN, "Bruce")
	deploy_noble("Scotland", AREA_GALLOWAY, "Galloway")

	deploy_block(AREA_FIFE, "Wallace")
	deploy_block(AREA_FIFE, "Douglas")
	deploy_block(AREA_FIFE, "Barclay")
	deploy_block(AREA_MORAY, "Moray")
	deploy_block(AREA_MORAY, "Fraser")
	deploy_block(AREA_STRATHSPEY, "Grant")

	deploy_off_map("King")
	deploy_off_map("French Knights")

	game.scottish_king = false
	game.edward = 1
	game.year = 1297
	game.end_year = 1305
}

function setup_the_bruce() {
	reset_blocks()

	deploy_noble("England", AREA_BADENOCH, "Comyn")
	deploy_noble("England", AREA_ANGUS, "Angus")
	deploy_noble("England", AREA_ARGYLL, "Argyll")
	deploy_noble("England", AREA_BUCHAN, "Buchan")
	deploy_noble("England", AREA_GALLOWAY, "Galloway")
	deploy_noble("England", AREA_ROSS, "Ross")
	deploy_noble("England", AREA_MENTIETH, "Mentieth")
	deploy_noble("England", AREA_LANARK, "Steward")

	deploy_block(AREA_MORAY, "Cumbria Infantry")
	deploy_block(AREA_MENTIETH, "Northumber Infantry")
	deploy_block(AREA_LOTHIAN, "Durham Infantry")
	deploy_block(AREA_LANARK, "Westmor Infantry")

	deploy_english(6)

	deploy_noble("Scotland", AREA_DUNBAR, "Dunbar")
	deploy_noble("Scotland", AREA_LENNOX, "Lennox")
	deploy_noble("Scotland", AREA_ATHOLL, "Atholl")
	deploy_noble("Scotland", AREA_MAR, "Mar")
	deploy_noble("Scotland", AREA_CARRICK, "Bruce")

	deploy_block(AREA_FIFE, "King")
	deploy_block(AREA_FIFE, "Douglas")
	deploy_block(AREA_FIFE, "Barclay")
	deploy_block(AREA_LENNOX, "Campbell")
	deploy_block(AREA_CARRICK, "Lindsay")

	deploy_off_map("Moray")
	deploy_off_map("Wallace")
	deploy_off_map("French Knights")

	game.scottish_king = true
	game.edward = 1
	game.year = 1306
	game.end_year = 1314
}

function setup_campaign() {
	setup_braveheart()
	game.end_year = 1400; /* no limit */
}

// GAME TURN

function start_year() {
	log("")
	log(".h1 Year " + game.year)

	// Deal new cards
	let deck = shuffle_deck()
	game.e_hand = deal_cards(deck, 5)
	game.s_hand = deal_cards(deck, 5)

	start_game_turn()
}

function start_game_turn() {
	game.turn = 6 - game.e_hand.length

	log("")
	log(".h1 Turn " + game.turn + " of Year " + game.year)

	// Reset movement and attack tracking state
	game.truce = false
	reset_border_limits()
	game.last_used = {}
	game.attacker = {}
	game.reserves = []
	game.moved = []

	goto_card_phase()
}

function end_game_turn() {
	if (count_english_nobles() === 0) {
		game.victory = "Scotland won by controlling all the nobles!"
		game.result = SCOTLAND
	}
	if (count_scottish_nobles() === 0) {
		game.victory = "England won by controlling all the nobles!"
		game.result = ENGLAND
	}
	if (game.victory)
		return goto_game_over()

	if (game.e_hand.length > 0)
		start_game_turn()
	else
		goto_winter_turn()
}

// CARD PHASE

function goto_card_phase() {
	game.e_card = 0
	game.s_card = 0
	game.show_cards = 0
	game.state = 'play_card'
	game.active = BOTH
}

function resume_play_card() {
	if (game.s_card > 0 && game.e_card > 0)
		reveal_cards()
	else if (game.s_card > 0)
		game.active = ENGLAND
	else if (game.e_card > 0)
		game.active = SCOTLAND
	else
		game.active = BOTH
}

states.play_card = {
	prompt: function (view, current) {
		if (current === OBSERVER)
			return view.prompt = "Waiting for players to play a card."
		if (current === ENGLAND) {
			if (game.e_card) {
				view.prompt = "Waiting for Scotland to play a card."
				gen_action(view, 'undo')
			} else {
				view.prompt = "Play a card."
				for (let c of game.e_hand)
					gen_action(view, 'play', c)
			}
		}
		if (current === SCOTLAND) {
			if (game.s_card) {
				view.prompt = "Waiting for England to play a card."
				gen_action(view, 'undo')
			} else {
				view.prompt = "Play a card."
				for (let c of game.s_hand)
					gen_action(view, 'play', c)
			}
		}
	},
	play: function (card, current) {
		if (current === ENGLAND) {
			remove_from_array(game.e_hand, card)
			game.e_card = card
		}
		if (current === SCOTLAND) {
			remove_from_array(game.s_hand, card)
			game.s_card = card
		}
		resume_play_card()
	},
	undo: function (_, current) {
		if (current === ENGLAND) {
			game.e_hand.push(game.e_card)
			game.e_card = 0
		}
		if (current === SCOTLAND) {
			game.s_hand.push(game.s_card)
			game.s_card = 0
		}
		resume_play_card()
	}
}

function reveal_cards() {
	log("")
	log("England played " + CARDS[game.e_card].name + ".")
	log("Scotland played " + CARDS[game.s_card].name + ".")
	game.show_cards = 1

	let ec = CARDS[game.e_card]
	let sc = CARDS[game.s_card]

	if (ec.event && sc.event) {
		log("Two events played at the same time. The year will end after this turn.")
		game.e_hand.length = 0
		game.s_hand.length = 0
	}

	if (ec.event) {
		game.p1 = ENGLAND
		game.p2 = SCOTLAND
	} else if (sc.event) {
		game.p1 = SCOTLAND
		game.p2 = ENGLAND
	} else if (sc.moves > ec.moves) {
		game.p1 = SCOTLAND
		game.p2 = ENGLAND
	} else {
		game.p1 = ENGLAND
		game.p2 = SCOTLAND
	}

	game.active = game.p1
	start_player_turn()
}

function start_player_turn() {
	log("")
	log(".h2 " + game.active)
	reset_border_limits()
	let ec = CARDS[game.e_card]
	let sc = CARDS[game.s_card]
	if (game.active === ENGLAND && ec.event)
		goto_event(ec.event)
	else if (game.active === SCOTLAND && sc.event)
		goto_event(sc.event)
	else if (game.active === ENGLAND)
		goto_move_phase(ec.moves)
	else if (game.active === SCOTLAND)
		goto_move_phase(sc.moves)
}

function end_player_turn() {
	game.moves = 0
	game.activated = null
	game.main_origin = null
	game.main_border = null

	if (game.active === game.p2) {
		goto_battle_phase()
	} else {
		game.active = game.p2
		start_player_turn()
	}
}

// CORONATION

function can_crown_bruce() {
	return game.location[B_WALLACE] === NOWHERE && game.location[B_BRUCE_S] === AREA_FIFE
}

function can_crown_comyn() {
	return game.location[B_WALLACE] === NOWHERE && game.location[B_COMYN_S] === AREA_FIFE
}

function can_crown_balliol() {
	return game.year >= 1301 && is_on_map(B_FRENCH_KNIGHTS)
}

function goto_event(event) {
	if (game.active === SCOTLAND && !game.scottish_king &&
		(can_crown_bruce() || can_crown_comyn() || can_crown_balliol())) {
		game.state = 'coronation_event'
		game.event = event
	} else {
		goto_event_card(event)
	}
}

states.coronation_event = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to crown a king."
		view.prompt = "Play event or crown a king?"
		gen_action(view, 'play_event')
		if (can_crown_bruce())
			gen_action(view, 'crown_bruce')
		if (can_crown_comyn())
			gen_action(view, 'crown_comyn')
		if (can_crown_balliol())
			gen_action(view, 'return_of_the_king')
	},
	crown_bruce: function () {
		log("Bruce was crowned King!")
		game.scottish_king = true
		game.location[B_KING] = AREA_FIFE
		game.steps[B_KING] = block_max_steps(B_KING)
		defect_comyn_nobles()
	},
	crown_comyn: function () {
		log("Comyn was crowned King!")
		game.scottish_king = true
		game.location[B_KING] = AREA_FIFE
		game.steps[B_KING] = block_max_steps(B_KING)
		defect_bruce_nobles()
	},
	return_of_the_king: function () {
		log("Return of the King!")
		game.scottish_king = true
		game.location[B_KING] = game.location[B_FRENCH_KNIGHTS]
		game.steps[B_KING] = block_max_steps(B_KING)
		defect_bruce_nobles()
	},
	play_event: function () {
		let event = game.event
		delete game.event
		goto_event_card(event)
	},
}

function defect_bruce_nobles() {
	defect_nobles([ "Bruce", "Mar", "Lennox", "Atholl", "Dunbar", "Mentieth", "Steward" ])
}

function defect_comyn_nobles() {
	defect_nobles([ "Comyn", "Angus", "Argyll", "Buchan", "Galloway", "Ross" ])
}

function defect_nobles(list) {
	for (let name of list) {
		let who = find_noble(game.active, name)
		if (is_on_map(who)) {
			let where = game.location[who]
			log(name + " defected.")
			who = swap_blocks(who)
			if (is_contested_area(where))
				game.attacker[where] = block_owner(who)
		}
	}
	resume_coronation()
}

function resume_coronation() {
	if (have_contested_areas()) {
		game.active = game.p1
		game.state = 'coronation_battles'
	} else {
		game.active = SCOTLAND
		end_player_turn()
	}
}

states.coronation_battles = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to choose a battle."
		view.prompt = "Coronation: Choose the next battle to fight!"
		for (let where = first_map_area; where < area_count; ++where)
			if (is_contested_area(where))
				gen_action_area(view, where)
	},
	area: function (where) {
		start_battle(where, 'coronation')
	},
}

// EVENTS

function goto_event_card(event) {
	switch (event) {
	case 'herald': goto_herald(); break
	case 'pillage': goto_pillage(); break
	case 'sea_move': goto_sea_move(); break
	case 'truce': goto_truce(); break
	case 'victuals': goto_victuals(); break
	}
}

function goto_truce() {
	log("Truce is in effect!")
	game.truce = ENEMY[game.active]
	end_player_turn()
}

function goto_herald() {
	game.state = 'herald'
}

function is_enemy_noble(who) {
	return is_on_map(who) && block_type(who) === 'nobles' && block_owner(who) === ENEMY[game.active]
}

states.herald = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to choose a noble."
		view.prompt = "Herald: Name an enemy noble to try to convert to your side."
		gen_action(view, 'pass')
		for (let b = 0; b < block_count; ++b)
			if (is_enemy_noble(b))
				gen_action(view, 'noble', block_name(b))
	},
	noble: function (name) {
		let who = find_noble(ENEMY[game.active], name)
		let die = roll_d6()
		if (die <= 4) {
			log("Herald roll " + DIE_HIT[die] + " converted " + name + ".")
			let where = game.location[who]
			who = swap_blocks(who)
			if (is_contested_area(where)) {
				game.attacker[where] = game.active
				start_battle(where, 'herald')
				return
			}
		} else {
			log("Herald roll " + DIE_MISS[die] + " failed to convert " + name + ".")
		}
		end_player_turn()
	},
	pass: function () {
		end_player_turn()
	},
}

function goto_victuals() {
	game.victuals = 3
	game.where = NOWHERE
	game.state = 'victuals'
	game.turn_log = []
	clear_undo()
}

states.victuals = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to build."
		gen_action_undo(view)
		let done = true
		if (game.victuals > 0) {
			for (let b = 0; b < block_count; ++b) {
				if (is_on_map(b) && block_owner(b) === game.active) {
					if (game.steps[b] < block_max_steps(b)) {
						if (!game.where || game.location[b] === game.where) {
							gen_action_block(view, b)
							done = false
						}
					}
				}
			}
		}
		if (done) {
			view.prompt = "Victuals: Distribute three steps among friendly blocks in one group \u2014 done."
			gen_action(view, 'end_builds')
		} else {
			view.prompt = "Victuals: Distribute three steps among friendly blocks in one group."
		}
	},
	block: function (who) {
		push_undo()
		game.where = game.location[who]
		game.turn_log.push([area_tag(game.where)])
		++game.steps[who]
		--game.victuals
	},
	end_builds: function () {
		print_turn_log("victualed")
		clear_undo()
		delete game.victuals
		game.where = NOWHERE
		end_player_turn()
	},
	undo: pop_undo
}

function goto_pillage() {
	game.state = 'pillage'
	game.turn_log = []
}

states.pillage = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to pillage."
		view.prompt = "Pillage: Pillage one enemy group adjacent to a friendly group."
		gen_action(view, 'pass')
		for (let from = first_map_area; from < area_count; ++from) {
			if (is_friendly_area(from)) {
				for (let to of AREAS[from].exits)
					if (is_contested_area(to) || is_enemy_area(to))
						gen_action_area(view, to)
			}
		}
	},
	area: function (where) {
		game.where = where
		game.pillage = 2
		game.active = ENEMY[game.active]
		game.state = 'pillage_hits'
	},
	pass: function () {
		end_player_turn()
	},
}

function pillage_victims() {
	function is_candidate(b) {
		return block_owner(b) === game.active && game.location[b] === game.where
	}
	let max = 0
	for (let b = 0; b < block_count; ++b)
		if (is_candidate(b) && game.steps[b] > max)
			max = game.steps[b]
	let list = []
	for (let b = 0; b < block_count; ++b)
		if (is_candidate(b) && game.steps[b] === max)
			list.push(b)
	return list
}

states.pillage_hits = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to apply pillage hits."
		view.prompt = "Pillage: Apply two hits in " + area_name(game.where) + "."
		for (let b of pillage_victims())
			gen_action_block(view, b)
	},
	block: function (who) {
		--game.pillage
		reduce_block(who, 'pillage')
		if (game.pillage === 0 || pillage_victims().length === 0) {
			game.active = ENEMY[game.active]
			game.state = 'pillage_builds'
			game.pillage = 2 - game.pillage
			game.from = game.where
			game.where = NOWHERE
		}
	},
}

states.pillage_builds = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to apply pillage builds."
		gen_action_undo(view)
		let done = true
		if (game.pillage > 0) {
			if (game.where) {
				for (let b = 0; b < block_count; ++b) {
					if (block_owner(b) === game.active && game.location[b] === game.where) {
						if (game.steps[b] < block_max_steps(b)) {
							gen_action_block(view, b)
							done = false
						}
					}
				}
			} else {
				for (let to of AREAS[game.from].exits) {
					for (let b = 0; b < block_count; ++b) {
						if (block_owner(b) === game.active && game.location[b] === to) {
							if (game.steps[b] < block_max_steps(b)) {
								gen_action_block(view, b)
								done = false
							}
						}
					}
				}
			}
		}
		if (done) {
			view.prompt = "Pillage: Add pillaged steps to friendly blocks in the pillaging group \u2014 done"
			gen_action(view, 'end_pillage')
		} else {
			view.prompt = "Pillage: Add pillaged steps to friendly blocks in the pillaging group."
		}
	},
	block: function (who) {
		push_undo()
		game.where = game.location[who]
		game.turn_log.push([area_tag(game.from), area_tag(game.where)])
		++game.steps[who]
		--game.pillage
		// TODO: auto-end pillage builds?
		// if (game.pillage === 0) end_pillage(game.from)
	},
	end_pillage: function () {
		clear_undo()
		while (game.pillage > 0) {
			--game.pillage
			game.turn_log.push([area_tag(game.from)])
		}
		end_pillage(game.from)
	},
	undo: pop_undo
}

function end_pillage(where) {
	print_turn_log("pillaged")
	game.from = NOWHERE
	game.where = NOWHERE
	delete game.pillage
	if (is_contested_area(where)) {
		game.attacker[where] = ENEMY[game.active]
		start_battle(where, 'pillage')
	} else {
		end_player_turn()
	}
}

function goto_sea_move() {
	game.moves = 2
	game.from = NOWHERE
	game.where = NOWHERE
	game.state = 'sea_move'
	game.turn_log = []
	clear_undo()
}

states.sea_move = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to sea move."
		view.prompt = "Sea Move: Move one or two blocks from one coastal area to one other friendly coastal area."
		gen_action_undo(view)
		gen_action(view, 'end_move_phase')
		if (game.moves > 0) {
			for (let b = 0; b < block_count; ++b) {
				if (b === B_NORSE)
					continue
				if (is_in_friendly_coastal_area(b) && block_owner(b) === game.active)
					if (!game.from || game.location[b] === game.from)
						gen_action_block(view, b)
			}
		}
	},
	block: function (who) {
		push_undo()
		game.who = who
		game.state = 'sea_move_to'
	},
	end_move_phase: function () {
		print_turn_log("sea moved")
		clear_undo()
		game.moves = 0
		game.from = NOWHERE
		game.where = NOWHERE
		end_player_turn()
	},
	undo: pop_undo
}

states.sea_move_to = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to sea move."
		view.prompt = "Sea Move: Move one or two blocks from one coastal area to one other friendly coastal area."
		gen_action_undo(view)
		gen_action_block(view, game.who)
		if (game.where) {
			gen_action_area(view, game.where)
		} else {
			let from = game.location[game.who]
			for (let to = first_map_area; to < area_count; ++to)
				if (to !== from && is_friendly_coastal_area(to))
					gen_action_area(view, to)
		}
	},
	area: function (to) {
		if (!game.from)
			game.from = game.location[game.who]
		game.turn_log.push([area_tag(game.from), area_tag(to)])
		game.location[game.who] = to
		set_add(game.moved, game.who)
		game.where = to
		game.who = NOBODY
		--game.moves
		game.state = 'sea_move'
	},
	block: pop_undo,
	undo: pop_undo
}

// MOVE PHASE

function goto_move_phase(moves) {
	game.state = 'move_who'
	game.moves = moves
	game.activated = []
	game.main_origin = {}
	game.main_border = {}
	game.turn_log = []
	clear_undo()
}

states.move_who = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to move."
		view.prompt = "Choose an army to move. " + game.moves + "MP left."
		gen_action_undo(view)
		gen_action(view, 'end_move_phase')
		for (let b = 0; b < block_count; ++b) {
			if (b === B_NORSE && game.active === SCOTLAND && is_on_map(B_NORSE)) {
				if (!set_has(game.moved, b) && game.moves > 0 && !is_pinned(game.location[B_NORSE]))
					gen_action_block(view, B_NORSE)
			}
			if (can_block_move(b)) {
				if (game.moves === 0) {
					let from = game.location[b]
					if (game.activated.includes(from))
						gen_action_block(view, b)
				} else {
					gen_action_block(view, b)
				}
			}
		}
	},
	block: function (who) {
		push_undo()
		game.who = who
		game.state = 'move_where'
		game.origin = game.location[who]
		game.last_from = NOWHERE
		game.distance = 0
	},
	end_move_phase: function () {
		clear_undo()
		game.moves = 0
		print_turn_log("moved")
		end_player_turn()
	},
	undo: pop_undo
}

function move_block(who, from, to) {
	game.location[who] = to
	game.border_limit[border_id(from, to)] = border_limit(from, to) + 1
	game.distance ++
	if (is_contested_area(to)) {
		game.last_used[border_id(from, to)] = game.active
		if (!game.attacker[to]) {
			game.attacker[to] = game.active
			game.main_border[to] = from
			game.main_origin[to] = game.origin
			return ATTACK_MARK
		} else {
			if (game.attacker[to] !== game.active || game.main_border[to] !== from || game.main_origin[to] !== game.origin) {
				set_add(game.reserves, who)
				return RESERVE_MARK
			} else {
				return ATTACK_MARK
			}
		}
	}
	return false
}

states.move_where = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to move."
		view.prompt = "Move " + block_name(game.who) + "."
		gen_action_undo(view)
		gen_action_block(view, game.who)
		let from = game.location[game.who]
		if (game.who === B_NORSE) {
			for (let to = first_map_area; to < area_count; ++to)
				if (to !== from && to !== AREA_ENGLAND && is_coastal_area(to))
					if (game.truce !== game.active || !is_enemy_area(to))
						gen_action_area(view, to)
		} else {
			if (game.distance > 0)
				gen_action_area(view, from)
			for (let to of AREAS[from].exits) {
				if (to !== game.last_from && can_block_move_to(game.who, from, to))
					gen_action_area(view, to)
			}
		}
	},
	block: function () {
		if (game.distance === 0)
			pop_undo()
		else
			end_move()
	},
	area: function (to) {
		let from = game.location[game.who]
		if (to === from) {
			end_move()
			return
		}
		if (game.who === B_NORSE) {
			log("The Norse moved by sea.")
			game.location[game.who] = to
			set_add(game.moved, game.who)
			if (is_contested_area(to)) {
				if (!game.attacker[to]) {
					game.turn_log.push([area_tag(from), area_tag(to) + ATTACK_MARK + " (Norse)"])
					game.attacker[to] = game.active
				} else {
					game.turn_log.push([area_tag(from), area_tag(to) + RESERVE_MARK + " (Norse)"])
					set_add(game.reserves, game.who)
				}
			} else {
				game.turn_log.push([area_tag(from), area_tag(to) + " (Norse)"])
			}
			--game.moves
			game.who = NOBODY
			game.state = 'move_who'
		} else {
			if (game.distance === 0)
				game.move_buf = [ area_tag(from) ]
			let mark = move_block(game.who, from, to)
			if (mark)
				game.move_buf.push(area_tag(to) + mark)
			else
				game.move_buf.push(area_tag(to))
			game.last_from = from
			if (!can_block_continue(game.who, from, to))
				end_move()
		}
	},
	undo: pop_undo
}

function end_move() {
	if (game.distance > 0) {
		let to = game.location[game.who]
		if (game.origin === AREA_ENGLAND || to === AREA_ENGLAND) {
			log(game.active + " crossed the Anglo-Scottish border.")
			game.moves --
		} else if (!game.activated.includes(game.origin)) {
			log(game.active + " activated " + area_tag(game.origin) + ".")
			game.activated.push(game.origin)
			game.moves --
		}
		set_add(game.moved, game.who)
		game.turn_log.push(game.move_buf)
	}
	delete game.move_buf
	game.who = NOBODY
	game.distance = 0
	game.origin = NOWHERE
	game.last_from = NOWHERE
	game.state = 'move_who'
}

// BATTLE PHASE

function goto_battle_phase() {
	if (have_contested_areas()) {
		game.active = game.p1
		game.state = 'battle_phase'
	} else {
		goto_border_raids()
	}
}

states.battle_phase = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to choose a battle."
		view.prompt = "Choose the next battle to fight!"
		for (let where = first_map_area; where < area_count; ++where)
			if (is_contested_area(where))
				gen_action_area(view, where)
	},
	area: function (where) {
		start_battle(where, 'battle')
	},
}

function start_battle(where, reason) {
	game.battle_active = game.active
	game.battle_reason = reason
	game.flash = ""
	log("")
	if (reason !== 'battle')
		log(".h3 Defection battle in " + area_tag(where))
	else
		log(".h3 Battle in " + area_tag(where))
	game.where = where
	game.battle_round = 0
	game.state = 'battle_round'
	start_battle_round()
}

function resume_battle() {
	if (game.victory)
		return goto_game_over()
	game.state = 'battle_round'
	pump_battle_round()
}

function end_battle() {
	if (game.turn_log && game.turn_log.length > 0)
		print_turn_log_no_active("Retreated from " + area_tag(game.where) + ":")

	game.flash = ""
	game.battle_round = 0
	reset_border_limits()
	game.moved = []

	game.active = game.attacker[game.where]
	let victor = game.active
	if (is_contested_area(game.where))
		victor = ENEMY[game.active]
	else if (is_enemy_area(game.where))
		victor = ENEMY[game.active]
	log(victor + " won the battle in " + area_tag(game.where) + "!")

	goto_retreat()
}

function bring_on_reserves() {
	for (let b = 0; b < block_count; ++b)
		if (game.location[b] === game.where)
			set_delete(game.reserves, b)
}

function start_battle_round() {
	if (++game.battle_round <= 3) {
		if (game.turn_log && game.turn_log.length > 0)
			print_turn_log_no_active("Retreated from " + area_tag(game.where) + ":")
		game.turn_log = []

		log(".h4 Battle Round " + game.battle_round)

		reset_border_limits()
		game.moved = []

		if (game.battle_round === 1) {
			for (let b of CELTIC_BLOCKS)
				if (game.location[b] === game.where && !is_battle_reserve(b))
					celtic_unity_roll(b)
		}
		if (game.battle_round === 2) {
			if (count_defenders() === 0) {
				log("Defending main force was eliminated.")
				log("Battlefield control changed.")
				game.attacker[game.where] = ENEMY[game.attacker[game.where]]
			} else if (count_attackers() === 0) {
				log("Attacking main force was eliminated.")
			}
			for (let b of CELTIC_BLOCKS)
				if (game.location[b] === game.where && is_battle_reserve(b))
					celtic_unity_roll(b)
			bring_on_reserves()
		}
		if (game.battle_round === 3) {
			bring_on_reserves()
		}

		pump_battle_round()
	} else {
		end_battle()
	}
}

function pump_battle_round() {
	function filter_battle_blocks(ci, is_candidate) {
		let output = null
		for (let b = 0; b < block_count; ++b) {
			if (is_candidate(b) && !set_has(game.moved, b)) {
				if (block_initiative(b) === ci) {
					if (!output)
						output = []
					output.push(b)
				}
			}
		}
		return output
	}

	function battle_step(active, initiative, candidate) {
		game.battle_list = filter_battle_blocks(initiative, candidate)
		if (game.battle_list) {
			game.active = active
			return true
		}
		return false
	}

	if (is_friendly_area(game.where) || is_enemy_area(game.where)) {
		end_battle()
	} else if (count_attackers() === 0 || count_defenders() === 0) {
		start_battle_round()
	} else {
		let attacker = game.attacker[game.where]
		let defender = ENEMY[attacker]

		if (battle_step(defender, 'A', is_defender)) return
		if (battle_step(attacker, 'A', is_attacker)) return
		if (battle_step(defender, 'B', is_defender)) return
		if (battle_step(attacker, 'B', is_attacker)) return
		if (battle_step(defender, 'C', is_defender)) return
		if (battle_step(attacker, 'C', is_attacker)) return

		start_battle_round()
	}
}

function pass_with_block(b) {
	game.flash = block_name(b) + " passed."
	log_battle(block_name(b) + " passed.")
	set_add(game.moved, b)
	resume_battle()
}

function retreat_with_block(b) {
	game.who = b
	game.state = 'retreat_in_battle'
}

function fire_with_block(b) {
	set_add(game.moved, b)
	let steps = game.steps[b]
	let fire = block_fire_power(b, game.where)
	let printed_fire = block_printed_fire_power(b)
	let name = block_name(b) + " " + BLOCKS[b].combat
	if (fire > printed_fire)
		name += "+" + (fire - printed_fire)

	let rolls = []
	game.hits = 0
	for (let i = 0; i < steps; ++i) {
		let die = roll_d6()
		if (die <= fire) {
			rolls.push(DIE_HIT[die])
			++game.hits
		} else {
			rolls.push(DIE_MISS[die])
		}
	}

	game.flash = name + " fired " + rolls.join(" ") + " "
	if (game.hits === 0)
		game.flash += "and missed."
	else if (game.hits === 1)
		game.flash += "and scored 1 hit."
	else
		game.flash += "and scored " + game.hits + " hits."

	log_battle(name + " fired " + rolls.join("") + ".")

	if (game.hits > 0) {
		game.active = ENEMY[game.active]
		goto_battle_hits()
	} else {
		resume_battle()
	}
}

states.battle_round = {
	show_battle: true,
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to choose a combat action."
		view.prompt = "Fire, retreat, or pass with an army."
		for (let b of game.battle_list) {
			gen_action_block(view, b)
			gen_action_battle(view, 'battle_fire', b)
			gen_action_battle(view, 'battle_pass', b)
			if (can_block_retreat(b))
				gen_action_battle(view, 'battle_retreat', b)
		}
	},
	block: function (who) {
		fire_with_block(who)
	},
	battle_fire: function (who) {
		fire_with_block(who)
	},
	battle_retreat: function (who) {
		retreat_with_block(who)
	},
	battle_pass: function (who) {
		pass_with_block(who)
	}
}

function goto_battle_hits() {
	game.battle_list = list_victims(game.active)

	if (game.autohit) {
		let n = 0
		while (game.hits >= game.battle_list.length && game.battle_list.length > 0) {
			while (game.battle_list.length > 0) {
				let who = game.battle_list.pop()
				log_battle(block_name(who) + " took a hit.")
				reduce_block(who, 'combat')
				game.hits--
				++n
			}
			if (game.hits > 0)
				game.battle_list = list_victims(game.active)
		}
		if (n > 0)
			game.flash += ` Assigned ${n}.`
	}

	if (game.battle_list.length === 0)
		resume_battle()
	else
		game.state = 'battle_hits'
}

function apply_hit(who) {
	game.flash = block_name(who) + " took a hit."
	log_battle(block_name(who) + " took a hit.")
	reduce_block(who, 'combat')
	game.hits--
	if (game.victory)
		goto_game_over()
	else if (game.hits === 0)
		resume_battle()
	else {
		game.battle_list = list_victims(game.active)
		if (game.battle_list.length === 0)
			resume_battle()
		else
			game.flash += " " + game.hits + (game.hits === 1 ? " hit left." : " hits left.")
	}
}

function list_victims(p) {
	let is_candidate = (p === game.attacker[game.where]) ? is_attacker : is_defender
	let max = 0
	for (let b = 0; b < block_count; ++b)
		if (is_candidate(b) && game.steps[b] > max)
			max = game.steps[b]
	let list = []
	for (let b = 0; b < block_count; ++b)
		if (is_candidate(b) && game.steps[b] === max)
			list.push(b)
	return list
}

states.battle_hits = {
	show_battle: true,
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to assign hits."
		view.prompt = "Assign " + game.hits + (game.hits !== 1 ? " hits" : " hit") + " to your armies."
		for (let b of game.battle_list) {
			gen_action_block(view, b)
			gen_action_battle(view, 'battle_hit', b)
		}
	},
	block: function (who) {
		apply_hit(who)
	},
	battle_hit: function (who) {
		apply_hit(who)
	},
}

function goto_retreat() {
	game.active = game.attacker[game.where]
	if (is_contested_area(game.where)) {
		game.state = 'retreat'
		game.turn_log = []
		clear_undo()
	} else {
		goto_regroup()
	}
}

states.retreat = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to retreat."
		view.prompt = "Retreat: Choose an army to move."
		gen_action_undo(view)
		let can_retreat = false
		for (let b = 0; b < block_count; ++b) {
			if (game.location[b] === game.where && can_block_retreat(b)) {
				gen_action_block(view, b)
				can_retreat = true
			}
		}
		if (!is_contested_area(game.where) || !can_retreat)
			gen_action(view, 'end_retreat')
	},
	end_retreat: function () {
		clear_undo()
		for (let b = 0; b < block_count; ++b)
			if (game.location[b] === game.where && block_owner(b) === game.active)
				eliminate_block(b, 'retreat')
		print_turn_log("retreated")
		goto_regroup()
	},
	block: function (who) {
		push_undo()
		game.who = who
		game.state = 'retreat_to'
	},
	undo: pop_undo
}

states.retreat_to = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to retreat."
		gen_action_undo(view)
		gen_action_block(view, game.who)
		let can_retreat = false
		if (game.who === B_NORSE) {
			view.prompt = "Retreat: Move the army to a friendly coastal area."
			for (let to = first_map_area; to < area_count; ++to) {
				if (to !== game.where && to !== AREA_ENGLAND && is_friendly_coastal_area(to)) {
					gen_action_area(view, to)
					can_retreat = true
				}
			}
		} else {
			view.prompt = "Retreat: Move the army to a friendly or neutral area."
			for (let to of AREAS[game.where].exits) {
				if (can_block_retreat_to(game.who, to)) {
					gen_action_area(view, to)
					can_retreat = true
				}
			}
		}
		if (!can_retreat)
			gen_action(view, 'eliminate')
	},
	area: function (to) {
		let from = game.where
		if (game.who === B_NORSE) {
			game.turn_log.push([area_tag(from), area_tag(to) + " (Norse)"])
			game.location[game.who] = to
		} else {
			game.turn_log.push([area_tag(from), area_tag(to)])
			move_block(game.who, game.where, to)
		}
		game.who = NOBODY
		game.state = 'retreat'
	},
	eliminate: function () {
		eliminate_block(game.who, 'retreat')
		game.who = NOBODY
		game.state = 'retreat'
	},
	block: pop_undo,
	undo: pop_undo
}

states.retreat_in_battle = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to retreat."
		gen_action(view, 'undo')
		gen_action_block(view, game.who)
		if (game.who === B_NORSE) {
			view.prompt = "Retreat: Move the army to a friendly coastal area."
			for (let to = first_map_area; to < area_count; ++to)
				if (to !== game.where && to !== AREA_ENGLAND && is_friendly_coastal_area(to))
					gen_action_area(view, to)
		} else {
			view.prompt = "Retreat: Move the army to a friendly or neutral area."
			for (let to of AREAS[game.where].exits)
				if (can_block_retreat_to(game.who, to))
					gen_action_area(view, to)
		}
	},
	area: function (to) {
		game.turn_log.push([game.active, area_tag(to)])
		if (game.who === B_NORSE) {
			game.flash = "Norse retreated to " + area_name(to) + "."
			log_battle("Norse retreated to " + area_tag(to) + ".")
			game.location[game.who] = to
		} else {
			game.flash = block_name(game.who) + " retreated."
			log_battle(game.flash)
			move_block(game.who, game.where, to)
		}
		game.who = NOBODY
		resume_battle()
	},
	block: function () {
		game.who = NOBODY
		resume_battle()
	},
	undo: function () {
		game.who = NOBODY
		resume_battle()
	}
}

function goto_regroup() {
	game.active = game.attacker[game.where]
	if (is_enemy_area(game.where))
		game.active = ENEMY[game.active]
	game.state = 'regroup'
	game.turn_log = []
	clear_undo()
}

states.regroup = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to regroup."
		view.prompt = "Regroup: Choose an army to move."
		gen_action_undo(view)
		gen_action(view, 'end_regroup')
		for (let b = 0; b < block_count; ++b)
			if (game.location[b] === game.where && can_block_regroup(b))
				gen_action_block(view, b)
	},
	block: function (who) {
		push_undo()
		game.who = who
		game.state = 'regroup_to'
	},
	end_regroup: function () {
		print_turn_log("regrouped")
		game.attacker[game.where] = null // XXX ???
		game.where = NOWHERE
		clear_undo()
		game.active = game.battle_active
		delete game.battle_active
		if (game.battle_reason === 'herald') {
			delete game.battle_reason
			game.last_used = {}
			end_player_turn()
		} else if (game.battle_reason === 'pillage') {
			delete game.battle_reason
			game.last_used = {}
			end_player_turn()
		} else if (game.battle_reason === 'coronation') {
			delete game.battle_reason
			game.last_used = {}
			resume_coronation()
		} else {
			delete game.battle_reason
			goto_battle_phase()
		}
	},
	undo: pop_undo
}

states.regroup_to = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to regroup."
		view.prompt = "Regroup: Move the army to a friendly or neutral area."
		gen_action_undo(view)
		gen_action_block(view, game.who)
		if (game.who === B_NORSE) {
			for (let to = first_map_area; to < area_count; ++to)
				if (to !== game.where && to !== AREA_ENGLAND && is_friendly_coastal_area(to))
					gen_action_area(view, to)
		} else {
			for (let to of AREAS[game.where].exits)
				if (can_block_regroup_to(game.who, to))
					gen_action_area(view, to)
		}
	},
	area: function (to) {
		let from = game.where
		if (game.who === B_NORSE) {
			game.turn_log.push([area_tag(from), area_tag(to) + " (Norse)"])
			game.location[game.who] = to
		} else {
			game.turn_log.push([area_tag(from), area_tag(to)])
			move_block(game.who, game.where, to)
		}
		game.who = NOBODY
		game.state = 'regroup'
	},
	block: pop_undo,
	undo: pop_undo
}

// BORDER RAIDS

function count_non_noble_english_blocks_on_map() {
	let count = 0
	for (let b = 0; b < block_count; ++b)
		if (block_owner(b) === ENGLAND && block_type(b) !== 'nobles')
			if (is_on_map(b))
				++count
	return count
}

function goto_border_raids() {
	game.active = ENGLAND
	if (is_enemy_area(AREA_ENGLAND)) {
		log("Scotland raided in England.")
		if (count_non_noble_english_blocks_on_map() > 0) {
			game.state = 'border_raids'
		} else {
			log("England had no non-noble blocks in play.")
			end_game_turn()
		}
	} else {
		end_game_turn()
	}
}

states.border_raids = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for England to choose a border raid victim."
		view.prompt = "Border Raids: Eliminate a non-Noble block."
		for (let b = 0; b < block_count; ++b)
			if (block_owner(b) === ENGLAND && block_type(b) !== 'nobles')
				if (is_on_map(b))
					gen_action_block(view, b)
	},
	block: function (who) {
		eliminate_block(who, 'border_raids')
		end_game_turn()
	},
}

// WINTERING

function goto_winter_turn() {
	game.moved = []
	log("")
	log(".h1 Winter of " + game.year)
	log("")
	english_nobles_go_home()
}

function is_bruce(who) {
	return who === B_BRUCE_E || who === B_BRUCE_S
}

function is_comyn(who) {
	return who === B_COMYN_E || who === B_COMYN_S
}

function find_noble_home(who) {
	for (let where = first_map_area; where < area_count; ++where)
		if (AREAS[where].home === block_name(who))
			return where
	return NOWHERE
}

function go_home_to(who, home, defected = false) {
	let name = block_name(who)
	let from = game.location[who]
	if (from !== home) {
		game.location[who] = home
		if (is_contested_area(home)) {
			who = swap_blocks(who)
			defected = true
		}
		if (defected)
			game.turn_log.push([name, area_tag(home) + " \u2727"])
		else
			game.turn_log.push([name, area_tag(home)])
	}
}

function go_home(who) {
	go_home_to(who, find_noble_home(who))
}

function english_nobles_go_home() {
	game.turn_log = []
	game.active = ENGLAND
	for (let b = 0; b < block_count; ++b) {
		if (block_owner(b) === ENGLAND && block_type(b) === 'nobles' && game.location[b])
			if (!is_bruce(b) && !is_comyn(b))
				go_home(b)
	}

	game.going_home = ENGLAND
	game.bruce_home = false
	game.comyn_home = false
	goto_e_bruce()
}

function scottish_nobles_go_home() {
	game.turn_log = []
	game.active = SCOTLAND
	for (let b = 0; b < block_count; ++b) {
		if (block_owner(b) === SCOTLAND && block_type(b) === 'nobles' && game.location[b])
			if (!is_bruce(b) && !is_comyn(b))
				go_home(b)
	}
	game.going_home = SCOTLAND
	goto_s_bruce()
}

function goto_e_bruce() {
	game.who = B_BRUCE_E
	if (game.location[B_BRUCE_E] && !game.bruce_home)
		send_bruce_home()
	else
		end_bruce()
}

function goto_s_bruce() {
	game.who = B_BRUCE_S
	if (game.location[B_BRUCE_S] && !game.bruce_home)
		send_bruce_home()
	else
		end_bruce()
}

function send_bruce_home() {
	game.bruce_home = true
	let annan = is_friendly_or_neutral_area(AREA_ANNAN)
	let carrick = is_friendly_or_neutral_area(AREA_CARRICK)
	if (annan && !carrick) {
		go_home_to(game.who, AREA_ANNAN)
		game.who = NOBODY
		return end_bruce()
	}
	if (carrick && !annan) {
		go_home_to(game.who, AREA_CARRICK)
		game.who = NOBODY
		return end_bruce()
	}
	if (!annan && !carrick) {
		game.bruce_defected = true
		game.active = ENEMY[game.active]
		game.who = swap_blocks(game.who)
	} else {
		game.bruce_defected = false
	}
	game.state = 'bruce'
}

states.bruce = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to move Bruce to one of his home areas."
		view.prompt = "Nobles go Home: Move Bruce to one of his home areas."
		gen_action_area(view, AREA_ANNAN)
		gen_action_area(view, AREA_CARRICK)
	},
	area: function (to) {
		go_home_to(game.who, to, game.bruce_defected)
		game.who = NOBODY
		end_bruce()
	},
}

function end_bruce() {
	game.who = NOBODY
	game.active = game.going_home
	delete game.bruce_defected
	if (game.going_home === ENGLAND)
		goto_e_comyn()
	else
		goto_s_comyn()
}

function goto_e_comyn() {
	game.who = B_COMYN_E
	if (game.location[B_COMYN_E] && !game.comyn_home)
		send_comyn_home()
	else
		end_comyn()
}

function goto_s_comyn() {
	game.who = B_COMYN_S
	if (game.location[B_COMYN_S] && !game.comyn_home)
		send_comyn_home()
	else
		end_comyn()
}

function send_comyn_home() {
	game.comyn_home = true
	let badenoch = is_friendly_or_neutral_area(AREA_BADENOCH)
	let lochaber = is_friendly_or_neutral_area(AREA_LOCHABER)
	if (badenoch && !lochaber) {
		go_home_to(game.who, AREA_BADENOCH)
		game.who = NOBODY
		return end_comyn()
	}
	if (lochaber && !badenoch) {
		go_home_to(game.who, AREA_LOCHABER)
		game.who = NOBODY
		return end_comyn()
	}
	if (!lochaber && !badenoch) {
		game.comyn_defected = true
		game.active = ENEMY[game.active]
		game.who = swap_blocks(game.who)
	} else {
		game.comyn_defected = false
	}
	game.state = 'comyn'
}

states.comyn = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for " + game.active + " to move Comyn to one of his home areas."
		view.prompt = "Nobles go Home: Move Comyn to one of his home areas."
		gen_action_area(view, AREA_BADENOCH)
		gen_action_area(view, AREA_LOCHABER)
	},
	area: function (to) {
		go_home_to(game.who, to, game.comyn_defected)
		game.who = NOBODY
		end_comyn()
	},
}

function end_comyn() {
	game.who = NOBODY
	game.active = game.going_home
	delete game.comyn_defected
	if (game.active === ENGLAND) {
		print_turn_log_no_count("English nobles went home:")
		scottish_nobles_go_home()
	} else {
		goto_moray()
	}
}

function goto_moray() {
	delete game.going_home
	delete game.bruce_home
	delete game.comyn_home

	if (is_on_map(B_MORAY) && game.location[B_MORAY] !== AREA_MORAY && is_friendly_or_neutral_area(AREA_MORAY)) {
		game.state = 'moray'
		game.active = SCOTLAND
		game.who = B_MORAY
	} else {
		goto_scottish_king()
	}
}

states.moray = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for Scotland to move Moray."
		view.prompt = "Nobles go Home: Move Moray to his home area or remain where he is."
		gen_action_area(view, game.location[B_MORAY])
		gen_action_area(view, AREA_MORAY)
	},
	disband: function () {
		game.turn_log.push([area_tag(AREA_MORAY), "Pool"])
		disband(B_MORAY)
		game.who = NOBODY
		goto_scottish_king()
	},
	area: function (to) {
		let from = game.location[B_MORAY]
		if (to !== from)
			game.turn_log.push([area_tag(AREA_MORAY), area_tag(to)])
		game.location[B_MORAY] = to
		game.who = NOBODY
		goto_scottish_king()
	},
}

function king_can_go_home(current) {
	for (let where = first_map_area; where < area_count; ++where)
		if (where !== current && is_cathedral_area(where))
			if (is_friendly_or_neutral_area(where))
				return true
	return false
}

function goto_scottish_king() {
	print_turn_log_no_count("Scottish nobles went home:")

	// We can end winter early if Moray and Wallace are dead or on the map, and Moray is not overstacked
	if (game.year === game.end_year) {
		let e = count_english_nobles()
		let s = count_scottish_nobles()
		// We have a clear winner.
		if (s > 7 || e > 7)
			return goto_game_over()
		// Moray is dead so there can be no tie.
		if (game.location[B_MORAY] === NOWHERE)
			return goto_game_over()
		// Wallace is dead so there can be no tie breaker.
		if (game.location[B_WALLACE] === NOWHERE)
			return goto_game_over()
		// A tie is possible, need to continue to disband and build phase...
	}

	if (is_on_map(B_KING) && king_can_go_home(game.location[B_KING])) {
		game.state = 'scottish_king'
		game.active = SCOTLAND
		game.who = B_KING
	} else {
		goto_edward_wintering()
	}
}

states.scottish_king = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for Scotland to move the King."
		view.prompt = "Scottish King: Move the King to a cathedral or remain where he is."
		gen_action_area(view, game.location[B_KING])
		for (let where = first_map_area; where < area_count; ++where) {
			if (is_cathedral_area(where))
				if (is_friendly_or_neutral_area(where))
					gen_action_area(view, where)
		}
	},
	disband: function () {
		log("Scottish King disbanded.")
		disband(B_KING)
		game.who = NOBODY
		goto_edward_wintering()
	},
	area: function (to) {
		if (game.location[B_KING] !== to) {
			log("Scottish King moved to " + area_tag(to) + ".")
			game.location[B_KING] = to
		}
		game.who = NOBODY
		goto_edward_wintering()
	},
}

function is_in_scotland(who) {
	return is_on_map(who) && game.location[who] !== AREA_ENGLAND
}

function goto_edward_wintering() {
	if (game.edward === 1 && game.year !== 1306 && is_in_scotland(B_EDWARD) && !game.wintered_last_year) {
		game.active = ENGLAND
		game.who = B_EDWARD
		game.state = 'edward_wintering'
		return
	}

	if (game.edward === 1 && game.year === 1306) {
		log("Edward I died.")
		game.edward = 2
	}

	if (is_on_map(B_EDWARD)) {
		log("Edward disbanded.")
		disband(B_EDWARD)
	}

	game.wintered_last_year = false
	goto_english_disbanding()
}

function disband_edward() {
	log("Edward disbanded.")
	disband(B_EDWARD)
	game.who = NOBODY
	game.wintered_last_year = false
	goto_english_disbanding()
}

function winter_edward() {
	log("Edward wintered in " + area_tag(game.location[B_EDWARD]) + ".")
	game.who = NOBODY
	game.wintered_last_year = true
	goto_english_disbanding()
}

states.edward_wintering = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for England to winter in Scotland or disband."
		view.prompt = "Edward Wintering: Winter in Scotland or disband."
		gen_action(view, 'winter')
		gen_action(view, 'disband')
		gen_action_area(view, game.location[B_EDWARD])
		gen_action_area(view, AREA_ENGLAND)
	},
	winter: function () {
		winter_edward()
	},
	disband: function () {
		disband_edward()
	},
	area: function (to) {
		if (to === AREA_ENGLAND)
			disband_edward()
		else
			winter_edward()
	},
}

function goto_english_disbanding() {
	game.active = ENGLAND
	game.turn_log = []
	let ask = false
	for (let b = 0; b < block_count; ++b) {
		let where = game.location[b]

		// All (English) blocks in England must disband.
		// Scottish blocks disband later during the castle limit check.
		if (where === AREA_ENGLAND && block_owner(b) === ENGLAND) {
			game.turn_log.push([area_tag(AREA_ENGLAND)])
			disband(b)
		}

		if (block_owner(b) === ENGLAND && is_on_map(b)) {
			// Knights, Archers, & Hobelars must disband except when wintering with Edward.
			let type = block_type(b)
			if (type === 'knights' || type === 'archers' || type === 'hobelars') {
				if (where === game.location[B_EDWARD]) {
					ask = true
				} else {
					game.turn_log.push([area_tag(where)])
					disband(b)
				}
			}

			// Infantry may remain in Scotland subject to Castle Limits or wintering with Edward.
			if (type === 'infantry') {
				ask = true
			}
		}
	}
	if (ask) {
		game.state = 'english_disbanding'
		clear_undo()
	} else {
		print_turn_log("disbanded")
		goto_wallace()
	}
}

states.english_disbanding = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for England to disband."

		gen_action_undo(view)

		// Mandatory disbanding
		let okay_to_end = true
		for (let b = 0; b < block_count; ++b) {
			if (block_owner(b) === ENGLAND && is_on_map(b)) {
				let where = game.location[b]
				let type = block_type(b)
				if (type === 'infantry') {
					if (!is_within_castle_limit(where) && where !== game.location[B_EDWARD]) {
						okay_to_end = false
						gen_action_block(view, b)
					}
				}
			}
		}

		if (!okay_to_end)
		{
			view.prompt = "English Disbanding: Disband units in excess of castle limits."
		}
		else
		{
			// Voluntary disbanding
			view.prompt = "English Disbanding: You may disband units to the pool."
			gen_action(view, 'end_disbanding')
			for (let b = 0; b < block_count; ++b) {
				if (block_owner(b) === ENGLAND && is_on_map(b)) {
					let type = block_type(b)
					if (type === 'knights' || type === 'archers' || type === 'hobelars')
						gen_action_block(view, b)
					if (type === 'infantry')
						gen_action_block(view, b)
				}
			}
		}
	},
	block: function (who) {
		push_undo()
		game.turn_log.push([area_tag(game.location[who])])
		disband(who)
	},
	end_disbanding: function () {
		print_turn_log("disbanded")
		clear_undo()
		goto_wallace()
	},
	undo: pop_undo
}

function heal_wallace() {
	let old = game.steps[B_WALLACE]
	game.steps[B_WALLACE] = Math.min(block_max_steps(B_WALLACE), game.steps[B_WALLACE] + 2)
	let n = game.steps[B_WALLACE] - old
	if (n === 1)
		log("Wallace gained 1 step.")
	else if (n === 2)
		log("Wallace gained 2 steps.")
}

function goto_wallace() {
	game.active = SCOTLAND
	if (game.location[B_WALLACE] === AREA_SELKIRK) {
		heal_wallace()
		goto_scottish_disbanding()
	} else if (is_on_map(B_WALLACE) && is_friendly_or_neutral_area(AREA_SELKIRK)) {
		game.state = 'wallace'
		game.who = B_WALLACE
	} else {
		goto_scottish_disbanding()
	}
}

states.wallace = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for Scotland to move Wallace."
		view.prompt = "Scottish Disbanding: Move Wallace to Selkirk and gain 2 steps or remain where he is."
		gen_action_area(view, game.location[B_WALLACE])
		gen_action_area(view, AREA_SELKIRK)
	},
	area: function (to) {
		if (to === AREA_SELKIRK) {
			log("Wallace went home to " + area_tag(to) + ".")
			heal_wallace()
		}
		game.location[B_WALLACE] = to
		game.who = NOBODY
		goto_scottish_disbanding()
	},
}

function goto_scottish_disbanding() {
	game.active = SCOTLAND
	game.turn_log = []
	let ask = false
	for (let b = 0; b < block_count; ++b) {
		if (block_owner(b) === SCOTLAND && is_on_map(b)) {
			let type = block_type(b)
			if (type !== 'nobles')
				ask = true
		}
	}
	if (ask) {
		game.state = 'scottish_disbanding'
		clear_undo()
	} else {
		print_turn_log("disbanded")
		goto_scottish_builds()
	}
}

states.scottish_disbanding = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for Scotland to disband."

		gen_action_undo(view)

		// Mandatory disbanding
		let okay_to_end = true
		for (let b = 0; b < block_count; ++b) {
			if (block_owner(b) === SCOTLAND && is_on_map(b)) {
				let where = game.location[b]
				if (b === B_WALLACE && where === AREA_SELKIRK)
					continue
				let type = block_type(b)
				if (type !== 'nobles') {
					if (!is_within_castle_limit(where)) {
						okay_to_end = false
						gen_action_block(view, b)
					}
				}
			}
		}

		if (!okay_to_end) {
			view.prompt = "Scottish Disbanding: Disband units in excess of castle limits."
		} else {
			// Voluntary disbanding
			view.prompt = "Scottish Disbanding: You may disband units to the pool."
			gen_action(view, 'end_disbanding')
			for (let b = 0; b < block_count; ++b) {
				if (block_owner(b) === SCOTLAND && is_on_map(b)) {
					let type = block_type(b)
					if (type !== 'nobles')
						gen_action_block(view, b)
				}
			}
		}
	},
	block: function (who) {
		push_undo()
		game.turn_log.push([area_tag(game.location[who])])
		disband(who)
	},
	end_disbanding: function () {
		print_turn_log("disbanded")
		clear_undo()
		goto_scottish_builds()
	},
	undo: pop_undo
}

function goto_scottish_builds() {
	game.active = SCOTLAND

	if (!game.french_knights && count_scottish_nobles() >= 8) {
		log("French knights added to pool.")
		game.french_knights = true
		game.location[B_FRENCH_KNIGHTS] = S_BAG
		game.steps[B_FRENCH_KNIGHTS] = block_max_steps(B_FRENCH_KNIGHTS)
	}

	game.rp = Array(area_count).fill(0)
	for (let where = first_map_area; where < area_count; ++where)
		if (is_friendly_area(where))
			game.rp[where] = castle_limit(where)
	game.state = 'scottish_builds'
	game.turn_log = []
	clear_undo()
}

function can_build_scottish_block_in(where) {
	if (is_under_castle_limit(where)) {
		if (where === AREA_LANARK || where === AREA_BADENOCH)
			return count_blocks_in_area_excluding(S_BAG, [ B_NORSE, B_FRENCH_KNIGHTS ]) > 0
		else
			return count_blocks_in_area(S_BAG) > 0
	}
	return false
}

states.scottish_builds = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for Scotland to build."
		gen_action_undo(view)
		let done = true
		for (let where = 1; where < area_count; ++where) {
			let rp = game.rp[where]
			if (rp > 0) {
				for (let b = 0; b < block_count; ++b) {
					if (game.location[b] === where && game.steps[b] < block_max_steps(b)) {
						gen_action_block(view, b)
						done = false
					}
				}
				if (can_build_scottish_block_in(where)) {
					gen_action_area(view, where)
					done = false
				}
			}
		}
		if (done) {
			view.prompt = "Scottish Builds: Deploy or reinforce armies \u2014 done."
			gen_action(view, 'end_builds')
		} else {
			view.prompt = "Scottish Builds: Deploy or reinforce armies."
		}
	},
	area: function (where) {
		let who
		if (where === AREA_LANARK || where === AREA_BADENOCH)
			who = draw_from_bag(S_BAG, [ B_NORSE, B_FRENCH_KNIGHTS ])
		else
			who = draw_from_bag(S_BAG)
		if (who !== NOBODY) {
			clear_undo() // no undo after drawing from the bag!
			game.turn_log.push([area_tag(where)])
			game.location[who] = where
			game.steps[who] = 1
			--game.rp[where]
		}
	},
	block: function (who) {
		push_undo()
		let where = game.location[who]
		game.turn_log.push([area_tag(where)])
		--game.rp[where]
		++game.steps[who]
	},
	end_builds: function () {
		print_turn_log("built")
		game.rp = null
		clear_undo()
		goto_english_builds()
	},
	undo: pop_undo
}

function goto_english_builds() {
	game.active = ENGLAND
	game.rp = Array(area_count).fill(0)
	for (let where = first_map_area; where < area_count; ++where)
		if (is_friendly_area(where))
			game.rp[where] = castle_limit(where)
	game.state = 'english_builds'
	game.turn_log = []
}

states.english_builds = {
	prompt: function (view, current) {
		if (is_inactive_player(current))
			return view.prompt = "Waiting for England to build."
		gen_action_undo(view)
		let done = true
		for (let where = 1; where < area_count; ++where) {
			let rp = game.rp[where]
			if (rp > 0) {
				for (let b = 0; b < block_count; ++b) {
					if (game.location[b] === where && game.steps[b] < block_max_steps(b)) {
						let type = block_type(b)
						if (type === 'nobles' || type === 'infantry') {
							gen_action_block(view, b)
							done = false
						}
					}
				}
			}
		}
		if (done) {
			view.prompt = "English Builds: Reinforce armies \u2014 done."
			gen_action(view, 'end_builds')
		} else {
			view.prompt = "English Builds: Reinforce armies."
		}
	},
	block: function (who) {
		push_undo()
		let where = game.location[who]
		game.turn_log.push([area_tag(where)])
		--game.rp[where]
		++game.steps[who]
	},
	end_builds: function () {
		clear_undo()
		print_turn_log("built")
		game.rp = null
		goto_english_feudal_levy()
	},
	undo: pop_undo
}

function goto_english_feudal_levy() {
	if (!is_on_map(B_EDWARD)) {
		let count = Math.ceil(count_blocks_in_area(E_BAG) / 2)
		log("English feudal levy:\n" + count + " England")
		deploy_english(count)
	}
	end_winter_turn()
}

function end_winter_turn() {
	if (count_english_nobles() === 0) {
		game.victory = "Scotland won by controlling all the nobles!"
		game.result = SCOTLAND
	}
	if (count_scottish_nobles() === 0) {
		game.victory = "England won by controlling all the nobles!"
		game.result = ENGLAND
	}
	if (game.victory)
		return goto_game_over()

	if (++game.year > game.end_year)
		goto_game_over()
	else
		start_year()
}

function goto_game_over() {
	if (!game.victory) {
		let e = count_english_nobles()
		let s = count_scottish_nobles()
		if (e > s) {
			game.victory = "England won by controlling the most nobles!"
			game.result = ENGLAND
		} else if (s > e) {
			game.victory = "Scotland won by controlling the most nobles!"
			game.result = SCOTLAND
		} else {
			if (is_on_map(B_WALLACE)) {
				game.victory = "Tied for control of nobles. Scotland won because Wallace was on the map!"
				game.result = SCOTLAND
			} else {
				game.victory = "Tied for control of nobles. England won because Wallace was dead or in the draw pool!"
				game.result = ENGLAND
			}
		}
	}
	log("")
	log(game.victory)
	game.active = "None"
	game.state = 'game_over'
}

states.game_over = {
	prompt: function (view) {
		view.prompt = game.victory
	}
}

function make_battle_view() {
	let battle = {
		EF: [], ER: [],
		SF: [], SR: [],
		flash: game.flash
	}

	battle.title = game.attacker[game.where] + " attacks " + area_name(game.where)
	battle.title += " \u2014 round " + game.battle_round + " of 3"

	function fill_cell(cell, owner, fn) {
		for (let b = 0; b < block_count; ++b)
			if (game.location[b] === game.where & block_owner(b) === owner && fn(b))
				cell.push(b)
	}

	fill_cell(battle.ER, ENGLAND, b => is_battle_reserve(b))
	fill_cell(battle.EF, ENGLAND, b => !is_battle_reserve(b))
	fill_cell(battle.SR, SCOTLAND, b => is_battle_reserve(b))
	fill_cell(battle.SF, SCOTLAND, b => !is_battle_reserve(b))

	return battle
}

exports.setup = function (seed, scenario, options) {
	game = {
		seed: seed,
		log: [],
		undo: [],
		moves: 0,

		location: [],
		steps: [],
		moved: [],
		reserves: [],

		attacker: {},
		border_limit: {},
		last_used: {},
		main_border: {},
		main_origin: {},
		show_cards: 0,
		who: NOBODY,
		where: NOWHERE,
	}

	if (options.rng)
		game.rng = options.rng

	if (scenario === "The Bruce")
		setup_the_bruce()
	else if (scenario === "Braveheart")
		setup_braveheart()
	else if (scenario === "Campaign")
		setup_campaign()
	else
		throw new Error("Unknown scenario:", scenario)

	if (options.autohit)
		game.autohit = 1

	log(".h1 " + scenario)
	start_year()
	return game
}

exports.action = function (state, current, action, arg) {
	game = state
	let S = states[game.state]
	if (action in S) {
		S[action](arg, current)
	} else {
		throw new Error("Invalid action " + action + " in state " + game.state)
	}
	return game
}

exports.resign = function (state, current) {
	game = state
	if (game.state !== 'game_over') {
		log("")
		log(current + " resigned.")
		game.active = "None"
		game.state = 'game_over'
		game.victory = current + " resigned."
		game.result = ENEMY[current]
	}
	return game
}

function observer_hand() {
	let hand = []
	hand.length = Math.max(game.e_hand.length, game.s_hand.length)
	hand.fill(0)
	return hand
}

exports.is_checkpoint = (a, b) => a.turn !== b.turn

exports.view = function(state, current) {
	game = state

	let view = {
		log: game.log,
		year: game.year,
		turn: 6 - (game.e_hand.length + (game.e_card ? 1 : 0)),
		edward: game.edward,
		e_vp: count_english_nobles(),
		s_vp: count_scottish_nobles(),
		e_card: (game.show_cards || current === ENGLAND) ? game.e_card : 0,
		s_card: (game.show_cards || current === SCOTLAND) ? game.s_card : 0,
		hand: (current === ENGLAND) ? game.e_hand : (current === SCOTLAND) ? game.s_hand : observer_hand(),
		who: (game.active === current) ? game.who : NOBODY,
		where: game.where,
		location: game.location,
		steps: game.steps,
		moved: game.moved,
		active: game.active,
	}

	states[game.state].prompt(view, current)

	if (states[game.state].show_battle)
		view.battle = make_battle_view()

	return view
}

// === COMMON LIBRARY ===

// remove item at index (faster than splice)
function array_remove(array, index) {
	let n = array.length
	for (let i = index + 1; i < n; ++i)
		array[i - 1] = array[i]
	array.length = n - 1
	return array
}

// insert item at index (faster than splice)
function array_insert(array, index, item) {
	for (let i = array.length; i > index; --i)
		array[i] = array[i - 1]
	array[index] = item
	return array
}

function set_clear(set) {
	set.length = 0
}

function set_has(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return true
	}
	return false
}

function set_add(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return set
	}
	return array_insert(set, a, item)
}

function set_delete(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return array_remove(set, m)
	}
	return set
}

function set_toggle(set, item) {
	let a = 0
	let b = set.length - 1
	while (a <= b) {
		let m = (a + b) >> 1
		let x = set[m]
		if (item < x)
			b = m - 1
		else if (item > x)
			a = m + 1
		else
			return array_remove(set, m)
	}
	return array_insert(set, a, item)
}

// Fast deep copy for objects without cycles
function object_copy(original) {
	if (Array.isArray(original)) {
		let n = original.length
		let copy = new Array(n)
		for (let i = 0; i < n; ++i) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	} else {
		let copy = {}
		for (let i in original) {
			let v = original[i]
			if (typeof v === "object" && v !== null)
				copy[i] = object_copy(v)
			else
				copy[i] = v
		}
		return copy
	}
}

function clear_undo() {
	if (game.undo.length > 0)
		game.undo = []
}

function push_undo() {
	let copy = {}
	for (let k in game) {
		let v = game[k]
		if (k === "undo")
			continue
		else if (k === "log")
			v = v.length
		else if (typeof v === "object" && v !== null)
			v = object_copy(v)
		copy[k] = v
	}
	game.undo.push(copy)
}

function pop_undo() {
	let save_log = game.log
	let save_undo = game.undo
	game = save_undo.pop()
	save_log.length = game.log
	game.log = save_log
	game.undo = save_undo
}
