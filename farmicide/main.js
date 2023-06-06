window.onload = setup;
window.onresize = handleResize;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;


var animation;

var aspect = 16 / 9;

var board = [[[]]];
var board_dims = [120, 60];
var board_margin = 0.04;
var board_canvas = document.createElement("canvas");
var btx = board_canvas.getContext("2d");
var board_spacing = 6;

var bullet_velocity = 0.3;
var bullet_damage = 1;

var camera_scaleMenu = 2;
var camera_scaleGame = 1;
var camera_scale = 2;

var canvas;
var ctx;

var color_coin = "#FF0";
var color_cropWindup = "#8A8";
var color_textMenu = "#F80";
var color_textShadow = "#002";
var color_textPlayer = "#FED";
var color_claim1 = "#FA2";
var color_claim2 = "#29F";
var color_unclaimed = "#FFF";
var color_boxBG = "#974";
var color_boxBG2 = "#862";
var color_health = "#0B2";

var data_persistent = {
	alias: false, //make images pixelated instead of blurred
	interactLock: false, //interact by holding left+right instead of using the interact button
	regen: true, //naturally regenerate health
	friendlyFire: true, //turrets can shoot your own buildings, as well as you
	communism: false, //only beacons claim territory, crops don't give preferential drops
}

var entities = [];
var entity_data = {
	"beacon": {
		obj: Beacon,
		price: 100,
		vendorID: 3
	},
	"corn": {
		obj: Crop,
		price: 10,
		vendorID: 0
	},
	"chicken": {
		// obj, Chicken,
		price: 50,
		vendorID: 2
	},
	"turret": {
		obj: Turret,
		price: 50,
		vendorID: 1
	},
	"wall": {
		obj: Rock,
		price: 5,
		vendorID: 4,
	}
};
var entity_vendors = [
	new Vendor(-14, -5, "beacon"),
	new Vendor(-14, -2, "corn"),
	// new Vendor(-14, 1, "chicken"), 
	new Vendor(-14, 4, "turret"),
	new Vendor(-14, 7, "wall"),

	new Vendor(14, -5, "beacon"),
	new Vendor(14, -2, "corn"),
	// new Vendor(14, 1, "chicken"),
	new Vendor(14, 4, "turret"),
	new Vendor(14, 7, "wall"),
];

var credits = [
	`Art - Leah, Jessica, Mandy`,
	`Design - Caleb`,
	`Code - Cynthia`,
	// `SFX - Michael`
]


var game_state = "menu";
var game_dims = [30, 15];
var game_tileSize;
var game_introTime = 40;
var game_result = undefined;

var gameover_buttons = [
	["Restart", () => {beginGame();}],
	["Main Menu", () => {game_state = "menu"; timer = 0;}]
];
var gameover_bMargin = 1 / 18;

var menu_buttons = [
	["Play", beginGame],
	["Settings", () => {}],
	["Credits", () => {game_state = "credits"}]
];
var menu_bMargin = 0.05;

var player1;
var player2;
var player_names = [`Player 1`, `Player 2`];
var player_moneyStart = 15;
var player_boxW = 0.05;
var player_boxH = 0.04;

var settings = [
	`Run tutorial`, //boolean
	`Turret range limit`, //range
	`Automatic health regeneration`, //boolean
	`Crop growth time` //range
];

var territory_barHeight = 0.05;
var territory_percentages = [1, 0, 0];
var territory_required = 0.75;

var timer = game_introTime + 1;


function setup() {
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");

	handleResize();

	game_mainLoop = main;
	animation = window.requestAnimationFrame(main);
}

function main() {
	ctx.setTransform(camera_scale, 0, 0, camera_scale, canvas.width / 2, canvas.height / 2);
	if (game_state != "gameover" && game_state != "paused") {
		//just draw the background for now
		ctx.drawImage(image_ground, -0.5 * canvas.width, -0.5 * canvas.height, canvas.width, canvas.height);
	}

	switch (game_state) {
		case "menu":
			if (timer <= game_introTime) {
				camera_scale = easerp(camera_scaleGame, camera_scaleMenu, timer / game_introTime);
			}
			drawMainMenu();
			break;
		case "settings":
			drawSettings();
			break;
		case "credits":
			drawCredits();
			break;
		case "game":
			if (timer <= game_introTime) {
				camera_scale = easerp(camera_scaleMenu, camera_scaleGame, timer / game_introTime);
			}
			tickGameWorld();
			drawGameWorld();
			break;
		case "paused":
			drawTextPrecise(`~Paused~`, 0, 0, `${canvas.height / 20}px Lato`, undefined, color_textMenu, [canvas.height * 0.002, canvas.height * 0.002]);
			break;
		case "gameover":
			drawGameOver();
			break;
	}

	timer += 1;
	animation = window.requestAnimationFrame(main);
}

