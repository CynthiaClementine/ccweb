//houses html interactivity, setup, and main function

window.onload = setup;
window.onresize = handleResize;
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
document.addEventListener("keydown", handleKeyPress, false);

//global variables
var animation;

var audio_damage = new Audio('aud/hit.mp3');
var audio_block = new Audio('aud/block.mp3');
var audio_effects = [audio_damage, audio_block];
var audio_musics = {
	'outskirts': new Audio('aud/outskirts112-5.mp3'),
};

var bulletClasses = [Projectile, Projectile_Spinning];

var canvas;
var ctx;

const color_bg = "#002";
const color_player = "#F8F";
const color_projectile = "#F80";
const color_shield = "#080";
const color_shield_bright = "#0F0";

var cursorX = 0;
var cursorY = -50;

var data_persist = {
	top: 0,
	skip: false,
	vols: [1, 1]
}

var dualAnimationTime = 60;
var dualTimer = 0;


var player = new Player(0, 0);
var player2 = new Player(0, 0);

var game_systems = [new GameSet(player)];
var game_time = 0;

/* Level specifications act like this:
	{
		ticksPerBeat: the number of ticks in between each projectile hitting the player
		bulletSpeed?: the speed at which projectiles travel. If not specified, it is assumed to allow 50px between projectiles
		maxDist?: the maximum distance an orange can be away from the player. Also the distance oranges spawn at

		spinChance?: the chance that a projectile will be a spinning one
		spinProfile?: allows binary specifying of which bullets are spinning ones (1 indicates spin, 0 non-spin)
		[spinChance and spinProfile are miai]

		music?: music to play during the level. If this is specified, the level length will be however many beats the music is, instead of the typical level_length
		length?: length to be instead of the typical level length.
		dual?: boolean representing whether the level is a dual level or not. Really only the first one of these matters, because every level afterwards is dual
		skip?: whether to skip this level when in fast mode
	}
Note these specifications apply to one catcher, not necessarily the level as a whole. A dual level with length 32 will have the user catch 64 projectiles, while each catcher only catches 32.
 */
var level = 1;
var level_length = 16;
var level_specifications = [
	undefined,
	{
		//level 1
		bulletSpeed: 1,
		maxDist: 290,
		ticksPerBeat: 50,
		spinProfile: 0b0000_0000_0000_0001,
		length: 16,
	}, {
		ticksPerBeat: 45,
		spinChance: 0.25,
		skip: true
	}, {
		ticksPerBeat: 40,
		spinChance: 0.35
	}, {
		ticksPerBeat: 35,
		spinChance: 0.425,
		skip: true
	}, {
		//level 5
		ticksPerBeat: 32,
		music: `outskirts`,
		spinChance: 0.5,
		skip: true
	}, {
		bulletSpeed: 2.5,
		ticksPerBeat: 28,
		spinChance: 0.6,
	}, {
		bulletSpeed: 0.3,
		maxDist: 100,
		ticksPerBeat: 28,
		spinChance: 0.75,
	}, {
		ticksPerBeat: 20,
		spinChance: 1,
		skip: true
	}, {
		bulletSpeed: 0.75,
		maxDist: 90,
		ticksPerBeat: 19,
		spinChance: 1,
		length: 32,
	}, {
		//level 10 - the real fun begins
		ticksPerBeat: 100,
		dual: true,
		spinProfile: 0b0000_1111_0000_1111
	}, {
		ticksPerBeat: 90,
	}, {
		ticksPerBeat: 75,
		skip: true
	}, {
		ticksPerBeat: 60,
	}, {
		ticksPerBeat: 50,
		skip: true
	}, {
		ticksPerBeat: 45,
		spinChance: 1,
		length: 32,
	}, {
		bulletSpeed: 1,
		ticksPerBeat: 42,
		spinChance: 0.9,
		length: 32,
	}, {
		//final infinite level
		ticksPerBeat: 40,
		spinChance: 1,
		length: 1e1001
	}
];

var menu_selectors = [
	[`Play`, () => {state = 1; game_systems[0].startLevel(1);}, 0],
	[`Options`, () => {state = 0.5;}, 0],
	[`View Lore`, () => {state = 3;}, 0]
];
var menu_textSize = 20;
var menu_optBaseX = -160;
var menu_slideMinX = -10;
var menu_slideMaxX = 90;


var score = 0;

var state = 0;
var stateFuncs = [doMenuState, doMainState, doSwitchState, doLoreState];

var currentOrangeSpeed = undefined;

//setup function
function setup() {
	canvas = document.getElementById("cabin");
	ctx = canvas.getContext("2d");
	handleResize();
	readStorage();

	state = 0;
	animation = window.requestAnimationFrame(main);
}

function main() {
	//bg
	ctx.fillStyle = color_bg;
	ctx.fillRect(-320, -240, 640, 480);

	stateFuncs[floor(state)]();
	page_animation = window.requestAnimationFrame(main);
}

