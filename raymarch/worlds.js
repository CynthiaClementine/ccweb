function world_loopRay(ray, width) {
	var rPos = ray.pos;
	var ww = ray.world.width ?? width;
	rPos[0] = modulate(rPos[0], ww);
	rPos[1] = modulate(rPos[1], ww);
	rPos[2] = modulate(rPos[2], ww);
}

//pridepotato314 - lemon hamas cone

function world_brighten(ray, color) {
	ray.color[0] += color[0];
	ray.color[1] += color[1];
	ray.color[2] += color[2];
	ray.color[3] += color[3] ?? 1;
}

function world_spherize(ray, sphereR) {
	ray.dPos[1] += (ray.localDist / sphereR);
	ray.dPos = normalize(ray.dPos);
}


var map_idPre = {
	10: world_loopRay,
	20: world_brighten,
	30: world_spherize
};
var map_preId = Object.fromEntries(Object.entries(map_idPre).map(a => [a[1].name, a[0]]));

var map_idPost = {
	0: bg,
	1: bg_range,
	2: bg_gradient,
	10: bg_fadeTo,
	11: bg_fadeToOld,
	12: bg_fadeToRange,
	20: bg_sun
};
var map_postId = Object.fromEntries(Object.entries(map_idPost).map(a => [a[1].name, a[0]]));


//applies a background color.
function bg(ray, color) {
	applyColor(Color4(color[0], color[1], color[2], 0), ray.color);
}

function bg_range(ray, color1, color2) {
	var r1 = randomBounded(color1[0], color2[0]);
	var r2 = randomBounded(color1[1], color2[1]);
	var r3 = randomBounded(color1[2], color2[2]);
	applyColor(Color(r1, r2, r3), ray.color);
}

function bg_gradient(ray, color, power) {
	applyColor(Color4(color[0], color[1], color[2], ray.dPos[1] ** power), ray.color);
}

function bg_fadeTo(ray, color, dist) {
	var distPerc = clamp(ray.hitDist / dist, 0, 0.9) ** 2;
	ray.color[0] = color[0]*distPerc + ray.color[0]*(1-distPerc);
	ray.color[1] = color[1]*distPerc + ray.color[1]*(1-distPerc);
	ray.color[2] = color[2]*distPerc + ray.color[2]*(1-distPerc);
}

function bg_fadeToOld(ray, color, dist) {
	var distPerc = clamp(ray.totalDist / dist, 0, 0.9) ** 2;
	ray.color[0] = color[0]*distPerc + ray.color[0]*(1-distPerc);
	ray.color[1] = color[1]*distPerc + ray.color[1]*(1-distPerc);
	ray.color[2] = color[2]*distPerc + ray.color[2]*(1-distPerc);
}

function bg_fadeToRange(ray, color1, color2, dist) {
	var r1 = randomBounded(color1[0], color2[0]);
	var r2 = randomBounded(color1[1], color2[1]);
	var r3 = randomBounded(color1[2], color2[2]);
	bg_fadeTo(ray, Color(r1, r2, r3), dist);
}

function bg_sun(ray, color, sunSize) {
	if (ray.hit) {
		return;
	}
	if (!loading_world.sunVector) {
		return;
	}
	var dotted = Math.max(dot(ray.dPos, loading_world.sunVector) - 1 + sunSize, 0);
	var dotted = Math.min(2 * dotted / sunSize, 1);
	ray.color[0] = linterp(ray.color[0], color[0], dotted);
	ray.color[1] = linterp(ray.color[1], color[1], dotted);
	ray.color[2] = linterp(ray.color[2], color[2], dotted);
}



