var canvas;
var ctx;

//quick type
const U8Arr = Uint8Array;
const F32Arr = Float32Array; //f16 is smaller but not supported on safari
function Pos(x, y, z) {
	var q = new Float32Array(3);
	q[0] = x;
	q[1] = y;
	q[2] = z;
	return q;
}
function Color(r, g, b) {
	var q = new Uint8Array(3);
	q[0] = r;
	q[1] = g;
	q[2] = b;
	return q;
}

var frameTime = 1000 / 60;

var camera_FOV = 1.5;
var camera_planeOffset = 1;
var camera;


var color_editor_bg = "#207";
var color_editor_border = "#FFF";

var debug_listening = false;

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

var rand_seed = 3;

//ray properties
const ray_maxDist = 9999;
const ray_minDist = 0.1;
const ray_maxIters = 1000;
var ray_safetyMult = 0.85;

var page_animation;

var render_cornerCoords = [0, 0, 0, 0];
var render_crosshair = true;
//goalN is used to change n. Changing n directly will mess up internal functions
var render_n = 80;
var render_goalN = render_n;
var render_shadowPercent = 0.3;
var render_linesDrawn = 0;
var render_sizeTimeout = 60;

const tree_maxD = 5000;
const tree_minD = 2;
const tree_l = 63;
const tree_sets = 6;

var worker_num = 4;
var worker_pool = [];

var worlds = {};
var loading_world;

var world_time = 0;