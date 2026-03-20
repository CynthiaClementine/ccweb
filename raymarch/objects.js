// REALLY GOOD SDF RESOURCE:
// https://gist.github.com/munrocket/f247155fc22ecb8edf974d905c677de1

/*
we have:

Objects:
	CloudSeed (?)
	Box
	Cylinder
	Ellipsoid
	Line
	Pipe
	Portal
	Ring
	Sphere
	Octahedron

Meta-Objects:
	Scene3dLoop
	
templates/abstract:
	Scene3dObject
	Scene3dObject_Axes
	Prism
 */


//main object contract
class Scene3dObject {
	constructor(type, pos, material, nature) {
		this.pos = pos;
		this.material = material;
		this.type = type;
		this.nature = nature ?? N_NORMAL;
		this.gloopiness = ray_nearDist;
	}
	
	//gives the axis-aligned bounding box of the object, in [smallest pos, largest pos] terms
	bounds() {
		console.error(`bounds are not defined for ${this.constructor.name}!`);
		return giveBounds(this.pos, 1, 1, 1);
	}

	tick() {
		if (this.material.tick) {
			this.material.tick(this);
		}
	}
	
	distanceToPos(pos) {
		console.error(`SDF is not defined for ${this.constructor.name}!`);
		return -1;
	}
	
	//how this object should interact with other objects
	sceneSDF(pos, currentSDF) {
		const d = this.distanceToPos(pos);
		return [Math.min(currentSDF, d), d < currentSDF];
	}
	
	normalAt(pos) {
		const ε = 0.01;
		const base = this.distanceToPos(pos);
		const grad = [
			this.distanceToPos(Pos(pos[0] + ε, pos[1], pos[2])) - base,
			this.distanceToPos(Pos(pos[0], pos[1] + ε, pos[2])) - base,
			this.distanceToPos(Pos(pos[0], pos[1], pos[2] + ε)) - base,
		];
		return normalize(grad);
	}

	serialize() {
		return `|${this.material.serialize()}|[${this.pos}]~${this.nature}`;
	}
	
	serializeGPU() {
		return [];
	}
}

class Scene3dObject_Axes extends Scene3dObject {
	constructor(type, pos, material, nature, rx, ry, rz) {
		super(type, pos, material, nature);
		this.rx = rx;
		this.ry = ry;
		this.rz = rz;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz);
	}
	
	serialize() {
		return `${super.serialize()}~${this.rx}~${this.ry}~${this.rz}`;
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz];
	}
}

class Prism extends Scene3dObject_Axes {
	constructor(type, pos, material, nature, rx, ry, h, axisType) {
		super(type, pos, material, nature, rx, ry, h);
		this.swapXY = axisType & 0b001;
		this.swapYZ = axisType & 0b010;
		this.swapXZ = axisType & 0b100;
	}
	
	sdf2D(relX, relY) {
		console.error(`2d SDF is not defined for object ${this.constructor.name}!`);
		return -1;
	}
	
	distanceToPos(pos) {
		var relX = pos[0] - this.pos[0];
		var relY = pos[1] - this.pos[1];
		var relZ = pos[2] - this.pos[2];
		
		if (this.swapXY) {
			[relX, relY] = [relY, relX];
		}
		if (this.swapYZ) {
			[relY, relZ] = [relZ, relY];
		}
		if (this.swapXZ) {
			[relX, relZ] = [relZ, relX];
		}
		
		const faceDist = this.sdf2D(relX, relY);
		const vertDist = Math.abs(relZ) - this.rz;
		const negPart = Math.min(Math.max(faceDist, vertDist), 0);
		const posPart = Math.hypot(Math.max(faceDist, 0), Math.max(vertDist, 0));
		return (negPart + posPart);
	}
	
	calcAxisType(swapXY, swapYZ, swapXZ) {
		return swapXY + 2 * swapYZ + 4 * swapXZ;
	}
	
	serialize() {
		return `${super.serialize()}~${this.calcAxisType(this.swapXY, this.swapYZ, this.swapXZ)}`;
	}
	
	serializeGPU() {
		return [this.calcAxisType(this.swapXY, this.swapYZ, this.swapXZ)];
	}
}

