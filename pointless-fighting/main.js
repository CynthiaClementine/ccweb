//events
window.onload = setup;
window.addEventListener("keydown", handleKeyPress, false);
window.addEventListener("keyup", handleKeyNegate, false);
window.addEventListener("mousemove", handleMouseMove, false);
window.addEventListener("mousedown", handleMouseDown, false);
window.addEventListener("mouseup", handleMouseUp, false);


//global vars
let animation;

var audio_channel1 = new AudioChannel(0.5);
var audio_fadeTime = 50;
var audio_tolerance = 1 / 30;

let ctx;
let canvas;

let camera;
var camera_scaleMin = 20;
var camera_scaleMax = 120;
var camera_scaleDefault = 80;
var camera_scaleStep = 20;

const color_attackBubble = "#47F";
const color_background = "#226";
const color_collision = "#64A";
const color_dialogueBox = "#DFF";
const color_dialogueBoxOutside = "#688";

const color_editor_background = "#335";
const color_editor_border = "#4F4";
const color_editor_selection = "#0FF";

const color_grey = "#999";
const color_grey_light = "#CCC";
const color_grey_dark = "#666";
const color_meter_health = "#F44";
const color_meter_stamina = "#FF4";
const color_player = "#F6F";
const color_player_eyes = "#000";
const color_portal = "#A0F";
const color_sword = "#368";
const color_text = "#828";
const color_text_light = "#C5C";

var cursor_down = false;
var cursor_x = 0;
var cursor_y = 0;

//[audio object, loop at selected time?, start of loop time, end of loop time]
var data_audio = {
	"winter": [new Audio("audio/winter.mp3"), true, 1.436, 59.837],
	"buriedTreasure": [new Audio("audio/buried treasure.mp3"), false],
}
var data_colorTable = [];
var data_dialogues = {};
var data_spriteSize = 20;
var data_images = {
	Background: getImage('images/bgStatic.png'),
	Empty: new Palette_Empty(),

	Terrain: {
		Empty: new Palette(getImage('images/terrainEmpty.png'), data_spriteSize),
		North: new Palette(getImage('images/terrainNorth.png'), data_spriteSize),
		Soul: new Palette(getImage('images/terrainSoul.png'), data_spriteSize),
		Treasure: new Palette(getImage('images/terrainTreasure.png'), data_spriteSize)
	},
	
	Characters: {
		Player: new Texture_Animated(getImage('images/spritesPlayer.png'), data_spriteSize, 1, 1, [0.5, 0.5], [[0, 0], [0, 1], [0, 2], [0, 3]], 1e1001, false)
	},

	Decoration: {
		Spikes: new Texture_Set(getImage('images/treasureSpikes.png'), data_spriteSize, [[[0, 0], [1, 2], [0.5, 1.5]], [[1, 0], [1, 2], [0.5, 1.5]], [[2, 0], [1, 2], [0.5, 1.5]], [[3, 0], [1, 2], [0.5, 1.5]], [[4, 0], [1, 2], [0.5, 1.5]], [[5, 0], [1, 2], [0.5, 1.5]], [[6, 0], [1, 2], [0.5, 1.5]],
			[[0, 2], [2, 3], [0.5, 2.5]],
			[[10, 2], [3, 6], [1.5, 5.5]], [[13, 1], [3, 7], [1.5, 6.5]]])
	},
};
var data_persistent = {
	gates: [],
	settings: {
		resSelection: 2
	}
};

var dialogue_advanceDelay = 10;
var dialogue_boxW = 0.4;
var dialogue_boxH = 0.3;
var dialogue_boxA = 0.02;
var dialogue_boxMargin = 0.05;
var dialogue_startText = "...";
var dialogue_scrollSpeed = 3;


var editor_active = false;
var editor_block = " ";
var editor_sidebarWidth = 0.2;

var entities_listing = ["NPC", "POR", "PPR", "SPK"];
let loading_map;
let loading_state;

var menu_animSpeed = 7;
var menu_curve = 100;
let player;

var render_vSquish = 0.8;
var settings_resolutions = [
	[480, 360],
	[640, 480],
	[960, 720],
	[1280, 960]
];

var static_size = 50;
var static_lumSpread = 0.04;
var static_lumBase = 0.6;

var tileImage_key = `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZαγεηικμνυπρσςτφχψωβΓδΔΛξζΣΞΘθΠλΦΨΩ<^> `;
var tileImage_map = generateTileImageMap();

var world_outsideMapFade = 5;
var world_outsideMapFadeConstant = 5.2;
var world_time = 0;

let world_maps = [];


//main functions
function setup() {
	canvas = document.getElementById("poderVase");
	ctx = canvas.getContext("2d");

	camera = new Camera(0, 0, camera_scaleDefault);
	camera.calculateCorners();
	loading_state = new State_Menu();
	player = new Player(1, 0, color_player);

	setCanvasPreferences();
	
	importMaps(rawData_maps);
	importConversations(rawData_dialogues);
	animation = window.requestAnimationFrame(main);
}

function main() {
	loading_state.execute();

	animation = window.requestAnimationFrame(main);
	world_time += 1;
}

function handleKeyPress(a) {
	loading_state.handleKeyPress(a);
}

function handleKeyNegate(a) {
	loading_state.handleKeyNegate(a);
}

function handleMouseDown(a) {
	cursor_down = true;
	loading_state.handleMouseDown();
}

function handleMouseMove(a) {
	var canvasArea = canvas.getBoundingClientRect();
	cursor_x = a.clientX - canvasArea.left;
	cursor_y = a.clientY - canvasArea.top;

	loading_state.handleMouseMove();
}

function handleMouseUp(a) {
	cursor_down = false;
}