var canvas;
var ctx;

var globalA = 0.08;
var globalB = 13;

const degToRad = (Math.PI / 180);

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
	var q = new Uint8ClampedArray(3);
	q[0] = r;
	q[1] = g;
	q[2] = b;
	return q;
}
function Color4(r, g, b, a) {
	var q = new Uint8ClampedArray(4);
	q[0] = r;
	q[1] = g;
	q[2] = b;
	q[3] = a;
	return q;
}

var frameTime = 1000 / 60;

var camera_FOV = 90;
var camera_halfTan = Math.tan((camera_FOV / 2) * degToRad);
var camera_halfTanVert = Math.tan((camera_FOV / 2) * degToRad);
var camera_planeOffset = 1;
var camera_projFunc = projectOct;
var camera_paniniR = 0.3;
var camera;


var color_editor_bg = "#207";
var color_editor_border = "#FFF";

var debug_listening = false;

var controls_cursorLock = false;
var controls_shiftPressed = false;
var controls_sensitivity = 0.005;

var editor_active = false;

var page_animation;

var perf_log = [];
var perf_len = 20;
var perf_n = 0;
var perf_startT = 0;
var perf_endT = 0;

var player;
var player_bounceThreshold = 1;
var player_stepHeight = 2;
var player_width = 3;

var rand_seed = 3;

//ray properties
const ray_maxDist = 3000;
const ray_nearDist = 3;
const ray_minDist = 0.1;
const ray_maxIters = 500;
var ray_safetyMult = 0.95;


var render_crosshair = true;
//goalN is used to change n. Changing n directly will mess up internal functions
var render_n = 120;
var render_goalN = render_n;
var render_shadowPercent = 0.3;
var render_linesDrawn = 0;

const tree_maxD = 5000;
const tree_minD = 2;
const tree_l = 63;
const tree_sets = 7;

var worker_num = 4;
var worker_pool = [];
var worker_ready = [];

var loading_world;

var worlds = {};
const world_objectChunks = Math.floor(Math.cbrt(10000));
var world_time = 0;