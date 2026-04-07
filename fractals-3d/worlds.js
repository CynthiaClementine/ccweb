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
		this.id = null;
		
		this.preEffects = preEffects;
		this.postEffects = effects;
		this.tickFunc = tickFunc;
		
		
		this.sunVector = sunVector;
		this.spawn = spawn;
		//objects is the set of base objects that makes the world, while expressed objects is everything that could currently contribute to the world SDF
		//this is because a single object could be made of multiple overlapping SDFs, or an object could decide to unload itself and not contribute at all
		this.objects = objects;
		this.expObjs = [];
		this.shouldRegen = false;
		
		this.ambientLight = 1 - (shadowPercent ?? render_shadowPercent);
		
		this.grid = null;
		this.tree = null;
		this.bvh = null;
		this.errorCheck();
		this.finalize();
	}
	
	errorCheck() {
		var wname = this.name;
		function larg(obj, val, name) {
			if (obj.length >= val) {
				console.error(`World ${wname}: too many ${name}s!`);
				obj.splice(val);
			}
		}
		
		larg(this.preEffects, texture_worldCols, `pre-effect`);
		larg(this.postEffects, texture_worldCols, `post-effect`);
		larg(this.expObjs, texture_worldCols, `object`);
	}
	
	finalize() {
		//deserialize objects
		for (var o=0; o<this.objects.length; o++) {
			if (this.objects[o].constructor.name == "String") {
				this.objects[o] = deserialize(this.objects[o]);
			}
		}

		this.id = Object.keys(worlds).length;
		if (this.id >= universe_maxID) {
			throw new Error(`World ${this.name}: too many worlds!`);
		}

		worlds[this.name] = this;
		worldsByID[this.id] = this;
		
		this.bvh = new BVH(this);
		this.tree = new ObjectGrid(this, world_objectChunks);
		this.generate();
		console.log(`finished ${this.name}!`);
	}
	
	serialize() {
		return "`" + this.objects.map(a => a.serialize()).join("`,\n`") + "`";
	}

	express() {
		var expObjs = [];
		this.expObjs = expObjs;
		this.objects.forEach(o => {
			o.express().forEach(q => {
				expObjs.push(q);
			});
		});
	}

	generate() {
		this.express();
		this.bvh.generate();
		// this.grid.generate();
		this.tree.generate();
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
		if (this.shouldRegen) {
			this.generate();
			createGPUWorld(this);
			this.shouldRegen = false;
		}
	}
}

var worldsByID = [];

function createWorlds() {
	console.log(`creating worlds!`);
	
	new World("fractal", [], [
		[bg, Color(80, 90, 80)],
	],
	polToCart(0.6, 1.2, 1),
	[0, 57, -920], 
	[	
		// new Fractal({pos: Pos(0, 0, 0), theta: -0.12, phi: 0.5, rot: 0}, new M_Normal(), 0, 200, 1.7, -2.12, -2.75, 0.49),
		// new Fractal({pos: Pos(0, 2000, 0), theta: 1.570796, phi: 0, rot: 0}, new M_Normal(), 0, 200, 1.95, -6.75, -3.0, 0.0), //pylons
		// new Fractal({pos: Pos(0, 0, 0), theta: 0.04, phi: 0.6, rot: 0}, new M_Normal(), 0, 200, 1.3, -2, 1, 0.0), //a mess
		// new Fractal({pos: Pos(0, 0, 0), theta: 5.112, phi: -1.571, rot: 0}, new M_Normal(), 0, 200, 1.3, -2, 1, 0.0), //the cool ring
		
		// `FRACTAL~[0,0,0]~0~256~67~0|normal|200~1.3~0.161~-0.820~3.795`, //weird spidery thing
		// `SPHERE~[0,-200,0]~0~0~90~0|portal:fractal~[29233,261,0]|35`,

		`FRACTAL~[0,0,0]~0~293~0~0|normal|200~1.3~-2~1~0`, //cool ring
		// `FRACTAL~[0,0,0]~0~90~90~0|normal|200~1.95~-6.75~-3~0`, //pylons
		// `FRACTAL~[0,0,0]~0~0~90~0|normal|100~1.95~-6.75~0~0`, //sierpenski
		// `FRACTAL~[0,0.30000,0]~0~0~0~0|normal|200~1.95~-2~1~0`, //boxy bit
		// `FRACTAL~[.30000,0,.30000]~0~35~179~0|color:255~0~255|200~10~-4.677000045776367~1.534000039100647~-1.1180000305175781`,
	], 0.3, () => {
		constrainPlayer(7000, 7000, 7000);
	});
	
	console.log(`finished loading ${worldsByID.length} worlds.`);
	
	loading_world = worlds["fractal"];
}