function doMainState() {
	game_systems.forEach(g => {
		g.tick();
		g.beDrawn();
	});

	//score text
	ctx.fillStyle = color_projectile;
	ctx.fillText(`${score} | ${data_persist.top}`, 0, 225);
	data_persist.top = Math.max(data_persist.top, score);

	game_time += 1;
	pauseGameplay();
}

function pauseGameplay() {
	//normally, if the player has blocked 16 orbs stop
	if (player.projectsBlocked > 15) {
		game_state = 1;
		player.projectsBlocked = 0;
	}
}

function endGame() {
	writeStorage();
	//reset everything to defaults
	score = 0;
	level = 1;
	state = 0;
	game_time = 0;

	player = new Player(0, 0);
	player2 = new Player(0, 0);
	game_systems = [new GameSet(player)];
}

function doSwitchState() {
	game_systems.forEach(g => {
		g.tick();
		g.beDrawn();
	});

	//score text
	ctx.fillStyle = color_projectile;
	ctx.fillText(`${score} | ${data_persist.top}`, 0, 225);

	//decrease approach rate
	var allOranges = [...game_systems[0].oranges];
	if (game_systems.length == 2) {
		allOranges = allOranges.concat(game_systems[1].oranges);
	}
	//wait until all bullets are offscreen
	if (allOranges.length == 0) {
		//update level and do any auxilary effects necessary
		var thisLSpecs = level_specifications[level];
		var nextLSpecs = level_specifications[level + 1];

		//split into dual mode?
		if (nextLSpecs.dual && !thisLSpecs.dual) {
			if (game_systems.length < 2) {
				game_systems[1] = new GameSet(player2, true);
				game_systems[1].startLevel(level);
				dualTimer = 0;
			}

			if (dualTimer <= dualAnimationTime) {
				player2.x = linterp(0, -160, dualTimer / dualAnimationTime);
				player.x = linterp(0, 160, dualTimer / dualAnimationTime);
				dualTimer += 1;
				return;
			}
		}

		//change back to gameplay state
		state = 1;
		level += 1;
		game_systems.forEach(g => {
			g.startLevel(level);
		});

		player.totalBlocks = 0;
		player2.totalBlocks = 0;

		//fill in missing parameters
		nextLSpecs.bulletSpeed = nextLSpecs.bulletSpeed ?? 50 / nextLSpecs.ticksPerBeat;
		nextLSpecs.maxDist = nextLSpecs.maxDist ?? 290 / (1 + (game_systems.length == 2));
		if (nextLSpecs.music == undefined) {
			nextLSpecs.length = nextLSpecs.length ?? level_length;
		}
		return;
	}

	//if there are still oranges onscreen, slow them down
	var speedChange = Math.max(0.06, allOranges[0].speed / 18);
	allOranges.forEach(o => {
		o.speed -= speedChange;
	});
}

function doMenuState() {
	ctx.fillStyle = color_projectile;
	ctx.strokeStyle = color_shield_bright;

	//in options mode
	if (state == 0.5) {
		ctx.textAlign = "left";
		ctx.fillText(`Fast Difficulty Increase: ${(data_persist.skip) ? "On" : "Off"}`, menu_optBaseX, 0);
		ctx.fillText(`Music volume:`, menu_optBaseX, 20);
		ctx.fillText(`Effects volume:`, menu_optBaseX, 40);

		ctx.strokeStyle = color_projectile;
		//slider lines
		ctx.beginPath();
		ctx.moveTo(menu_slideMinX, 22);
		ctx.lineTo(menu_slideMaxX, 22);
		ctx.moveTo(menu_slideMinX, 42);
		ctx.lineTo(menu_slideMaxX, 42);
		ctx.stroke();

		//slider knobs
		ctx.beginPath();
		ctx.arc(linterp(menu_slideMinX, menu_slideMaxX, data_persist.vols[0]), 22, 5, 0, Math.PI * 2);
		ctx.arc(linterp(menu_slideMinX, menu_slideMaxX, data_persist.vols[1]), 42, 5, 0, Math.PI * 2);
		ctx.fill();
		return;
	}

	//title
	ctx.textAlign = "center";
	ctx.font = `30px Ubuntu`;
	
	ctx.fillText(`Orange Defense`, 0, -192);

	//highscore text
	if (data_persist.top > 0) {
		ctx.font = `10px Ubuntu`;
		ctx.fillText(`Highscore: ${data_persist.top}`, 0, 230);
	}

	//selector highlight box
	var hoverBox = Math.floor((cursorY + (menu_textSize / 2)) / menu_textSize);
	if (Math.abs(cursorX) < 50 && menu_selectors[hoverBox] != undefined && menu_selectors[hoverBox][2] < 1) {
		menu_selectors[hoverBox][2] += 0.2;
	}

	//selectors
	ctx.font = `${menu_textSize}px Ubuntu`;
	for (var c=0; c<menu_selectors.length; c++) {
		ctx.fillText(menu_selectors[c][0], 0, c * menu_textSize);
		if (menu_selectors[c][2] > 0) {
			var w = ctx.measureText(menu_selectors[c][0]).width + 5;
			ctx.beginPath();
			ctx.globalAlpha = Math.min(1, menu_selectors[c][2]);
			ctx.roundRect(-w / 2, c * menu_textSize - 10.5, w, 20, 5);
			ctx.stroke();
			ctx.globalAlpha = 1;
			menu_selectors[c][2] -= 0.1;
		}
	}
}

