
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
		const self = this;
		
		while (this.iters < ray_maxIters) {
			if (this.totalDist > ray_maxDist) {
				this.world.postEffects.forEach(e => {e[0](self, e[1], e[2], e[3]);});
				return this.color;
			}
	
			//get distance
			const distObj = this.world.tree.estimate(this);
			var dist = distObj.distanceToPos(this.pos) * ray_safetyMult;
			if (distObj.nature & N_ANTI) {
				dist = -dist;
			}
			
			this.localDist = dist;
			// var [dist, distObj] = this.world.grid.estimatePos(this.pos);
			// distObj = this.world.objects[distObj];
	
			//if distance is out of dist bounds
			if (dist < ray_nearDist) {
				if (dist < ray_minDist) {
					//if it's hit:
					this.hit += distObj.material.applyHitEffect(this, distObj);
					
					//a ray will go through normal (hit=0) -> shadow (hit=1) -> done (hit=2) span.
					if (this.hit >= 2) {
						//draw self as a shadow
						this.shadow();
						this.world.postEffects.forEach(e => {e[0](self, e[1], e[2], e[3]);});
						return this.color;
					}
					
					//can be false if it's a portal
					if (this.hit == 1) {
						//try to not get stuck
						// normal = distObj.normalAt(pos);
						// var moveDist = (2 * ray_minDist - safeDist);
						// pos[0]
						this.hitDist = this.totalDist;
						dPos[0] = this.world.sunVector[0];
						dPos[1] = this.world.sunVector[1];
						dPos[2] = this.world.sunVector[2];
					}
				} else {
					distObj.material.applyNearEffect(this, distObj);
				}
			}

			//move distance
			pos[0] += dPos[0] * this.localDist;
			pos[1] += dPos[1] * this.localDist;
			pos[2] += dPos[2] * this.localDist;
			this.totalDist += this.localDist;
			this.world.preEffects.forEach(e => {e[0](self, e[1], e[2], e[3]);});
			this.iters += 1;
		}
		this.world.postEffects.forEach(e => {e[0](self, e[1], e[2], e[3]);});
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
			var dist = distObj.distanceToPos(this.pos);
			if (distObj.nature & N_ANTI) {
				dist = -dist;
			// 	dist = Math.max(-dist, ray_minDist * 1.1);
			}
			if (distObj.nature & N_FOG) {
				dist = Math.max(dist, ray_nearDist * 0.9);
			}
			
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



//BVH - Bounding Volume Hierarchy.
//a collection of rectangular nodes that contain either one object or two sub-nodes.
//used as a data structure that can speed up finding the closest object, while also fitting into a nice array that can go on the GPU
class BVH {
	constructor(world) {
		this.world = world;
		this.root = null;
	}
	
	generate() {
		if (this.world.expObjs.length == 0) {
			this.root = new BVH_Node(Pos(0, 0, 0), Pos(0, 0, 0), -1, null, null);
			return;
		}
		var sorted = sortByMorton(this.world.expObjs);
		this.root = this.generateSubtree(sorted, 0, sorted.length - 1);
	}
	
	generateSubtree(list, startInd, endInd) {
		//leaf case
		if (startInd >= endInd) {
			const o = list[startInd];
			const bounds = o.bounds();
			return new BVH_Node(bounds[0], bounds[1], o, null, null);
		}
		
		//branch case
		const m = ((startInd + endInd) / 2) | 0;
		const left = this.generateSubtree(list, startInd, m);
		const right = this.generateSubtree(list, m + 1, endInd);
		return BVHUnion(left, right);
	}
	
	// estimatePos(pos) {
	// 	if (!this.root) {
	// 		return [99999, this.objects[0]];
	// 	}
		
	// 	//start at the top: get distance to node
	// 	//
	// }
	
	distance(obj) {
		return this.root.distance(obj.pos, obj.dPos);
	}
	
	objects(obj) {
		return this.root.objects(obj.pos, obj.dPos);
	}
}

class BVH_Node {
	constructor(minPos, maxPos, obj, left, right) {
		this.minPos = minPos;
		this.maxPos = maxPos;
		this.obj = obj;
		this.left = left;
		this.right = right;
	}
	
	distance(pos, dPos) {
		//if it's a leaf node
		if (this.obj != null) {
			return this.obj.distanceToPos(pos);
		}
		
		//no intersection, return huge distance
		if (!this.rayIntersects(pos, dPos)) {
			return 2 * ray_maxDist;
		}
		
		//yes intersection! Recurse to children
		var d1 = this.left.distance(pos, dPos);
		var d2 = this.right.distance(pos, dPos);
		console.log(`d1=${d1.toFixed(2)}, d2=${d2.toFixed(2)}`);
		return Math.min(d1, d2);
	}
	
