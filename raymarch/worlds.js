function createWorlds() {
	console.log(`creating worlds!`);
	
	new World("start",
		function() {
			var c = new Uint8Array(3);
			c[0] = 40;
			c[1] = 30 + 20 * Math.cos(world_time / 80);
			c[2] = 50;
			return c;
		},
		function(ray, closestObj) {},
		polToCart(0, 0.7, 1),
		[0, 600, 0],
		[
			new Cube(0, 500, 0, 70, [255, 64, 64]),
			new Box(0, 0, 0, 1000, 50, 1000, [64, 255, 150]),
			// new Cylinder(500, 300, 0, 100, 200, [128, 128, 255]),
			// new Ring(500, 400, 0, 200, 50, [128, 255, 255]),
			// new Portal(900, 50, -827, `darkBright`)
		]
	);
	console.log(`created start`);
	
	new World("darkBright",
		function() {
			var c = new Uint8Array(3);
			var val = randomBounded(10, 30);
			c[0] = val;
			c[1] = val;
			c[2] = val;
			return c;
		},
		function(ray, closestObj) {
			ray.color[0] += 1;
			ray.color[1] += 1;
			ray.color[2] += 1;
		},
		[0, 1, 0],
		undefined,
		[
			new Box(0, -100, 0, 6000, 50, 6000, [0, 0, 64])
		]
	);
	
	console.log(`created darkBright`);
	
	
	new World("tinyObjs",
		function() {
			var c = new Uint8Array(3);
			c[0] = 120;
			c[1] = 120;
			c[2] = 120;
			return c;
		},
		function(ray, closestObj) {},
		polToCart(0, 1.04, 1),
		[0, 600, 250],
		[
			new Box(0, 10, 0, 1000, 40, 1000, [64, 255, 150]),
			
			new Cube(1000, 500, 0, 70, [255, 64, 64]),
			new Cube(788, 80, 265, 60, [255, 64, 64]),
			new Cube(758, 80, 154, 60, [255, 64, 64]),
			new Cube(256, 80, 686, 60, [255, 64, 64]),
			new Cube(159, 80, 90, 60, [255, 64, 64]),
			new Cube(604, 80, 156, 60, [255, 64, 64]),
			new Cube(730, 80, 775, 60, [255, 64, 64]),
			new Cube(-788, 80, -265, 60, [255, 64, 64]),
			new Cube(-758, 80, -154, 60, [255, 64, 64]),
			new Cube(-256, 80, -686, 60, [255, 64, 64]),
			new Cube(-159, 80, -90, 60, [255, 64, 64]),
			new Cube(-604, 80, -156, 60, [255, 64, 64]),
			new Cube(-730, 80, -775, 60, [255, 64, 64]),
			
			new Sphere(0, 100, 0, 100, [128, 0, 128]),
			new Cylinder(500, 60, 0, 100, 100, [128, 128, 255]),
			new Cylinder(720, 60, -200, 50, 50, [128, 128, 255]),
			new Cylinder(810, 60, -150, 50, 50, [128, 128, 255]),
			new Cylinder(100, 60, -400, 50, 50, [128, 128, 255]),
			new Cylinder(-500, 60, 0, 100, 100, [128, 128, 255]),
			new Cylinder(-720, 60, -200, 50, 50, [128, 128, 255]),
			new Cylinder(-810, 60, -150, 50, 50, [128, 128, 255]),
			new Cylinder(-100, 60, -400, 50, 50, [128, 128, 255]),
			new Cylinder(-500, 60, 840, 100, 100, [128, 128, 255]),
			new Cylinder(-720, 60, 200, 50, 50, [128, 128, 255]),
			new Cylinder(-810, 60, 150, 50, 50, [128, 128, 255]),
			new Cylinder(-100, 60, 400, 50, 50, [128, 128, 255]),
			new Ring(500, 100, 0, 200, 50, [128, 255, 255]),
			
			new Portal(900, 50, -827, `darkBright`)
		]
	);
	
	loading_world = worlds["tinyObjs"];
}
