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
	for (var f=0; f<100; f++) {
		objs.push(new Cube(
			Pos(prand(-800, 800), prand(0, 500), prand(-800, 800)),
			prand(30, 60), 
			acceptableCols[Math.floor(prand(0, acceptableCols.length))]
		));
	}
	
	new World("cubes", 
		function() {
			return Color(5, 0, 10);
		},
		function(ray, closestObj) {},
		polToCart(0, Math.PI / 2, 1),
		[21.21, 498.15, 211.19],
		objs
	);
	
	loading_world = worlds["cubes"];
}
