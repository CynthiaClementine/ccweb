function noop(ray) {

}

function world_loopRay(ray) {
	ray.pos[0] = modulate(ray.pos[0], ray.world.width);
	ray.pos[1] = modulate(ray.pos[1], ray.world.width);
	ray.pos[2] = modulate(ray.pos[2], ray.world.width);
}

function world_brighten(ray, r, g, b) {
	ray.color[0] += r;
	ray.color[1] += g;
	ray.color[2] += b;
}

function world_spherize(ray, sphereR) {
	ray.dPos[1] += (ray.localDist / sphereR);
	ray.dPos = normalize(ray.dPos);
}

//applies a background color.
function bg(ray, color) {
	applyColor(color, ray.color);
}

function bg_fadeBlack(ray) {

}

function bg_fadeToOld(ray, color, dist) {
	var distPerc = clamp(ray.dist / dist, 0, 0.9) ** 2;
	ray.color[0] = color[0]*distPerc + ray.color[0]*(1-distPerc);
	ray.color[1] = color[1]*distPerc + ray.color[1]*(1-distPerc);
	ray.color[2] = color[2]*distPerc + ray.color[2]*(1-distPerc);
}

function bg_fadeTo(ray, color, dist) {
	var distPerc = clamp(ray.hitDist / dist, 0, 0.9) ** 2;
	ray.color[0] = color[0]*distPerc + ray.color[0]*(1-distPerc);
	ray.color[1] = color[1]*distPerc + ray.color[1]*(1-distPerc);
	ray.color[2] = color[2]*distPerc + ray.color[2]*(1-distPerc);
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
	 * @param {Function} preEffects effects applied at every stage of a ray's march
	 * @param {Function} effects effects applied after a ray finishes its march
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 */
	constructor(name, preEffects, effects, sunVector, spawn, objects) {
		console.log(`started ${name}..`);
		this.name = name;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		
		this.grid;
		this.tree;
		this.finalize();
	}
	
	finalize() {
		//generate BrickMap
		worlds[this.name] = this;
		this.grid = new ObjectGrid(this, world_objectChunks);
		this.tree = new BrickMap(this, tree_maxD, tree_sets);
		this.grid.generate();
		this.tree.generate();
		console.log(`finished ${this.name}!`);
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
		this.tree.update();
	}
}