class World {
	/**
	 * Creates a World object
	 * @param {String} name 
	 * @param {Function[]} preEffects effects applied at every stage of a ray's march
	 * @param {Function[]} effects effects applied after a ray finishes its march
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 * @param {Number|none} shadowPercent a number from 0 to 1 representing the brightness of shadowed areas. At 0, shadows do nothing. At 1, shadows are pure black.
	 */
	constructor(name, preEffects, effects, sunVector, spawn, objects, shadowPercent, tickFunc) {
		console.log(`started ${name}..`);
		this.name = name;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		this.tickFunc = tickFunc;
		
		if (preEffects.length >= texture_worldCols) {
			throw new Error(`World ${name}: too many pre-effects!`);
		}
		if (effects.length >= texture_worldCols) {
			throw new Error(`World ${name}: too many post-effects!`);
		}
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		
		this.ambientLight = 1 - (shadowPercent ?? render_shadowPercent);
		
		this.grid = null;
		this.tree = null;
		this.bvh = null;
		this.finalize();
	}
	
	finalize() {
		//serialize objects
		for (var o=0; o<this.objects.length; o++) {
			if (this.objects[o].constructor.name == "String") {
				this.objects[o] = deserialize(this.objects[o]);
			}
		}
		if (this.objects.length > world_maxObjs) {
			throw new Error(`World ${this.name}: too many objects!`);
		}
		
		this.id = Object.keys(worlds).length;
		if (this.id >= universe_maxID) {
			throw new Error(`World ${this.name}: too many worlds!`);
		}
		worlds[this.name] = this;
		worldsByID[this.id] = this;
		
		//generate BrickMap
		// this.grid = new ObjectGrid(this, world_objectChunks);
		// this.tree = new BrickMap(this, tree_maxD, tree_sets);
		this.bvh = new BVH(this);
		// this.grid.generate();
		// this.tree.generate();
		this.bvh.generate();
		
		
		this.tree = new ObjectGrid(this, world_objectChunks);
		this.tree.generate();
		console.log(`finished ${this.name}!`);
	}
	
	serialize() {
		return "`" + this.objects.map(a => a.serialize()).join("`,\n`") + "`";
	}
	
	//estimate distance at a given point. Returns both distance and the object that gave that distance
	estimateObj(obj) {
		var dist = 1e1001;
		var distObj = undefined;
		var testDist;
		this.objects.forEach(o => {
			testDist = o.distanceToObj(obj);
			if (testDist < dist) {
				dist = testDist;
				distObj = o;
			}
		});
		return [dist, distObj];
	}
	
	estimatePos(pos) {
		var dist = 1e100;
		var distInd = -1;
		for (var i=0; i<this.objects.length; i++) {
			var testDist = this.objects[i].distanceToPos(pos);
			if (testDist < dist) {
				dist = testDist;
				distInd = i;
			}
			//if the distance is small enough, don't bother running through all the other objects
			if (dist < -2) {
				return [dist, distInd];
			}
		}
		return [dist, distInd];
	}
	
	tick() {
		// this.tree.update();
		if (loading_world == this && this.tickFunc) {
			this.tickFunc();
		}
	}
}

class World_Looping {
	/**
	 * A World object that has built in looping effects, for pseudo-infinite space.
	 * @param {String} name 
	 * @param {Function[]} preEffects 
	 * @param {Function[]} effects 
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 * @param {Number} size 
	 * @param {Number|none} shadowPercent 
	 */
	constructor(name, preEffects, effects, sunVector, spawn, objects, size, shadowPercent) {
		console.log(`started ${name}..`);
		this.name = name;
		this.width = size;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		
		if (preEffects.length >= texture_worldCols) {
			throw new Error(`World ${name}: too many pre-effects!`);
		}
		if (effects.length >= texture_worldCols) {
			throw new Error(`World ${name}: too many post-effects!`);
		}
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		this.ambientLight = 1 - (shadowPercent ?? render_shadowPercent);
		
		//because we're dealing with a small space, a BrickMap probably isn't necessary. 
		//A single BrickGrid will do just fine
		this.tree = null;
		this.bvh = null;
		this.finalize();
	}
	
	finalize() {
		this.id = Object.keys(worlds).length;
		if (this.id >= universe_maxID) {
			throw new Error(`World ${this.name}: too many worlds!`);
		}
		worlds[this.name] = this;
		worldsByID[this.id] = this;
		
		this.duplicateObjs();
		this.tree = new ObjectGrid(this, world_objectChunks);
		this.bvh = new BVH(this);
		this.tree.generate();
		this.bvh.generate();
		
	}
	
