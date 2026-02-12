

//objects that are required for the engine to run
class Camera {
	constructor(world, pos) {
		this.world = world;
		//add 0.1 so that the camera doesn't start out aligned on the grid
		this.pos = pos;
		this.dPos = Pos(0, 0, 0);
		this.aPos = Pos(0, 0, 0);
		this.dMax = 3;
		this.dMin = 0.05;

		this.speed = 0.07;
		this.jumpSpeed = 2.5;
		this.friction = 0.8;

		this.gravity = 0.15;
		this.fallMax = 12;
		this.onGround = false;

		this.height = 10;
		this.width = player_width;

		this.theta = 0;
		this.phi = 0;
	}

	tick() {
		this.updateMomentum();
		this.updatePosition();
	}

	updateMomentum() {
		//updates dVars
		this.dPos[0] += this.aPos[0];
		if (Math.abs(this.dPos[0]) > this.dMax) {
			this.dPos[0] = clamp(this.dPos[0], -this.dMax, this.dMax);
		}
		if (this.aPos[0] * this.dPos[0] <= 0) {
			this.dPos[0] *= this.friction;
		}

		//gravity
		this.dPos[1] -= this.gravity;
		if (Math.abs(this.dPos[1]) > this.fallMax) {
			this.dPos[1] = clamp(this.dPos[1], -this.fallMax, this.fallMax);
		}

		this.dPos[2] += this.aPos[2];
		if (Math.abs(this.dPos[2]) > this.dMax) {
			this.dPos[2] = clamp(this.dPos[2], -this.dMax, this.dMax);
		}
		if (this.aPos[2] * this.dPos[2] <= 0) {
			this.dPos[2] *= this.friction;
		}
	}

	updatePosition() {
		/* movement follows a simple 3-part plan
		1. cast ray upwards from self's feet
		2. try to move ray in the sideways directions, to whatever varying success
		3. move ray downwards
		
		This makes sure that the movement is always valid, because there has to be an unobstructed path 
		between the previous position and the new position.
		It also allows the player to step up slopes.
		 */

		//before any raycasts, housekeeping
		var speedMultiplier = 1 + controls_shiftPressed * (1 + editor_active * 7);
		var feetCoords = [this.pos[0], this.pos[1] - this.height + 1, this.pos[2]];
		var axisVecs = [
			polToCart(this.theta + (Math.PI / 2), 0, 1),
			[0, 1, 0],
			polToCart(this.theta, 0, 1)
		];
		var dVec = Pos(this.dPos[0] * speedMultiplier, this.dPos[1], this.dPos[2] * speedMultiplier);
		
		
		//go up
		var lookRay = new Ray_Tracking(this.world, feetCoords, Pos(0, 1, 0), player_stepHeight);
		lookRay.iterate(0);
		feetCoords[1] += lookRay.distance;
		
		//sideways
		for (var i=0; i<3; i++) {
			if (!this.tryMovementOnAxis(feetCoords, axisVecs[i], dVec[i])) {
				dVec[i] = 0;
				if (i == 1) {
					this.onGround = true;
				}
			}
		}
		
		//go back down. Hacky solution with the +1 but it works
		var lookRay = new Ray_Tracking(this.world, feetCoords, Pos(0, -1, 0), (player_stepHeight + 1));
		lookRay.iterate(0);
		feetCoords[1] -= lookRay.distance;
		
		
		//update real coordinates
		dVec[0] /= speedMultiplier;
		dVec[2] /= speedMultiplier;
		this.pos = Pos(feetCoords[0], feetCoords[1] + this.height, feetCoords[2]);
		this.dPos = dVec;
	}
	
	tryMovementOnAxis(pos, axisVec, distance) {
		if (distance < 0) {
			axisVec = [-axisVec[0], -axisVec[1], -axisVec[2]];
			distance = -distance;
		}
		if (distance > this.dMin) {
			//cast ray sideways
			var lookRay = new Ray_Tracking(this.world, pos, axisVec, this.width + distance + 1);
			lookRay.iterate(0);
			//if the ray's gone far enough, then move there
			if (lookRay.distance > this.width + distance) {
				//doesn't need a y because phi is always 0
				pos[0] += axisVec[0] * distance;
				pos[1] += axisVec[1] * distance;
				pos[2] += axisVec[2] * distance;
				return true;
			} else {
				return false;
			}
		}
	}

