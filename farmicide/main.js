window.onload = setup;
window.onresize = handleResize;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;


var animation;

var aspect = 16 / 9;

var board = [[[]]];
var board_dims = [120, 60];
var board_margin = 0.075;
var board_canvas = document.createElement("canvas");
var btx = board_canvas.getContext("2d");
var board_spacing = 6;

var bullet_velocity = 0.5;
var bullet_damage = 1;

var camera_scaleMenu = 2;
var camera_scaleGame = 1;
var camera_scale = 2;

var canvas;
var ctx;

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
	interactLock: true, //interact by holding left+right instead of using the interact button
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
		maxAge: 600,
		harvestTime: 300,
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
		claimR: 2,
		cooldown: 60,
		// obj: Turret,
		price: 50,
		vendorID: 1
	},
	"wall": {
		claimR: 0.75,
		// obj: Rock,
		price: 5,
		vendorID: 4,
	}
};
var entity_vendors = [
	new Vendor(-14, -5, "beacon"),
	new Vendor(-14, -2, "corn"),
	new Vendor(-14, 1, "chicken"),
	new Vendor(-14, 4, "turret"),
	new Vendor(-14, 7, "wall"),

	new Vendor(14, -5, "beacon"),
	new Vendor(14, -2, "corn"),
	new Vendor(14, 1, "chicken"),
	new Vendor(14, 4, "turret"),
	new Vendor(14, 7, "wall"),
];


var game_state = "menu";
var game_dims = [30, 15];
var game_tileSize;
var game_introTime = 40;

var menu_buttons = [
	["Play", beginGame],
	["Settings", () => {}],
	["Credits", () => {}]
];
var menu_bMargin = 0.05;

var player1;
var player2;
var player_moneyStart = 10;
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

var timer = 0;


function setup() {
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");

	handleResize();

	game_mainLoop = main;
	animation = window.requestAnimationFrame(main);
}

function main() {
	ctx.setTransform(camera_scale, 0, 0, camera_scale, canvas.width / 2, canvas.height / 2);
	//just draw the background for now
	ctx.drawImage(image_ground, -0.5 * canvas.width, -0.5 * canvas.height, canvas.width, canvas.height);

	switch (game_state) {
		case "menu":
			drawMainMenu();
			break;
		case "game":
			if (timer <= game_introTime) {
				camera_scale = easerp(camera_scaleMenu, camera_scaleGame, timer / game_introTime);
			}
			tickGameWorld();
			drawGameWorld();
			break;
		case "gameover":
			break;
	}

	



	timer += 1;
	animation = window.requestAnimationFrame(main);
}

function drawGameWorld() {
	//draw grid
	drawBoard();

	//draw all entities
	entities.forEach(e => {
		e.draw();
	});

	//scorebar at the top
	ctx.fillStyle = color_textShadow;
	ctx.fillRect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height * territory_barHeight);
}

function tickGameWorld() {
	entities.forEach(e => {
		e.tick();
	})
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
	
}

function handleKeyPress(a) {
	if (game_state != "game") {
		return;
	}

	switch (a.code) {
		case "ArrowLeft":
			player1.dirsDown[0] = Math.max(player1.dirsDown[0], 1);
			break;
		case "ArrowUp":
			player1.dirsDown[1] = Math.max(player1.dirsDown[1], 1);
			break;
		case "ArrowRight":
			player1.dirsDown[2] = Math.max(player1.dirsDown[2], 1);
			break;
		case "ArrowDown":
			player1.dirsDown[3] = Math.max(player1.dirsDown[3], 1);
			break;
		case "Slash":
			if (!data_persistent.interactLock) {
				player1.interact();
			}
			break;

		case "KeyA":
			player2.dirsDown[0] = Math.max(player2.dirsDown[0], 1);
			break;
		case "KeyW":
			player2.dirsDown[1] = Math.max(player2.dirsDown[1], 1);
			break;
		case "KeyD":
			player2.dirsDown[2] = Math.max(player2.dirsDown[2], 1);
			break;
		case "KeyS":
			player2.dirsDown[3] = Math.max(player2.dirsDown[3], 1);
			break;
		case "KeyQ":
			if (!data_persistent.interactLock) {
				player2.interact();
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
			player1.dirsDown[0] = 0;
			break;
		case "ArrowUp":
			player1.dirsDown[1] = 0;
			break;
		case "ArrowRight":
			player1.dirsDown[2] = 0;
			break;
		case "ArrowDown":
			player1.dirsDown[3] = 0;
			break;

		case "KeyA":
			player2.dirsDown[0] = 0;
			break;
		case "KeyW":
			player2.dirsDown[1] = 0;
			break;
		case "KeyD":
			player2.dirsDown[2] = 0;
			break;
		case "KeyS":
			player2.dirsDown[3] = 0;
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

