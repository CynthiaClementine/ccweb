
//objects that are required for the engine to run

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
		this.color = Color4(255, 0, 255, 0);
		this.dPos = dPos;
		this.hit = 0;
		this.iters = 0;
		this.totalDist = 0;
		this.hitDist = 0;
		this.localDist = 0;
	}
	
	reset(world, pos, dPos) {
		this.world = world;
		this.pos = new Float32Array(pos);
		this.color = Color4(255, 0, 255, 0);
		this.dPos = dPos;
		this.hit = 0;
		this.iters = 0;
		this.totalDist = 0;
		this.hitDist = 0;
		this.localDist = 0;
	}

	iterate() {
		const pos = this.pos;
		const dPos = this.dPos;
		
		while (this.iters < ray_maxIters) {
			if (this.totalDist > ray_maxDist) {
				this.world.postEffects(this);
				return this.color;
			}
	
			//get distance
			const distObj = this.world.tree.estimate(this);
			const dist = distObj.distanceToPos(pos);
			const safeDist = dist * ray_safetyMult;
			this.localDist = safeDist;
			// var [dist, distObj] = this.world.grid.estimatePos(this.pos);
			// distObj = this.world.objects[distObj];
	
			//if distance is out of dist bounds
			
			if (safeDist < ray_minDist) {
				//if it's hit:
				this.hit += distObj.material.applyHitEffect(this);
				
				//a ray will go through normal (hit=0) -> shadow (hit=1) -> done (hit=2) span.
				if (this.hit >= 2) {
					//draw self as a shadow
					this.shadow();
					this.world.postEffects(this);
					return this.color;
				}
				
				//can be false if it's a portal
				if (this.hit == 1) {
					this.hitDist = this.totalDist;
					dPos[0] = this.world.sunVector[0];
					dPos[1] = this.world.sunVector[1];
					dPos[2] = this.world.sunVector[2];
				}
			} else if (safeDist < ray_nearDist) {
				distObj.material.applyNearEffect(this);
			}

			//move distance
			pos[0] += dPos[0] * this.localDist;
			pos[1] += dPos[1] * this.localDist;
			pos[2] += dPos[2] * this.localDist;
			this.totalDist += this.localDist;
			this.world.preEffects(this);
			this.iters += 1;
		}
		this.world.postEffects(this);
		return this.color;
	}
	
	//applies the shadow effect to the color
	shadow() {
		const shh = this.world.ambientLight;
		this.color[0] *= shh;
		this.color[1] *= shh;
		this.color[2] *= shh;
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

	iterate() {
		var iters = 0;
		while (iters < ray_maxIters) {
			//get distance
			const distObj = this.world.tree.estimate(this);
			var dist = distObj.distanceToPos(this.pos) * ray_safetyMult;
			// var [dist, distObj] = this.world.grid.estimatePos(this.pos);
			// distObj = this.world.objects[distObj];
	
			//if distance is out of dist bounds
			if (dist < ray_minDist) {
				this.object = distObj;
				return this.distance;
			}
			
			if (dist < ray_nearDist) {
				distObj.material.applyNearEffect(this);
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
			iters += 1;
		}
		return this.distance;
	}
}


class ObjectGrid {
	/**
	* @param {World} world the world to break into a grid
	* @param {Number} l number of chunks on an axis
	 */
	constructor(world, l) {
		this.l = l;
		this.world = world;
		this.objects = world.objects;
		this.chunks = [];
		this.xd = 0;
		this.yd = 0;
		this.zd = 0;
		this.minPos;
		this.maxPos;
	}
	
	binObject(obj) {
		var index = this.objects.indexOf(obj);
		var [min, max] = obj.bounds();
		min = this.calcGridCoords(min);
		max = this.calcGridCoords(max);
		if (Number.isNaN(min) || Number.isNaN(max)) {
			throw new Error(`cannot get real bounds for object ${index}!`);
		}

		for (var a=0; a<=2; a++) {
			min[a] = Math.floor(clamp(min[a] - 1, 0, this.l));
			max[a] =  Math.ceil(clamp(max[a] + 1, 0, this.l));
		}
		
		for (var x=min[0]; x<max[0]; x++) {
			for (var y=min[1]; y<max[1]; y++) {
				for (var z=min[2]; z<max[2]; z++) {
					this.chunks[x][y][z].add(index);
				}
			}
		}
	}
	
	calcGridCoords(pos) {
		return [
			(pos[0] - this.minPos[0]) / this.xd,
			(pos[1] - this.minPos[1]) / this.yd,
			(pos[2] - this.minPos[2]) / this.zd
		];
	}
	
	generate() {
		//generate bounds
		var min = [1e1001, 1e1001, 1e1001];
		var max = [-1e101, -1e101, -1e101];
		this.objects.forEach(o => {
			var bounds = o.bounds();
			for (var a=0; a<=2; a++) {
				min[a] = Math.min(min[a], bounds[0][a]);
				max[a] = Math.max(max[a], bounds[1][a]);
				if (Number.isNaN(min[a]) || Number.isNaN(bounds[0][a])) {
					throw new Error("something has gone horribly wrong with block bounds.");
				}
			}
		});
		this.minPos = min;
		this.maxPos = max;
		this.xd = (max[0] - min[0]) / this.l;
		this.yd = (max[1] - min[1]) / this.l;
		this.zd = (max[2] - min[2]) / this.l;
		
		if (Number.isNaN(this.xd)) {
			throw new Error("something has gone horribly wrong with block bounds..");
		}
		
		// console.log(min, max, this.l);
		
		//generate object estimate grid
		this.chunks = [];
		const len = this.l;
		for (var x=0; x<len; x++) {
			this.chunks[x] = [];
			for (var y=0; y<len; y++) {
				this.chunks[x][y] = [];
				for (var z=0; z<len; z++) {
					this.chunks[x][y][z] = new Set();
				}
			}
		}
		
		//add closest object to the estimate grid
		const xd = this.xd;
		const yd = this.yd;
		const zd = this.zd;
		const chunks = this.chunks;
		for (var x=0; x<len; x++) {
			var worldX = this.minPos[0] + x * xd;
			for (var y=0; y<len; y++) {
				var worldY = this.minPos[1] + y * yd;
				for (var z=0; z<len; z++) {
					//add the object that's closest
					var worldZ = this.minPos[2] + z * zd;
					var obj = this.world.estimatePos(Pos(worldX, worldY, worldZ))[1];
					//add to all adjacents as well
					[[1, 1, 1],[1, 1, -1],[1, -1, 1],[1, -1, -1],
					[-1, 1, 1],[-1, 1, -1],[-1, -1, 1],[-1, -1, -1]].forEach(g => {
						var mx = x + g[0];
						var my = y + g[1];
						var mz = z + g[2];
						//stupid check
						if (chunks[mx] && chunks[mx][my] && chunks[mx][my][mz]) {
							chunks[mx][my][mz].add(obj);
						}
					});
				}
			}
		}
		
		//add all objects to the estimate grid
		this.objects.forEach(o => {
			this.binObject(o);
		});
	}
	
	estimatePos(pos) {
		var dist = 1e100;
		var distInd = -1;
		
		//ough
		var gridPos = this.calcGridCoords(pos);
		gridPos[0] = clamp(gridPos[0], 0, this.l - 1) | 0;
		gridPos[1] = clamp(gridPos[1], 0, this.l - 1) | 0;
		gridPos[2] = clamp(gridPos[2], 0, this.l - 1) | 0;
		
		var set = this.chunks[gridPos[0]][gridPos[1]][gridPos[2]];
		set.forEach(i => {
			var testDist = this.objects[i].distanceToPos(pos);
			if (testDist < dist) {
				dist = testDist;
				distInd = i;
			}
			//if the distance is small enough, don't bother running through all the other objects
			// if (dist > -2); {
			// 	return [dist, distInd]
			// }
		});
		return [dist, distInd];
	}
	
	estimate(obj) {
		//technically a little bit of wasted work. But it's probably fine
		return this.world.objects[this.estimatePos(obj.pos)[1]];
	}
}



//test version of the BrickGrid class
/* 
CUBES:
	with ind:		11-193ms, uses 5mb
	with tor:		13-187ms, uses 2mb

TINYOBJS:
	ind:		9--60ms, uses 5mb
	tor:		9--60ms, uses 2mb
*/

class BrickGridTor {
	constructor(world, l, d) {
		this.l = l;
		this.l2 = l*l;
		this.lHalf = (l - 1) / 2;
		this.pos;
		this.minPos;
		this.d = d;
		this.world = world;
		
		this.generated = false;
		this.estimInds = new U8Arr(l*l*l);
		this.indOffset = new U8Arr([0, 0, 0]);
		this.changePos(0, 0, 0);
	}
	
	changePos(newX, newY, newZ) {
		var range = ((this.l - 1) * this.d) / 2;
		this.pos = Pos(newX, newY, newZ);
		this.minPos = [newX - range, newY - range, newZ - range];
	}
	
	generate() {
		this.generateRegion(0, this.l, 0, this.l, 0, this.l);
		this.generated = true;
	}
	
	/*
	* generates the object estimates for a region between the bounds specified.
	* bounds are inclusive of the min but not the max. eg. generateRegion(0, 0, 4, 4, 7, 7) will generate nothing
	* on account of the mins and maxs being the same for all coordinates.
	 */
	generateRegion(minX, maxX, minY, maxY, minZ, maxZ) {
		const source = this.world.grid ?? this.world;
		const indOff = this.indOffset;
		const minPos = this.minPos;
		const len = this.l;
		const d = this.d;
		for (var x=minX; x<maxX; x++) {
			var gridX = modulateSoft(x + indOff[0], len);
			for (var y=minY; y<maxY; y++) {
				var gridY = modulateSoft(y + indOff[1], len);
				for (var z=minZ; z<maxZ; z++) {
					// var i = this.world.estimatePos(Pos(this.minPos[0] + x*this.d, this.minPos[1] + y*this.d, this.minPos[2] + z*this.d))[1];
					const i = source.estimatePos(Pos(minPos[0] + x*d, minPos[1] + y*d, minPos[2] + z*d))[1];
					// if (i == -1 && prand(0, 1) < 0.001) {
					// 	console.error("AAAAA", this.minPos, Pos(this.minPos[0] + x*this.d, this.minPos[1] + y*this.d, this.minPos[2] + z*this.d));
					// }
					this.estimInds[gridX*this.l2 + gridY*len + modulateSoft(z + indOff[2], len)] = i;
				}
			}
		}
	}
	
	//since 
	
	update() {
		//if the camera is more than d/2 away from the center point, it's time to shift center points
		var cVec = this.calcRelCoords(camera.pos);
		//move towards camera
		this.shift(Math.round(cVec[0]), Math.round(cVec[1]), Math.round(cVec[2]));
	}
	
	shift(xBlocks, yBlocks, zBlocks) {
		//don't bother if we don't need to move
		if (!(xBlocks || yBlocks || zBlocks)) {
			return;
		}
		// console.log(`grid with d=${this.d} shifting by ${xBlocks} ${yBlocks} ${zBlocks}`);

		//only shift a little

		var maxBlock = this.l - 1;
		var range = ((this.l - 1) * this.d) / 2;
		
		//coordinate updates can be first because generation only depends on cornercoords
		this.pos[0] += xBlocks * this.d;
		this.pos[1] += yBlocks * this.d;
		this.pos[2] += zBlocks * this.d;
		this.minPos = [this.pos[0] - range, this.pos[1] - range, this.pos[2] - range];
		
		//if moving too far, just teleport
		if (Math.max(Math.abs(xBlocks), Math.abs(yBlocks), Math.abs(zBlocks)) >= this.l) {
			this.generate();
			return;
		}
		this.indOffset[0] = modulate(this.indOffset[0] + xBlocks, this.l);
		this.indOffset[1] = modulate(this.indOffset[1] + yBlocks, this.l);
		this.indOffset[2] = modulate(this.indOffset[2] + zBlocks, this.l);
		
		
		
		//the worst-case scenario of X, Y, and Z all moving can be divided into 6 blocks:
		//X, Y, Z
		//X && Y, X && Z, Y && Z
		//X && Y && Z
		//we can generate all 6 of these blocks, and then just use the range to figure out which ones are unnecessary
		var oldZeroX = -xBlocks;
		var oldZeroY = -yBlocks;
		var oldZeroZ = -zBlocks;
		var oldEndX = this.l - xBlocks;
		var oldEndY = this.l - yBlocks;
		var oldEndZ = this.l - zBlocks;
		
		var xInfo = (xBlocks < 0) ? [0, oldZeroX] : [oldEndX, this.l];
		var yInfo = (yBlocks < 0) ? [0, oldZeroY] : [oldEndY, this.l];
		var zInfo = (zBlocks < 0) ? [0, oldZeroZ] : [oldEndZ, this.l];
		
		//X, Y, Z
		this.generateRegion(xInfo[0], xInfo[1], oldZeroY, oldEndY, oldZeroZ, oldEndZ);
		this.generateRegion(oldZeroX, oldEndX, yInfo[0], yInfo[1], oldZeroZ, oldEndZ);
		this.generateRegion(oldZeroX, oldEndX, oldZeroY, oldEndY, zInfo[0], zInfo[1]);
		
		//X && Y, X && Z, Y && Z
		this.generateRegion(xInfo[0], xInfo[1], yInfo[0], yInfo[1], oldZeroZ, oldEndZ);
		this.generateRegion(oldZeroX, oldEndX, yInfo[0], yInfo[1], zInfo[0], zInfo[1]);
		this.generateRegion(xInfo[0], xInfo[1], oldZeroY, oldEndY, zInfo[0], zInfo[1]);
		
		//X && Y && Z
		this.generateRegion(xInfo[0], xInfo[1], yInfo[0], yInfo[1], zInfo[0], zInfo[1]);
	}
	
	calcRelCoords(pos) {
		const d = this.d;
		return [
			(pos[0] - this.pos[0]) / d,
			(pos[1] - this.pos[1]) / d,
			(pos[2] - this.pos[2]) / d,
		];
	}
	
	calcGridCoords(pos) {
		return [
			(pos[0] - this.pos[0]) / this.d,
			(pos[1] - this.pos[1]) / this.d,
			(pos[2] - this.pos[2]) / this.d,
		];
	}
	
	getSurface(q) {
		const l = this.l;
		return this.world.objects[
			this.estimInds[	modulateSoft((q[0] + this.indOffset[0]), l)*l*l + 
							modulateSoft((q[1] + this.indOffset[1]), l)*l + 
							modulateSoft((q[2] + this.indOffset[2]), l)]
		];
	}
	
	//somehow faster than in-place modifying the q array (at least on firefox)
	fixQ(q) {
		const lHalf = this.lHalf;
		return [
			Math.round(lHalf + clamp(q[0], -lHalf, lHalf)),
			Math.round(lHalf + clamp(q[1], -lHalf, lHalf)),
			Math.round(lHalf + clamp(q[2], -lHalf, lHalf))
		];
	}
	
	estimate(obj) {
		return this.getSurface(this.fixQ(this.calcRelCoords(obj.pos)));
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
		return this.getMaterial(q);
	}
}

//a series of exponentially larger BrickGrids that cover the world
class BrickMap {
	constructor(world, maxRange, maxSets) {
		this.world = world;
		this.numSetsIdeal = Math.ceil(Math.log2(maxRange / tree_minD));
		this.trueMinD = undefined;
		//number of points in each grid axis
		this.l = tree_l;
		this.sets = [];
		this.maxSetNum = maxSets;
	}
	
	estimate(obj) {
		//figure out which BrickGrid the ray is in
		const sets = this.sets;
		const brickDistX = (obj.pos[0] - camera.pos[0]) / tree_minD;
		const brickDistY = (obj.pos[1] - camera.pos[1]) / tree_minD;
		const brickDistZ = (obj.pos[2] - camera.pos[2]) / tree_minD;
		var maxBrickDist = Math.max(Math.abs(brickDistX), Math.abs(brickDistY), Math.abs(brickDistZ));
		
		const level = clamp(Math.ceil(Math.log2(maxBrickDist / this.l)) + 1,
							0, sets.length - 1);
		if (!sets[level].generated) {
			return ray_maxDist;
		}
		// console.log(`passing off to level ${level}, d=${this.sets[level].d}`);
		return sets[level].estimate(obj);
	}
	
	generate() {
		//create all BrickGrids
		this.sets = [];
		var max = Math.min(this.numSetsIdeal, this.maxSetNum);
		for (var a=0; a<max; a++) {
			this.sets[a] = new BrickGridTor(this.world, this.l, tree_minD * (2 ** a));
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