	jump() {
		if (true || this.onGround) {
			this.dPos[1] = this.jumpSpeed;
			this.onGround = false;
		}
	}
}



//ray class, for marching rays
class Ray {
	/**
	* A Ray performs raymarching calculations! Given a world, xyz, and directionPos, marches through the world. 
	* It calculates what color is made via this process.
	* @param {Float32Array[]} pos starting position of the ray
	* @param {Float32Array[]} dPos direction of the ray
	*/
	constructor(world, pos, dPos) {
		this.world = world;
		this.pos = new Float32Array(pos);
		this.color = world.getBgColor();
		this.dPos = dPos;
		this.hit = 0;
		this.iters = 0;
		this.dist = 0;
		this.hitDist = 0;
	}

	iterate() {
		while (this.iters < ray_maxIters) {
			if (this.dist > ray_maxDist) {
				this.world.postEffects(this);
				return this.color;
			}
	
			//get distance
			var [dist, distObj] = this.world.tree.estimate(this);
			dist *= ray_safetyMult;
	
			//if distance is out of dist bounds
			if (dist < ray_minDist) {
				if (this.hit > 1) {
					//draw self as a shadow
					this.shadow();
					this.world.postEffects(this);
					return this.color;
				}
				//color self according to hit object, and change direction
				if (!this.hit) {
					distObj.applyHitEffect(this);
					this.hitDist = this.dist;
				}
				dist = ray_minDist * 1.5;
				this.hit += 1;
				this.dPos[0] = this.world.sunVector[0];
				this.dPos[1] = this.world.sunVector[1];
				this.dPos[2] = this.world.sunVector[2];
			}

			//move distance
			this.pos[0] += this.dPos[0] * dist;
			this.pos[1] += this.dPos[1] * dist;
			this.pos[2] += this.dPos[2] * dist;
			this.dist += dist;
			this.world.preEffects(this);
			this.iters += 1;
		}
		this.world.postEffects(this);
		return this.color;
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
	* @param {World} world the world the ray's in
	* @param {Float32Array[]} pos starting position of the ray
	* @param {Float32Array[]} dPos direction vector to travel in
	* @param {Number} maxDist the maximum distance to travel before stopping
	*/
	constructor(world, pos, dPos, maxDist) {
		this.world = world;
		this.pos = new Float32Array(pos);
		// console.trace(this.pos, pos);
		this.dPos = dPos;
		this.distance = 0;
		this.distCap = maxDist ?? ray_maxDist;
		this.object = undefined;
	}

	iterate(num) {
		if (num > ray_maxIters) {
			return this.distance;
		}
		
		//get distance
		var [dist, distObj] = this.world.tree.estimate(this);
		dist *= ray_safetyMult;

		//if distance is out of dist bounds
		if (dist < ray_minDist) {
			this.object = distObj;
			return this.distance;
		}
		
		dist = Math.min(dist, this.distCap - this.distance);
		
		//move distance
		this.pos[0] += this.dPos[0] * dist;
		this.pos[1] += this.dPos[1] * dist;
		this.pos[2] += this.dPos[2] * dist;
		this.distance += dist;
		
		//if we've reached the cap, return
		if (this.distance >= this.distCap) {
			return this.distCap;
		}

		return this.iterate(num+1);
	}
}


//test version of the BrickGrid class that uses indeces instead of references. I think it's slower.
//     BrickGrid			24-73ms, uses 24mb
//with BrickGridInd:		22-70ms, uses 3mb
//with BrickGridTor:		
class BrickGridTor {
	constructor(world, l, d) {
		this.l = l;
		this.l2 = l*l;
		this.pos = Pos(0, 0, 0);
		this.minPos = Pos(this.pos[0] - awagh, this.pos[1] - awagh, this.pos[2]- awagh);
		this.d = d;
		this.world = world;
		
		this.generated = false;
		this.estimInds = new U8Arr(l*l*l);
		this.indOffset = new U8Arr([0, 0, 0]);
	}
	
