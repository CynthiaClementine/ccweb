

//objects that are required for the engine to run
class Camera {
	constructor(world, x, y, z) {
		this.world = world;
		this.x = x;
		this.y = y;
		this.z = z;

		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.dMax = 3;
		this.dMin = 0.05;

		this.ax = 0;
		this.ay = 0;
		this.az = 0;

		this.speed = 0.07;
		this.jumpSpeed = 2.5;
		this.friction = 0.8;

		this.gravity = 0.15;
		this.fallMax = 12;
		this.onGround = false;

		this.height = 10;
		this.width = 5;

		this.theta = 0;
		this.phi = 0;
	}

	tick() {
		this.updateMomentum();
		this.updatePosition();
	}

	updateMomentum() {
		//updates dVars
		this.dx += this.ax;
		if (Math.abs(this.dx) > this.dMax) {
			this.dx = clamp(this.dx, -this.dMax, this.dMax);
		}
		if (this.ax * this.dx <= 0) {
			this.dx *= this.friction;
		}

		//gravity
		this.dy += this.gravity;
		if (Math.abs(this.dy) > this.fallMax) {
			this.dy = clamp(this.dy, -this.fallMax, this.fallMax);
		}

		this.dz += this.az;
		if (Math.abs(this.dz) > this.dMax) {
			this.dz = clamp(this.dz, -this.dMax, this.dMax);
		}
		if (this.az * this.dz <= 0) {
			this.dz *= this.friction;
		}
	}

	updatePosition() {
		//handling position
		var speedMultiplier = 1 + controls_shiftPressed * (1 + editor_active * 7);
		var lookRay, toAdd, absMag;

		var polars = [
			[this.theta + (Math.PI / 2), 0],
			[0, -Math.PI / 2],
			[this.theta, 0]
		]
		var dVec = [this.dx * speedMultiplier, this.dy, this.dz * speedMultiplier];
		//handle all 3 axes separately so if one fails they can still happen
		for (var i=0; i<3; i++) {
			absMag = Math.abs(dVec[i]);
			if (absMag > this.dMin) {
				toAdd = polToCart(polars[i][0], polars[i][1], dVec[i]);
				//cast ray sideways
				lookRay = new Ray_Tracking(this.world, this.x, this.y, this.z, [toAdd[0] / absMag, toAdd[1] / absMag, toAdd[2] / absMag]);
				lookRay.iterate(0);
				//if the ray's gone far enough, then move there
				if (lookRay.distance > this.width + absMag) {
					//doesn't need a y because phi is always 0
					this.x += toAdd[0];
					this.y += toAdd[1];
					this.z += toAdd[2];
				} else {
					dVec[i] = 0;
					if (i == 1) {
						this.onGround = true;
					}
				}
			}
		}

		dVec[0] /= speedMultiplier;
		dVec[1] /= speedMultiplier;
		[this.dx, this.dy, this.dz] = dVec;
	}

	jump() {
		if (true || this.onGround) {
			this.dy = -this.jumpSpeed;
			this.onGround = false;
		}
	}
}



//ray class, for marching rays
class Ray {
	/**
	* A Ray performs raymarching calculations! Given a world, xyz, and directionPos, marches through the world. 
	* It calculates what color is made via this process.
	* @param {Number} x 
	* @param {Number} y 
	* @param {Number} z 
	* @param {Number[]} dPos
	*/
	constructor(world, x, y, z, dPos) {
		this.world = world;
		this.x = x;
		this.y = y;
		this.z = z;
		this.color = world.getBgColor();
		this.dPos = dPos;
		this.hit = false;
	}

