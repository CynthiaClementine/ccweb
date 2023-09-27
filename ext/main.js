window.onload = setup;
window.onresize = handleResize;
window.onkeydown = handleKeyDown;
window.onkeyup = handleKeyUp;

var animation;
var animation_fps;

var audio_bgChannel = new AudioChannel(0.5);
var audio_sfxChannel = new AudioContainer(0.5);
var audio_fadeTime = 40;

var base64 = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+=`;
var base64_inv = invertList(base64);

var bg_canvas;
var btx;
var bg_chunkW = 80;
var bg_chunkH = 80;
var bg_tw = 60;
var bg_chunkStart = [-2, -2];
//this array is laid out so that y goes down visually, and x goes across visually
var bgg = function(id) {
	return getImage(`img/ter${id}.png`, true);
}
var bg_chunkArr = [
	[undefined, undefined, undefined, undefined, undefined],
	[undefined, undefined, undefined, undefined, undefined],
	[undefined, undefined, bgg(`r00`), bgg(`r10`), bgg(`r20`)],
	[undefined, undefined, undefined, undefined, undefined],
	[undefined, undefined, undefined, undefined, undefined],
	[],
];

var button_acceptingInput = undefined;
var button_acceptingOutput = undefined;
var button_queue = [];
var button_alt = false;
var button_shift = false;
var button_conversions = {
	'ShiftLeft': 'Shift',
	'ShiftRight': 'Shift',
	'KeyW': 'Up',
	'ArrowUp': 'Up',
	'KeyA': 'Left',
	'ArrowLeft': 'Left',
	'KeyS': 'Down',
	'ArrowDown': 'Down',
	'KeyD': 'Right',
	'ArrowRight': 'Right',
	'Space': 'Magic',
	'KeyX': 'Magic',

	'KeyZ': 'Interact',
	'Enter': 'Interact'
};
var camera = new Camera(0, 0, 40);
var camera_xStops = [4, 16, 32, 80];

var collision_binSize = 10;
var collision_bins = [[]];

var cursor = {
	x: 0,
	y: 0,
	down: false,
	pastPoint: [0, 0]
};


var color_bg = "#000000";
var color_castleEntities = "#888888";
var color_collision = "#fb055f";
var color_health = "#87097C";
var color_magic = "#9966FF";
var color_textBackground = "#04061D";
var color_textDefault = "#FFFFFF";
var color_editorBg = "#222222";
var color_editorGrid = "#222222";
var color_editorHighlight = "#FF00FF";
var color_editorHighlight2 = "#FF8800";
var color_editorPanelLight = "#414446";
var color_editorPolygon = "#FFFF00";
var color_menuPrimary = "#FEFF99";
var color_menuSecondary = "#DBD9AB";
var color_menuText = "#4B4C54";


//music is the actual data
//bpm is beats per minute
//activeBeats is how many beats are in the loop (generally expressed in measures * beats per measure)
//inactive beats is for if the loop starts part of the way through the song (the inactive beats are not looped)
/*
"audio name": {
	music: [Audio class data],
	bpm: [number]
	activeBeats: [number]
	?loop: boolean - tells whether to loop the music. If not included, is by default true
}
*/
var data_audio = {
	"leafyOverworld": {
		music: new Audio(`aud/largeLeafCanyon.mp3`),
		bpm: 100,
		activeBeats: 24 * 8
	},
	"none": {
		music: undefined,
		activeBeats: 12 * 12
	},
	
	//sfx
	"fxChoco": new Audio(`audFx/chocolate.mp3`),
	"fxContact": new Audio(`audFx/contactDamage.mp3`),
	"fxOcohc": new Audio(`audFx/chocolateInverse.mp3`),
	"fxOrbL": new Audio(`audFx/largeOrb.mp3`),
	"fxOrbS": new Audio(`audFx/smallOrb.mp3`),
	"fxMiss": new Audio(`audFx/whiff.mp3`),
	"fxHit": new Audio(`audFx/enemyHit.mp3`),
	"fxBeHit": new Audio(`audFx/playerHit.mp3`),
	"fxShatter": new Audio(`audFx/shatter.mp3`),

	"fxStep0": new Audio(`audFx/stepGrass.mp3`),
	"fxStep2": new Audio(`audFx/stepSoftStone.mp3`),
	"fxStep3": new Audio(`audFx/stepSand.mp3`),
	"fxStep4": new Audio(`audFx/stepWood.mp3`),
	"fxStep5": new Audio(`audFx/stepCarpet.mp3`),
	"fxStep6": new Audio(`audFx/stepStone.mp3`),
	"fxStep7": new Audio(`audFx/stepSnow.mp3`),
};

/*
alias - should images be aliased
x - player x storage
y - player y storage
music - music storage

data gets saved every few seconds as long as the player isn't in a conversation or fighting. This is to prevent weird music chicanery from happening 
(as well as potential skips where player loads into a cutscene area they shouldn't)
*/
var data_persistent = {
	class: "warrior",
	chocos: [0,0,0],
	ends: 0,

	alias: false,
	vols: [0.5,0.5],
	x: 0,
	y: 0,
	music: 'none'
};
var data_persistentDefaults = JSON.parse(JSON.stringify(data_persistent));

var data_terrain = {
	'w':[],
	'r':[[[67.1,33.6],[69.6,32.1]],[[63.8,33.7],[67.1,33.6]],[[60.9,35.7],[63.8,33.7]],[[46.3,41.7],[60.9,35.7]],[[42.3,41.9],[46.3,41.7]],[[37.1,44.2],[42.3,41.9]],[[31.5,43.9],[37.1,44.2]],[[27.1,46],[31.5,43.9]],[[22.1,45.8],[27.1,46]],[[16.6,48.3],[22.1,45.8]],[[9.3,48.2],[16.6,48.3]],[[10.5,53.8],[0.7,56.2]],[[2.5,50.6],[9.3,48.2]],[[177,41],[177,50]],[[171.5,55.6],[171,55.6]],[[171.5,54.4],[171.5,55.6]],[[167.7,54.4],[171.5,54.4]],[[167.7,50],[167.7,54.4]],[[172.2,50],[167.7,50]],[[172.2,51.5],[172.2,50]],[[173,51.5],[172.2,51.5]],[[173,50],[173,51.5]],[[177,50],[173,50]],[[69.6,32.1],[78.2,32.1]],[[78.2,32.1],[85.3,29.8]],[[171,67],[167,67]],[[171,55.6],[171,67]],[[114,50],[108.5,46.9]],[[120.7,56.6],[114,50]],[[128.8,60.6],[120.7,56.6]],[[134.6,61.5],[128.8,60.6]],[[139.1,60.4],[134.6,61.5]],[[144.8,56.6],[139.1,60.4]],[[151,50.3],[144.8,56.6]],[[152.6,46.5],[151,50.3]],[[152.7,42.7],[152.6,46.5]],[[150.5,38],[152.7,42.7]],[[146.1,34.7],[150.5,38]],[[138.7,33.3],[146.1,34.7]],[[131.9,29.4],[138.7,33.3]],[[127.3,27.8],[131.9,29.4]],[[115.6,27.4],[127.3,27.8]],[[108.9,29.4],[115.6,27.4]],[[100.5,30.6],[108.9,29.4]],[[92.9,29.8],[100.5,30.6]],[[85.3,29.8],[92.9,29.8]],[[18.1,54.3],[10.5,53.8]],[[23.1,52],[18.1,54.3]],[[29,52.7],[23.1,52]],[[35.9,50.2],[29,52.7]],[[39.2,49.9],[35.9,50.2]],[[44.2,52.1],[39.2,49.9]],[[47.6,52.3],[44.2,52.1]],[[53.1,50.4],[47.6,52.3]],[[56.4,50],[53.1,50.4]],[[60.5,47.8],[56.4,50]],[[63.6,47.8],[60.5,47.8]],[[73.4,45.1],[63.6,47.8]],[[78.9,45],[73.4,45.1]],[[86.7,43.8],[78.9,45]],[[91.2,44.3],[86.7,43.8]],[[99,46.3],[91.2,44.3]],[[108.5,46.9],[99,46.3]],[[177,63],[177,55]],[[181,63],[177,63]],[[181,55],[181,63]],[[177,55],[181,55]]],
	'y':[],
	'g':[],
	't':[],
	'b':[],
	'p':[]
};
var layerInteracts = {
	'r': ['w', 'r', 'y', 'p'],
	'g': ['w', 'y', 'g', 't'],
	'b': ['w', 't', 'b', 'p']
};


var deferredFunc;

var editor_active = false;
var editor_creatables = [
	[`collision`, 	(x, y) => {data_terrain[player.layer].push([[x - 1, y - 1], [x + 1, y + 1]])}],
	[`portal`, 		(x, y) => {return new Portal()}], //layer, position
	[`trigger`, 	(x, y) => {}], //cutscene, music, spawn
	[`audioSource`, (x, y) => {}], 
	[`entity`, 		(x, y) => {}], //npc, enemy, moth, dreamskater, debug comments, etc
	[`tileEntity`, 	(x, y) => {}], //walls n' stuff, animated textures
]
var editor_entity = undefined;
var editor_value = 0;
var editor_layerColors = {
	'w': "#FFF",
	'r': "#F88",
	'y': "#FF8",
	'g': "#8F8",
	't': "#8FF",
	'b': "#88F",
	'p': "#F8F"
};
var editor_locations = [
	[0, 0]
];
var editor_polyPoints = [];
var editor_pointSelected = -1;
var editor_selectTolerance = 10;

var editor_sidebarW = 0.24;
var editor_topbarH = 0.04;
var editor_sidebarHs = [0.06, 0.4, 0.82];

var fight_boundsUL = [];
var fight_boundsDR = [];
var fight_onSuccess;
var fight_onFail;
var fight_fadeTimer = 0;
var fight_fadeTimerMax = 100;

var dt_tLast = 0;
var dt_buffer = [];
dt_buffer.maxLen = 30;

var game_mainLoop;

var menu_texture = new Texture(getImage(`img/menuBg.png`), data_textures.tileSize, 1e1001, [16, 12], [8, 6], [[0, 0]], false);
var menu_rate = 0;
var menu_rateMagnitude = 3;
var menu_t = 0;


var player;

var render_bgFilterOpacity = 0;
var render_fgFilterOpacity = 0;
var render_chocoOverlay = new Texture(data_textures.TileEntities.sheet, data_textures.tileSize, ...data_textures.TileEntities.chocWorld, false);
var render_hpMEdge = 0.025;
var render_hpMBar = 0.006;
var render_hpHeight = 0.05;
var render_iframePeriod = 1 / 6;

var text_charsPerSec = 120;
var text_filterTime = 2 / 3;
var text_size = 0.04;
var text_tabsCount = 8;

var terrain_starChainMax = 4;
//8 surfaces	//0 - grass, 1 - wall
/*
0 - grass
1 - wall
2 - soft stone
3 - sandy path
4 - wood
5 - carpet
6 - stone
7 - snow????
*/
var terrain_surfaces = ["fxStep0", undefined, "fxStep2", "fxStep3", "fxStep4", "fxStep5", "fxStep6", "fxStep7"];
var terrain_tileUnits = 0.5;

var time_default = 30;

var vScale = 0.8;

var weapon_damages = [0, 1, 4];


var wildder = getImage(`img/terrainWilderness.png`);
var bgts = data_textures.Roofs.tileSize;
var daTex = data_textures;

var entities = [];
var world_entities = entities;

//TODO: make some automated way to create these, it's super annoying to type them out
var world_roofs = [
	//oak trees
	TRoofFactory(47.4, 24.3, daTex.Roofs.oakBranches3, []),
	TRoofFactory(59.1, 26.55, daTex.Roofs.oakBranches1, []),
	TRoofFactory(50.15, 34.7, daTex.Roofs.oakBranches2, []),
	TRoofFactory(44.55, 38.1, daTex.Roofs.oakBranches1, []),
	TRoofFactory(47.05, 48.7, daTex.Roofs.oakBranches2, []),

	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy3[0], 47, 23.3, ...daTex.Roofs.oakCanopy3[1], [[53.1,23.4],[56.1,24.9],[57.7,27.6],[56.9,31.3],[55,33.3],[52.8,34.6],[50,34.8],[47.3,31.2],[47.2,29],[49.9,27],[50.3,24.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy1[0], 58.2, 25.9, ...daTex.Roofs.oakCanopy1[1], [[63,25.9],[66.5,26.1],[68.9,30.8],[66.5,35.4],[62.4,35.5],[59.8,33.9],[58.1,31.2],[58.4,28.4]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy2[0], 49.15, 33.7, ...daTex.Roofs.oakCanopy2[1], [[49.5,34.9],[55.4,33.4],[57.9,35.1],[60.1,38.9],[56.5,42],[52.5,42.5],[48.8,37.3]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy1[0], 43.5, 37.5, ...daTex.Roofs.oakCanopy1[1], [[42.7,38.4],[51.1,37.2],[54.4,41.9],[51.8,47.1],[47.5,47],[44.1,44.6]]),
	new Texture_Roof(daTex.Roofs.sheet, bgts, ...daTex.Roofs.oakCanopy2[0], 46.3, 47.6, ...daTex.Roofs.oakCanopy2[1], [[46.6,48.8],[50.9,47.4],[53.8,47.7],[57.8,52.6],[52.1,56.6],[49.1,56],[45.9,50.8]]),
];
/**
 * creates a roof texture with less information than would be required (since a lot of the information you put into a roof constructor is the same)
 * @param {Number} x The leftmost x coordinate of the object
 * @param {Number} y The top-most y coordinate of the object
 * @param {Number[][]} xywhData The texture x,y,width,height data 
 * @param {Number[][]|undefined} bounding OPTIONAL: the bounding box that will make the roof transluscent
 */
function TRoofFactory(x, y, xywhData, bounding) {
	return new Texture_Roof(daTex.Roofs.sheet, bgts, xywhData[0][0], xywhData[0][1], x, y, xywhData[1][0], xywhData[1][1], bounding)
}

function setup() {
	//sneaky sneaky - by having the user click to load, they are unknowingly consenting to play audio and also to have their clipboard copied to
	//don't do things like this in real life it's frowned upon and also probably a crime
	loadingText.innerHTML = `<button onclick="setup2()">Begin program</button>`;
}

function setup2() {
	canvas = document.getElementById("convos");
	canvas2 = document.getElementById("convosSecret");
	bg_canvas = document.createElement("canvas");
	ctx = canvas.getContext("2d");
	cty = canvas2.getContext("2d");
	btx = bg_canvas.getContext("2d");

	loadingText.innerHTML = "";

	// importWorld(data_terrain.replaceAll("\n", ""));

	player = new Player(17.55, 35.65, 'r');
	audio_bgChannel.target = data_audio["outside"];

	handleResize();
	localStorage_read();
	rasterizeBG();


	game_mainLoop = main;
	animation = window.requestAnimationFrame(runGame);
}

function runGame() {
	var newTime = performance.now();
	var dt = clamp(newTime - dt_tLast, 1, 30) / 1000;
	dt_tLast = newTime;
	dt_buffer.push(dt);
	if (dt_buffer.length > dt_buffer.maxLen) {
		dt_buffer.shift();
	}

	game_mainLoop(dt);
	animation = window.requestAnimationFrame(runGame);
}

function runWorld(dt, fightActive) {
	//audo 
	audio_bgChannel.tick(dt);


	//camera
	camera.tick(dt);
	
	//world
	drawWorldBG();

	//background filter, if active
	if (render_bgFilterOpacity > 0) {
		ctx.globalAlpha = render_bgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//entities
	if (!fightActive) {
		player.tick(dt);
		player.draw(dt);
	}

	//make a copy of the array so that adding/removing entities doesn't mess up the loop
	world_entities.slice(0).forEach(v => {
		v.tick();
		v.draw();
		
		if (v.DELETE) {
			//make sure to not softlock the player
			if (player.convoPartner == v) {
				v.endConversation();
			}
			
			world_entities.splice(world_entities.indexOf(v), 1);
		}
	});

	world_roofs.forEach(w => {
		w.tick();
		w.draw();
	});

	//run the deferred function if there is one
	if (deferredFunc != undefined) {
		deferredFunc();
		deferredFunc = undefined;
	}

	//save the game if in the main world without conversing
	if (!fightActive && player.convoPartner == undefined && animation % 180 == 1) {
		localStorage_write();
	}

	//foreground filter, if active
	if (render_fgFilterOpacity > 0) {
		ctx.globalAlpha = render_fgFilterOpacity;
		ctx.fillStyle = color_bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;
	}

	//chocolate count overlay
	if (player.chocolate > 0) {
		var chocoUnit = canvas.width / 40;
		render_chocoOverlay.draw(chocoUnit, chocoUnit, 0, chocoUnit * 2);
		drawText(player.chocolate, chocoUnit * 2, chocoUnit * 0.9, `${chocoUnit}px Playfair Display`, "#321801");
	}
}

function runEnding() {
	//background
	ctx.fillStyle = color_bg;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	audio_bgChannel.tick();

	//rectangle around the screen
	var margin = canvas.height / 25;
	ctx.strokeStyle = (player.magicLearned) ? color_magic : color_castleEntities;
	ctx.lineWidth = canvas.height / 50;
	ctx.beginPath();
	ctx.rect(margin, margin, canvas.width - (2 * margin), canvas.height - (2 * margin));
	ctx.stroke();

	//text
	ctx.font = `${canvas.height / 18}px Playfair Display`;
	var displayText = data_conversations[(data_persistent.ends == 3) ? "outro-allEndings" : "outro-oneEnding"];
	var vOffset = Math.floor(canvas.height / 16);
	for (var h=0; h<displayText.length; h++) {
		drawText(displayText[h], canvas.width / 2, (canvas.height * 0.4) + (vOffset * (h - ((displayText.length - 1) / 2))), NaN, "#FFFFFF", "center");
	}

	drawText(`Reset`, canvas.width / 2, canvas.height * 0.9, `${canvas.height / 30}px Playfair Display`, "#888");
}

function main(dt) {
	if (menu_t > 0 || menu_rate != 0) {
		menu_t = clamp(menu_t + menu_rate * dt, 0, 1);
		//ending movement
		if ((menu_t == 0 && menu_rate < 0) || (menu_t == 1 && menu_rate > 0)) {
			menu_rate = 0;
		}
		drawMenu();
		audio_bgChannel.tick();
		return;
	}
	runWorld(dt, false);
	
	//editor grid
	if (editor_active) {
		drawEditor();

		//make sure this happens in case of screen movement
		if (cursor.down) {
			handleMouseMove_custom();
		}
	}
}

function fight() {
	//same menu handling
	if (menu_t > 0 || menu_rate != 0) {
		menu_t = clamp(menu_t + menu_rate, 0, 1);
		if ((menu_t == 0 && menu_rate < 0) || (menu_t == 1 && menu_rate > 0)) {
			menu_rate = 0;
		}
		drawMenu();
		audio_bgChannel.tick();
		return;
	}
	runWorld(true);

	//entity health
	var enemyCurrentHealth = 0;
	var enemyPossibleHealth = 0;

	world_entities.forEach(v => {
		if (v != player && v.health != undefined) {
			//don't add negative health
			if (v.health > 0) {
				enemyCurrentHealth += v.health;
			}
			enemyPossibleHealth += v.maxHealth;
		}

		//make sure they're inside the bounds
		v.x = clamp(v.x, fight_boundsUL[0], fight_boundsDR[0]);
		v.y = clamp(v.y, fight_boundsUL[1], fight_boundsDR[1]);
	});

	//start the fade out
	if (enemyCurrentHealth <= 0 || player.health <= 0) {
		fight_fadeTimer += 1;
		render_fgFilterOpacity = (fight_fadeTimer / fight_fadeTimerMax) ** 8;

		//if the timer's up end the state
		if (fight_fadeTimer < fight_fadeTimerMax) {
			return;
		}
		fight_fadeTimer = 0;
		//if all enemies' health drops to zero, run the success case
		if (enemyCurrentHealth <= 0) {
			fight_onSuccess();
			fightExit();
			return;
		}
		
		//if the player's health drops to zero, run the fail case
		if (player.health <= 0) {
			player.respawn();
			fight_onFail();
			fightExit();
			return;
		}
	}

	//draw health bars
	var min = canvas.width * render_hpMEdge;
	var buffer = canvas.width * render_hpMBar;
	var hWidth = canvas.width * (0.5 - render_hpMEdge * 2);
	var hHeight = canvas.height * render_hpHeight;
	var wid = canvas.width;

	ctx.lineWidth = canvas.height / 200;
	ctx.strokeStyle = world_entities[world_entities.length-1].color;
	ctx.fillStyle = world_entities[world_entities.length-1].color;
	//enemy
	ctx.beginPath();
	ctx.rect(min, min, hWidth, hHeight);
	ctx.stroke();
	ctx.fillRect(min + buffer, min + buffer, (hWidth - (buffer * 2)) * (enemyCurrentHealth / enemyPossibleHealth), hHeight - (buffer * 2));
	
	//self
	ctx.beginPath();
	ctx.strokeStyle = color_health;
	ctx.fillStyle = color_health;

	ctx.rect(wid - min, min, -hWidth, hHeight);
	ctx.stroke();
	ctx.fillRect(wid - (min + buffer), min + buffer, (hWidth - (buffer * 2)) * -(player.health / player.maxHealth), hHeight - (buffer * 2));
}

function fightExit() {
	render_fgFilterOpacity = 0;
	world_entities = entities;
	player.health = player.maxHealth;
	game_mainLoop = main;
}

function fightStart(fightEntities, fightULBounds, fightDRBounds, onSuccess, onFail) {
	window.setTimeout(() => {
		if (player.convoPartner != undefined) {
			player.convoPartner.endConversation();
		}
		fight_boundsUL = fightULBounds;
		fight_boundsDR = fightDRBounds;
		fight_onSuccess = onSuccess;
		fight_onFail = onFail;
		world_entities = fightEntities;

		game_mainLoop = fight;
	}, 1);
}

function fightStart_angel() {
	lockCastleBoss(1);
	setMusic("angelFight");
	fightStart([player, new Enemy_Angel(141.5, 16)], [131, 7], [152, 25], 
		() => {
			lockCastleBoss(0);
			setMusic("none");
			getEntityFromID("queen").forceConversation("angel-defeat");
		}, 
		() => {
			lockCastleBoss(0);
			setMusic("castle");
		}
	);
}
function fightStart_guard() {
	[player.x, player.y] = [116, 65];
	setMusic("guardFight");
	fightStart([player, new Enemy_Guard(116, 59.5)], [108, 58], [124, 70], 
		() => {
			getEntityFromID('guard1').forceConversation('guard-defeated');
			//put them really far away so you don't see them
			getEntityFromID('guard1').x = 1e1001;
			getEntityFromID('guard2').x = 1e1001;
			getEntityFromID('guard2').DELETE = true;
			setMusic("outside");
		},
		() => {
			setMusic("outside");
		}
	);
}

function fightStart_knights() {
	lockCastleBoss(1);
	setMusic("knightFight");
	fightStart([player, new Enemy_Knight(139.5, 11.5), new Enemy_Knight(141.5, 11.5), new Enemy_Knight(143.5, 11.5)], [131, 7], [152, 25],
		() => {
			lockCastleBoss(0);
			getEntityFromID('knight1').x = 1e1001;
			getEntityFromID('knight1').DELETE = true;
			getEntityFromID('knight2').forceConversation('knights-defeat');
			getEntityFromID('knight3').x = 1e1001;
			getEntityFromID('knight3').DELETE = true;
			getEntityFromID('queen').DELETE = true;
			setMusic("none");
		},
		() => {
			lockCastleBoss(0);
			setMusic("castle");
		}
	);
}

function fightStart_lord() {
	setMusic("lordFight");
	fightStart([player, new Enemy_Lord(16, 12)], [8, 8], [24, 20], 
		() => {
			setMusic("outside");
			getEntityFromID('lord').forceConversation('lord-youWin');
		},
		() => {
			setMusic("outside");
			if (data_persistent.lordFirst) {
				getEntityFromID('lord').forceConversation('lord-youLose');
			} else {
				getEntityFromID('lord').forceConversation('lord-youLose2');
			}
		}
	);
}

function handleKeyDown(a) {
	//some key distinctions are unoptimal for my purposes
	var code = a.code;
	if (button_conversions[code] != undefined) {
		code = button_conversions[code];
	}



	//if in accepting mode, only accept that key
	if (button_acceptingOutput != undefined) {
		return;
	}

	if (button_acceptingInput != undefined) {
		if (button_acceptingInput[0] == code) {
			button_acceptingInput[1]();
			button_acceptingInput = undefined;
		}
		return;
	}

	if (editor_active && code.slice(0, 5) == "Digit") {
		var value = +code.slice(5);

	
		//if shift is pressed, teleport the player to some strategic location.
		if (button_shift) {
			[player.x, player.y] = editor_locations[value];
			return;
		}

		//without shift, numbers control the tile to place
		if (value < 8) {
			editor_value = value;
		}
		return;
	}


	switch (code) {
		case 'Left':
		case 'Up':
		case 'Right':
		case 'Down':
			if (!button_queue.includes(code)) {
				button_queue.push(code);
			}
			//try to dash if the player is holding shift and then presses a direction (as a little quality of life thing)
			if (button_shift) {player.dash();}
			break;
		case 'Interact':
			player.attack_start();
			break;
		case 'Magic':
			if (!player.locked) {
				player.charge();
			}
			break;
		case 'Shift':
			button_shift = true;
			player.dash();
			break;
		case 'AltLeft':
			button_alt = true;
			break;
		case 'BracketRight':
			editor_active = !editor_active;
			break;
		case 'KeyP':
			if (editor_active) {
				console.log(+(cursor.x.toFixed(1)), +(cursor.y.toFixed(1)));
			}
			break;
		case 'Escape':
			if (player.convoPartner == undefined) {
				//escape activates / deactivates the menu
				if (menu_rate <= 0 && menu_t < 1) {
					menu_rate = menu_rateMagnitude;
				} else {
					menu_rate = -menu_rateMagnitude;
				}
			}
			break;
		case "Backspace":
			editor_deleteSelected();
			break;
	}

}

function handleKeyUp(a) {
	var code = a.code;
	if (button_conversions[code] != undefined) {
		code = button_conversions[code];
	}

	if (button_acceptingOutput != undefined && button_acceptingOutput[0] == code) {
		button_acceptingOutput[1]();
		button_acceptingOutput = undefined;
	}

	switch (code) {
		case 'Left':
		case 'Up':
		case 'Right':
		case 'Down':
			if (button_queue.includes(code)) {
				button_queue.splice(button_queue.indexOf(code), 1);
			}
			break;
		case 'Magic':
			if (!player.locked) {
				player.discharge();
			}
			break;
		case 'Shift':
			button_shift = false;
			break;
		case 'AltLeft':
			button_alt = false;
			break;
	}
}

function handleResize() {
	//compute
	var w = window.innerWidth * 0.96;
	var h = window.innerHeight * 0.95;
	var scaleFactor = 480 / 640;

	//resize canvas
	canvas.height = Math.min(h, w * scaleFactor);
	canvas.width = canvas.height / scaleFactor;
	canvas.style["margin-left"] = `-${canvas.width/2}px`;
	canvas2.height = Math.min(h, w * scaleFactor);
	canvas2.width = canvas.height / scaleFactor;
	canvas2.style["margin-left"] = `-${canvas2.width/2}px`;

	//compute camera scaling
	camera.rescale();

	//set canvas preferences
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.imageSmoothingEnabled = !data_persistent.alias;

	cty.textBaseline = "middle";
	cty.textAlign = "left";
	cty.imageSmoothingEnabled = !data_persistent.alias;
}




function handleMouseDown_custom() {
	//if the mouse is outside of the canvas, ignore it
	if (cursor.x > canvas.width || cursor.x < 0 || cursor.y > canvas.height || cursor.y < 0) {
		cursor.down = false;
		return;
	}
	cursor.downTime = dt_tLast;
	if (menu_t > 0.75) {
		handleMouseDown_menu();
		return;
	}

	if (!editor_active) {
		return;
	}

	var spa = screenToSpace(cursor.x, cursor.y);

	if (cursor.x < editor_sidebarW * canvas.width || cursor.y < editor_topbarH * canvas.height) {
		editor_handleMDMenu(cursor.x / canvas.width, cursor.y / canvas.height);
		return;
	}

	editor_entity = undefined;

	if (editor_handleMDCol(spa)) {
		return;
	}

	
	// if (button_alt) {
	// 	if (editor_handleSpritePoly()) {
	// 		return;
	// 	}
	// }

	//if over a roof, try to move it
	for (var h=world_roofs.length-1; h>-1; h--) {
		if (distSquared(world_roofs[h].x - spa[0], world_roofs[h].y - spa[1]) < 0.25) {
			editor_entity = world_roofs[h];
			return;
		}
	}

	cursor.pastPoint = [cursor.x, cursor.y];
}

function handleMouseDown_menu() {
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var baseH = (canvas.height * 0.5) - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//reset
	if (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > baseW && cursor.x < (canvas.width / 2)) {
		reset();
		return;
	}

	//true reset
	if (Math.abs(cursor.y - (baseH + cs*menu_boxSize[1])) < cs && cursor.x > (canvas.width / 2) && cursor.x < canvas.width - baseW) {
		trueReset();
		return;
	}

	//don't bother if the cursor isn't in the preferences range
	if (cursor.y < baseH + cs * 0.5 || cursor.y > baseH + cs * 2.5) {
		return;
	}

	//volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	if (cursor.y < baseH + cs * 1.5) {
		if (cursor.x < canvas.width / 2) {
			var value = clamp(getPercentage(sliderStart1, sliderStart1 + sliderW, cursor.x), 0, 1);
			audio_bgChannel.volume = value;
			//the rounding is so persistent volume measurements aren't too long (0.2834616523 as a string is a lot of characters)
			data_persistent.vols[0] = Math.round(value * 100) / 100;
			//music
		} else {
			//sfx
			var value = clamp(getPercentage(sliderStart2, sliderStart2 + sliderW, cursor.x), 0, 1);
			audio_sfxChannel.volume = value;
			data_persistent.vols[1] = Math.round(value * 100) / 100;
		}
		return;
	}

	//aliasing
	if (cursor.x < canvas.width / 2) {
		data_persistent.alias = !data_persistent.alias;
		ctx.imageSmoothingEnabled = !data_persistent.alias;
		cty.imageSmoothingEnabled = !data_persistent.alias;
	}
}

function handleMouseMove_menu() {
	//just do the volume sldiers
	var menu_boxSize = [12, 8];
	var cs = camera.scale;
	var baseH = (canvas.height * 0.5) - (cs * menu_boxSize[1] / 2);
	var baseW = (canvas.width / 2) - (cs * menu_boxSize[0] / 2);

	//don't bother if the cursor isn't in the preferences range
	if (cursor.y < baseH + cs * 0.5 || cursor.y > baseH + cs * 2.5) {
		return;
	}

	//volume sliders
	var sliderW = cs*3;
	var sliderStart1 = baseW + cs*2.75;
	var sliderStart2 = baseW + cs * (menu_boxSize[0]/2 + 2.85);
	if (cursor.y < baseH + cs * 1.5) {
		if (cursor.x < canvas.width / 2) {
			var value = clamp(getPercentage(sliderStart1, sliderStart1 + sliderW, cursor.x), 0, 1);
			audio_bgChannel.volume = value;
			data_persistent.vols[0] = Math.round(value * 100) / 100;
			//music
		} else {
			//sfx
			var value = clamp(getPercentage(sliderStart2, sliderStart2 + sliderW, cursor.x), 0, 1);
			audio_sfxChannel.volume = value;
			data_persistent.vols[1] = Math.round(value * 100) / 100;
		}
		return;
	}
}

function handleMouseMove_custom() {
	if (menu_t > 0.75 && cursor.down) {
		handleMouseMove_menu();
		return;
	}
	if (!editor_active || !cursor.down) {
		return;
	}

	var spa = screenToSpace(cursor.x, cursor.y);

	if (cursor.y < canvas.height * editor_topbarH && editor_entity == undefined) {
		editor_adjustCamera(cursor.x / canvas.width);
	}

	if (editor_entity != undefined) {
		if (editor_entity.x != undefined) {
			[editor_entity.x, editor_entity.y] = editor_quantizeArr(spa);
		}
		return;
	}

	if (editor_pointSelected) {
		[editor_pointSelected[0], editor_pointSelected[1]] = editor_quantizeArr(spa);
	}

	cursor.pastPoint = [cursor.x, cursor.y];
}

function quantizeTo(x, decimalPlace) {
	return +(x.toFixed(decimalPlace));
}

function handleMouseUp_custom() {
	editor_pointSelected = undefined;
}