	generate() {
		for (var x=0; x<this.l; x++) {
			this.generateX(this.minPos, x);
		}
		this.generated = true;
	}
	
	generateX(minCoords, x) {
		for (var y=0; y<this.l; y++) {
			this.generateY(minCoords, x, y);
		}
	}
	
	generateY(minCoords, x, y) {
		for (var z=0; z<this.l; z++) {
			this.generateZ(minCoords, x, y, z);
		}
	}
	
	generateZ(minCoords, x, y, z) {
		// console.log(`testing ${x} ${y} ${z} -> ${minCoords[0] + this.d * x} ${minCoords[1] + this.d * y} ${minCoords[2] + this.d * z}`)
		var i = this.world.estimatePos(Pos(minCoords[0] + x*this.d, minCoords[1] + y*this.d, minCoords[2] + z*this.d))[1];
		if (i == -1 && prand(0, 1) < 0.001) {
			console.error("AAAAA", Pos(minCoords[0] + x*this.d, minCoords[1] + y*this.d, minCoords[2] + z*this.d));
		}
		// console.log(i);
		this.estimInds[x*this.l2 + y*this.l + z] = i;
	}
	
	update() {
		//if the player is more than d/2 away from the center point, it's time to shift center points
		var cVec = this.calcGridCoords(camera.pos);
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
		var cornerCoords = [this.pos[0] - range, this.pos[1] - range, this.pos[2] - range];
		
		//a bit confusing. But I can put the coordinate updates first because generation only depends on cornercoords
		this.pos[0] += xBlocks * this.d;
		this.pos[1] += yBlocks * this.d;
		this.pos[2] += zBlocks * this.d;
		
		if (xBlocks) {
			while (xBlocks > 0) {
				cornerCoords[0] += this.d;
				this.estimInds.splice(0, 1);
				this.generateX(cornerCoords, maxBlock);
				xBlocks -= 1;
			}
			while (xBlocks < 0) {
				cornerCoords[0] -= this.d;
				this.estimInds.splice(0, 0, []);
				this.generateX(cornerCoords, 0);
				this.estimInds.pop();
				xBlocks += 1;
			}
		}
		
		if (yBlocks) {
			while (yBlocks > 0) {
				cornerCoords[1] += this.d;
				for (var x=0; x<this.l; x++) {
					this.estimInds[x].splice(0, 1);
					this.generateY(cornerCoords, x, maxBlock);
				}
				yBlocks -= 1;
			}
			while (yBlocks < 0) {
				cornerCoords[1] -= this.d;
				for (var x=0; x<this.l; x++) {
					this.estimInds[x].splice(0, 0, []);
					this.generateY(cornerCoords, x, 0);
					this.estimInds[x].pop();
				}
				yBlocks += 1;
			}
		}
		
		if (zBlocks) {
			while (zBlocks > 0) {
				cornerCoords[2] += this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						this.estimInds[x][y].set(this.estimInds[x][y].slice(1));
						this.generateZ(cornerCoords, x, y, maxBlock);
					}
				}
				zBlocks -= 1;
			}
			while (zBlocks < 0) {
				cornerCoords[2] -= this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						//this.estimInds[x][y].splice(0, 0, []);
						this.estimInds[x][y].set(this.estimInds[x][y].slice(0, this.estimInds[x][y].length - 1), 1);
						this.generateZ(cornerCoords, x, y, 0);
					}
				}
				zBlocks += 1;
			}
		}
	}
	
	calcGridCoords(pos) {
		return [
			(pos[0] - this.pos[0]) / this.d,
			(pos[1] - this.pos[1]) / this.d,
			(pos[2] - this.pos[2]) / this.d,
		];
	}
	
	getMaterial(q) {
		return this.world.objects[this.estimInds[q[0]][q[1]][q[2]]];
	}
	
	estimate(obj) {
		var q = this.calcGridCoords(obj.pos);
		var halfsies = (this.l - 1) / 2;
		// console.log(q);
		q[0] = Math.round(halfsies + clamp(q[0], -halfsies, halfsies));
		q[1] = Math.round(halfsies + clamp(q[1], -halfsies, halfsies));
		q[2] = Math.round(halfsies + clamp(q[2], -halfsies, halfsies));
		
		// console.log(`trying to access ${Math.round(q[0])}_${Math.round(q[1])}_${Math.round(q[2])}`);
		var material = this.getMaterial(q);
		// console.log(this, material, q);
		var g = material.distanceToObj(obj);
		return [g, material];
	}
}