	iterate(num) {
		if (num > ray_maxIters) {
			return this.color;
		}

		//get distance
		var [dist, distObj] = this.world.tree.estimate(this);
		dist *= ray_safetyMult;

		//if distance is out of dist bounds
		if (dist < ray_minDist) {
			if (this.hit) {
				//draw self as a shadow
				this.shadow();
				return this.color;
			}
			//if not hit,
			//color self according to hit object, and change direction
			this.color[0] = distObj.color[0];
			this.color[1] = distObj.color[1];
			this.color[2] = distObj.color[2];
			dist = ray_minDist * 2;
			this.hit = true;
			// var lightDot = 
			this.dPos = this.world.sunVector;
		}

		if (dist > ray_maxDist) {
			return this.color;
		}

		//apply world effects
		this.world.effects(this, distObj);
		//move distance
		this.x += this.dPos[0] * dist;
		this.y += this.dPos[1] * dist;
		this.z += this.dPos[2] * dist;

		return this.iterate(num+1);
	}
	
	//applies the shadow effect to the color
	shadow() {
		this.color[0] *= render_shadowPercent;
		this.color[1] *= render_shadowPercent;
		this.color[2] *= render_shadowPercent;
	}
}


class Ray_Tracking {
	/**
	* a Tracking Ray is a ray that just calculates the distance to the nearest object in a given direction.
	* Once it hits something, it returns the total distance traveled.
	* Tracking Rays also keep track of which object they've hit.
	*/
	constructor(world, x, y, z, dPos) {
		this.world = world;
		this.x = x;
		this.y = y;
		this.z = z;
		this.dPos = dPos;
		this.distance = 0;
		this.object = undefined;
	}

	iterate(num) {
		if (num > ray_maxIters) {
			return this.distance;
		}
		
		//get distance
		var dist = ray_maxDist+1;
		var distObj = undefined;
		
		[dist, distObj] = this.world.tree.estimate(this);

		//if distance is out of dist bounds
		if (dist < ray_minDist) {
			this.object = distObj;
			return this.distance;
		}

		if (dist > ray_maxDist) {
			return (this.distance + dist);
		}
		dist *= ray_safetyMult;
		//move distance
		this.x += this.dPos[0] * dist;
		this.y += this.dPos[1] * dist;
		this.z += this.dPos[2] * dist;
		this.distance += dist;

		return this.iterate(num+1);
	}
}



/**
 * Here's the idea behind the octree:
 Raymarching is slow. It's faster than raytracing, but it's still extremely slow because each ray has to do 
 N distance estimates per step, with M steps, at a resolution of w*h rays per frame. This is a lot of computation when every distance estimate
 generally involves a square root of some sort. It would be way better if we had some way to both do fewer distance estimates, and have them be
 less expensive.
 Enter: The Octree.
 By partitioning the world into progressively smaller chunks, we have a way to do fewer distance estimates 
 (don't have to estimate when in the large root notes)
 and have each distance estimate be less expensive (we store the distance results at every corner and interpolate between them for later)
 */
class Octree {
	/**
	 * 
	 * @param {Number} x the x center of the octree
	 * @param {Number} y the y center of the octree
	 * @param {Number} z the z center of the octree
	 * @param {World} world the world the octree is located in
	 * @param {Number} boxSize the width of one subbox. 2 * boxSize is the entire width of the octree
	 */
	constructor(x, y, z, world, boxSize) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.d = boxSize;
		
		this.world = world;
		
