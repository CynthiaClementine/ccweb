// REALLY GOOD SDF RESOURCE:
// https://gist.github.com/munrocket/f247155fc22ecb8edf974d905c677de1

/*
we have:

Objects:
	Cube
	Box
	Cylinder
	Line
	Pipe
	Portal
	Ring
	Sphere
	Oval

Meta-Objects:
	Scene3dLoop
 */


//main object contract
class Scene3dObject {
	constructor(pos, color) {
		this.pos = pos;
		this.color = color;
	}
	
	//gives the axis-aligned bounding box of the object, in [smallest pos, largest pos] terms
	bounds() {
		console.error(`bounds is not defined for ${this.constructor.name}!`);
		return giveBounds(this.pos, 1, 1, 1);
	}

	tick() {

	}
	
	distanceToPos(pos) {
		console.error(`SDF is not defined for ${this.constructor.name}!`);
		return -1;
	}

	/**
	* gets the distance to a given object. Can also generate side effects.
	* @param {Object} object the object to check against
	*/
	distanceToObj(object) {
		return this.distanceToPos(object.pos);
	}
	
	/**
	* what to do to rays that hit the object. By default just sets the color of the ray to self
	* @param {Object} object the object to check against
	 */
	applyHitEffect(object) {
		object.color[0] = this.color[0];
		object.color[1] = this.color[1];
		object.color[2] = this.color[2];
	}
	

	serialize() {
		console.error(`serialization is not defined for ${this.constructor.name}!`);
		return `!!!UNDEFINED!!!`;
	}
}

class Scene3dObject_Axes extends Scene3dObject {
	constructor(pos, rx, ry, rz, color) {
		super(pos, color);
		this.rx = rx;
		this.ry = ry;
		this.rz = rz;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz);
	}
}

class Scene3dLoop {
	/**
	* An object that contains other objects inside a looping space. 
	* Allows for large repeating spaces without needing the entire world to repeat.
	* @param {Number} xRange min/max X to be in the loop
	* @param {Number} yRange min/max Y to be in the loop
	* @param {Number} zRange min/max Z to be in the loop
	* @param {Scene3dObject} object the object to construct the loop out of
	 */
	constructor(xRange, yRange, zRange, loopSize, object) {
		this.xRange = xRange;
		this.yRange = yRange;
		this.zRange = zRange;
		this.d = loopSize;
		object.pos[0] = loopSize / 2;
		object.pos[1] = loopSize / 2;
		object.pos[2] = loopSize / 2;
		this.obj = object;
		this.pos = object.pos;
		this.color = object.color;
	}
	
	applyHitEffect(object) {
		this.obj.applyHitEffect(object);
	}
	
	bounds() {
		return giveBounds([0, 0, 0], this.xRange, this.yRange, this.zRange);
	}
	
	distanceToPos(pos) {
		var insideX = clamp(pos[0], -this.xRange, this.xRange);
		var insideY = clamp(pos[1], -this.yRange, this.yRange);
		var insideZ = clamp(pos[2], -this.zRange, this.zRange);
		return this.obj.distanceToPos(Pos(
			modulate(insideX, this.d) + (pos[0] - insideX),
			modulate(insideY, this.d) + (pos[1] - insideY),
			modulate(insideZ, this.d) + (pos[2] - insideZ),
		));
	}
	
	distanceToObj(object) {
		return this.distanceToPos(object.pos);
	}
	
	tick() {
		this.obj.tick();
	}
	
	serialize() {
		return this.obj.map(a => a.serialize()).join("\n");
	}
}



//cube, standard object
class Cube extends Scene3dObject {
	constructor(pos, r, RGBColor) {
		super(pos, RGBColor);
		this.r = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r);
	}
	
	distanceToPos(pos) {
		var x = Math.max(0, Math.abs(pos[0] - this.pos[0]) - this.r);
		var y = Math.max(0, Math.abs(pos[1] - this.pos[1]) - this.r);
		var z = Math.max(0, Math.abs(pos[2] - this.pos[2]) - this.r);
		return Math.sqrt(x * x + y * y + z * z);
	}
	
	

	serialize() {
		return `CUBE|[${this.pos}]~${this.r}~[${this.color}]`;
	}
}