/**
 * Here's the idea behind the BrickGrid:
 Raymarching is slow. It's faster than raytracing, but it's still extremely slow because each ray has to do 
 N distance estimates per step, with M steps, at a resolution of w*h rays per frame. This is a lot of computation when every distance estimate
 generally involves a square root of some sort. It would be way better if we had some way to do fewer distance estimates.
 Enter: The BrickGrid.
 By partitioning a space into a grid, and estimating the one object closest at every point on that grid, 
 we have fewer distance estimates (we only have to check against one object per measurement).
 */
 class BrickGridInd {
	constructor(world, l, d) {
		this.l = l;
		this.pos = Pos(0, 0, 0);
		this.d = d;
		this.world = world;
		
		this.generated = false;
		this.estimInds = [];
	}
	
	generate() {
		var awagh = ((this.l - 1) * this.d / 2);
		this.minCoords = Pos(this.pos[0] - awagh, this.pos[1] - awagh, this.pos[2]- awagh);
		this.estimInds = [];
		for (var x=0; x<this.l; x++) {
			this.generateX(this.minCoords, x);
		}
		this.generated = true;
	}
	
	generateX(minCoords, x) {
		this.estimInds[x] = [];
		for (var y=0; y<this.l; y++) {
			this.generateY(minCoords, x, y);
		}
	}
	
	generateY(minCoords, x, y) {
		this.estimInds[x][y] = new Uint8Array(this.l);
		for (var z=0; z<this.l; z++) {
			this.generateZ(minCoords, x, y, z);
		}
	}
	
	generateZ(minCoords, x, y, z) {
		// console.log(`testing ${x} ${y} ${z} -> ${minCoords[0] + this.d * x} ${minCoords[1] + this.d * y} ${minCoords[2] + this.d * z}`)
		var i = this.world.estimatePos(Pos(minCoords[0] + x*this.d, minCoords[1] + y*this.d, minCoords[2] + z*this.d))[1];
		if (i == -1 && prand(0, 1) < 0.001) {
			console.error("AAAAA", Pos(minCoords[0] + x*this.d, minCoords[1] + y*this.d, minCoords[2] + z*this.d));
		}
		// console.log(i);
		this.estimInds[x][y][z] = i;
	}
	
	update() {
		//if the player is more than d/2 away from the center point, it's time to shift center points
		var cVec = this.calcGridCoords(camera.pos);
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
		var cornerCoords = [this.pos[0] - range, this.pos[1] - range, this.pos[2] - range];
		
		//a bit confusing. But I can put the coordinate updates first because generation only depends on cornercoords
		this.pos[0] += xBlocks * this.d;
		this.pos[1] += yBlocks * this.d;
		this.pos[2] += zBlocks * this.d;
		
		if (xBlocks) {
			while (xBlocks > 0) {
				cornerCoords[0] += this.d;
				this.estimInds.splice(0, 1);
				this.generateX(cornerCoords, maxBlock);
				xBlocks -= 1;
			}
			while (xBlocks < 0) {
				cornerCoords[0] -= this.d;
				this.estimInds.splice(0, 0, []);
				this.generateX(cornerCoords, 0);
				this.estimInds.pop();
				xBlocks += 1;
			}
		}
		
		if (yBlocks) {
			while (yBlocks > 0) {
				cornerCoords[1] += this.d;
				for (var x=0; x<this.l; x++) {
					this.estimInds[x].splice(0, 1);
					this.generateY(cornerCoords, x, maxBlock);
				}
				yBlocks -= 1;
			}
			while (yBlocks < 0) {
				cornerCoords[1] -= this.d;
				for (var x=0; x<this.l; x++) {
					this.estimInds[x].splice(0, 0, []);
					this.generateY(cornerCoords, x, 0);
					this.estimInds[x].pop();
				}
				yBlocks += 1;
			}
		}
		
		if (zBlocks) {
			while (zBlocks > 0) {
				cornerCoords[2] += this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						this.estimInds[x][y].set(this.estimInds[x][y].slice(1));
						this.generateZ(cornerCoords, x, y, maxBlock);
					}
				}
				zBlocks -= 1;
			}
			while (zBlocks < 0) {
				cornerCoords[2] -= this.d;
				for (var x=0; x<this.l; x++) {
					for (var y=0; y<this.l; y++) {
						//this.estimInds[x][y].splice(0, 0, []);
						this.estimInds[x][y].set(this.estimInds[x][y].slice(0, this.estimInds[x][y].length - 1), 1);
						this.generateZ(cornerCoords, x, y, 0);
					}
				}
				zBlocks += 1;
			}
		}
	}
	
	calcGridCoords(pos) {
		return [
			(pos[0] - this.pos[0]) / this.d,
			(pos[1] - this.pos[1]) / this.d,
			(pos[2] - this.pos[2]) / this.d,
		];
	}
	
	getMaterial(q) {
		return this.world.objects[this.estimInds[q[0]][q[1]][q[2]]];
	}
	
	estimate(obj) {
		var q = this.calcGridCoords(obj.pos);
		var halfsies = (this.l - 1) / 2;
		// console.log(q);
		q[0] = Math.round(halfsies + clamp(q[0], -halfsies, halfsies));
		q[1] = Math.round(halfsies + clamp(q[1], -halfsies, halfsies));
		q[2] = Math.round(halfsies + clamp(q[2], -halfsies, halfsies));
		
		// console.log(`trying to access ${Math.round(q[0])}_${Math.round(q[1])}_${Math.round(q[2])}`);
		var material = this.getMaterial(q);
		// console.log(this, material, q);
		var g = material.distanceToObj(obj);
		return [g, material];
	}
}