		this.subtrees = [null, null, null, null, null, null, null, null];
		this.estimates = [];
		this.estimObjs = [];
	}
	
	calcQuadrant(x, y, z) {
		return ((x < this.x) + 2*(y < this.y) + 4*(z < this.z));
	}
	
	createEstimates() {
		//there are 27 estimates in an octree - 3 planes per axis, 3 axes in 3d space
		for (var x=-1; x<=1; x++) {
			// this.estimates[x] = [];
			this.estimObjs[x] = [];
			for (var y=-1; y<=1; y++) {
				// this.estimates[x][y] = [];
				this.estimObjs[x][y] = [];
				for (var z=-1; z<=1; z++) {
					var res = this.world.estimate(this.x + x * this.d, this.y + y * this.d, this.z + z * this.d);
					// this.estimates[x][y][z] = res[0];
					this.estimObjs[x][y][z] = res[1];
				}
			}
		}
	}
	
	estimate(obj) {
		// console.log(`octree estimating ${x} ${y} ${z}, d=${this.d}`);
		//first figure out which subtree the point is in
		var q = this.calcQuadrant(obj.x, obj.y, obj.z);
		
		//if there's a subtree there, recurse!
		if (this.subtrees[q]) {
			return this.subtrees[q].estimate(obj);
		}
		
		//if there's not a subtree in there, then linearly interpolate between the boundaries
		var xPerc = clamp(((obj.x - this.x) / this.d), -1, 1);
		var yPerc = clamp(((obj.y - this.y) / this.d), -1, 1);
		var zPerc = clamp(((obj.z - this.z) / this.d), -1, 1);
		
		// var percFloors = [Math.floor(xPerc), Math.floor(yPerc), Math.floor(zPerc)];
		// var percCeils = [Math.ceil(xPerc), Math.ceil(yPerc), Math.ceil(zPerc)];
		
		var material = this.estimObjs[Math.round(xPerc)][Math.round(yPerc)][Math.round(zPerc)];
		/*
		var a = linterp(this.estimates[percFloors[0]][percFloors[1]][percFloors[2]], 
						this.estimates[percFloors[0]][percCeils[1]][percFloors[2]], yPerc);
		var b = linterp(this.estimates[percCeils[0]][percFloors[1]][percFloors[2]], 
						this.estimates[percCeils[0]][percCeils[1]][percFloors[2]], yPerc);
		var c = linterp(this.estimates[percFloors[0]][percFloors[1]][percCeils[2]], 
						this.estimates[percFloors[0]][percCeils[1]][percCeils[2]], yPerc);
		var d = linterp(this.estimates[percCeils[0]][percFloors[1]][percCeils[2]], 
						this.estimates[percCeils[0]][percCeils[1]][percCeils[2]], yPerc);
		
		var e = linterp(a, b, xPerc);
		var f = linterp(c, d, xPerc);
		
		//yayyyyy!
		var g = linterp(e, f, zPerc);
		*/
		return [material.distanceTo(obj), material];
	}
	
	generate(n) {
		this.createEstimates();
		if (!(n > 1)) {
			return;
		}
		
		//go through each octant and see if it needs recursion
		
		//base case
		if (this.d / 2 < tree_minD) {
			return;
		}
		
		var hd = this.d / 2;
		for (var x=-1; x<1; x++) {
			for (var y=-1; y<1; y++) {
				for (var z=-1; z<1; z++) {
					var coords = [this.x + this.d * x, this.y + this.d * y, this.z + this.d * z];
					if (this.shouldRecurse(coords[0], coords[1], coords[2])) {
						var quadrant = this.calcQuadrant(coords[0], coords[1], coords[2]);
						console.log(`tree at ${this.x}~${this.y}~${this.z}/${this.d} creating child at ${coords[0]+hd}~${coords[1]+hd}~${coords[2]+hd}/${this.d/2}`)
						this.subtrees[quadrant] = new Octree(coords[0] + hd, coords[1] + hd, coords[2] + hd, this.world, this.d / 2);
						this.subtrees[quadrant].generate(n - 1);
					}
				}
			}
		}
	}
	
	//given the smallest xyz coords in an octant, says if the tree should recurse for that octant
	shouldRecurse(x, y, z) {
		var n = 3;
		var third = this.d / n;
		var distThresh = third * Math.sqrt(2);
		
		//check all the bits and see if the distance is small enough.
		var dist;
		for (var x=1; x<n; x++) {
			for (var y=1; y<n; y++) {
				for (var z=1; z<n; z++) {
					dist = this.world.estimate(x, y, z)[0];
					if (dist < distThresh) {
						return true;
					}
					//if the distance threshold is big enough, none of the checks can possibly pass
					if (dist > distThresh * (n - 1)) {
						return false;
					}
				}
			}
		}
		return false;
	}
}