class Box extends Scene3dObject_Axes {
	constructor(pos, rx, ry, rz, RGBColor) {
		super(pos, rx, ry, rz, RGBColor);
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz);
	}

	distanceToPos(pos) {
		var x = Math.max(0, Math.abs(pos[0] - this.pos[0]) - this.rx);
		var y = Math.max(0, Math.abs(pos[1] - this.pos[1]) - this.ry);
		var z = Math.max(0, Math.abs(pos[2] - this.pos[2]) - this.rz);
		return Math.sqrt(x * x + y * y + z * z);
	}

	serialize() {
		return `BOX|[${this.pos}]~${this.rx}~${this.ry}~${this.rz}~[${this.color}]`;
	}
}

class BoxFrame extends Scene3dObject_Axes {
	constructor(pos, rx, ry, rz, thickness, color) {
		super(pos, rx, ry, rz, color);
		this.e = thickness;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + this.e, this.ry + this.e, this.rz + this.e);
	}
	
	distanceToPos(pos) {
		var relX = Math.abs(pos[0] - this.pos[0]) - this.rx;
		var relY = Math.abs(pos[1] - this.pos[1]) - this.ry;
		var relZ = Math.abs(pos[2] - this.pos[2]) - this.rz;
		
		var welX = Math.abs(relX + this.e) - this.e;
		var welY = Math.abs(relY + this.e) - this.e;
		var welZ = Math.abs(relZ + this.e) - this.e;
		
		var distX = Math.hypot(Math.max(relX, 0), Math.max(welY, 0), Math.max(welZ, 0)) + Math.min(Math.max(relX, Math.max(welY, welZ)), 0);
		var distY = Math.hypot(Math.max(welX, 0), Math.max(relY, 0), Math.max(welZ, 0)) + Math.min(Math.max(welX, Math.max(relY, welZ)), 0);
		var distZ = Math.hypot(Math.max(welX, 0), Math.max(welY, 0), Math.max(relZ, 0)) + Math.min(Math.max(welX, Math.max(welY, relZ)), 0);
		return Math.min(distX, distY, distZ);
		
		// fn sdBoxFrame(p: vec3f, b: vec3f, e: f32) -> f32 {
		//   let relX = abs(p.x) - b.x;
		//   let relY = abs(p.y) - b.y;
		//   let relZ = abs(p.z) - b.z;
		
		//   // let q = abs(p) - b;
		//   let welX = abs(relX + e) - e;
		//   let welY = abs(relY + e) - e;
		//   let welZ = abs(relZ + e) - e;
		
		//   let dx = length(max(vec3f(relX, welY, welZ), vec3f(0.))) + min(max(relX, max(welY, welZ)), 0.);
		//   let dy = length(max(vec3f(welX, relY, welZ), vec3f(0.))) + min(max(welX, max(relY, welZ)), 0.);
		//   let dz = length(max(vec3f(welX, welY, relZ), vec3f(0.))) + min(max(welX, max(welY, relZ)), 0.);
		//   return min(min(dx, dy), dz);
		// }
	}
}

class Cylinder extends Scene3dObject {
	constructor(pos, r, h, RGBColor) {
		super(pos, RGBColor);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.h, this.r);
	}

	distanceToPos(pos) {
		var relX = Math.abs(pos[0] - this.pos[0]);
		var relY = Math.abs(pos[1] - this.pos[1]);
		var relZ = Math.abs(pos[2] - this.pos[2]);
		relY -= clamp(relY, 0, this.h);
		return Math.sqrt(relX * relX + relY * relY + relZ * relZ) - this.r;
	}
	
	serialize() {
		return `CYLINDER|[${this.pos}]~${this.r}~${this.h}~[${this.color}]`;
	}
}

class DebugLines extends Scene3dObject {
	constructor(minPos, maxPos) {
		super(Pos(0, 0, 0), Color(255, 0, 255));
		this.minPos = minPos;
		this.maxPos = maxPos;
		this.frame = new BoxFrame(Pos(0, 0, 0), 10, 10, 10, 2);
	}
	