	duplicateObjs() {
		var duplicates = [];
		this.objects.forEach(o => {
			for (var x=-1; x<=1; x++) {
				for (var y=-1; y<=1; y++) {
					for (var z=-1; z<=1; z++) {
						if (x || y || z) {
							var dupe = deserialize(o.serialize());
							dupe.pos[0] += x * this.width;
							dupe.pos[1] += y * this.width;
							dupe.pos[2] += z * this.width;
							if (dupe.posEnd) {
								dupe.posEnd[0] += x * this.width;
								dupe.posEnd[1] += y * this.width;
								dupe.posEnd[2] += z * this.width;
							}
							duplicates.push(dupe);
						}
					}
				}
			}
		});
		this.objects.push(...duplicates);
		if (this.objects.length > world_maxObjs) {
			throw new Error(`World ${this.name}: too many objects!`);
		}
	}
	
	tick() {
		if (loading_world != this) {
			return;
		}
		
	}
	
	estimateObj(obj) {
		var dist = 1e1001;
		var distObj = undefined;
		var testDist;
		this.objects.forEach(o => {
			testDist = o.distanceToObj(obj);
			if (testDist < dist) {
				dist = testDist;
				distObj = o;
			}
		});
		return [dist, distObj];
	}
	
	estimatePos(pos) {
		var dist = 1e1001;
		var distInd = -1;
		var testDist;
		for (var i=0; i<this.objects.length; i++) {
			testDist = this.objects[i].distanceToPos(pos);
			if (testDist < dist) {
				dist = testDist;
				distInd = i;
			}
		}
		return [dist, distInd];
	}
}


var worldsByID = [];

