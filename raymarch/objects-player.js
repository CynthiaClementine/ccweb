

class Camera {
	constructor(world, pos) {
		this.world = world;
		this.pos = pos;
		this.theta = 0;
		this.phi = 0;
	}
	
	calcMatrix() {
		var cxDir = polToCart(this.theta + (Math.PI / 2), 0, 1);
		var cyDir = polToCart(this.theta, this.phi + (Math.PI / 2), 1);
		var czDir = polToCart(this.theta, this.phi, 1);
	
		return [
			cxDir[0], cxDir[1], cxDir[2],
			cyDir[0], cyDir[1], cyDir[2],
			czDir[0], czDir[1], czDir[2]
		];
	}
	
	tick() {
		camera.theta = this.theta;
		camera.phi = this.phi;
		
		//update GPU with current data
		gl.uniform3fv(uCamPos, Array.from(this.pos));
		gl.uniformMatrix3fv(uCamRot, false, this.calcMatrix());
		gl.uniform1i(uCamWorld, this.world.id);
	}
}

class Player {
	constructor(world, pos) {
		this.world = world;
		this.pos = pos;
		this.dPos = Pos(0, 0, 0);
		this.aPos = Pos(0, 0, 0);
		this.dMax = 1.5;
		this.dMin = 0.05;

		this.speed = 0.07;
		this.jumpSpeed = 3;
		this.friction = 0.8;

		this.gravity = 0.1;
		this.fallMax = 10;
		this.onGround = false;

		this.height = 10;
		this.width = player_width;

		this.theta = 0;
		this.phi = 0;
	}

	tick() {
		this.updateMomentum();
		this.updatePosition();
		camera.world = this.world;
		camera.pos = this.pos;
		camera.theta = this.theta;
		camera.phi = this.phi;
	}

	updateMomentum() {
		this.updateMomentumAxis(0);

		//gravity
		this.dPos[1] -= this.gravity;
		this.dPos[1] = clamp(this.dPos[1], -this.fallMax, this.fallMax);
		
		this.updateMomentumAxis(2);
	}
	
	updateMomentumAxis(num) {
		this.dPos[num] += this.aPos[num];
		if (Math.abs(this.dPos[num]) > this.dMax) {
			this.dPos[num] = clamp(this.dPos[num], -this.dMax, this.dMax);
		}
		if (this.aPos[num] * this.dPos[num] <= 0) {
			this.dPos[num] *= this.friction;
		}
	}

	updatePosition() {
		/* movement follows a simple 3-part plan
		1. cast ray upwards from self's feet
		2. try to move ray in the movement directions, to whatever varying success
		3. move ray downwards
		
		This makes sure that the movement is always valid, because there has to be an unobstructed path 
		between the previous position and the new position.
		It also allows the player to step up slopes.
		 */

		//before any raycasts, housekeeping
		var speedMultiplier = 1 + controls_shiftPressed * (1 + editor_active * 7);
		var feetCoords = Pos(this.pos[0], this.pos[1] - this.height + 1, this.pos[2]);
		var headCoords = Pos(this.pos[0], this.pos[1], this.pos[2]);
		var axisVecs = [
			polToCart(this.theta + (Math.PI / 2), 0, 1),
			[0, 1, 0],
			polToCart(this.theta, 0, 1),
		];
		var dVec = Pos(this.dPos[0] * speedMultiplier, this.dPos[1], this.dPos[2] * speedMultiplier);
		
		
		//go up
		var lookRay = new Ray_Tracking(this.world, feetCoords, axisVecs[1], player_stepHeight);
		lookRay.iterate(0);
		feetCoords[1] += lookRay.distance;
		
		//sideways
		var trueI = 0;
		for (var i=0; i<3; i++) {
			var vHat = axisVecs[i];
			var len = dVec[i];
			
			var obj1 = this.tryMovementOnAxis(feetCoords, vHat, len);
			var obj2 = this.tryMovementOnAxis(headCoords, vHat, len);
			var trueObj = (obj1 ?? obj2);
			
			//there comes a point at which you just give up and make a special case for portals
			if (trueObj && trueObj.material.constructor.name == `M_Portal`) {
				this.portalTest(trueObj, headCoords);
				trueObj = null;
			}
			
			//simple unobstructed movement
			if (!trueObj) {
				feetCoords[0] += vHat[0] * len;
				feetCoords[1] += vHat[1] * len;
				feetCoords[2] += vHat[2] * len;
				
				headCoords[0] += vHat[0] * len;
				headCoords[1] += vHat[1] * len;
				headCoords[2] += vHat[2] * len;
				continue;
			}
			
			//landing on the ground
			if (i == 1) {
				if (Math.abs(dVec[i]) > player_bounceThreshold) {
					dVec[i] *= -trueObj.material.bounciness;
				} else {
					dVec[i] = 0;
					this.onGround = true;
				}
				continue;
			}
			
			//use SDF + normal to push self out
			var [dist, normal] = [trueObj.distanceToPos(feetCoords), trueObj.normalAt(feetCoords)];
			var [dist2, normal2] = [trueObj.distanceToPos(headCoords), trueObj.normalAt(headCoords)];
			// var obj = this.tryMovementOnAxis(feetCoords, axisVecs[i], -Math.sign(dVec[i]));
			if (dist > dist2) {
				dist = dist2;
				normal = normal2;
			}
			
			if (true || dist < 0) {
				var vDot = dot(vHat, normal);
				var vProj = [normal[0] * vDot, normal[1] * vDot, normal[2] * vDot];
				vHat[0] -= vProj[0];
				vHat[1] -= vProj[1];
				vHat[2] -= vProj[2];
				dVec[i] *= 0.7 + 0.3 * Math.cos(vDot);
				// dVec[i] = dVec[i] * Math.sqrt(dot(axisVecs[i], axisVecs[i]));
				axisVecs[i] = normalize(vHat);
				i -= 1;
				trueI += 1;
			}
			
			var squidgeLen = -Math.min(dist - this.width * ray_minDist, 0);
			
			if (trueI > 10) {
				console.error(`too many movement iterations!`);
				i = trueI;
				squidgeLen = 1;
			}
			
			feetCoords[0] += normal[0] * squidgeLen;
			feetCoords[1] += normal[1] * squidgeLen;
			feetCoords[2] += normal[2] * squidgeLen;
			
			headCoords[0] += normal[0] * squidgeLen;
			headCoords[1] += normal[1] * squidgeLen;
			headCoords[2] += normal[2] * squidgeLen;
		}
		
		//go back down. Hacky solution with the +1 but it works
		var lookRay = new Ray_Tracking(this.world, feetCoords, Pos(0, -1, 0), (player_stepHeight + 1));
		lookRay.iterate(0);
		if (lookRay.object) {
			this.portalTest(lookRay.object, feetCoords);
		}
		feetCoords[1] -= lookRay.distance;
		
		//update real coordinates
		this.dPos[0] = dVec[0] / speedMultiplier;
		this.dPos[1] = dVec[1];
		this.dPos[2] = dVec[2] / speedMultiplier;
		this.pos = Pos(feetCoords[0], feetCoords[1] + this.height, feetCoords[2]);
	}
	