	bounds() {
		return [this.minPos, this.maxPos];
	}
	
	tick() {
		var cameraBlock = loading_world.grid.calcGridCoords(camera.pos);
		cameraBlock[0] = Math.floor(cameraBlock[0]) + 0.5;
		cameraBlock[1] = Math.floor(cameraBlock[1]) + 0.5;
		cameraBlock[2] = Math.floor(cameraBlock[2]) + 0.5;
		
		
		this.frame.color = this.color;
		this.frame.pos = Pos(
			loading_world.grid.minPos[0] + cameraBlock[0] * loading_world.grid.xd,
			loading_world.grid.minPos[1] + cameraBlock[1] * loading_world.grid.yd,
			loading_world.grid.minPos[2] + cameraBlock[2] * loading_world.grid.zd,
		);
		this.frame.rx = loading_world.grid.xd / 2;
		this.frame.ry = loading_world.grid.yd / 2;
		this.frame.rz = loading_world.grid.zd / 2;
	}
	
	distanceToPos(pos) {
		return this.frame.distanceToPos(pos);
	}
}

class Line extends Scene3dObject {
	constructor(pos1, pos2, radius, RGBColor) {
		super(pos1, RGBColor);
		this.posEnd = pos2;
		var lv = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]];
		this.lineVec = lv;
		this.lineDot = dot(lv, lv);
		this.r = radius;
	}
	
	bounds() {
		return [Pos(
			Math.min(this.pos[0], this.posEnd[0]),
			Math.min(this.pos[1], this.posEnd[1]),
			Math.min(this.pos[2], this.posEnd[2]),
		), Pos (
			Math.max(this.pos[0], this.posEnd[0]),
			Math.max(this.pos[1], this.posEnd[1]),
			Math.max(this.pos[2], this.posEnd[2]),
		)];
	}
	
	distanceToPos(pos) {
		//lambda = clamp((P-A)•(B-A)/(B-A)•(B-A), 0, 1)
		//then closest = linterp(A, B, lambda)
		//dist = dist to closest
		
		var apVec = [pos[0] - this.pos[0], pos[1] - this.pos[1], pos[2] - this.pos[2]];
		var l = clamp(dot(apVec, this.lineVec) / this.lineDot, 0, 1);
			
		return (getDistance(pos[0], pos[1], pos[2], 
				linterp(this.pos[0], this.posEnd[0], l), linterp(this.pos[1], this.posEnd[1], l), linterp(this.pos[2], this.posEnd[2], l)) - this.r);
	}
	
	serialize() {
		return `LINE|[${this.pos}]~[${this.posEnd}]~${this.r}~[${this.color}]`;
	}
}

class Pipe extends Scene3dObject {

}

class Portal extends Cylinder {
	constructor(pos, newWorldSTRING) {
		super(pos, 50, 50, [255, 255, 255]);
		this.rayTolerance = 2;
		var self = this;
		setTimeout(() => {
			if (worlds[newWorldSTRING]) {
				self.newWorld = worlds[newWorldSTRING];
			}
		}, 5);
	}

	tick() {
		if (this.distanceToObj(camera) / 0.95 < ray_minDist) {
			camera.dx *= -1;
			camera.dz *= -1;
		}
	}

	distanceToObj(object) {
		var trueDist = super.distanceToPos(object.pos);
		//if the distance is small enough, transport ray to the other world
		if (trueDist < this.rayTolerance) {
			if (this.newWorld) {
				object.world = this.newWorld;
			}
			//if it's a ray
			if (object.color != undefined) {
				//if it hasn't been hit, make it the color of the new world background
				if (!object.hit) {
					object.color = object.world.getBgColor();
				}
			}
		}
		return trueDist + 3;
	}
	
	serialize() {
		return `PORTAL|[${this.pos}]~"${this.newWorld.name}"`;
	}
}

