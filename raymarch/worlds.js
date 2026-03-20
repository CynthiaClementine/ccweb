function world_loopRay(ray, width) {
	var rPos = ray.pos;
	var ww = ray.world.width ?? width;
	rPos[0] = modulate(rPos[0], ww);
	rPos[1] = modulate(rPos[1], ww);
	rPos[2] = modulate(rPos[2], ww);
}

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
		return `"` + this.objects.map(a => a.serialize()).join(`",\n"`) + `"`;
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
			"CUBE|color:90~114~187|[-100,330,100]~0~45",
			"PRISM-RHOMBUS|color:255~64~64|[0,300,-80]~0~5~24~30~17~50",
			new BoxFrame(Pos(100, 100, 100), new M_Glass(255, 128, 255, 40), 0, 50, 50, 50, 10),
			"CYLINDER|color:64~255~150|[155,-50,-400]~0~1500~100",
			"CYLINDER|rubber|[-500,300,0]~0~100~250",
			new Ellipsoid(Pos(-300, 100, 200), new M_Mirror(128, 128, 255, 30), 0, 100, 80, 60),
			new Gyroid(Pos(100, 100, -300), new M_Color(255, 240, 10), 0, 50, 50, 50, 0.08, 13, 10),
			new Ring(Pos(500, 400, 0), new M_Color(128, 255, 255), 0, 100, 20),
			// ...createCloud(),
			// new CloudSeed(Pos(-80,516,-387), 5),
			new Box_Moving(Pos(-80,100,-387), new M_Color(40, 0, 255), 0, 10, 10, 10),
			
			"BOX|mirror:255~0~255~7|[-587,60,-777]~0~10~10~5",
			"BOX|mirror:255~0~255~57|[-573,60,-763]~0~5~10~10",
			"BOX|mirror:255~0~255~9|[-584,60,-748]~0~10~10~5",
			
			new Capsule(Pos(900, 50, -827), new M_Portal(`darkBright`, Pos(0, 0, 0)), 0, 15, 20),
			"BOX|portal:cubes~[0,50,0]|[746,60,-399]~0~10~10~10",
			"BOX|portal:tinyObjs~[0,0,0]|[-100,385,100]~0~10~10~10",
			new Sphere(Pos(177, 90, 511), new M_Color(255, 255, 255), 0, 40, 5),
			"ELLIPSE|ghost:103~103~132~8|[783,835,710]~4~41~47~83",
			"ELLIPSE|ghost:111~117~172~8|[63,739,680]~4~177~85~119",
			"ELLIPSE|ghost:242~255~255~7|[-461,699,-87]~4~181~210~102",
			"ELLIPSE|ghost:255~255~255~8|[-60,743,-340]~4~106~82~108",
			"ELLIPSE|ghost:255~255~255~6|[-186,782,-153]~4~104~91~106",
			"CAPSULE|ghost:255~255~255~12|[410,766,-557]~4~54~10",
			"ELLIPSE|ghost:255~255~255~7|[-68,805,-423]~4~148~49~83",
			"ELLIPSE|ghost:251~255~255~6|[-270,715,-188]~4~110~76~88",
			"ELLIPSE|ghost:212~223~235~14|[-501,589,-7]~4~88~110~110",
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
			new Box(Pos(0, -100, 0), new M_Color(0, 0, 64), 0, 6000, 50, 6000),
			new Scene3dLoop(1000, 1000, 1000, 120, new Octahedron(Pos(60, 40, 60), new M_Color(0, 0, 160), 0, 20, 15, 15)),
			new Line(Pos(-477,550,-311), new M_Color(0, 0, 160), 0, -240,670,-300, 5)
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
			"BOX|color:64~255~150|[0,10,0]~0~1000~40~1000",
			"CUBE|color:255~64~64|[1000,500,0]~0~70",
			"CUBE|color:255~64~64|[788,80,265]~0~60",
			"CUBE|color:255~64~64|[758,80,154]~0~60",
			"CUBE|color:255~64~64|[256,80,686]~0~60",
			"CUBE|color:255~64~64|[159,80,90]~0~60",
			"CUBE|color:255~64~64|[604,80,156]~0~60",
			"CUBE|color:255~64~64|[730,80,775]~0~60",
			"CUBE|color:255~64~64|[-788,80,-265]~0~60",
			"CUBE|color:255~64~64|[-758,80,-154]~0~60",
			"CUBE|color:255~64~64|[-256,80,-686]~0~60",
			"CUBE|color:255~64~64|[-159,80,-90]~0~60",
			"CUBE|color:255~64~64|[-604,80,-156]~0~60",
			"CUBE|color:255~64~64|[-730,80,-775]~0~60",
			"SPHERE|color:128~0~128|[0,100,0]~0~100",
			"CAPSULE|color:128~128~255|[500,60,0]~0~100~100",
			"CAPSULE|color:128~128~255|[720,60,-200]~0~50~50",
			"CAPSULE|color:128~128~255|[810,60,-150]~0~50~50",
			"CAPSULE|color:128~128~255|[100,60,-400]~0~50~50",
			"CAPSULE|color:128~128~255|[-500,60,0]~0~100~100",
			"CAPSULE|color:128~128~255|[-720,60,-200]~0~50~50",
			"CAPSULE|color:128~128~255|[-810,60,-150]~0~50~50",
			"CAPSULE|color:128~128~255|[-100,60,-400]~0~50~50",
			"CAPSULE|color:128~128~255|[-500,60,840]~0~100~100",
			"CAPSULE|color:128~128~255|[-720,60,200]~0~50~50",
			"CAPSULE|color:128~128~255|[-810,60,150]~0~50~50",
			"CAPSULE|color:128~128~255|[-100,60,400]~0~50~50",
			"RING|color:128~255~255|[500,100,0]~0~200~50",
			"LINE|color:246~173~105|[1000,800,990]~0~-372~-50~-563~3",
			"LINE|color:246~173~105|[628,750,427]~0~-751~150~-193~3",
			"LINE|color:246~173~105|[-123,900,234]~0~0~-500~-34~3",
			"LINE|color:246~173~105|[-123,900,234]~0~0~-500~-34~3",
			"LINE|color:246~173~105|[628,750,427]~0~304~-180~-359~3",
			"LINE|color:246~173~105|[-122,916,219]~0~-38~-68~-255~3",
			"LINE|color:246~173~105|[-160,848,-36]~0~-114~-156~5~3",
			"LINE|color:246~173~105|[-274,692,-31]~0~-97~-26~209~3",
			"LINE|color:246~173~105|[-371,666,178]~0~219~-102~200~3",
			"CAPSULE|portal:cubes~[0,0,0]|[900,50,-827]~0~15~10"
		]
	);
	
	
	//cubes world
	var objs = [
		new Line(Pos(60, 60, 60), new M_Color(240, 180, 60), 0, 80, 60, 80, 3),
		new Line(Pos(45,128,117), new M_Color(255, 0, 255), 0, 81, 82, 83, 3),
		// new DebugLines(Pos(-800, -800, -800), Pos(800, 800, 800))
		
		"BOX|color:255~255~255|[861,91,-400]~0~420~10~25",
		"PRISM-RHOMBUS|color:255~255~255|[373,124,-399]~0~10~70~25~1~-74",
		
		new Cylinder(Pos(-202,121,19), new M_Portal("gyroidCaves", Pos(-62, -100, -104)), 0, 15, 10),
		"CYLINDER|portal:turtleHell~[7,68,105]|[1073,109,-404]~0~10~15",
		"LINE|color:255~224~255|[-2,117,-636]~0~118~6~11~8",
		"CAPSULE|portal:spheres~[193,18,0,0]|[-226,134,-676]~0~15~7.5"
	];
	var acceptableMats = [
		new M_Color(57, 0, 64), new M_Color(133, 111, 132), new M_Color(124, 80, 119), new M_Color(115, 0, 113), 
		new M_Color(168, 75, 132), new M_Color(194, 112, 141), new M_Color(220, 149, 150), new M_Color(157, 131, 108), 
		new M_Color(132, 160, 124)
	];
	
	rand_seed = 4;
	for (var f=0; f<200; f++) {
		var pos = Pos(prand(-800, 800), prand(0, 500), prand(-800, 800));
		var r = prand(30, 60);
		var mat = acceptableMats[Math.floor(prand(0, acceptableMats.length))];
		objs.push(new Cube(pos, mat, 0, r));
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
	
	new World_Looping("spheresForever", [
			[world_loopRay, 120]
		],[
			[bg, Color(255,227,245)],
			[bg_fadeToOld, Color(255,227,245), 1200]
		],
		polToCart(0.6, 0.4, 1),
		[60.2, 100, 60.2],
		[
			new Line(Pos(0, 10, 60), new M_Color(240, 180, 60), 0, Pos(20, 10, 60), 5),
			new Line(Pos(120, 10, 60), new M_Color(240, 180, 60), 0, Pos(100, 10, 60), 5),
			new Line(Pos(60, 10, 0), new M_Color(240, 180, 60), 0, Pos(60, 10, 20), 5),
			new Line(Pos(60, 10, 120), new M_Color(240, 180, 60), 0, Pos(60, 10, 100), 5),
			// new Ring(Pos(60, 40, 60), new M_Color(240, 180, 60), 60, 10),
			// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 6, 5, 60),
			// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 60, 5, 6),
			new Sphere(Pos(40, 60, 10), new M_Color(60, 40, 60), 0, 15),
			
			new Line(Pos(20, 10, 60), new M_Color(240, 180, 60), 0, Pos(60, 10, 20), 5),
			new Line(Pos(60, 10, 20), new M_Color(240, 180, 60), 0, Pos(100, 10, 60), 5),
			new Line(Pos(100, 10, 60), new M_Color(240, 180, 60), 0, Pos(60, 10, 100), 5),
		],
		120
	);
	
	new World("turtleHell", [
			// [world_loopRay, 120]
		],[
			[bg, Color(255, 227, 245)],
			[bg_fadeToOld, Color(255, 227, 245), 800],
		],
		polToCart(0.6, 0.4, 1),
		[60.2,100,60.2],
		[
			new Scene3dLoop(8000, 8000, 8000, 120, new Ring(Pos(60, 40, 60), new M_Color(240, 180, 60), 0, 60, 10)),
			new Sphere(Pos(1500, -460, -1620), new M_Portal("parkourSimple", Pos(-1600, 860, 1700)), 0, 40)
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
		[
			new Gyroid(Pos(0, 0, 0), new M_Color(50,240,10), 0, 200, 10, 200, 0.08, 13, 10),
			new Box(Pos(112,22,105), new M_Rubber(), 0, 30, 10, 30),
			new Cylinder(Pos(-115,22,-59), new M_Portal("cubes", Pos(-70, 110, 30)), 0, 10, 15),
			"BOX|portal:start~[0,0,0,0]|[112,193,105]~0~20~6~20",
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
		[
			"CUBE|rubber|[-100,330,100]~0~45",
			"BOX|mirror:0~149~234~34|[-118,100,165]~0~3200~80~3200",
			"BOX|color:255~0~255|[-82,400,218]~0~10~10~10",
			"BOX|color:255~0~255|[-147,428,298]~0~10~10~10",
			"BOX|color:255~0~255|[-91,451,384]~0~10~10~10",
			"BOX|color:255~0~255|[-8,474,335]~0~10~10~10",
			"BOX|color:255~0~255|[82,500,302]~0~10~10~10",
			"BOX|color:255~0~255|[109,527,207]~0~10~10~10",
			"BOX|color:255~0~255|[72,554,110]~0~10~10~10",
			"BOX|color:255~0~255|[5,581,38]~0~10~10~10",
			"BOX|color:255~0~255|[-82,600,-18]~0~10~10~10",
			"BOX|color:255~0~255|[-225,628,225]~0~10~10~10",
			"BOX|color:186~197~203|[-88,370,116]~0~25~7~25"
		]
	);
	
	// var pks = worlds["parkourSimple"];
	// function awawa(node, red) {
	// 	if (!node) {
	// 		return;
	// 	}
	// 	var x = (node.minPos[0] + node.maxPos[0]) / 2;
	// 	var y = (node.minPos[1] + node.maxPos[1]) / 2;
	// 	var z = (node.minPos[2] + node.maxPos[2]) / 2;
	// 	var dx = (node.maxPos[0] - node.minPos[0]);
	// 	var dy = (node.maxPos[1] - node.minPos[1]);
	// 	var dz = (node.maxPos[2] - node.minPos[2]);
	// 	var obj = new BoxFrame(Pos(x, y, z), new M_Glass(red, 255, 255, 30), dx / 2, dy / 2, dz / 2, 5);
	// 	pks.objects.push(obj);
		
	// 	awawa(node.left, red + 20);
	// 	awawa(node.right, red + 20);
	// }
	// awawa(pks.bvh.root, 0);
	// editor_selected = camera;
	// syncObject_send(pks, pks.objects[0]);
	
	new World("speedCheck", [
		],[
			[bg, Color(80, 80, 120)],
			[bg_sun, Color(255, 200, 170), 0.003],
			[bg_sun, Color(255, 255, 255), 0.001]
		],
		polToCart(0.2, 0.7, 1),
		[-101, 400, 101],
		[
			"BOX|mirror:0~149~234~34|[0,0,0]~0~10000~70~300",
			new Capsule(Pos(100, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(100, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(200, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(200, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(300, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(300, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(400, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(400, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(500, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(500, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(600, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(600, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(700, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(700, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(800, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(800, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(900, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(900, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1000, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1000, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1100, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1100, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1200, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1200, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1300, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1300, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1400, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1400, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1500, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1500, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1600, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1600, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1700, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1700, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1800, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1800, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(1900, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(1900, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
			new Capsule(Pos(2000, 80, 60), new M_Color(255, 240, 200), 0, 15, 10), new Capsule(Pos(2000, 80, -60), new M_Color(255, 240, 200), 0, 15, 10),
		]
	);
	
	new World("stairwell", [
		],[
			[bg_fadeTo, Color4(128, 128, 128, 128), 100],
			[bg, Color(184, 255, 249)]
		],
		polToCart(1.4, Math.PI * 0.4, 1),
		[0, 0, 0],
		[
			"CYLINDER|color:255~255~255|[0,-19,0]~0~200~20",
			"BOX|color:255~255~255|[86,1,-8]~0~100~2~5",
			"BOX|color:255~255~255|[86,1,-10]~0~100~3~5",
			"BOX|color:255~255~255|[86,1,-12]~0~100~4~5",
			"BOX|color:255~255~255|[86,2,-14]~0~100~4~5",
			"BOX|color:255~255~255|[86,3,-16]~0~100~4~5",
			"BOX|color:255~255~255|[86,4,-18]~0~100~4~5",
			"BOX|color:255~255~255|[86,5,-20]~0~100~4~5",
			"BOX|color:255~255~255|[86,6,-22]~0~100~4~5",
			"BOX|color:255~255~255|[86,7,-24]~0~100~4~5",
			"BOX|color:255~255~255|[86,8,-26]~0~100~4~5",
			"BOX|color:255~255~255|[86,9,-28]~0~100~4~5",
			"BOX|color:255~255~255|[86,10,-30]~0~100~4~5",
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
		[
			"BOX|color:255~255~255|[86,-7,-24]~0~200~20~200",
			"SHELL|glass:191~243~255~217|[62,13,-35]~0~1510~10",
			"SPHERE|glass:255~0~255~141|[87,18,99]~0~10",
			"SPHERE|mirror:255~0~255~14|[76,19,70]~0~10",
			"SPHERE|mirror:241~237~255~143|[43,31,36]~0~26",
			"SPHERE|color:255~0~255|[-17,57,96]~0~10",
			"SPHERE|color:104~0~0|[159,25,57]~0~10",
			"SPHERE|mirror:255~0~255~0|[102,25,-60]~0~10",
			"SPHERE|color:81~63~201|[-44,25,-44]~0~10",
			"SPHERE|mirror:93~146~69~96|[82,25,21]~0~10",
			"SPHERE|color:255~133~255|[159,25,-20]~0~10",
			"SPHERE|color:255~0~255|[25,25,-104]~0~10",
			"SPHERE|color:255~0~255|[192,25,-130]~0~10",
			"SPHERE|color:255~0~255|[219,25,140]~0~10",
			"SPHERE|mirror:0~0~0~9|[170,25,36]~0~10",
			"SPHERE|color:255~0~255|[247,25,-32]~0~10",
			"SPHERE|color:255~0~255|[-84,25,-145]~0~10",
			"SPHERE|mirror:255~0~255~26|[-43,25,59]~0~10",
			"SPHERE|color:255~0~255|[-1,25,150]~0~10",
			"SPHERE|color:255~0~255|[118,20,184]~0~10",
			"SPHERE|concrete|[82,77,-14]~0~20",
			"SPHERE|color:255~0~255|[120,132,76]~0~15",
			"SHELL|glass:255~0~255~36|[131,115,-3]~0~17~3.5",
			"SPHERE|color:255~0~255|[139,149,-33]~0~10",
			"SPHERE|color:255~0~255|[48,142,-124]~0~10",
			"SPHERE|color:255~0~255|[-12,134,-14]~0~10",
			"SPHERE|color:131~255~0|[100,183,-84]~0~10",
			"SPHERE|color:255~0~255|[118,217,11]~0~10",
			"SPHERE|color:255~0~255|[-18,171,-69]~0~10",
			"SPHERE|glass:255~255~255~255|[132,697,771]~0~51",
			"SPHERE|glass:255~203~136~94|[-5,824,-774]~0~110",
			"SHELL|glass:255~109~255~44|[-591,1056,761]~0~122~10.6",
			"SPHERE|glass:83~199~255~48|[1170,1571,-266]~0~110",
			"BOX|color:0~121~0|[-69,-1481,46]~0~10~10~10",
			"BOX|portal:stairwell~[0,1460,0,0]|[-69,-1460,46]~0~10~10~10",
		],
		1
	);
	
	
	console.log(`finished loading ${worldsByID.length} worlds.`);
	
	loading_world = worlds["start"];
}