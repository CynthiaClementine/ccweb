function world_noop(ray) {

}

function world_loopRay(ray) {
	ray.pos[0] = modulate(ray.pos[0], ray.world.width);
	ray.pos[1] = modulate(ray.pos[1], ray.world.width);
	ray.pos[2] = modulate(ray.pos[2], ray.world.width);
}

function bg_fadeBlack(ray) {

}

function bg_fadeTo(ray, color, dist) {
	var distPerc = clamp(ray.dist / dist, 0, 0.9) ** 2;
	ray.color[0] = color[0]*distPerc + ray.color[0]*(1-distPerc);
	ray.color[1] = color[1]*distPerc + ray.color[1]*(1-distPerc);
	ray.color[2] = color[2]*distPerc + ray.color[2]*(1-distPerc);
}



class World {
	/**
	 * Creates a World object
	 * @param {String} name 
	 * @param {Function} getBgColor 
	 * @param {Function} preEffects effects applied at every stage of a ray's march
	 * @param {Function} effects effects applied after a ray finishes its march
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 */
	constructor(name, getBgColor, preEffects, effects, sunVector, spawn, objects) {
		this.name = name;
		this.getBgColor = getBgColor;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		var self = this;
		worlds[this.name] = self;
		this.tree = new BrickMap(self, tree_maxD);
		this.tree.generate(tree_sets);
		// this.finalize();
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

class World_Looping {
	/**
	 * A World object that has built in looping effects, for pseudo-infinite space.
	 * @param {String} name 
	 * @param {Function} getBgColor 
	 * @param {Function} preEffects 
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 * @param {Number} size 
	 */
	constructor(name, getBgColor, preEffects, effects, sunVector, spawn, objects, size) {
		this.name = name;
		this.width = size;
		this.getBgColor = getBgColor;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		
		var self = this;
		worlds[this.name] = self;
		//because we're dealing with a small space, a BrickMap probably isn't necessary. 
		//A single BrickGrid will do just fine
		this.duplicateObjs();
		this.tree = new BrickGridInd(self, Math.ceil((this.width / tree_minD) * 2), tree_minD);
		this.tree.pos = Pos(this.width / 2, this.width / 2, this.width / 2);
		this.tree.generate();
	}
	
	duplicateObjs() {
		var duplicates = [];
		this.objects.forEach(o => {
			for (var x=-1; x<=1; x++) {
				for (var y=-1; y<=1; y++) {
					for (var z=-1; z<=1; z++) {
						if (x || y || z) {
							var dupe = deserialize(o.serialize());
							console.log(dupe.pos, x, y, z, this.width);
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
	}
	
	tick() {
		camera.pos[0] = modulate(camera.pos[0], this.width);
		camera.pos[1] = modulate(camera.pos[1], this.width);
		camera.pos[2] = modulate(camera.pos[2], this.width);
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



function createWorlds() {
	console.log(`creating worlds!`);
	/*
	new World("start",
		function() {
			return Color(40, 30 + 20 * Math.cos(world_time / 80), 50)
		},
		function(ray, closestObj) {},
		polToCart(0, 0.7, 1),
		[0, 600, 0],
		[
			new Cube(Pos(0, 500, 0), 70, Color(255, 64, 64)),
			new Box(Pos(0, 0, 0), 1000, 50, 1000, Color(64, 255, 150)),
			// new Cylinder(500, 300, 0, 100, 200, Color(128, 128, 255)),
			// new Ring(500, 400, 0, 200, 50, [128, 255, 255]),
			// new Portal(900, 50, -827, `darkBright`)
		]
	);
	console.log(`created start`);

	new World("darkBright",
		function() {
			return Color(randomBounded(10, 30),randomBounded(10, 30),randomBounded(10, 30));
		},
		function(ray, closestObj) {
			ray.color[0] += 1;
			ray.color[1] += 1;
			ray.color[2] += 1;
		},
		[0, 1, 0],
		undefined,
		[
			new Box(0, -100, 0, 6000, 50, 6000, Color(0, 0, 64))
		]
	);
	
	console.log(`created darkBright`);
	
	
	new World("tinyObjs",
		function() {
			return Color(120, 120, 120);
		},
		function(ray, closestObj) {},
		polToCart(0, 1.04, 1),
		[-19.85, 308.75, 241.36],
		[
			new Box(Pos(0, 10, 0), 1000, 40, 1000, Color(64, 255, 150)),
			
			new Cube(Pos(1000, 500, 0), 70, Color(255, 64, 64)),
			new Cube(Pos(788, 80, 265), 60, Color(255, 64, 64)),
			new Cube(Pos(758, 80, 154), 60, Color(255, 64, 64)),
			new Cube(Pos(256, 80, 686), 60, Color(255, 64, 64)),
			new Cube(Pos(159, 80, 90), 60, Color(255, 64, 64)),
			new Cube(Pos(604, 80, 156), 60, Color(255, 64, 64)),
			new Cube(Pos(730, 80, 775), 60, Color(255, 64, 64)),
			new Cube(Pos(-788, 80, -265), 60, Color(255, 64, 64)),
			new Cube(Pos(-758, 80, -154), 60, Color(255, 64, 64)),
			new Cube(Pos(-256, 80, -686), 60, Color(255, 64, 64)),
			new Cube(Pos(-159, 80, -90), 60, Color(255, 64, 64)),
			new Cube(Pos(-604, 80, -156), 60, Color(255, 64, 64)),
			new Cube(Pos(-730, 80, -775), 60, Color(255, 64, 64)),
			
			new Sphere(Pos(0, 100, 0), 100, Color(128, 0, 128)),
			new Cylinder(Pos(500, 60, 0), 100, 100, Color(128, 128, 255)),
			new Cylinder(Pos(720, 60, -200), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(810, 60, -150), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(100, 60, -400), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-500, 60, 0), 100, 100, Color(128, 128, 255)),
			new Cylinder(Pos(-720, 60, -200), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-810, 60, -150), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-100, 60, -400), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-500, 60, 840), 100, 100, Color(128, 128, 255)),
			new Cylinder(Pos(-720, 60, 200), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-810, 60, 150), 50, 50, Color(128, 128, 255)),
			new Cylinder(Pos(-100, 60, 400), 50, 50, Color(128, 128, 255)),
			new Ring(Pos(500, 100, 0), 200, 50, [128, 255, 255]),
			
			new Line(Pos(1000,800,990), Pos(628,750,427), 3, Color(246, 173, 105)),
			new Line(Pos(628,750,427),  Pos(-123,900,234), 3, Color(246, 173, 105)),
			new Line(Pos(-123,900,234), Pos(-123,400,200), 3, Color(246, 173, 105)),
			new Line(Pos(-123,900,234), Pos(-123,400,200), 3, Color(246, 173, 105)),
			
			new Line(Pos(628,750,427),  Pos(932,570,68), 3, Color(246, 173, 105)),
			
			new Line(Pos(-122,916,219), Pos(-160,848,-36), 3, Color(246, 173, 105)),
			new Line(Pos(-160,848,-36), Pos(-274,692,-31), 3, Color(246, 173, 105)),
			new Line(Pos(-274,692,-31), Pos(-371,666,178), 3, Color(246, 173, 105)),
			new Line(Pos(-371,666,178), Pos(-152,564,378), 3, Color(246, 173, 105)),
			
			new Portal(Pos(900, 50, -827), `darkBright`)
		]
	);*/
	
	//cubes test world
	var objs = [];
	var acceptableCols = [
		Color(57, 0, 64), Color(133, 111, 132), Color(124, 80, 119), Color(115, 0, 113), 
		Color(168, 75, 132), Color(194, 112, 141), Color(220, 149, 150), Color(157, 131, 108), Color(132, 160, 124)
	];
	rand_seed = 4;
	for (var f=0; f<200; f++) {
		objs.push(new Cube(
			Pos(prand(-800, 800), prand(0, 500), prand(-800, 800)),
			prand(30, 60), 
			acceptableCols[Math.floor(prand(0, acceptableCols.length))]
		));
	}
	
	// new World("cubes", 
	// 	function() {
	// 		return Color(5, 0, 10);
	// 	},
	// 	noop,
	// 	function(ray) {
	// 		var distPerc = clamp(ray.dist / ray_maxDist, 0, 1) ** 2;
	// 		ray.color[0] *= 1 - distPerc;
	// 		ray.color[1] *= 1 - distPerc;
	// 		ray.color[2] *= 1 - distPerc;
	// 	},
	// 	polToCart(0, Math.PI / 2, 1),
	// 	[21.21, 498.15, 211.19],
	// 	objs
	// );
	
	new World_Looping("spheresForever",
		function() {
			return Color(255, 227, 245);
		},
		//world_noop,// 
		world_loopRay,
		function(ray) {
			bg_fadeTo(ray, Color(255, 227, 245), 1200);
		},
		polToCart(0.6, 0.4, 1),
		[60.2, 100, 60.2],
		[
			// new Line(Pos(60, 60, 60), Pos(70, 60, 70), 5, Color(240, 180, 60)),
			new Ring(Pos(60, 40, 60), 60, 10, Color(240, 180, 60)),
			// new Box(Pos(60, 10, 60), 6, 5, 60, Color(180, 130, 0)),
			// new Box(Pos(60, 10, 60), 60, 5, 6, Color(180, 130, 0)),
			// new Sphere(Pos(40, 60, 10), 15, Color(60, 40, 60)),
			// new Line(Pos(120, 10, 100), Pos(80, 10, 100), 5, Color(240, 180, 60)),
			// new Line(Pos(800, 10, 100), Pos(80, 10, 20), 5, Color(240, 180, 60)),
		],
		120
	);
	
	loading_world = worlds["spheresForever"];
}