function tickGameWorld() {
	for (var e=0; e<entities.length; e++) {
		entities[e].tick();
		//delete it if necessary
		if (entities[e].DELETE) {
			updateBoardWith(entities[e], true);
			entities.splice(e, 1);
			e -= 1;
		}
	}
	entities
	//order entities by height
	entities = entities.sort((a, b) => {return a.y - b.y;});

	//game ending section
	if (isSoftlock()) {
		game_result = `You have trapped yourselves. Congrats`;
		endGame();
		return;
	}
	if (player2.health < 0 || territory_percentages[1] >= territory_required) {
		game_result = `${player_names[0]} has won!`;
		endGame();
		return;
	}
	if (player1.health < 0 || territory_percentages[2] >= territory_required) {
		game_result = `${player_names[1]} has won!`;
		endGame();
	}
}

function handleMouseDown_custom() {
	var cCds = [cursor.x - canvas.width / 2, cursor.y - canvas.height / 2];

	if (game_state == "menu") {
		//menu selectors
		if (Math.abs(cCds[0]) < canvas.width * 0.25) {
			var index = (cCds[1] / (canvas.height * menu_bMargin)) / camera_scale;
			index = Math.floor(index + 0.5);
			if (index > -1 && index < 3) {
				menu_buttons[index][1]();
			}
		}
	}

	if (game_state == "credits" || game_state == "settings") {
		if (cCds[0] < canvas.width * -0.15 && cCds[1] < canvas.height * -0.15) {
			game_state = "menu";
			return;
		}
	}

	if (game_state == "gameover") {
		//index thingy but for gameover buttons
		if (Math.abs(cCds[0]) < canvas.width * 0.25) {
			var index = (cCds[1] / (canvas.height * gameover_bMargin)) / camera_scale;
			index = Math.floor(index + 0.5);
			if (index > -1 && index < 2) {
				gameover_buttons[index][1]();
			}
		}

	}
	
}

function handleKeyPress(a) {
	if (game_state != "game" && a.code != "Escape" && a.code != "Enter") {
		return;
	}

	switch (a.code) {
		case "ArrowLeft":
		case "KeyK":
			player2.dirsDown[0] = Math.max(player2.dirsDown[0], 1);
			break;
		case "ArrowUp":
		case "KeyO":
			player2.dirsDown[1] = Math.max(player2.dirsDown[1], 1);
			break;
		case "ArrowRight":
		case "Semicolon":
			player2.dirsDown[2] = Math.max(player2.dirsDown[2], 1);
			break;
		case "ArrowDown":
		case "KeyL":
			player2.dirsDown[3] = Math.max(player2.dirsDown[3], 1);
			break;
		case "Slash":
		case "KeyI":
			if (!data_persistent.interactLock) {
				player2.interact();
			}
			break;

		case "KeyA":
			player1.dirsDown[0] = Math.max(player1.dirsDown[0], 1);
			break;
		case "KeyW":
			player1.dirsDown[1] = Math.max(player1.dirsDown[1], 1);
			break;
		case "KeyD":
			player1.dirsDown[2] = Math.max(player1.dirsDown[2], 1);
			break;
		case "KeyS":
			player1.dirsDown[3] = Math.max(player1.dirsDown[3], 1);
			break;
		case "KeyQ":
			if (!data_persistent.interactLock) {
				player1.interact();
			}
			break;

		case "Escape":
			if (["credits", "settings", "gameover"].includes(game_state)) {
				game_state = "menu";
			}
			if (game_state == "game") {
				game_state = "paused";
			} else if (game_state == "paused") {
				game_state = "menu";
				timer = 0;
			}
			break;
		case "Enter":
			if (game_state == "paused") {
				game_state = "game";
			}
			break;
	}
}

function handleKeyRelease(a) {
	if (game_state != "game") {
		return;
	}

	switch (a.code) {
		case "ArrowLeft":
		case "KeyK":
			player2.dirsDown[0] = 0;
			break;
		case "ArrowUp":
		case "KeyO":
			player2.dirsDown[1] = 0;
			break;
		case "ArrowRight":
		case "Semicolon":
			player2.dirsDown[2] = 0;
			break;
		case "ArrowDown":
		case "KeyL":
			player2.dirsDown[3] = 0;
			break;

		case "KeyA":
			player1.dirsDown[0] = 0;
			break;
		case "KeyW":
			player1.dirsDown[1] = 0;
			break;
		case "KeyD":
			player1.dirsDown[2] = 0;
			break;
		case "KeyS":
			player1.dirsDown[3] = 0;
			break;
	}
}

function handleResize() {
	//compute
	var w = window.innerWidth - 6;
	var h = window.innerHeight - 6;
	var scaleFactor = 1 / aspect;

	//resize canvas
	canvas.height = Math.min(h, w * scaleFactor);
	canvas.width = canvas.height / scaleFactor;
	ctx.translate(canvas.width / 2, canvas.height / 2);

	//set canvas preferences
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.imageSmoothingEnabled = !data_persistent.alias;

	//game changes
	game_tileSize = (canvas.width * (1 - 2 * board_margin)) / game_dims[0];
}