	portalTest(obj, coords) {
		var mat = obj.material;
		if (obj.distanceToPos(coords) < ray_nearDist && mat.constructor.name == "M_Portal") {
			if (mat.newWorld) {
				this.world = mat.newWorld;
				coords[0] += mat.offset[0];
				coords[1] += mat.offset[1];
				coords[2] += mat.offset[2];
			}
		}
	}
	
	tryMovementOnAxis(pos, axisVec, distance) {
		if (distance < 0) {
			axisVec = [-axisVec[0], -axisVec[1], -axisVec[2]];
			distance = -distance;
		}
		if (true || distance > this.dMin) {
			//cast ray sideways
			var lookRay = new Ray_Tracking(this.world, pos, axisVec, this.width + distance + 1);
			lookRay.iterate(0);
			//if the ray's gone far enough, then move there
			if (lookRay.distance > this.width + distance) {
				return undefined;
			} else {
				return lookRay.object;
			}
		}
	}
	
	dash() {
		
	}

	jump() {
		if (true || this.onGround) {
			this.dPos[1] = this.jumpSpeed;
			this.onGround = false;
		}
	}
}

class Player_Debug extends Player {
	constructor(world, pos) {
		super(world, pos);
		this.dMax = 6;
		this.speed = 0.4;
	}
	
	updateMomentum() {
		this.updateMomentumAxis(0);
		this.updateMomentumAxis(1);
		this.updateMomentumAxis(2);
	}
}

class Player_Noclip extends Player {
	constructor(world, pos) {
		super(world, pos);
		this.dMax = 6;
		this.speed = 0.4;
	}
	
	updateMomentum() {
		this.updateMomentumAxis(0);
		this.updateMomentumAxis(1);
		this.updateMomentumAxis(2);
	}
	
	updatePosition() {
		var axisVecs = [
			polToCart(this.theta + (Math.PI / 2), 0, 1),
			[0, 1, 0],
			polToCart(this.theta, 0, 1),
		];
		const dPos = this.dPos;
		this.pos[0] += axisVecs[0][0] * dPos[0] + axisVecs[1][0] * dPos[1] + axisVecs[2][0] * dPos[2];
		this.pos[1] += axisVecs[0][1] * dPos[0] + axisVecs[1][1] * dPos[1] + axisVecs[2][1] * dPos[2];
		this.pos[2] += axisVecs[0][2] * dPos[0] + axisVecs[1][2] * dPos[1] + axisVecs[2][2] * dPos[2];
	}
}