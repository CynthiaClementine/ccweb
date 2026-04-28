
//objects that are required for the engine to run
class Ray_Tracking {
	/**
	* a Tracking Ray is a ray intended to calculate the distance to the nearest object in a given direction.
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
		this.objsList = [];
		this.object = null;
		this.calcObjs();
	}
	
	reset(world, pos, dPos) {
		this.world = world;
		this.pos = new Float32Array(pos);
		this.dPos = dPos;
		this.distance = 0;
		this.calcObjs();
		this.object = null;
	}
	
	calcObjs() {
		this.objsList = this.world.bvh.objects(this);
	}

	iterate() {
		var iters = 0;
		while (iters < ray_maxIters) {
			//get distance
			const distObj = sceneSDF(this.objsList, this.pos)[1];
			if (!distObj) {
				this.distance = this.distCap;
				return this.distCap;
			}
			var dist = distObj.distanceToPos(this.pos);
			if (distObj.nature & N_ANTI) {
				dist = -dist;
			}
			if (distObj.nature & N_FOG || distObj.nature == N_GRAVITY) {
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
		var sorted = mortonSort(this.world.expObjs);
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
	
	objectsInBox(minPos, maxPos) {
		return this.root.objectsInBox(minPos, maxPos);
	}
	
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
	
	objectsInBox(minPos, maxPos) {
		//figure out if the box overlaps self's box
		var intersects = (minPos[0] < this.maxPos[0] && maxPos[0] > this.minPos[0])
						&& (minPos[1] < this.maxPos[1] && maxPos[1] > this.minPos[1])
						&& (minPos[2] < this.maxPos[2] && maxPos[2] > this.minPos[2]);
		
		if (!intersects) {
			return [];
		}
		if (this.obj) {
			return this.obj;
		}
		
		return [].concat(this.left.objectsInBox(minPos, maxPos)).concat(this.right.objectsInBox(minPos, maxPos));
	}
}