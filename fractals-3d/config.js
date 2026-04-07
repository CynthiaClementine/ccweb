// var globalA = 0.08;
// var globalB = 13;

const degToRad = (Math.PI / 180);

const fencepost32 = 0xff0110ff;

const M_COLOR = 0;
const M_CONCRETE = 1;
const M_RUBBER = 2;
const M_NORMAL = 3;
const M_GLASS = 10;
const M_GHOST = 11;
const M_PORTAL = 20;
const M_MIRROR = 30;

const TYPE_FRACTAL = 70;

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

var buf32 = new ArrayBuffer(4);
var buf32_float = new Float32Array(buf32);
var buf32_int = new Int32Array(buf32);

var program;
var vertexBuffer;
var posLoc;
var gl;

const frameTime = 1000 / 60;

const bvhTolerance = 8;

var camera_FOV = 90;
var camera_halfTan = Math.tan((camera_FOV / 2) * degToRad);
var camera_halfTanVert = Math.tan((camera_FOV / 2) * degToRad);
var camera_planeOffset = 1;
var camera_paniniR = 0.3;
var camera;

var clipboard = null;

var color_editor_border = `#FFF`;

var controls_cursorLock = false;
var controls_shiftPressed = false;
var controls_sensitivity = 0.005;

var debug_listening = false;

var editor_active = false;

const fractal_iters = 10;

var lineBuffers = [];
var lineBuffer_num = -1;

var mortonBits = 10;

var page_animation;

var perf_log = [];
var perf_len = 20;
var perf_n = 0;
var perf_startT = 0;
var perf_endT = 0;

var player;
var player_bounceThreshold = 1;
var player_coyote = 5;
var player_stepHeight = 2;
var player_width = 3;

var rand_seed = 3;

//ray properties
const ray_maxDist = 3000;
const ray_nearDist = 3;
const ray_minDist = 0.1;
const ray_maxIters = 500;
var ray_safetyMult = 1;


var render_crosshair = true;
//goalN is used to change n. Changing n directly will mess up internal functions
var render_n = 512;
var render_goalN = render_n;
var render_shadowPercent = 0.7;
var render_linesDrawn = 0;

const months = [`March`, `Jan`, `January`, `Fay`, `May`, `.`, `Sept`, `July`, `Aug`, `Auct`, `Dec`, `Enerch`];

var date = new Date();

const splashes = [
	`Splash Text!`,
	`Now with WebGL!`,
	`We have soft shading`,
	`As seen on TV!`,
	`Frac(Fractals)tals!`,
	`Frac(Frac(Fractals)tals)tals!`,
	`Frac(Frac(Frac(Fractals)tals)tals)tals!`,
];

const tree_maxD = 5000;
const tree_minD = 2;
const tree_l = 41;
var tree_sets = 7;

const texture_rowsPerObj = 4;
const texture_rowsPerMat = 3;
const texture_rowsPerNode = 2;
const texture_worldCols = 6;
var texture_universe;
var texture_universeArr;
var texture_bvh;
var texture_bvhArr;

const universe_maxID = 20;

//uniforms
var uDebug;
var uResolution;
var uTime;
var uCamPos;
var uCamRot;
var uCamWorld;
var uObjectCount;
var uUniverseTex;
var uUniverseBVH;

var worker_num = 8;
var worker_pool = [];
var worker_ready = [];

var loading_world;

const world_maxObjs = 500;
const world_objectChunks = Math.floor(Math.cbrt(10000));
var worlds = {};
var world_time = 0;