function createWorlds() {
	console.log(`creating worlds!`);
	
	new World("start", 
		[
			// [world_brighten, [1, 1, 1, 1]]
		],[
			[bg, Color(80, 90, 80)],
			[bg_sun, Color(255, 255, 240), 0.002]
		],
		polToCart(0, 0.7, 1),
		[0, 600, 0],
		[
			`CUBE~[-100,330,100]~0~0~90~0|color:90~114~187|45`,
			`PRISM-RHOMBUS~[0,300,-80]~0~0~90~0|color:255~64~64|5~24~30~0~50`,
			`BOX-FRAME~[100,100,100]~0~0~90~0|glass:255~128~255~40|50~50~50~10`,
			`CYLINDER~[155,-50,-400]~0~0~90~0|color:64~255~150|1500~100`,
			`CYLINDER~[-500,300,0]~0~0~90~0|rubber|100~250`,
			`ELLIPSE~[-300,100,200]~0~0~90~0|mirror:128~128~255~30|100~80~60`,
			`GYROID~[100,100,-300]~0~0~90~0|color:255~240~10|50~50~50~0.08~13~10`,
			`RING~[500,400,0]~0~0~90~0|color:128~255~255|100~20`,
			`BOX-MOVING~[-80,100,-387]~1~0~90~0|color:40~0~255|10~10~10`,
			`BOX~[-587,60,-777]~0~0~90~0|mirror:255~0~255~7|10~10~5`,
			`BOX~[-573,60,-763]~0~0~90~0|mirror:255~0~255~57|5~10~10`,
			`BOX~[-584,60,-748]~0~0~90~0|mirror:255~0~255~9|10~10~5`,
			`CAPSULE~[900,50,-827]~0~0~90~0|portal:darkBright~[0,0,0]|15~20`,
			`BOX~[746,60,-399]~0~0~90~0|portal:cubes~[0,50,0]|10~10~10`,
			`BOX~[-100,385,100]~0~0~90~0|portal:tinyObjs~[0,0,0]|10~10~10`,
			`SPHERE~[177,90,511]~0~0~90~0|color:255~255~255|40`,
			`ELLIPSE~[783,835,710]~4~0~90~0|ghost:103~103~132~8|41~47~83`,
			`ELLIPSE~[63,739,680]~4~0~90~0|ghost:111~117~172~8|177~85~119`,
			`ELLIPSE~[-461,699,-87]~4~0~90~0|ghost:242~255~255~7|181~210~102`,
			`ELLIPSE~[-60,743,-340]~4~0~90~0|ghost:255~255~255~8|106~82~108`,
			`ELLIPSE~[-186,782,-153]~4~0~90~0|ghost:255~255~255~6|104~91~106`,
			`CAPSULE~[410,766,-557]~4~0~90~0|ghost:255~255~255~12|54~10`,
			`ELLIPSE~[-68,805,-423]~4~0~90~0|ghost:255~255~255~7|148~49~83`,
			`ELLIPSE~[-270,715,-188]~4~0~90~0|ghost:251~255~255~6|110~76~88`,
			`ELLIPSE~[-501,589,-7]~4~0~90~0|ghost:212~223~235~14|88~110~110`
		],
		0.4
	);
	
	new World("darkBright", [
			[world_brighten, [1, 160/255, 140/255, 1.5]]
		],[
			[bg_range, Color(10, 10, 10), Color(30, 30, 30)],
			[bg_fadeToRange, Color(10, 10, 10), Color(30, 30, 30), 800],
			[bg_sun, Color(255, 160, 140), 0.01],
		],
		polToCart(0.1, Math.PI * 0.47, 1),
		[101, 101, 101],
		[
			`BOX~[0,-100,0]~0~0~90~0|color:0~0~64|6000~50~6000`,
			`Scene3dLoop~1000~1000~1000~120||OCTAHEDRON~[60,60,60]~0~0~90~0|color:0~0~160|20~15~15`,
			`LINE~[-477,550,-311]~0~0~90~0|color:0~0~160|-240~670~-300~5`
		]
	);
	
	new World("tinyObjs",
		[
			[world_spherize, 600]
		],[
			[bg, Color(120, 120, 120)]
		],
		polToCart(0, 1.04, 1),
		[-19.85, 308.75, 241.36],
		[
			`BOX~[0,10,0]~0~0~90~0|color:64~255~150|1000~40~1000`,
			`CUBE~[1000,500,0]~0~0~90~0|color:255~64~64|70`,
			`CUBE~[788,80,265]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[758,80,154]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[256,80,686]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[159,80,90]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[604,80,156]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[730,80,775]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-788,80,-265]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-758,80,-154]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-256,80,-686]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-159,80,-90]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-604,80,-156]~0~0~90~0|color:255~64~64|60`,
			`CUBE~[-730,80,-775]~0~0~90~0|color:255~64~64|60`,
			`SPHERE~[0,100,0]~0~0~90~0|color:128~0~128|100`,
			`CAPSULE~[500,60,0]~0~0~90~0|color:128~128~255|100~100`,
			`CAPSULE~[720,60,-200]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[810,60,-150]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[100,60,-400]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-500,60,0]~0~0~90~0|color:128~128~255|100~100`,
			`CAPSULE~[-720,60,-200]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-810,60,-150]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-100,60,-400]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-500,60,840]~0~0~90~0|color:128~128~255|100~100`,
			`CAPSULE~[-720,60,200]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-810,60,150]~0~0~90~0|color:128~128~255|50~50`,
			`CAPSULE~[-100,60,400]~0~0~90~0|color:128~128~255|50~50`,
			`RING~[500,100,0]~0~0~90~0|color:128~255~255|200~50`,
			`LINE~[1000,800,990]~0~0~90~0|color:246~173~105|-372~-50~-563~3`,
			`LINE~[628,750,427]~0~0~90~0|color:246~173~105|-751~150~-193~3`,
			`LINE~[-123,900,234]~0~0~90~0|color:246~173~105|0~-500~-34~3`,
			`LINE~[-123,900,234]~0~0~90~0|color:246~173~105|0~-500~-34~3`,
			`LINE~[628,750,427]~0~0~90~0|color:246~173~105|304~-180~-359~3`,
			`LINE~[-122,916,219]~0~0~90~0|color:246~173~105|-38~-68~-255~3`,
			`LINE~[-160,848,-36]~0~0~90~0|color:246~173~105|-114~-156~5~3`,
			`LINE~[-274,692,-31]~0~0~90~0|color:246~173~105|-97~-26~209~3`,
			`LINE~[-371,666,178]~0~0~90~0|color:246~173~105|219~-102~200~3`,
			`CAPSULE~[900,50,-827]~0~0~90~0|portal:cubes~[0,0,0]|15~10`
		]
	);
	
	
	//cubes world
	var objs = [
		`LINE~[60,60,60]~0~0~90~0|color:240~180~60|80~60~80~3`,
		`LINE~[45,128,117]~0~0~90~0|color:255~0~255|81~82~83~3`,
		`LINE~[-2,117,-636]~0~0~90~0|color:255~224~255|118~6~11~8`,
		`CYLINDER~[-202,121,19]~0~0~90~0|portal:gyroidCaves~[-62,-100,-104]|15~10`,
		`BOX~[861,91,-400]~0~0~90~0|color:255~255~255|420~10~25`,
		`PRISM-RHOMBUS~[373,124,-399]~0~0~90~0|color:255~255~255|10~70~25~1~-74`,
		`CYLINDER~[1073,109,-404]~0~0~90~0|portal:turtleHell~[7,68,105]|10~15`,
		`CAPSULE~[-226,134,-676]~0~0~90~0|portal:spheres~[193,18,0]|15~7.5`
	];
	var acceptableMats = [
		`color: 57~   ~ 64`, `color:133~111~132`, `color:124~ 80~119`,
		`color:115~   ~113`, `color:168~ 75~132`, `color:194~112~141`,
		`color:157~131~108`, `color:132~160~124`, `color:220~149~150`,
	];
	
	rand_seed = 4;
	for (var f=0; f<200; f++) {
		var pos = Pos(prand(-800, 800), prand(0, 500), prand(-800, 800));
		var r = prand(30, 60);
		var mat = acceptableMats[Math.floor(prand(0, acceptableMats.length))];
		objs.push(new Cube({pos: pos}, deserializeMat(mat), 0, r));
	}
	
	new World("cubes",
		[],[
			[bg, Color(5,0,10)],
			[bg_fadeTo, Color(0,0,0), 1500]
		],
		polToCart(0, Math.PI / 2, 1),
		[197,349,-403],
		objs
	);
	
	// new World_Looping("spheresForever", [
	// 		[world_loopRay, 120]
	// 	],[
	// 		[bg, Color(255,227,245)],
	// 		[bg_fadeToOld, Color(255,227,245), 1200]
	// 	],
	// 	polToCart(0.6, 0.4, 1),
	// 	[60.2, 100, 60.2],
	// 	[
	// 		new Line(Pos(0, 10, 60), new M_Color(240, 180, 60), 0, Pos(20, 10, 60), 5),
	// 		new Line(Pos(120, 10, 60), new M_Color(240, 180, 60), 0, Pos(100, 10, 60), 5),
	// 		new Line(Pos(60, 10, 0), new M_Color(240, 180, 60), 0, Pos(60, 10, 20), 5),
	// 		new Line(Pos(60, 10, 120), new M_Color(240, 180, 60), 0, Pos(60, 10, 100), 5),
	// 		// new Ring(Pos(60, 40, 60), new M_Color(240, 180, 60), 60, 10),
	// 		// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 6, 5, 60),
	// 		// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 60, 5, 6),
	// 		new Sphere(Pos(40, 60, 10), new M_Color(60, 40, 60), 0, 15),
			
	// 		new Line(Pos(20, 10, 60), new M_Color(240, 180, 60), 0, Pos(60, 10, 20), 5),
	// 		new Line(Pos(60, 10, 20), new M_Color(240, 180, 60), 0, Pos(100, 10, 60), 5),
	// 		new Line(Pos(100, 10, 60), new M_Color(240, 180, 60), 0, Pos(60, 10, 100), 5),
	// 	],
	// 	120
	// );
	
	new World("turtleHell", [
			// [world_loopRay, 120]
		],[
			[bg, Color(255, 227, 245)],
			[bg_fadeToOld, Color(255, 227, 245), 800],
		],
		polToCart(0.6, 0.4, 1),
		[60.2,100,60.2],
		[	`Scene3dLoop~8000~8000~8000~120||RING~[60,60,60]~0~0~90~0|color:240~180~60|60~10`,
			`SPHERE~[1500,-460,-1620]~0~0~90~0|portal:parkourSimple~[-1600,860,1700]|40`
		],
		null,
		() => {
			constrainPlayer(5040, 5040, 5040);
		}
	);
	
	new World("gyroidCaves", [
			[world_brighten, Color(1,1,1)]
		],[
			[bg, Color(40, 30, 50)],
			[bg_sun, Color(255, 255, 240), 0.0025],
			[bg_sun, Color(0, 0, 0), 0.001]
		],
		polToCart(-0.82, 0.73, 1),
		[17,22,-6],
		[	`GYROID~[0,0,0]~0~0~90~0|color:50~240~10|200~10~200~0.08~13~10`,
			`BOX~[112,22,105]~0~0~90~0|rubber|30~10~30`,
			`CYLINDER~[-115,22,-59]~0~0~90~0|portal:cubes~[-70,110,30]|10~15`,
			`BOX~[112,193,105]~0~0~90~0|portal:start~[0,0,0]|20~6~20`
		]
	);
	
	new World("parkourSimple", [
		],[
			[bg, Color(80, 80, 120)],
			[bg_fadeTo, Color(80, 80, 120), 2000],
			[bg_sun, Color(255, 200, 170), 0.003],
			[bg_sun, Color(255, 255, 255), 0.001],
		],
		polToCart(0.2, 0.7, 1),
		[-101, 400, 101],
		[	`CUBE~[-100,330,100]~0~0~90~0|rubber|45`,
			`BOX~[-118,100,165]~0~0~90~0|mirror:0~149~234~34|3200~80~3200`,
			`BOX~[-82,400,218]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-147,428,298]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-91,451,384]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-8,474,335]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[82,500,302]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[109,527,207]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[72,554,110]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[5,581,38]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-82,600,-18]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-225,628,225]~0~0~90~0|color:255~0~255|10~10~10`,
			`BOX~[-88,370,116]~0~0~90~0|color:186~197~203|25~7~25`
		]
	);
	
	new World("speedCheck", [
		],[
			[bg, Color(80, 80, 120)],
			[bg_sun, Color(255, 200, 170), 0.003],
			[bg_sun, Color(255, 255, 255), 0.001]
		],
		polToCart(0.2, 0.7, 1),
		[-101, 400, 101],
		[	`BOX~[0,0,0]~0~0~90~0|mirror:0~149~234~34|10000~70~300`,
			`CAPSULE~[100,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[100,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[200,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[200,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[300,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[300,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[400,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[400,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[500,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[500,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[600,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[600,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[700,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[700,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[800,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[800,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[900,80,60]~0~0~90~0|color:255~240~200|15~10`,  `CAPSULE~[900,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1000,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1000,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1100,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1100,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1200,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1200,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1300,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1300,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1400,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1400,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1500,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1500,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1600,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1600,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1700,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1700,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1800,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1800,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[1900,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[1900,80,-60]~0~0~90~0|color:255~240~200|15~10`,
			`CAPSULE~[2000,80,60]~0~0~90~0|color:255~240~200|15~10`, `CAPSULE~[2000,80,-60]~0~0~90~0|color:255~240~200|15~10`
		]
	);
	
	new World("stairwell", [
		],[
			[bg_fadeTo, Color4(128, 128, 128, 128), 100],
			[bg, Color(184, 255, 249)]
		],
		polToCart(1.4, Math.PI * 0.4, 1),
		[0, 0, 0],
		[	`CYLINDER~[0,-19,0]~0~0~90~0|color:255~255~255|200~20`,
			`BOX~[86,1,-8]~0~0~90~0|color:255~255~255|100~2~5`,
			`BOX~[86,1,-10]~0~0~90~0|color:255~255~255|100~3~5`,
			`BOX~[86,1,-12]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,2,-14]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,3,-16]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,4,-18]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,5,-20]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,6,-22]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,7,-24]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,8,-26]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,9,-28]~0~0~90~0|color:255~255~255|100~4~5`,
			`BOX~[86,10,-30]~0~0~90~0|color:255~255~255|100~4~5`,
		],
		1
	);
	
	
	
	
	new World("spheres", [
		],[
			[bg_fadeTo, Color4(128, 128, 128, 128), 200],
			[bg, Color(20, 1, 30)]
		],
		polToCart(1.4, Math.PI * 0.3, 1),
		[0, 0, 0],
		[	`BOX~[86,-7,-24]~0~0~90~0|color:255~255~255|200~20~200`,
			`SHELL~[62,13,-35]~0~0~90~0|glass:191~243~255~217|1510~10`,
			`SPHERE~[87,18,99]~0~0~90~0|glass:255~0~255~141|10`,
			`SPHERE~[76,19,70]~0~0~90~0|mirror:255~0~255~14|10`,
			`SPHERE~[43,31,36]~0~0~90~0|mirror:241~237~255~143|26`,
			`SPHERE~[-17,57,96]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[159,25,57]~0~0~90~0|color:104~0~0|10`,
			`SPHERE~[102,25,-60]~0~0~90~0|mirror:255~0~255~0|10`,
			`SPHERE~[-44,25,-44]~0~0~90~0|color:81~63~201|10`,
			`SPHERE~[82,25,21]~0~0~90~0|mirror:93~146~69~96|10`,
			`SPHERE~[159,25,-20]~0~0~90~0|color:255~133~255|10`,
			`SPHERE~[25,25,-104]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[192,25,-130]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[219,25,140]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[170,25,36]~0~0~90~0|mirror:0~0~0~9|10`,
			`SPHERE~[247,25,-32]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[-84,25,-145]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[-43,25,59]~0~0~90~0|mirror:255~0~255~26|10`,
			`SPHERE~[-1,25,150]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[118,20,184]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[82,77,-14]~0~0~90~0|concrete|20`,
			`SPHERE~[120,132,76]~0~0~90~0|color:255~0~255|15`,
			`SHELL~[131,115,-3]~0~0~90~0|glass:255~0~255~36|17~3.5`,
			`SPHERE~[139,149,-33]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[48,142,-124]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[-12,134,-14]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[100,183,-84]~0~0~90~0|color:131~255~0|10`,
			`SPHERE~[118,217,11]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[-18,171,-69]~0~0~90~0|color:255~0~255|10`,
			`SPHERE~[132,697,771]~0~0~90~0|glass:255~255~255~255|51`,
			`SPHERE~[-5,824,-774]~0~0~90~0|glass:255~203~136~94|110`,
			`SHELL~[-591,1056,761]~0~0~90~0|glass:255~109~255~44|122~10.6`,
			`SPHERE~[1170,1571,-266]~0~0~90~0|glass:83~199~255~48|110`,
			`BOX~[-69,-1481,46]~0~0~90~0|color:0~121~0|10~10~10`,
			`BOX~[-69,-1460,46]~0~0~90~0|portal:stairwell~[0,1460,0]|10~10~10`
		],
		1
	);
	
	new World("desert", [
	
	], [
		[bg, Color(28, 3, 54)]
	],
	polToCart(0.2, 0.01, 1),
	[0, 0, 0],
	[	`BOX~[0,-100,0]~0~0~90~0|color:119~0~64|6000~50~6000`,
		`BOX~[257,-16,-828]~0~103~380~227|color:255~0~255|1~35~80`,
		`BOX~[336,-16,-749]~0~93~428~164|color:255~0~255|80~35~1`,
		`BOX~[415,-16,-892]~0~223~433~171|color:255~0~255|1~35~16`,
		`BOX~[336,-16,-907]~0~0~90~0|color:255~0~255|80~35~1`,
		`BOX~[331,-11,-871]~0~111~138~230|color:128~128~255|32~31~40`
	]
	);
	
	
	console.log(`finished loading ${worldsByID.length} worlds.`);
	
	loading_world = worlds["desert"];
}