class Scene3dLoop {
	/**
	* An object that contains other objects inside a looping space. 
	* Allows for large repeating spaces without needing the entire world to repeat.
	* @param {Number} xRange min/max X to be in the loop
	* @param {Number} yRange min/max Y to be in the loop
	* @param {Number} zRange min/max Z to be in the loop
	* @param {Number} loopSize the 
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
		
		this.type = object.type + 100;
		this.pos = object.pos;
		this.material = object.material;
		this.nature = object.nature;
	}
	
	sceneSDF(pos, currentSDF) {
		const d = this.distanceToPos(pos);
		return [Math.min(currentSDF, d), d < currentSDF];
	}
	
	normalAt(pos) {
		return this.obj.normalAt(pos);
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
	
	tick() {
		this.obj.tick();
	}
	
	serialize() {
		//TODO: doesn't work
		return this.obj.serialize();
	}
	
	serializeGPU() {
		var serial = this.obj.serializeGPU();
		serial[8] = this.d;
		return serial;
	}
}

class CloudSeed extends Scene3dObject {
	constructor(pos, r, nature) {
		super(TYPE_CLOUD, pos, materialCloud, nature);
		this.minR = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.minR, this.minR, this.minR);
	}
	
	distanceToPos(pos) {
		const x = Math.abs(pos[0] - this.pos[0]);
		const y = Math.abs(pos[1] - this.pos[1]);
		const z = Math.abs(pos[2] - this.pos[2]);
		const d = Math.sqrt(x * x + y * y + z * z);
		return Math.max(d - this.minR, ray_nearDist * 0.9);
	}
}



//cube, standard object
class Cube extends Scene3dObject {
	constructor(pos, material, nature, r) {
		super(TYPE_BOX, pos, material, nature);
		this.r = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r);
	}
	
	distanceToPos(pos) {
		const r = this.r;
		const zeroPos = this.pos;
		const x = Math.abs(pos[0] - zeroPos[0]) - r;
		const y = Math.abs(pos[1] - zeroPos[1]) - r;
		const z = Math.abs(pos[2] - zeroPos[2]) - r;
		const dExt = Math.hypot(Math.max(x, 0), Math.max(y, 0), Math.max(z, 0));
		const dInt = Math.min(Math.max(x, y, z), 0);
		
		return dExt + dInt;
	}

	serialize() {
		return `CUBE${super.serialize()}~${this.r}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.r, this.r];
	}
}

class Box extends Scene3dObject_Axes {
	constructor(pos, material, nature, rx, ry, rz) {
		super(TYPE_BOX, pos, material, nature, rx, ry, rz);
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz);
	}

	distanceToPos(pos) {
		const x = Math.abs(pos[0] - this.pos[0]) - this.rx;
		const y = Math.abs(pos[1] - this.pos[1]) - this.ry;
		const z = Math.abs(pos[2] - this.pos[2]) - this.rz;
		
		const dExt = Math.hypot(Math.max(x, 0), Math.max(y, 0), Math.max(z, 0));
		const dInt = Math.min(Math.max(x, y, z), 0);
		
		return dExt + dInt;
	}

	serialize() {
		return `BOX${super.serialize()}`;
	}
}

class Box_Moving extends Box {
	constructor(pos, material, nature, rx, ry, rz, pos2) {
		super(pos, material, nature, rx, ry, rz);
		this.posBase = Pos(...this.pos);
		this.posEnd = pos2;
		this.nature = N_GLOOP;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + 12, this.ry + 12, this.rz + 12);
	}
	
	//warning: does not mesh well with portal surfaces. fix before finishing
	tick() {
		this.pos = [
			this.posBase[0],
			this.posBase[1] + 50 * Math.sin(world_time / 100),
			this.posBase[2]
		];
		
		if (gl && loading_world.objects.includes(this)) {
			loading_world.bvh.generate();
			createGPUWorld(loading_world);
			// GPU_transferObj(loading_world, this);
		}
	}
}

class BoxFrame extends Scene3dObject_Axes {
	constructor(pos, material, nature, rx, ry, rz, thickness) {
		super(TYPE_BOXFRAME, pos, material, nature, rx, ry, rz);
		this.e = thickness;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + this.e, this.ry + this.e, this.rz + this.e);
	}
	
	distanceToPos(pos) {
		const relX = Math.abs(pos[0] - this.pos[0]) - this.rx;
		const relY = Math.abs(pos[1] - this.pos[1]) - this.ry;
		const relZ = Math.abs(pos[2] - this.pos[2]) - this.rz;
		
		const e = this.e;
		const welX = Math.abs(relX + e) - e;
		const welY = Math.abs(relY + e) - e;
		const welZ = Math.abs(relZ + e) - e;
		
		var distX = Math.hypot(Math.max(relX, 0), Math.max(welY, 0), Math.max(welZ, 0)) + Math.min(Math.max(relX, Math.max(welY, welZ)), 0);
		var distY = Math.hypot(Math.max(welX, 0), Math.max(relY, 0), Math.max(welZ, 0)) + Math.min(Math.max(welX, Math.max(relY, welZ)), 0);
		var distZ = Math.hypot(Math.max(welX, 0), Math.max(welY, 0), Math.max(relZ, 0)) + Math.min(Math.max(welX, Math.max(welY, relZ)), 0);
		return Math.min(distX, distY, distZ);
	}
	
	serialize() {
		return `BOX-FRAME${super.serialize()}~${this.e}`;
	}
	
	serializeGPU() {
		return super.serializeGPU().concat(this.e);
	}
}

class Capsule extends Scene3dObject {
	constructor(pos, material, nature, r, h) {
		super(TYPE_CAPSULE, pos, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.h + this.r, this.r);
	}

	distanceToPos(pos) {
		const relX = Math.abs(pos[0] - this.pos[0]);
		var   relY = Math.abs(pos[1] - this.pos[1]);
		const relZ = Math.abs(pos[2] - this.pos[2]);
		relY -= clamp(relY, 0, this.h);
		return Math.sqrt(relX * relX + relY * relY + relZ * relZ) - this.r;
	}
	
	serialize() {
		return `CAPSULE${super.serialize()}~${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [this.r, this.h];
	}
}

class Cylinder extends Scene3dObject {
	constructor(pos, material, nature, r, h) {
		super(TYPE_CYLINDER, pos, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.h, this.r);
	}
	
	distanceToPos(pos) {
		const relX = pos[0] - this.pos[0];
		const relY = pos[1] - this.pos[1];
		const relZ = pos[2] - this.pos[2];
		
		const hDist = Math.abs(relY) - this.h;
		const xyDist = Math.hypot(relX, relZ) - this.r;
		return Math.min(Math.max(hDist, xyDist), 0) + Math.hypot(Math.max(xyDist, 0), Math.max(hDist, 0));
	}
	
	serialize() {
		return `CYLINDER${super.serialize()}~${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [this.r, this.h];
	}
}

class DebugLines extends Scene3dObject {
	constructor(minPos, maxPos) {
		super(TYPE_BOXFRAME, Pos(0, 0, 0), new M_Color(255, 0, 255), N_NORMAL);
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
		
		
		this.frame.material = this.material;
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
	
	serializeGPU() {
		return [null, this.frame.rx, this.frame.ry, this.frame.rz, 2];
	}
}

//TODO: SDF is wrong, not a proper euclidian distance
class Ellipsoid extends Scene3dObject_Axes {
	constructor(pos, material, nature, rx, ry, rz) {
		super(TYPE_ELLIPSE, pos, material, nature, rx, ry, rz);
	}
	
	distanceToPos(pos) {
	// 	fn sdEllipsoid(p: vec3f, r: vec3f) -> f32 {
	//   let k0 = length(p / r);
	//   let k1 = length(p / (r * r));
	//   return k0 * (k0 - 1.) / k1;
	// }
		const relX = Math.abs(pos[0] - this.pos[0]) / this.rx;
		const relY = Math.abs(pos[1] - this.pos[1]) / this.ry;
		const relZ = Math.abs(pos[2] - this.pos[2]) / this.rz;
		const rrx = relX / this.rx;
		const rry = relY / this.ry;
		const rrz = relZ / this.rz;
		
		var d = Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ));
		var d2 = Math.sqrt((rrx * rrx) + (rry * rry) + (rrz * rrz));
		
		// return d - 1;
		return d * (d - 1) / d2;
	}
	
	serialize() {
		return `ELLIPSE${super.serialize()}`;
	}
}

class Gyroid extends Scene3dObject_Axes {
	constructor(pos, material, nature, rx, ry, rz, a, b, h) {
		super(TYPE_GYROID, pos, material, nature, rx, ry, rz);
		this.a = a ?? 0.08;
		this.b = b ?? 13;
		this.h = h;
	}
	
	distanceToPos(pos) {
		const relX = pos[0] - this.pos[0];
		const relY = pos[1] - this.pos[1];
		const relZ = pos[2] - this.pos[2];
		const a = this.a;
		const dot = 
			(Math.sin(a * relX) * Math.cos(a * relZ)) + 
			(Math.sin(a * relY) * Math.cos(a * relX)) + 
			(Math.sin(a * relZ) * Math.cos(a * relY));
		
		const x = Math.max(0, Math.abs(relX) - this.rx);
		const y = Math.max(0, Math.abs(relY) - this.ry);
		const z = Math.max(0, Math.abs(relZ) - this.rz);
		
		const gyroidSDF = Math.abs(this.b * dot) - this.h;
		const boxSDF = Math.sqrt(x * x + y * y + z * z);
		
		
		return Math.max(boxSDF, gyroidSDF);
	}
	
	serialize() {
		return `GYROID${super.serialize()}~${this.a}~${this.b}~${this.h}`;
	}
	
	serializeGPU() {
	//[a, rx, ry, rz, b, h, 0, 0, 0]
		var params = super.serializeGPU();
		params[0] = this.a;
		return params.concat(this.b, this.h);
	}
}

//line extends an axes object for the sake of constructor / editor simplicity. 
//The offset point is not really a "radius" by any metric but eh. whatever.
class Line extends Scene3dObject_Axes {
	constructor(pos1, material, nature, rx, ry, rz, thickness) {
		//the constructor is flexible because I couldn't be bothered to rewrite everything
		if (rx.constructor.name != "Number") {
			thickness = ry;
			[rx, ry, rz] = [rx[0] - pos1[0], rx[1] - pos1[1], rx[2] - pos1[2]];
		}
		super(TYPE_LINE, pos1, material, nature, rx, ry, rz);
		this.r = thickness;
		this.calc();
	}
	
	calc() {
		this.posEnd = Pos(this.pos[0] + this.rx, this.pos[1] + this.ry, this.pos[2] + this.rz);
		this.lineVec = Pos(this.rx, this.ry, this.rz);
		this.lineDot = dot(this.lineVec, this.lineVec);
	}
	
	bounds() {
		const r = this.r;
		return [Pos(
			Math.min(this.pos[0] - r, this.posEnd[0] - r),
			Math.min(this.pos[1] - r, this.posEnd[1] - r),
			Math.min(this.pos[2] - r, this.posEnd[2] - r),
		), Pos (
			Math.max(this.pos[0] + r, this.posEnd[0] + r),
			Math.max(this.pos[1] + r, this.posEnd[1] + r),
			Math.max(this.pos[2] + r, this.posEnd[2] + r),
		)];
	}
	
	distanceToPos(pos) {
		//lambda = clamp((P-A)•(B-A)/(B-A)•(B-A), 0, 1)
		//then closest = linterp(A, B, lambda)
		//dist = dist to closest
		const base = this.pos;
		const apVec = [pos[0] - base[0], pos[1] - base[1], pos[2] - base[2]];
		const l = clamp(dot(apVec, this.lineVec) / this.lineDot, 0, 1);
			
		return (getDistance(pos[0], pos[1], pos[2], 
				linterp(base[0], this.posEnd[0], l), linterp(base[1], this.posEnd[1], l), linterp(base[2], this.posEnd[2], l)) - this.r);
	}
	
	serialize() {
		return `LINE${super.serialize()}~${this.r}`;
	}
	
	serializeGPU() {
		return super.serializeGPU().concat(this.r);
	}
}

class Octahedron extends Scene3dObject_Axes {
	constructor(pos, material, nature, rx, ry, rz) {
		super(TYPE_OCTAHEDRON, pos, material, nature, rx, ry, rz);
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
		return `OCTAHEDRON${super.serialize()}`;
	}
}

class PrismRhombus extends Prism {
	constructor(pos, material, nature, rx, ry, h, axisType, skew) {
		super(TYPE_PRISM_RHOMBUS, pos, material, nature, rx, ry, h, axisType);
		this.skew = skew;
	}
	
	sdf2D(relX, relY) {
		if (relY < 0) {
			relX = -relX;
			relY = -relY;
		}
		
		const skew = this.skew / 2;
		const hegt = this.ry;
		const widt = this.rx;
		
		var w0 = relX - skew;
		var w1 = relY - hegt;
		w0 = w0 - clamp(w0, -widt, widt);
		var d0 = w0*w0 + w1*w1;
		var d1 = -w1;
		
		const s = relX * hegt - relY * skew;
		if (s < 0) {
			relX = -relX;
			relY = -relY;
		}
		var v0 = relX - widt;
		var v1 = relY;
		
		const ve = v0 * skew   + v1 * hegt;
		const ee = skew * skew + hegt * hegt;
		const gweh = clamp(ve / ee, -1, 1);
		
		v0 = v0 - skew * gweh;
		v1 = v1 - hegt * gweh;
		const vv = v0 * v0 + v1 * v1;
		
		d0 = Math.min(d0, vv);
		d1 = Math.min(d1, widt * hegt - Math.abs(s));
		
		return Math.sqrt(d0) * Math.sign(-d1);
	}
	
	serialize() {
		return `PRISM-RHOMBUS${super.serialize()}~${this.skew}`;
	}
}

class PrismHexagon extends Prism {
	constructor(pos, material, nature, rx, ry, h, axisType) {
		super(TYPE_PRISM_HEX, pos, material, nature, rx, ry, h, axisType);
	}
	
	sdf2D(relX, relY) {
		
	}
	
	serialize() {
		return `PRISM-HEXAGON${super.serialize()}`;
	}
}

class Ramp extends PrismRhombus {
	/**
	* creates a ramp with given parameters that travels in the x direction.
	 */
	constructor() {
		
	}
}