class Ring extends Scene3dObject {
	constructor(pos, r, ringR, RGBColor) {
		super(pos, RGBColor);
		this.r = r;
		this.ringR = ringR;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r + this.ringR, this.ringR, this.r + this.ringR);
	}

	distanceToPos(pos) {
		var distX = Math.abs(pos[0] - this.pos[0]);
		var distY = Math.abs(pos[1] - this.pos[1]);
		var distZ = Math.abs(pos[2] - this.pos[2]);
		var q = [Math.sqrt(distX * distX + distZ * distZ) - this.r];
		return Math.sqrt(q[0] * q[0] + distY * distY) - this.ringR;
	}
	
	serialize() {
		return `RING|[${this.pos}]~${this.r}~${this.ringR}~[${this.color}]`;
	}
}

class Sphere extends Scene3dObject {
	constructor(pos, r, RGBColor) {
		super(pos, RGBColor)
		this.r = r;

		this.color = RGBColor;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r);
	}

	distanceToPos(pos) {
		//get relative distance
		var relX, relY, relZ;
		relX = Math.abs(pos[0] - this.pos[0]);
		relY = Math.abs(pos[1] - this.pos[1]);
		relZ = Math.abs(pos[2] - this.pos[2]);

		return Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - this.r;
	}

	serialize() {
		return `SPHERE|[${this.pos}]~${this.r}~[${this.color}]`;
	}
}

//TODO: SDF is wrong, not a proper euclidian distance
class Oval extends Scene3dObject_Axes {
	constructor(pos, xr, yr, zr, RGBColor) {
		super(pos, xr, yr, zr, RGBColor);
		this.color = RGBColor;
	}
	
	distanceToPos(pos) {
		var relX, relY, relZ;
		relX = Math.abs(pos[0] - this.pos[0]) / this.rx;
		relY = Math.abs(pos[1] - this.pos[1]) / this.ry;
		relZ = Math.abs(pos[2] - this.pos[2]) / this.rz;
		return Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - 1;
	}
}

class Gyroid extends Scene3dObject_Axes {
	constructor(pos, xRadius, yRadius, zRadius, a, b, h, RGBColor) {
		super(pos, xRadius, yRadius, zRadius, RGBColor);
		this.a = a;
		this.b = b;
		this.h = h;
	}
	
	distanceToPos(pos) {
		var relX = pos[0] - this.pos[0];
		var relY = pos[1] - this.pos[1];
		var relZ = pos[2] - this.pos[2];
		var a = globalA;
		var dot = 
			(Math.sin(a * relX) * Math.cos(a * relZ)) + 
			(Math.sin(a * relY) * Math.cos(a * relX)) + 
			(Math.sin(a * relZ) * Math.cos(a * relY));
		// fn sdGyroid(p: vec3f, h: f32) -> f32 {
		//   return abs(dot(sin(p), cos(p.zxy))) - h;
		// }
		// //d = max(sdBox(p, vec3f(.8)), .5 * sdGyroid((p+vec3f(2.)) * 6.5, .2) / 6.5);
		
		var x = Math.max(0, Math.abs(relX) - this.rx);
		var y = Math.max(0, Math.abs(relY) - this.ry);
		var z = Math.max(0, Math.abs(relZ) - this.rz);
		
		var gyroidSDF = Math.abs(globalB * dot) - this.h;
		var boxSDF = Math.sqrt(x * x + y * y + z * z);
		
		
		return Math.max(boxSDF, gyroidSDF);
	}
}


class Octahedron extends Scene3dObject {
	constructor(pos, xRadius, yRadius, zRadius, RGBColor) {
		super(pos, RGBColor);
		this.rx = xRadius;
		this.ry = yRadius;
		this.rz = zRadius;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz);
	}
	
	//TODO: probably broken in some way
	distanceToPos(pos) {
		var relX = pos[0] - this.pos[0];
		var relY = pos[1] - this.pos[1];
		var relZ = pos[2] - this.pos[2];
		[relX, relZ] = rotate(relX, relZ, Math.PI / 4);
		relX = Math.abs(relX);
		relY = Math.abs(relY);
		relZ = Math.abs(relZ);
		
		return ((relX - this.rx) + (relY - this.ry) + (relZ - this.rz)) * 0.57735;
	}
	
	serialize() {
		return `OCTOHEDRON|[${this.pos}]~${this.rx}~${this.ry}~${this.rz}~[${this.color}]`;
	}
}