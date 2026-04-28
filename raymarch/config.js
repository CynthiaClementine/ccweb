// var globalA = 0.08;
// var globalB = 13;

const degToRad = (Math.PI / 180);

const fencepost32 = 0xff0110ff;

//it's called scaryVariable because you don't know if you can remove it or not
var scaryVariable = 0;

const N_NORMAL =0;
const N_GLOOP = 1;
const N_ANTI =	2;
const N_FOG =	4;
const N_SMOOTH =8;
const N_GRAVITY=16;

const M_COLOR =		0;
const M_CONCRETE =	1;
const M_RUBBER =	2;
const M_NORMAL =	3;
const M_GLASS =		10;
const M_GHOST =		11;
const M_PORTAL =	20;
const M_GRAVITY =	25;
const M_MIRROR =	30;

const TYPE_SPHERE =			0;
const TYPE_ELLIPSE =		1;
const TYPE_CAPSULE =		2;
const TYPE_CYLINDER =		3;
const TYPE_SHELL =			4;
const TYPE_CONE =			5;
const TYPE_BOX =			10;
const TYPE_BOXFRAME =		11;
const TYPE_GYROID =			12;
const TYPE_VOXEL =			13;
const TYPE_CUBE =			14;
const TYPE_LINE =			20;
const TYPE_DISH =			22;
const TYPE_OCTAHEDRON =		30;
const TYPE_RING =			40;
const TYPE_PRISM_RHOMBUS =	51;
const TYPE_PRISM_HEX =		53;
const TYPE_PRISM_OCT =		55;
const TYPE_FRACTAL =		70;
const TYPE_TERRAIN =		71;

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

const bvhTolerance = 0;

var camera_FOV = 90;
var camera_halfTan = Math.tan((camera_FOV / 2) * degToRad);
var camera_halfTanVert = Math.tan((camera_FOV / 2) * degToRad);
var camera_planeOffset = 1;
var camera_projFunc = projectOct;
var camera_paniniR = 0.3;
var camera;

var clipboard = null;

//standard 16 colors
const colors16 = [
	`#000`,`#008`,`#080`,`#088`,
	`#800`,`#808`,`#880`,`#CCC`,
	`#888`,`#00F`,`#0F0`,`#0FF`,
	`#F00`,`#F0F`,`#FF0`,`#FFF`,
];
const color_editor_border = colors16[15];


var controls_cursorLock = false;
var controls_shiftPressed = false;
var controls_altPressed = false;
var controls_sensitivity = 0.005;

var debug_listening = false;
var debug_flags = {
	autoScale: false,
	bunnyTargets: false,
	collisionRaycast: false,
	showChunk: false,
	realCrosshair: true,
};

var editor_active = false;
var editor_local = false;
var editor_placeOffset = 100;
var editor_placeRange = [10, 2000];
var editor_axisType = null;
var editor_axis = null;

const pxdata_world = [
	0xF9999F,
	0x929999,
	0x922292,
	0x992929,
	0x999299,
	0xF9999F,
];
[pxdata_world.w, pxdata_world.h] = [6, 6];
const pxdata_box = [
	0x777778,
	0x7FFFF8,
	0x7FFFF8,
	0x7FFFF8,
	0x7FFFF8,
	0x788888,
];
[pxdata_box.w, pxdata_box.h] = [6, 6];

const fractal_iters = 10;

var lineBuffers = [];
var lineBuffer_num = -1;

var mortonBits = 10;

var page_animation;

var perf_log = {
	"tick": [0], 
	"intra": [0], 
	"inter": [0]
};
var perf_len = 20;
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
var render_n = 150;
var render_nAutoRange = [120, 512];
var render_lastScaleTime = -1;
var render_colN = 60;
var render_goalN = render_n;
var render_shadowPercent = 0.7;
var render_linesDrawn = 0;


const months = [`March`, `Jan`, `January`, `Fay`, `May`, `.`, `Sept`, `July`, `Aug`, `Auct`, `Dec`, `Enerch`];

var date = new Date();

const splashes = [
	`Splash Text!`,
	`Now with 60000% more pixels!`,
	`Now with WebGL!`,
	`We have soft shading`,
	`As seen on TV!`,
	`I'll Have You Know, I'm Moderately Popular With a Number of Extremely Mentally Ill Trans Women on a Failing Social Media Website`,
	`Best in class!`,
	`pure exhilaration.`,
	`hi`,
	`.... hi....`,
	`It sure is    here! `,
	`Rearticulating spines!`,
	`What do I do with this drunken sailor?`,
	`Locally sourced.`,
	`I put my friends on the GPU. I put my WIFE on the GPU!`,
	`Jensen Huang is sobbing.`,
	`Maximizing shareholder value since 1929!`,
	`More heartwarming than a radioactive pacemaker! `,
	`squircles now included!`,
	`Limited Edition!`,
	`I sold my car for this!!`,
	`hi my name is john sTith PJEMBERTON`,
	`I know you're playing this on ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
	`A house? In this economy???`,
	`I am in crippling financial debt!`,
	`I am in crippling sleep debt!`,
	`When was the last time you cleaned your keyboard?`,
	`I still can't spell defenestrate.`,
	`:3`,
	`0-0`,
	`0u0`,
	`waow`,
	`The governmental spending of the United States is untenable and its economy is only being held up by the quickly diminishing role it plays as the world's reserve currency!`,
	`All the money is gone! Rush your bank!`,
	`More hampered than a laundry basket! `,
	`Hampter.`,
	`Euclidean!*`,
	`Beloved by millions!`,
	`I can promise you much, but offer you little.`,
	`Short and stout!`,
	`Stop and smell the Rosen-Einstein bridge!`,
	`The things you're nostalgic for are likely mediocre at best!`,
	`INFDEAF `,
	`Fascist takeover!`,
	`Now with 80% more shariah law!`,
	`March comes in like a lion!`,
	`I would go on the internet and write a callout post. About the porcupine.`,
	`Babushka! `,
	`Now you're thinking with portals!`,
	`Turtle Hell 1999`,
	`Also check out red pandas!`,
	`See also: Laser broom`,
	`Overpopulating pixels!!`,
	`All your friends are coefficient hacking!`,
	`The sky of the spheres is not as it seems.`,
	`My goal is to integer overflow the number of bugs.`,
	`Buckle your pants!`,
	`Just two triangles!`,
	`Gullible is written on your forehead!`,
	`RAaahaagagaggaggghsbhhhhhg`,
	`I would never lie to you!`,
	`I would never not lie to you!`,
	`And so on.`,
	`Tacit approval by the United Nations!`,
	`Perlin not included!`,
	`Consider the lobster!`,
	`Marching on the Sun!`,
	`Dragon curve!`,
	`Elbereth!`,
	`Held under the dorsal guiding feathers?`,
	`Don't trust people who say always or never!`,
	`Spain without the 'a'!`,
	`Question authority!`,
	`Help, help, I'm being compressed!`
];

var tickHandler;

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
var uResFov;
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