class Ring extends Scene3dObject {
	constructor(pos, material, nature, r, ringR) {
		super(TYPE_RING, pos, material, nature);
		this.r = r;
		this.ringR = ringR;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r + this.ringR, this.ringR, this.r + this.ringR);
	}

	distanceToPos(pos) {
		const distX = Math.abs(pos[0] - this.pos[0]);
		const distY = Math.abs(pos[1] - this.pos[1]);
		const distZ = Math.abs(pos[2] - this.pos[2]);
		const q = Math.sqrt(distX * distX + distZ * distZ) - this.r;
		return Math.sqrt(q * q + distY * distY) - this.ringR;
	}
	
	serialize() {
		return `RING${super.serialize()}~${this.r}~${this.ringR}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.ringR];
	}
}

class Shell extends Scene3dObject {
	//like sphere but the inside is hollow
	constructor(pos, material, nature, r, thickness) {
		super(TYPE_SHELL, pos, material, nature);
		this.r = r;
		this.h = thickness;
	}
	
	bounds() {
		const re = this.r + this.h;
		return giveBounds(this.pos, re, re, re);
	}
	
	distanceToPos(pos) {
		const relX = Math.abs(pos[0] - this.pos[0]);
		const relY = Math.abs(pos[1] - this.pos[1]);
		const relZ = Math.abs(pos[2] - this.pos[2]);
		const sphereDist = Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - this.r;
		return Math.abs(sphereDist) - this.h;
	}
	
	serialize() {
		return `SHELL${super.serialize()}~${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.h];
	}
}