//the octree made everything slower so here's me testing with a grid 
class Grid {
	//
	constructor(x, y, z, world, maxRange) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.world = world;
		this.minCoords = [x - maxRange, y - maxRange, z - maxRange];
		this.d = tree_minD;
		this.l = Math.ceil((maxRange * 2) / this.d);
		this.estimates = [];
		this.estimObjs = [];
	}
	
	calcGridCoords(x, y, z) {
		return [
			(x - this.minCoords[0]) / this.d,
			(y - this.minCoords[1]) / this.d,
			(z - this.minCoords[2]) / this.d,
		];
	}
	
	estimate(obj) {
		var q = this.calcGridCoords(obj.x, obj.y, obj.z);
		if (Number.isNaN(q[0])) {
			return [900, this.estimObjs[0][0][0]];
		}
		// console.log(q);
		q[0] = clamp(q[0], 0, this.l - 1);
		q[1] = clamp(q[1], 0, this.l - 1);
		q[2] = clamp(q[2], 0, this.l - 1);
		// console.log(JSON.stringify(q));
		
		var xPerc = q[0] % 1;
		var yPerc = q[1] % 1;
		var zPerc = q[2] % 1;
		
		var percFloors = [Math.floor(q[0]), Math.floor(q[1]), Math.floor(q[2])];
		var percCeils = [Math.ceil(q[0]), Math.ceil(q[1]), Math.ceil(q[2])];
		
		// console.log(`trying to access ${Math.round(q[0])}_${Math.round(q[1])}_${Math.round(q[2])}`);
		var material = this.estimObjs[Math.round(q[0])][Math.round(q[1])][Math.round(q[2])];
		
		/* 
		var a = linterp(this.estimates[percFloors[0]][percFloors[1]][percFloors[2]], 
						this.estimates[percFloors[0]][percCeils[1]][percFloors[2]], yPerc);
		var b = linterp(this.estimates[percCeils[0]][percFloors[1]][percFloors[2]], 
						this.estimates[percCeils[0]][percCeils[1]][percFloors[2]], yPerc);
		var c = linterp(this.estimates[percFloors[0]][percFloors[1]][percCeils[2]], 
						this.estimates[percFloors[0]][percCeils[1]][percCeils[2]], yPerc);
		var d = linterp(this.estimates[percCeils[0]][percFloors[1]][percCeils[2]], 
						this.estimates[percCeils[0]][percCeils[1]][percCeils[2]], yPerc);
		
		var e = linterp(a, b, xPerc);
		var f = linterp(c, d, xPerc);
		
		var g = linterp(e, f, zPerc); */
		var g = material.distanceTo(obj);
		
		return [g, material];
	}
	
	generate(n) {
		console.log(`generating ${this.l ** 3} grid blocks for world ${this.world.name}`);
		//create all estimates
		
		for (var x=0; x<this.l; x++) {
			this.estimates[x] = [];
			this.estimObjs[x] = [];
			for (var y=0; y<this.l; y++) {
				this.estimates[x][y] = [];
				this.estimObjs[x][y] = [];
				for (var z=0; z<this.l; z++) {
					var res = this.world.estimate(this.minCoords[0] + this.d * x, this.minCoords[1] + this.d * y, this.minCoords[2] + this.d * z);
					this.estimates[x][y][z] = res[0];
					this.estimObjs[x][y][z] = res[1];
				}
			}
		}
	}
}


class BrickGrid {
	constructor(world, l, d) {
		this.l = l;
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.d = d;
		this.world = world;
		
		this.estimObjs = [];
	}
	