//a series of exponentially larger BrickGrids that cover the world
class BrickMap {
	constructor(world, maxRange) {
		this.world = world;
		this.numSetsIdeal = Math.ceil(Math.log2(maxRange / tree_minD));
		this.trueMinD = undefined;
		//number of points in each grid axis
		this.l = tree_l;
		this.sets = [];
	}
	
	estimate(obj) {
		//figure out which BrickGrid the ray is in
		var brickDist = [
			(obj.pos[0] - camera.pos[0]) / tree_minD,
			(obj.pos[1] - camera.pos[1]) / tree_minD,
			(obj.pos[2] - camera.pos[2]) / tree_minD,
		];
		var maxBrickDist = Math.max(Math.abs(brickDist[0]), Math.abs(brickDist[1]), Math.abs(brickDist[2]));
		
		var level = Math.ceil(Math.log2(maxBrickDist / this.l)) + 1;
		if (level < 0) {
			level = 0;
		}
		if (!this.sets[level]) {
			// console.log(`cannot find brickmap level ${level}! Using ${this.sets.length - 1}`);
			level = this.sets.length - 1;
		}
		if (!this.sets[level].generated) {
			return ray_maxDist;
		}
		// console.log(`passing off to level ${level}, d=${this.sets[level].d}`);
		return this.sets[level].estimate(obj);
	}
	
	generate(n) {
		//create all BrickGrids
		this.sets = [];
		var max = Math.min(this.numSetsIdeal, n);
		for (var a=0; a<max; a++) {
			this.sets[a] = new BrickGridInd(this.world, this.l, tree_minD * (2 ** a));
			this.sets[a].generate();
		}
		this.trueMinD = this.sets[0].d;
	}
	
	update() {
		this.sets.forEach(s => {
			s.update();
		});
	}
}