	objects(pos, dPos) {
		if (this.obj != null) {
			return [this.obj];
		}
		
		if (!this.rayIntersects(pos, dPos)) {
			return [];
		}
		
		var d1 = this.left.objects(pos, dPos);
		var d2 = this.right.objects(pos, dPos);
		return d1.concat(d2);
	}
	
	rayIntersects(pos, dPos) {
		/*
		The Slab Method:
			p(t) = o + t•v
			if v = 0 ignore 
		
			tLow = (l - o) / v
			tHigh = (h - o) / v
			tClose = whichever's lesser (of tLow, tHigh)
			tFar = whichever's greater (of tLow, tHigh)
		
			tClose = max of tCloses
			tFar = min of tFars
		
			intersection exists only if tClose ≤ tFar
		 */
		var tClose = -1e1001;
		var tFar = 1e1001;
		
		var tLow, tHigh;
		for (var c=0; c<3; c++) {
			//I'm just not going to do error checking on the potential divides by 0. I hope the world will forgive me
			tLow = (this.minPos[c] - pos[c]) / dPos[c];
			tHigh = (this.maxPos[c] - pos[c]) / dPos[c];
			if (tLow > tHigh) {
				[tLow, tHigh] = [tHigh, tLow];
			}
			
			tClose = Math.max(tClose, tLow);
			tFar = Math.min(tFar, tHigh);
		}
		
		return (tClose <= tFar);
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
		this.objs = world.expObjs;
		this.chunks = [];
		this.xd = 0;
		this.yd = 0;
		this.zd = 0;
		this.minPos;
		this.maxPos;
	}
	
	binObject(obj) {
		var index = this.objs.indexOf(obj);
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
		this.objs = this.world.expObjs;
		//generate bounds
		var min = [1e1001, 1e1001, 1e1001];
		var max = [-1e101, -1e101, -1e101];
		this.objs.forEach(o => {
			if (!o) {
				throw new Error(`Block Bounds Error: undefined object!`);
			}
			var bounds = o.bounds();
			for (var a=0; a<=2; a++) {
				min[a] = Math.min(min[a], bounds[0][a]);
				max[a] = Math.max(max[a], bounds[1][a]);
				if (Number.isNaN(bounds[0][a])) {
					console.error(bounds);
					throw new Error(`Block Bounds Error: bounds aren't calculated correctly!`);
				}
				if (Number.isNaN(min[a])) {
					throw new Error(`Block Bounds Error: what`);
				}
			}
		});
		this.minPos = min;
		this.maxPos = max;
		const len = this.l;
		this.xd = (max[0] - min[0]) / len;
		this.yd = (max[1] - min[1]) / len;
		this.zd = (max[2] - min[2]) / len;
		
		if (Number.isNaN(this.xd)) {
			throw new Error("something has gone horribly wrong with block bounds..");
		}
		
		// console.log(min, max, this.l);
		
		//generate object estimate grid
		this.chunks = [];
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
		if (this.objs.length == 0) {
			return;
		}
		const xd = this.xd;
		const yd = this.yd;
		const zd = this.zd;
		const minPos = this.minPos;
		const chunks = this.chunks;
		for (var x=0; x<len; x++) {
			const worldX = minPos[0] + x * xd;
			for (var y=0; y<len; y++) {
				const worldY = minPos[1] + y * yd;
				for (var z=0; z<len; z++) {
					//add the object that's closest
					const worldZ = minPos[2] + z * zd;
					const ind = this.world.estimatePos(Pos(worldX, worldY, worldZ))[1];
					//add to all adjacents as well
					[[1, 1, 1],[1, 1, -1],[1, -1, 1],[1, -1, -1],
					[-1, 1, 1],[-1, 1, -1],[-1, -1, 1],[-1, -1, -1]].forEach(g => {
						var mx = x + g[0];
						var my = y + g[1];
						var mz = z + g[2];
						//stupid check
						if (chunks[mx] && chunks[mx][my] && chunks[mx][my][mz]) {
							chunks[mx][my][mz].add(ind);
						}
					});
				}
			}
		}
		
		//add all objects to the estimate grid
		this.objs.forEach(o => {
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
			var testDist = applyDist(dist, this.objs[i].distanceToPos(pos), this.objs[i].nature);
			if (testDist != dist) {
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
		return this.objs[this.estimatePos(obj.pos)[1]];
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
		console.log(`creating brickgrid!`);
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