	generate() {
		var awagh = ((this.l - 1) * this.d / 2);
		this.minCoords = [this.x - awagh, this.y - awagh, this.z- awagh];
		this.estimObjs = [];
		for (var x=0; x<this.l; x++) {
			this.generateX(this.minCoords, x);
		}
	}
	
	generateX(minCoords, x) {
		this.estimObjs[x] = [];
		for (var y=0; y<this.l; y++) {
			this.generateY(minCoords, x, y);
		}
	}
	
	generateY(minCoords, x, y) {
		this.estimObjs[x][y] = [];
		for (var z=0; z<this.l; z++) {
			this.generateZ(minCoords, x, y, z);
		}
	}
	
	generateZ(minCoords, x, y, z) {
		// console.log(`testing ${x} ${y} ${z} -> ${minCoords[0] + this.d * x} ${minCoords[1] + this.d * y} ${minCoords[2] + this.d * z}`)
		this.estimObjs[x][y][z] = this.world.estimate(minCoords[0] + this.d * x, minCoords[1] + this.d * y, minCoords[2] + this.d * z)[1];
	}
	
	update() {
		//if the player is more than d/2 away from the center point, it's time to shift center points
		var cVec = this.calcGridCoords(camera.x, camera.y, camera.z);
		//move towards player
		this.shift(Math.round(cVec[0]), Math.round(cVec[1]), Math.round(cVec[2]));
	}
	
	shift(xBlocks, yBlocks, zBlocks) {
		//don't bother if we don't need to move
		if (!(xBlocks || yBlocks || zBlocks)) {
			return;
		}
		// console.log(`grid with d=${this.d} shifting by ${xBlocks} ${yBlocks} ${zBlocks}`);

		
	
		var maxBlock = this.l - 1;
		var range = ((this.l - 1) * this.d) / 2;
		var cornerCoords = [this.x - range, this.y - range, this.z - range];
		
		//a bit confusing. But I can put the coordinate updates first because generation only depends on cornercoords
		this.x += xBlocks * this.d;
		this.y += yBlocks * this.d;
		this.z += zBlocks * this.d;
		
		if (xBlocks) {
			while (xBlocks > 0) {
				cornerCoords[0] += this.d;
				this.estimObjs.splice(0, 1);
				this.generateX(cornerCoords, maxBlock);
				xBlocks -= 1;
			}
			while (xBlocks < 0) {
				cornerCoords[0] -= this.d;
				this.estimObjs.splice(0, 0, []);
				this.generateX(cornerCoords, 0);
				this.estimObjs.pop();
				xBlocks += 1;
			}
		}
		
		if (yBlocks) {
			while (yBlocks > 0) {
				cornerCoords[1] += this.d;
				for (var x=0; x<this.l; x++) {
					this.estimObjs[x].splice(0, 1);
					this.generateY(cornerCoords, x, maxBlock);
				}
				yBlocks -= 1;
			}
			while (yBlocks < 0) {
				cornerCoords[1] -= this.d;
				for (var x=0; x<this.l; x++) {
					this.estimObjs[x].splice(0, 0, []);
					this.generateY(cornerCoords, x, 0);
					this.estimObjs[x].pop();
				}
				yBlocks += 1;
			}
		}
		
		if (zBlocks) {
			while (zBlocks > 0) {
				cornerCoords[2] += this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						this.estimObjs[x][y].splice(0, 1);
						this.generateZ(cornerCoords, x, y, maxBlock);
					}
				}
				zBlocks -= 1;
			}
			while (zBlocks < 0) {
				cornerCoords[2] -= this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						this.estimObjs[x][y].splice(0, 0, []);
						this.generateZ(cornerCoords, x, y, 0);
						this.estimObjs[x][y].pop();
					}
				}
				zBlocks += 1;
			}
		}
		
	}
	
	calcGridCoords(x, y, z) {
		return [
			(x - this.x) / this.d,
			(y - this.y) / this.d,
			(z - this.z) / this.d,
		];
	}
	
	estimate(obj) {
		var q = this.calcGridCoords(obj.x, obj.y, obj.z);
		if (Number.isNaN(q[0])) {
			console.error(`NAN IN ESTIMATE`);
			return [this.d, this.estimObjs[0][0][0]];
		}
		var halfsies = (this.l - 1) / 2;
		// console.log(q);
		q[0] = halfsies + clamp(q[0], -halfsies, halfsies);
		q[1] = halfsies + clamp(q[1], -halfsies, halfsies);
		q[2] = halfsies + clamp(q[2], -halfsies, halfsies);
		// console.log(JSON.stringify(q));
		
		// console.log(`trying to access ${Math.round(q[0])}_${Math.round(q[1])}_${Math.round(q[2])}`);
		var material = this.estimObjs[Math.round(q[0])][Math.round(q[1])][Math.round(q[2])];
		var g = material.distanceTo(obj);
		return [g, material];
	}
}

