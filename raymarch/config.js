var canvas;
var ctx;

var frameTime = 1000 / 60;

var camera_FOV = 1.5;
var camera_planeOffset = 1;
var camera;

var color_editor_bg = "#220073";
var color_editor_border = "#FF00FF";

var controls_cursorLock = false;
var controls_shiftPressed = false;
var controls_sensitivity = 0.01;

var editor_active = false;

var perf_log = [];
var perf_len = 20;
var perf_n = 0;
var perf_startT = 0;
var perf_endT = 0;

var player_stepHeight = 2;
var player_width = 5;


//ray properties
var ray_maxDist = 9999;
var ray_minDist = 0.1;
var ray_maxIters = 1000;
var ray_safetyMult = 0.75;

var page_animation;

var render_cornerCoords = [0, 0, 0, 0];
//goalN is used to change n. Changing n directly will mess up internal functions
var render_n = 120;
var render_goalN = render_n;
var render_shadowPercent = 0.2;
var render_linesDrawn = 0;
var render_sizeTimeout = 60;

const tree_maxD = 5000;
const tree_minD = 4;
const tree_l = 63;

var worker_num = 4;
var worker_pool = [];

var worlds = {};
var loading_world;

var world_time = 0;

var loading_editor = {
	beDrawn: () => {},
	toggle: () => {editor_active = !editor_active;},
};

//width / height of two Courier New characters
const widthPerHeight = 58 / 53;
//31px font means 37.2px wide
const widthPerFont = 37.2 / 31;