function doLoreState() {

}


function readStorage() {
	var toRead;
	try {
		toRead = window.localStorage["orange_data"];
	} catch(error) {
		console.log(`ERROR: could not access local storage. Something has gone very seriously wrong.`);
		if (error.name == "NS_ERROR_FILE_CORRUPTED") {
			alert(`Hi! Something has gone terribly wrong. But don't panic. 
Most likely the local browser storage has been corrupted. 
You can fix it by clearing your browser history, including cookies, cache, and local website data.`);
		}
	}

	try {
		toRead = JSON.parse(toRead);
	} catch (error) {
		console.log(`ERROR: could not parse ${toRead}, using default`);
		return;
	}

	//make sure it's somewhat safe, and then make it into the game flags
	if (typeof(toRead) == "object") {
		[data_persist.top, data_persist.skip] = toRead;
	} else {
		console.log("ERROR: invalid type specified in save data, using default");
		return;
	}
}

function writeStorage() {
	window.localStorage["orange_data"] = `[${data_persist.top},${data_persist.skip},${data_persist.vols[0]},${data_persist.vols[1]}]`;
}

function setMusicVolume(vol) {
	var titles = Object.keys(audio_musics);
	titles.forEach(t => {
		audio_musics[t].volume = vol;
	});
}

function setEffectsVolume(vol) {
	audio_effects.forEach(t => {
		t.volume = vol;
	});
}

//input
function handleKeyPress(a) {
	if (state < 1 && a.code == "Escape") {
		state = 0;
		return;
	}

	//make sure it's in a game state
	if (state != 1 && state != 2) {
		return;
	}

	//make sure the players are defined
	switch(a.code) {
		case "ArrowLeft":
			player.angleQueue.push(Math.PI);
			break;
		case "ArrowUp":
			player.angleQueue.push(Math.PI * 1.5);
			break;
		case "ArrowRight":
			player.angleQueue.push(0);
			break;
		case "ArrowDown":
			player.angleQueue.push(Math.PI * 0.5);
			break;

		case "KeyA":
			player2.angleQueue.push(Math.PI);
			break;
		case "KeyW":
			player2.angleQueue.push(Math.PI * 1.5);
			break;
		case "KeyD":
			player2.angleQueue.push(0);
			break;
		case "KeyS":
			player2.angleQueue.push(Math.PI * 0.5);
			break;
	}
}

function handleMouseDown(a) {
	//only do mouse if in menu / lore states
	if (state != 0 && state != 3) {
		return;
	}

	//if hovering over one of the menu boxes, run the function there
	var hoverBox = Math.floor((cursorY + (menu_textSize / 2)) / menu_textSize);

	//in the options
	if (state == 0.5) {
		if (cursorX > menu_)
		writeStorage();
		return;
	}


	//in the main menu
	if (Math.abs(cursorX) < 50 && menu_selectors[hoverBox] != undefined) {
		menu_selectors[hoverBox][1]();
	}
}

function handleMouseMove(a) {
	var canvasArea = canvas.getBoundingClientRect();
	cursorX = (640 * (a.clientX - canvasArea.left) / canvasArea.width) - 320;
	cursorY = (480 * (a.clientY - canvasArea.top) / canvasArea.height) - 240;
}

function handleResize() {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.92;
	var forceAspect = 0.75;

	spaceH = Math.min(spaceH, spaceW * forceAspect);
	spaceW = spaceH / forceAspect;

	canvas.width = Math.floor(spaceW);
	canvas.height = Math.floor(spaceH);
	var scaling = canvas.width / 640;
	ctx.setTransform(scaling, 0, 0, scaling, 0, 0);
	ctx.translate(320, 240);
	ctx.textBaseline = "middle";
}






function cLinterp(color1HalfHex, color2HalfHex, percentage) {
	//performing a linear interpolation on all 3 aspects
	var finR = linterp(parseInt(color1HalfHex[1], 16), parseInt(color2HalfHex[1], 16), percentage);
	var finG = linterp(parseInt(color1HalfHex[2], 16), parseInt(color2HalfHex[2], 16), percentage);
	var finB = linterp(parseInt(color1HalfHex[3], 16), parseInt(color2HalfHex[3], 16), percentage);
	//converting back to hex
	return ("#" + Math.floor(finR).toString(16) + Math.floor(finG).toString(16) + Math.floor(finB).toString(16));
}