//a series of exponentially larger BrickGrids that cover the world
class BrickMap {
	constructor(world, maxRange) {
		this.world = world;
		this.numSets = Math.ceil(Math.log2(maxRange / tree_minD));
		this.trueMinD = undefined;
		//number of points in each grid axis
		this.l = tree_l;
		this.sets = [];
	}
	
	estimate(obj) {
		//figure out which BrickGrid the ray is in
		var brickDist = [
			(obj.x - camera.x) / tree_minD,
			(obj.y - camera.y) / tree_minD,
			(obj.z - camera.z) / tree_minD,
		];
		var maxBrickDist = Math.max(Math.abs(brickDist[0]), Math.abs(brickDist[1]), Math.abs(brickDist[2]));
		
		var level = Math.ceil(Math.log2(maxBrickDist / this.l)) + 1;
		if (level < 0) {
			level = 0;
		}
		if (Number.isNaN(level)) {
			console.error(`uh oh!`, obj.x, maxBrickDist, (maxBrickDist / (this.l * tree_minD)));
			return;
		}
		if (!this.sets[level]) {
			// console.log(`cannot find brickmap level ${level}! Using ${this.sets.length - 1}`);
			level = this.sets.length - 1;
		}
		// console.log(`passing off to level ${level}, d=${this.sets[level].d}`);
		return this.sets[level].estimate(obj);
	}
	
	generate(n) {
		//create all BrickGrids
		this.sets = [];
		var max = Math.min(this.numSets, n);
		for (var a=0; a<max; a++) {
			this.sets.push(new BrickGrid(this.world, this.l, tree_minD * (2 ** a)));
			this.sets[this.sets.length-1].generate();
		}
		this.trueMinD = this.sets[0].d;
	}
	
	update() {
		this.sets.forEach(s => {
			s.update();
		});
	}
}

class World {
	/**
	 * Creates a World object
	 * @param {Function} getBgColor 
	 * @param {Function} effects 
	 * @param {Number[]} sunVector 
	 * @param {Number[]} spawn 
	 * @param {Scene3dObject[]} objects 
	 */
	constructor(name, getBgColor, effects, sunVector, spawn, objects) {
		this.name = name;
		this.getBgColor = getBgColor;
		this.effects = effects;
		this.sunVector = sunVector;
		this.spawn = spawn;
		this.objects = objects;
		this.finalize();
	}
	
	finalize() {
		worlds[this.name] = this;
		this.tree = new BrickMap(this, tree_maxD);
		this.tree.generate(6);
	}
	
	//estimate distance at a given point. Returns both distance and the object that gave that distance
	estimate(x, y, z) {
		var obj = {x: x, y: y, z: z};
		var dist = 1e1001;
		var distObj;
		var testDist;
		this.objects.forEach(w => {
			testDist = w.distanceTo(obj);
			if (testDist < dist) {
				dist = testDist;
				distObj = w;
			}
		});
		return [dist, distObj];
	}
}