class World_Looping {
	/**
	 * A World object that has built in looping effects, for pseudo-infinite space.
	 * @param {String} name 
	 * @param {Function} preEffects 
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 * @param {Number} size 
	 */
	constructor(name, preEffects, effects, sunVector, spawn, objects, size) {
		this.name = name;
		this.width = size;
		
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
	
	new World("start",
		noop,
		(ray) => {
			bg(ray, Color4(40, 30 + 20 * Math.cos(world_time / 80), 50, 0));
			bg_sun(ray, Color(255, 255, 240), 0.002);
		},
		polToCart(0, 0.7, 1),
		[0, 600, 0],
		[
			new Cube(Pos(0, 500, 0), new M_Color(255, 64, 64), 70),
			new PrismRhombus(Pos(0, 300, -100), new M_Color(255, 64, 64), 5, 30, 40, 0b000, 10),
			new Box(Pos(0, -50, 0), new M_Color(64, 255, 150), 1000, 100, 1000),
			new BoxFrame(Pos(100, 100, 100), new M_Glass(255, 128, 255, 10), 50, 50, 50, 10),
			new Cylinder(Pos(-500, 300, 0), new M_Color(128, 128, 255), 100, 200),
			new Ellipsoid(Pos(-300, 100, 200), new M_Color(128, 128, 255), 100, 80, 60),
			new Gyroid(Pos(100, 100, -300), new M_Color(255, 240, 10), 50, 50, 50, globalA, globalB, 10),
			// new Ring(Pos(500, 400, 0, 200), 50, new M_Color(128, 255, 255)),
			new Cylinder(Pos(900, 50, -827), new M_Portal(`darkBright`, Pos(0, 0, 0)), 15, 20),
			// ...createCloud(),
			new CloudSeed(Pos(-80,516,-387), 5),
			new Box_Moving(Pos(-80,120,-387), new M_Color(40, 0, 255), 10, 10, 10),
			// new DebugLines(Pos(-1000,-1000,-1000), Pos(1000,1000,1000))
		]
		/*
		"CUBE|color:85~137~80|[0,500,0]~34",
		"BOX|color:75~175~40|[0,-50,0]~1000~100~1000",
		"BOX-FRAME|glass:255~128~255~10|50~50~50~10",
		"CYLINDER|color:128~128~255|[-565,300,-995]~30~200",
		"ELLIPSE|color:128~128~255|[-300,100,200]~100~80~60",
		"GYROID|color:255~240~10|[200,100,0]~50~440~50~0.08~13~10",
		"CYLINDER|portal:darkBright~[0,0,0]|[900,50,-827]~15~20",
		"!!!UNDEFINED!!!",
		"BOX|color:40~0~255|[-80,120,-334.31801799808585]~10~10~10",
		 */
	);
	
	

	new World("darkBright",
		(ray) => {
			world_brighten(ray, 2, 1, 1);
		},
		(ray) => {
			bg(ray, Color(randomBounded(10, 30), randomBounded(10, 30), randomBounded(10, 30), 0));
			bg_fadeTo(ray, Color(randomBounded(10, 30),randomBounded(10, 30),randomBounded(10, 30)), 800);
			bg_sun(ray, Color(255, 160, 140), 0.01);
		},
		polToCart(0.1, Math.PI * 0.47, 1),
		[101, 101, 101],
		[
			new Box(Pos(0, -100, 0), new M_Color(0, 0, 64), 6000, 50, 6000),
			new Scene3dLoop(1000, 1000, 1000, 120, new Octahedron(Pos(60, 40, 60), new M_Color(0, 0, 160), 20, 15, 15)),
			new Line(Pos(-477,550,-311), new M_Color(0, 0, 160), -240,670,-300, 5)
		]
	);
	
	loading_world = worlds["start"];
	return;
	
	
	new World("tinyObjs",
		noop,
		(ray) => {
			bg(ray, Color4(120, 120, 120, 0));
		},
		polToCart(0, 1.04, 1),
		[-19.85, 308.75, 241.36],
		[
			new Box(Pos(0, 10, 0), 1000, 40, 1000, new M_Color(64, 255, 150)),
			
			new Cube(Pos(1000, 500, 0), 70, new M_Color(255, 64, 64)),
			new Cube(Pos(788, 80, 265), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(758, 80, 154), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(256, 80, 686), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(159, 80, 90), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(604, 80, 156), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(730, 80, 775), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-788, 80, -265), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-758, 80, -154), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-256, 80, -686), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-159, 80, -90), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-604, 80, -156), 60, new M_Color(255, 64, 64)),
			new Cube(Pos(-730, 80, -775), 60, new M_Color(255, 64, 64)),
			
			new Sphere(Pos(0, 100, 0), 100, new M_Color(128, 0, 128)),
			new Cylinder(Pos(500, 60, 0), 100, 100, new M_Color(128, 128, 255)),
			new Cylinder(Pos(720, 60, -200), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(810, 60, -150), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(100, 60, -400), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-500, 60, 0), 100, 100, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-720, 60, -200), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-810, 60, -150), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-100, 60, -400), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-500, 60, 840), 100, 100, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-720, 60, 200), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-810, 60, 150), 50, 50, new M_Color(128, 128, 255)),
			new Cylinder(Pos(-100, 60, 400), 50, 50, new M_Color(128, 128, 255)),
			new Ring(Pos(500, 100, 0), 200, 50, [128, 255, 255]),
			
			new Line(Pos(1000,800,990), new M_Color(246, 173, 105), Pos(628,750,427), 3),
			new Line(Pos(628,750,427),  new M_Color(246, 173, 105), Pos(-123,900,234), 3),
			new Line(Pos(-123,900,234), new M_Color(246, 173, 105), Pos(-123,400,200), 3),
			new Line(Pos(-123,900,234), new M_Color(246, 173, 105), Pos(-123,400,200), 3),
			
			new Line(Pos(628,750,427),  new M_Color(246, 173, 105), Pos(932,570,68), 3),
			
			new Line(Pos(-122,916,219), new M_Color(246, 173, 105), Pos(-160,848,-36), 3),
			new Line(Pos(-160,848,-36), new M_Color(246, 173, 105), Pos(-274,692,-31), 3),
			new Line(Pos(-274,692,-31), new M_Color(246, 173, 105), Pos(-371,666,178), 3),
			new Line(Pos(-371,666,178), new M_Color(246, 173, 105), Pos(-152,564,378), 3),
			
			new Cylinder(Pos(900, 50, -827), new M_Portal(`cubes`, Pos(0, 0, 0)), 15, 10)
		]
	);
	
	//cubes test world
	var objs = [new Line(Pos(60, 60, 60), Pos(80, 60, 80), 3, new M_Color(240, 180, 60)), 
		new Line(Pos(45,128,117), Pos(81, 82, 83), 3, new M_Color(255, 0, 255)),
		new Pipe(Pos(-202,121,19), 15, 10, new M_Portal("gyroidCaves", Pos(-62, -100, -104)))
		// new DebugLines(Pos(-800, -800, -800), Pos(800, 800, 800))
		];
	var acceptableMats = [
		new M_Color(57, 0, 64), new M_Color(133, 111, 132), new M_Color(124, 80, 119), new M_Color(115, 0, 113), 
		new M_Color(168, 75, 132), new M_Color(194, 112, 141), new M_Color(220, 149, 150), new M_Color(157, 131, 108), 
		new M_Color(132, 160, 124)
	];
	rand_seed = 4;
	
	for (var f=0; f<200; f++) {
		objs.push(new Cube(
			Pos(prand(-800, 800), prand(0, 500), prand(-800, 800)),
			prand(30, 60), 
			acceptableMats[Math.floor(prand(0, acceptableMats.length))]
		));
	}
	
	new World("cubes",
		noop,
		(ray) => {
			bg(ray, Color4(5, 0, 10, 0));
			bg_fadeTo(ray, Color(0, 0, 0), 1500);
		},
		polToCart(0, Math.PI / 2, 1),
		[197,349,-403],
		objs
	);
	
	// new World_Looping("spheresForever",
	// 	//noop,// 
	// 	world_loopRay,
	// 	function(ray) {
	//		bg(ray, Color4(255, 227, 245, 0));
	// 		bg_fadeToOld(ray, Color(255, 227, 245), 1200);
	// 	},
	// 	polToCart(0.6, 0.4, 1),
	// 	[60.2, 100, 60.2],
	// 	[
	// 		new Line(Pos(0, 10, 60), new M_Color(240, 180, 60), Pos(20, 10, 60), 5),
	// 		new Line(Pos(120, 10, 60), new M_Color(240, 180, 60), Pos(100, 10, 60), 5),
	// 		new Line(Pos(60, 10, 0), Color(240, 180, 60), Pos(60, 10, 20), 5),
	// 		new Line(Pos(60, 10, 120), new M_Color(240, 180, 60), Pos(60, 10, 100), 5),
	// 		// new Ring(Pos(60, 40, 60), new M_Color(240, 180, 60), 60, 10),
	// 		// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 6, 5, 60),
	// 		// new Box(Pos(60, 10, 60), new M_Color(180, 130, 0), 60, 5, 6),
	// 		new Sphere(Pos(40, 60, 10), new M_Color(60, 40, 60), 15),
			
	// 		new Line(Pos(20, 10, 60), new M_Color(240, 180, 60), Pos(60, 10, 20), 5),
	// 		new Line(Pos(60, 10, 20), new M_Color(240, 180, 60), Pos(100, 10, 60), 5),
	// 		new Line(Pos(100, 10, 60), new M_Color(240, 180, 60), Pos(60, 10, 100), 5),
	// 	],
	// 	120
	// );
	
	// new World_Looping("turtleHell",
	// 	world_loopRay,
	// 	(ray) => {
	// 	bg(ray, Color4(255, 227, 245, 0));
	// 	bg_fadeToOld(ray, Color(255, 227, 245), 1200);
	// },
	// 	polToCart(0.6, 0.4, 1),
	// 	[60.2, 100, 60.2],
	// 	[new Ring(Pos(60, 40, 60), new M_Color(240, 180, 60), 60, 10)],
	// 	120
	// );
	
	new World("gyroidCaves",
		(ray) => {
			world_brighten(ray, 1, 1, 1);
		},
		(ray) => {
			bg(ray, Color4(40, 30, 50, 0));
			bg_sun(ray, Color(255, 255, 240), 0.002);
		},
		polToCart(-0.82, 0.73, 1),
		[17,22,-6],
		[
			new Gyroid(Pos(0, 0, 0), new M_Color(50,240,10), 200, 10, 200, globalA, globalB, 10),
			new Box(Pos(112,22,105), new M_Rubber(), 30, 10, 30),
			new Pipe(Pos(-115,22,-59), new M_Portal("cubes", Pos(-70, 110, 30)), 10, 15)
		]
	);
	
	loading_world = worlds["start"];
}