class Sphere extends Scene3dObject {
	constructor(pos, material, nature, r) {
		super(TYPE_SPHERE, pos, material, nature)
		this.r = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r);
	}

	distanceToPos(pos) {
		//get relative distance
		const relX = Math.abs(pos[0] - this.pos[0]);
		const relY = Math.abs(pos[1] - this.pos[1]);
		const relZ = Math.abs(pos[2] - this.pos[2]);
		return Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - this.r;
	}

	serialize() {
		return `SPHERE${super.serialize()}~${this.r}`;
	}
	
	serializeGPU() {
		return [this.r];
	}
}

class GloopySphere extends Sphere {
	constructor(pos, material, r, gloopR) {
		super(pos, material, N_GLOOP, r);
		this.gloopiness = gloopR;
	}
	
	sceneSDF(pos, currentSDF) {
		const d = this.distanceToPos(pos);
		const k = 1;
		const t = clamp(0.5 + 0.5 * (d - currentSDF) / k, 0, 1);
		const res = linterp(d, currentSDF, t) - k * t * (1 - t);
		return [res, res < currentSDF];
	}
	
	serialize() {
		return `GLOOP-${super.serialize()}~${this.gloop}`;
	}
}

var map_strObj = {
	"BOX": Box,
	"BOX-FRAME": BoxFrame,
	"CUBE": Cube,
	"CAPSULE": Capsule,
	"CYLINDER": Cylinder,
	"ELLIPSE": Ellipsoid,
	"GLOOP-SPHERE": GloopySphere,
	"GYROID": Gyroid,
	"LINE": Line,
	"OCTAHEDRON": Octahedron,
	"PRISM-RHOMBUS": PrismRhombus,
	"RING": Ring,
	"SHELL": Shell,
	"SPHERE": Sphere,
	
	//it's in here for editor purposes
	"PLAYER": Player,
	"PLAYER-DEBUG": Player_Debug,
	"PLAYER-NOCLIP": Player_Noclip,
};
var map_objStr = Object.fromEntries(Object.entries(map_strObj).map(a => [a[1].name, a[0]]));