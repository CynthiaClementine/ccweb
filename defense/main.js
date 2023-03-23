//houses html interactivity, setup, and main function

window.onload = setup;
window.onresize = handleResize;
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;
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
const color_bgPanel = "#788";
const color_player = "#F8F";
const color_projectile = "#F80";
const color_shield = "#080";
const color_shield_bright = "#0F0";
const color_star = "#FE9";

var cursorX = 0;
var cursorY = -50;
var cursorDown = false;

var data_persist = {
	top: 0,
	skip: false,
	vols: [1, 1]
}

var dualAnimationTime = 60;
var dualTimer = 0;


var player = new Player(0, 0);
var player2 = new Player(0, 0);

var flashBuffer = [];
var flashPeriod = 50;
var flashTime = 0;
var flashTimeMax = flashPeriod * 4.5;

var free_timings = [];
var free_timingsMax = 48;
var free_tpb = 0;
var free_score = 0;
var free_beatTimeout;

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
var msStore = 0;
var msDelta = 0;
var msFrame = 100 / 6;
var level = 1;
var level_length = 16;
var level_asyncFuncs = [];
var level_specifications = [
	{
		//level 0 is used for the free state
		bulletSpeed: 1.5,
		maxDist: 280,
		ticksPerBeat: 1e1001,
		spinChance: 0.5,
	}, {
		//level 1
		bulletSpeed: 1,
		maxDist: 290,
		ticksPerBeat: 50,
		spinProfile: 0b0000_0000_0000_0001,
		length: 16,
		bgFunc: () => {
			changeCameraZ(-4000);
			changeBHMass(0);
			rotateStarSphere(-starTracker);
		},
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
		bgFunc: () => {
			level_asyncFuncs[1] = window.setInterval(() => {
				if (state % 1 == 0) {
					rotateStarSphere(0.0075);
				}
			}, 16);
		}
	}, {
		bulletSpeed: 0.3,
		maxDist: 100,
		ticksPerBeat: 28,
		spinChance: 0.75,
		bgFunc: () => {
			level_asyncFuncs[0] = window.setInterval(() => {
				if (bhMass < 4E6) {
					changeBHMass(bhMass + 2.5E4);
				} else {
					cancelAsyncFunc(0);
				}
			}, 16);
		}
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
		bgFunc: () => {
			window.cancelAnimationFrame(level_asyncFuncs[1]);
			level_asyncFuncs[0] = window.setInterval(() => {
				if (cameraZPos < -10) {
					changeCameraZ(cameraZPos + 5);
				} else {
					cancelAsyncFunc(0);
					cancelAsyncFunc(1);
				}
			}, 16);
		}
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
		spinChance: 0.2,
	}, {
		ticksPerBeat: 50,
		spinChance: 0.4,
		music: ""
	}, {
		ticksPerBeat: 45,
		skip: true,
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

var lore_progress = 0;
var lore_selected = 0;
var lore_requirements = {
	0: 0,
	100: 5,
	300: 9,
	450: 16
}
var lores = [
	[`It is national orange day. This would normally be a momentous occasion, but for one other unfortunate fact: you do not like oranges.`],
	[`Naturally, you climb into your trusty spaceship and take off from the earth.`],
	[`Unfortunately, in the crowd's effort to give everyone a National Orange, they begin launching oranges into space as well!`],
	[`So you ready The Shields™.`],
	`end`,
	[`Hoping to escape the onslaught of oranges, you decide to get farther away. Your spaceship swings by the sun and heads to the outer reaches of the solar system.`],
	[`However, the wave of oranges continues.`],
	[`It has been multiple years since the last national orange day, and more oranges are being sent to your location.`],
	`end`,
	[`Realizing that the kuiper belt is yet too close to the earth, you accelerate out of the solar system.`],
	[`After drifting through interstellar space, avoiding oranges all the way, you arrive at the center of the galaxy.`],
	[`Oh no! It's Sagittarius A*! The supermassive black hole? Who could have predicated! this!`],
	[`Hang on, what does "supermassive" even mean? It's a black hole. Obviously it's massive. Is the term even necessary?`],
	[`Ok, I looked it up and it turns out supermassive officially refers to something over 1 million times the mass of the sun, which I think is interesting.`],
	[`Unfortunately, as we went off on that little tangent, your spaceship has reached the black hole. Whoopsies.`],
	`end`,
	[`As you drift past the event horizon, you consider how this whole adventure hasn't even worked, because the oranges still follow you.\nEven here, oranges approach at unreasonable speeds and temperatures.`],
	[`The universe will never again receive transmission from your spaceship. In just a few moments, you will probably be spaghettified by the singularity's tidal forces.`],
	[`It's ok though. Until then you can still avoid oranges.`]
]

var menu_selectors = [
	[`Play`, () => {state = 1; game_systems[0].startLevel(1); level_specifications[1].bgFunc();}, 0],
	[`Options`, () => {state = 0.5;}, 0],
	[`View Lore`, () => {state = 3;}, 0],
	[`Free play`, () => {state = 5; free_score = 0; game_systems[0].startLevel(0);}, 0]
];
var menu_textSize = 20;
var menu_optBaseX = -160;
var menu_slideMinX = -10;
var menu_slideMaxX = 90;


var score = 0;

var state = 0;
var stateFuncs = [doMenuState, doMainState, doSwitchState, doLoreState, doFlashState, doFreeState,	doStarState];

var currentOrangeSpeed = undefined;

//setup function
function setup() {
	canvas = document.getElementById("cabin");
	ctx = canvas.getContext("2d");
	handleResize();
	readStorage();
	changeBHMass(bhMass);
	setMusicVolume(data_persist.vols[0]);
	setEffectsVolume(data_persist.vols[1]);

	state = 0;

	window.requestAnimationFrame(main);
}

function main() {
	//make sure frames are tied to real time for musicality
	var temp = performance.now();
	msDelta = clamp(temp - msStore, 0, 25);
	msStore = temp;
	//bg
	if (!([1.5, 4, 5.5].includes(state))) {
		ctx.fillStyle = color_bg;
		ctx.fillRect(-320, -240, 640, 480);
	}

	stateFuncs[floor(state)]();
	window.requestAnimationFrame(main);
}

function doStarState() {
	drawSpace();
	// if (Math.random() < 0.5) {
	// 	drawStarsSimple();
	// } else {
		// }
	// drawStarsIntermediate();
	// graph();
	
	// changeBHMass(bhMass + 0.5E4);
}

function doMainState() {
	ctx.textAlign = "center";
	ctx.font = `20px Ubuntu`;
	//paused mode
	if (state == 1.5) {
		ctx.fillStyle = color_projectile;
		ctx.fillText(`~Paused~`, 0, -220);
		return;
	}

	drawSpace();

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
	if (player.projectsBlocked > 15 && player.health > 0) {
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
	drawSpace();

	game_systems.forEach(g => {
		g.tick();
		g.beDrawn();
	});

	//score text
	ctx.fillStyle = color_projectile;
	ctx.fillText(`${score} | ${data_persist.top}`, 0, 225);
	
	//wait until all bullets are offscreen
	if (!repelOranges()) {
		//update level and do any auxilary effects necessary
		var thisLSpecs = level_specifications[level];
		var levelIncrease = 1;
		var nextLSpecs = level_specifications[level + levelIncrease];

		while (data_persist.skip && nextLSpecs.skip) {
			levelIncrease += 1;
			nextLSpecs = level_specifications[level + levelIncrease];
		}

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
		level += levelIncrease;
		game_systems.forEach(g => {
			g.startLevel(level);
		});

		//run bg func, if there is one
		if (level_specifications[level].bgFunc != undefined) {
			level_specifications[level].bgFunc();
		}

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
}

function doFlashState() {
	//top bit
	ctx.fillStyle = color_bgPanel;
	ctx.font = `30px Ubuntu`;
	var textDims = ctx.measureText(score);
	ctx.beginPath();
	ctx.roundRect(-textDims.width * 0.6, -210, textDims.width * 1.2, 30, 5);
	ctx.fill();

	//text
	if (flashTime % flashPeriod < flashPeriod / 2) {
		ctx.fillStyle = color_projectile;
		ctx.fillText(score, 0, -195);
	}

	if (flashTime >= flashTimeMax) {
		flashTime = 0;
		endGame();
	}

	flashTime += 1;
}

function doMenuState() {
	ctx.fillStyle = color_projectile;
	ctx.strokeStyle = color_shield_bright;
	ctx.lineWidth = 1;

	//in options mode
	if (state == 0.5) {
		ctx.textAlign = "left";
		ctx.font = `20px Ubuntu`;
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

function doFreeState() {
	ctx.font = `20px Ubuntu`;

	//pause text potentially
	ctx.textAlign = "center";
	//paused mode
	if (state == 5.5) {
		ctx.fillStyle = color_projectile;
		ctx.fillText(`~Free Play Paused~`, 0, -220);
		return;
	}

	//bg goes here

	game_systems.forEach(g => {
		g.tick();
		g.beDrawn();
	});

	if (free_timings.length > 0) {
		repelOranges();
	}


	//draw corner bit
	ctx.fillStyle = color_bgPanel;
	ctx.beginPath();
	ctx.roundRect(-310, -230, 140, 100, 5);
	ctx.fill();

	ctx.textAlign = "left";
	ctx.fillStyle = color_projectile;
	ctx.fillText(`bpm: ${(free_timings.length > 0 && free_timings.length < 4) ? "..." : Math.round(3600 / free_tpb)}`, -305, -220);


	//score text
	if (score > 0) {
		free_score += score;
		score = 0;
	}
	ctx.fillStyle = color_projectile;
	ctx.fillText(`(${free_score})`, 0, 225);

	game_time += 1;
}

//input
function handleKeyPress(a) {
	if (a.code == "Escape") {
		//escape toggles between some states
		switch (state) {
			case 0.5:
				state = 0;
				break;

			case 1:
				state = 1.5;
				// if (audio_musics		level_specifications[level].music)
				break;
			case 1.5:
				state = 1;
				break;

			case 5:
				state = 5.5;
				break;
			case 5.5:
				state = 5;
				break;
		}
		return;
	}

	if (a.code == "Enter" && state == 1.5) {
		state = 1;
		return;
	}

	//digits for setting timing
	if (state == 5) {
		if (a.code.slice(0, 5) == "Digit") {
			//if there's nothing in the buffer area assume the user is resetting
			if (free_timings.length == 0) {
				free_tpb = 0;
			}

			free_timings.push(performance.now());

			//set timeout for key press times
			window.clearTimeout(free_beatTimeout);
			free_beatTimeout = window.setTimeout(() => {
				calculateBPM();
				free_timings = [];
				game_systems[0].oranges = [];
				if (game_systems.length > 1) {
					game_systems[1].oranges = [];
				}
			}, 1500);

			//timings -> bpm -> tpb, that way bpm is quantized
			if (free_timings.length > 1) {
				//fix to the last x counts
				if (free_timings.length > free_timingsMax) {
					free_timings = free_timings.slice(-free_timingsMax);
				}
				calculateBPM();
			}
			return;
		}

		//minus / plus
		if (a.code == "Minus" || a.code == "Equal") {
			var bpm = Math.round(3600 / free_tpb);
			bpm = clamp(bpm + boolToSigned(a.code == "Equal"), 0, 400);
			free_tpb = (bpm == 0) ? 1e1001 : 3600 / bpm;
			level_specifications[0].ticksPerBeat = free_tpb;
		}
		
	}

	function calculateBPM() {
		//can't do it if the length isn't enough
		if (free_timings.length < 2) {
			return;
		}

		//bpm is simply beats / minutes
		var ft = free_timings;
		var bpm = (ft.length - 1) / ((ft[ft.length-1] - ft[0]) / 6E4);
		bpm = Math.round(bpm);
		free_tpb = (bpm == 0) ? 1e1001 : 3600 / bpm;
		level_specifications[0].ticksPerBeat = free_tpb;
	}


	//make sure it's in a game state
	if (!([1, 2, 5].includes(state))) {
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
	cursorDown = true;
	//only do mouse if in menu / lore states
	if (state >= 1 && state != 3) {
		return;
	}

	//if hovering over one of the menu boxes, run the function there
	var hoverBox = Math.floor((cursorY + (menu_textSize / 2)) / menu_textSize);
	//in the options
	if (state == 0.5) {
		if (cursorX > menu_optBaseX && cursorX < menu_slideMaxX + 5) {
			//fast difficulty
			if (hoverBox == 0) {
				data_persist.skip = !data_persist.skip;
			}

			//sliders
			if (hoverBox == 1 || hoverBox == 2) {
				data_persist.vols[hoverBox - 1] = clamp(getPercentage(menu_slideMinX, menu_slideMaxX, cursorX), 0, 1);
				setMusicVolume(data_persist.vols[0]);
				setEffectsVolume(data_persist.vols[1]);
			}

			writeStorage();
		}
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

	//potentially drag a slider
	if (cursorDown && state == 0.5) {
		var hoverBox = Math.floor((cursorY + (menu_textSize / 2)) / menu_textSize);
		if (hoverBox == 1 || hoverBox == 2) {
			data_persist.vols[hoverBox - 1] = clamp(getPercentage(menu_slideMinX, menu_slideMaxX, cursorX), 0, 1);
			setMusicVolume(data_persist.vols[0]);
			setEffectsVolume(data_persist.vols[1]);
		}
	}
}

function handleMouseUp(a) {
	cursorDown = false;
	if (state == 0.5) {
		writeStorage();
	}
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
	ctx.lineCap = "round";
	ctx.textBaseline = "middle";
}