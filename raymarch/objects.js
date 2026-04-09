// REALLY GOOD SDF RESOURCE:
// https://gist.github.com/munrocket/f247155fc22ecb8edf974d905c677de1

/*
we have:
see end of file for objects list. There are some others not listed there:

templates/abstract:
	Scene3dObject
	Scene3dObject_Axes
	Prism

Meta-Objects:
	Scene3dLoop
	SceneCollection
 */


//main object contract
class Scene3dObject {
	static type = -1;
	/**
	 * creates a basic scene3dObject. This is an abstract class, you can't put it into the world.
	 * @param {Object} posRot an object containing pos, theta, phi, and rot, in radians. This comprises the standard transform.
	 * @param {Material} material the object's material. C
	 * @param {Integer|null} nature A bitmask representing the nature(s) of the object. 0 by default.
	 */
	constructor(posRot, material, nature) {
		this.pos = posRot.pos;
		this.material = material;
		this.nature = nature ?? N_NORMAL;
		this.type = this.constructor.type;
		
		//doesn't do anything right now
		this.gloopiness = ray_nearDist;

		this.theta = posRot.theta ?? 0;
		this.phi = posRot.phi ?? 0;
		this.rot = posRot.rot ?? 0;
	}
	
	//gives the axis-aligned bounding box of the object, in [smallest pos, largest pos] terms
	bounds() {
		console.error(`bounds are not defined for ${this.constructor.name}!`);
		return giveBounds(this.pos, 1, 1, 1);
	}

	//give a single object or a list of objects that represent the expressed portion of this object. 
	express() {
		return [this];
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
		const ε = 0.01 - 0.02 * (this.nature & N_ANTI != 0);
		const base = this.distanceToPos(pos);
		const grad = [
			this.distanceToPos(Pos(pos[0] + ε, pos[1], pos[2])) - base,
			this.distanceToPos(Pos(pos[0], pos[1] + ε, pos[2])) - base,
			this.distanceToPos(Pos(pos[0], pos[1], pos[2] + ε)) - base,
		];
		return normalize(grad);
	}

	serialize() {
		const [t, p, r] = [this.theta, this.phi, this.rot];
		var deg = (radians) => {
			radians /= degToRad;
			return modulate(Math.round(radians), 360);
		}
		return `~[${this.pos}]~${this.nature}~${deg(t)}~${deg(p + (Math.PI / 2))}~${deg(r)}|${this.material.serialize()}|`;
	}
	
	serializeGPU() {
		return [];
	}
}

class Scene3dObject_Axes extends Scene3dObject {
	static type = -2;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature);
		this.rx = Math.max(rx, 0);
		this.ry = Math.max(ry, 0);
		this.rz = Math.max(rz, 0);
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot);
	}
	
	serialize() {
		return `${super.serialize()}${this.rx}~${this.ry}~${this.rz}`;
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz];
	}
}

class Prism extends Scene3dObject_Axes {
	static type = -3;
	constructor(posRot, material, nature, rx, h, rz) {
		super(posRot, material, nature, rx, h, rz);
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot);
	}
	
	sdf2D(relX, relY) {
		console.error(`2d SDF is not defined for object ${this.constructor.name}!`);
		return -1;
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		var relX = relPos[0];
		var relY = relPos[1];
		var relZ = relPos[2];
		
		const faceDist = this.sdf2D(relX, relY);
		const vertDist = Math.abs(relZ) - this.rz;
		const negPart = Math.min(Math.max(faceDist, vertDist), 0);
		const posPart = Math.hypot(Math.max(faceDist, 0), Math.max(vertDist, 0));
		return (negPart + posPart);
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz];
	}
}

class Scene3dLoop {
	static type = -4;
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

	express() {
		return [this];
	}
	
	sceneSDF(pos, currentSDF) {
		const d = this.distanceToPos(pos);
		return [Math.min(currentSDF, d), d < currentSDF];
	}
	
	normalAt(pos) {
		return this.obj.normalAt(pos);
	}
	
	bounds() {
		return giveBounds([0, 0, 0],
			this.xRange + this.d / 2, this.yRange + this.d / 2, this.zRange + this.d / 2, 
			0, 0, 0);
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
		return `Scene3dLoop~${this.xRange}~${this.yRange}~${this.zRange}~${this.d}||${this.obj.serialize()}`;
	}
	
	serializeGPU() {
		var serial = this.obj.serializeGPU();
		serial[8] = this.d;
		return serial;
	}
}

class SceneCollection {
	static type = -5;
	/**
	* An object that contains other serialized objects. 
	* When editing, basic translations / rotations can be applied to all the objects in the collection.
	*/
	constructor(posRot, objects) {
		this.type = this.constructor.type;
		this.pos = posRot.pos;
		this.theta = posRot.theta;
		this.phi = posRot.phi;
		this.rot = posRot.rot;
		
		this.baseObjects = objects;
		this.expObjs = [];
	}
	
	fixRotations() {
		this.theta = modulate(this.theta, Math.PI * 2);
		this.phi += Math.PI / 2;
		this.phi = modulate(this.phi, Math.PI);
		this.phi -= Math.PI / 2;
		this.rot = modulate(this.rot, Math.PI * 2);
	}
	
	bounds() {
		console.error(`bounds are not defined for ${this.constructor.name}!`);
		return giveBounds(this.pos, 1, 1, 1);
	}
	
	/**
	* apply any possible animations to a particular object group. 
	* Examples: stretching legs, blinking, etc.
	 */
	animate(objGroup) {
	
	}
	
	/**
	* apply transformations (position, rotation) to a particular object group. Happens after standard transform.
	* Examples: moving
	 */
	transform(objGroup) {
	
	} 

	express() {
		/*
		for a collection to express itself:
			start with base objects
			-> apply any animations
			-> apply standard transform
			-> profit!
		 */
		const [basePos, baseTheta, basePhi, baseRot] = [this.pos, this.theta, this.phi, this.rot];
		const self = this;
		var objs = this.baseObjects.map(s => deserialize(s));
		this.animate(objs);
		objs.forEach(o => {
			var t = transformTransform(o.pos, o.theta, o.phi, o.rot, basePos, baseTheta, basePhi, baseRot);
			o.parent = self;
			o.pos = t.pos;
			o.theta = t.theta;
			o.phi = t.phi;
			o.rot = t.rot;
		});
		this.transform(objs);
		this.expObjs = objs;
		return objs;
	}

	tick() {}
	
	distanceToPos(pos) {
		console.error(`Do not call the SDF for SceneCollections!`);
		return -1;
	}
	
	//how this object should interact with other objects
	sceneSDF(pos, currentSDF) {
		const d = this.distanceToPos(pos);
		return [Math.min(currentSDF, d), d < currentSDF];
	}
	
	serializeKernel() {
		const [t, p, r] = [this.theta, this.phi, this.rot];
		function deg(radians) {
			radians /= degToRad;
			return modulate(Math.round(radians), 360);
		}
		return `~[${this.pos}]~X~${deg(t)}~${deg(p + (Math.PI / 2))}~${deg(r)}||`;
	}

	serialize() {
		const [t, p, r] = [this.theta, this.phi, this.rot];
		function deg(radians) {
			radians /= degToRad;
			return modulate(Math.round(radians), 360);
		}
		return `COLLECTION~[${this.pos}]~${this.nature}~${deg(t)}~${deg(p + (Math.PI / 2))}~${deg(r)}||${this.objects}`;
	}
}




//cube, standard object
class Cube extends Scene3dObject {
	static type = TYPE_CUBE;
	constructor(posRot, material, nature, r) {
		super(posRot, material, nature);
		this.r = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r, this.theta, this.phi, this.rot);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const r = this.r;
		const x = Math.abs(relPos[0]) - r;
		const y = Math.abs(relPos[1]) - r;
		const z = Math.abs(relPos[2]) - r;
		const dExt = Math.hypot(Math.max(x, 0), Math.max(y, 0), Math.max(z, 0));
		const dInt = Math.min(Math.max(x, y, z), 0);
		
		return dExt + dInt;
	}

	serialize() {
		return `CUBE${super.serialize()}${this.r}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.r, this.r];
	}
}

class Box extends Scene3dObject_Axes {
	static type = TYPE_BOX;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature, rx, ry, rz);
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot);
	}

	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const x = Math.abs(relPos[0]) - this.rx;
		const y = Math.abs(relPos[1]) - this.ry;
		const z = Math.abs(relPos[2]) - this.rz;
		
		const dExt = Math.hypot(Math.max(x, 0), Math.max(y, 0), Math.max(z, 0));
		const dInt = Math.min(Math.max(x, y, z), 0);
		
		return dExt + dInt;
	}

	serialize() {
		return `BOX${super.serialize()}`;
	}
}

class Box_Moving extends Box {
	constructor(posRot, material, nature, rx, ry, rz, pos2) {
		super(posRot, material, nature, rx, ry, rz);
		this.posBase = Pos(...this.pos);
		this.posEnd = pos2;
		this.nature = N_GLOOP;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + 12, this.ry + 12, this.rz + 12, this.theta, this.phi, this.rot);
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
	static type = TYPE_BOXFRAME;
	constructor(posRot, material, nature, rx, ry, rz, thickness) {
		super(posRot, material, nature, rx, ry, rz);
		this.e = thickness;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + this.e, this.ry + this.e, this.rz + this.e, this.theta, this.phi, this.rot);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relX = Math.abs(relPos[0]) - this.rx;
		const relY = Math.abs(relPos[1]) - this.ry;
		const relZ = Math.abs(relPos[2]) - this.rz;
		
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
	static type = TYPE_CAPSULE;
	constructor(posRot, material, nature, r, h) {
		super(posRot, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.h + this.r, this.theta, this.phi, this.rot);
	}

	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relX = Math.abs(relPos[0]);
		const relY = Math.abs(relPos[1]);
		var   relZ = Math.abs(relPos[2]);
		relZ -= clamp(relZ, 0, this.h);
		return Math.sqrt(relX * relX + relY * relY + relZ * relZ) - this.r;
	}
	
	serialize() {
		return `CAPSULE${super.serialize()}${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [this.r, this.h];
	}
}

class Cylinder extends Scene3dObject {
	static type = TYPE_CYLINDER;
	constructor(posRot, material, nature, r, h) {
		super(posRot, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.h, this.theta, this.phi, this.rot);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relX = relPos[0];
		const relY = relPos[1];
		const relZ = relPos[2];
		
		const hDist = Math.abs(relZ) - this.h;
		const xyDist = Math.hypot(relX, relY) - this.r;
		return Math.min(Math.max(hDist, xyDist), 0) + Math.hypot(Math.max(xyDist, 0), Math.max(hDist, 0));
	}
	
	serialize() {
		return `CYLINDER${super.serialize()}${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [this.r, this.h];
	}
}

//todo: useless in current scheme
class DebugLines extends Scene3dObject {
	static type = TYPE_BOXFRAME;
	constructor(minPos, maxPos) {
		super(Pos(0, 0, 0), new M_Color(255, 0, 255), N_NORMAL);
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
	static type = TYPE_ELLIPSE;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature, rx, ry, rz);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relX = Math.abs(relPos[0]) / this.rx;
		const relY = Math.abs(relPos[1]) / this.ry;
		const relZ = Math.abs(relPos[2]) / this.rz;
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

class Fractal extends Scene3dObject {
	static type = TYPE_FRACTAL;
	constructor(posRot, material, nature, r, scale, shiftX, shiftY, shiftZ) {
		super(posRot, material, nature);
		this.r = r;
		this.b = scale;
		this.shift = Pos(shiftX, shiftY, shiftZ);
	}
	
	tick() {
		// [this.shift[0], this.shift[2]] = rotate(this.shift[0], this.shift[2], 0.005);
		// if (gl && loading_world.objects.includes(this)) {
		// 	loading_world.bvh.generate();
		// 	createGPUWorld(loading_world);
		// }
	}
	
	//copy from shaderF but with less swizzling
	distanceToPos(pos) {
		//setup
		const r = this.r;
		const scale = this.b;
		const shift = this.shift;
		const a1 = -this.theta;
		const a2 = -this.phi;
		
		var px = (pos[0] - this.pos[0]) / r;
		var py = (pos[1] - this.pos[1]) / r;
		var pz = (pos[2] - this.pos[2]) / r;
		var pw = 1;
		
		//recursion
		for (var f=0; f<fractal_iters; f++) {
			px = Math.abs(px);
			py = Math.abs(py);
			pz = Math.abs(pz);
			[px, py] = rotate(px, py, a1);
			
			var a = Math.min(px - py, 0);
			px -= a;
			py += a;
			a = Math.min(px - pz, 0);
			px -= a;
			pz += a;
			a = Math.min(py - pz, 0);
			py -= a;
			pz += a;
			
			[py, pz] = rotate(py, pz, a2);
			px *= scale;
			px += shift[0];
			py *= scale;
			py += shift[1];
			pz *= scale;
			pz += shift[2];
			pw *= scale;
		}
		
		px -= 6;
		py -= 6;
		pz -= 6;
		
		const len = Math.hypot(Math.max(0, px), Math.max(0, py), Math.max(0, pz));
		return r * (Math.min(0, Math.max(px, py, pz)) + len) / pw;
	}
	
	bounds() {
		return giveBounds(this.pos, 10000, 10000, 10000, this.theta, this.phi, this.rot);
	}
	
	serialize() {
		return `FRACTAL${super.serialize()}${this.r}~${this.b}~${this.shift[0]}~${this.shift[1]}~${this.shift[2]}`;
	}
	
	serializeGPU() {
		return [this.r, this.b, this.theta, this.phi, fencepost32, ...this.shift];
	}
}

class Gyroid extends Scene3dObject_Axes {
	static type = TYPE_GYROID;
	constructor(posRot, material, nature, rx, ry, rz, a, b, h) {
		super(posRot, material, nature, rx, ry, rz);
		this.a = a ?? 0.08;
		this.b = b ?? 13;
		this.h = h;
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relX = relPos[0];
		const relY = relPos[1];
		const relZ = relPos[2];
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

//line has 3d radii for the sake of constructor / editor simplicity.
//The offset point is not really a "radius" by any metric but eh. whatever.
class Line extends Scene3dObject {
	static type = TYPE_LINE;
	constructor(posRot, material, nature, rx, ry, rz, thickness) {
		super(posRot, material, nature);
		this.rx = rx;
		this.ry = ry;
		this.rz = rz;
		//it doesn't really make sense for lines to be affected by transformations. So they're not.
		if (this.theta || this.phi || this.rot) {
			console.error(`${this.serialize()}: Lines should not be rotated!`);
			this.theta = 0;
			this.phi = 0;
			this.rot = 0;
		}
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
		return `LINE${super.serialize()}${this.rx}~${this.ry}~${this.rz}~${this.r}`;
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz, this.r];
	}
}

class Octahedron extends Scene3dObject_Axes {
	static type = TYPE_OCTAHEDRON;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature, rx, ry, rz);
	}
	
	//TODO: probably broken in some way
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		var relX = relPos[0];
		var relY = Math.abs(relPos[1]);
		var relZ = relPos[2];
		[relX, relZ] = rotate(relX, relZ, Math.PI / 4);
		relX = Math.abs(relX);
		relZ = Math.abs(relZ);
		
		return ((relX - this.rx) + (relY - this.ry) + (relZ - this.rz)) * 0.57735;
	}
	
	serialize() {
		return `OCTAHEDRON${super.serialize()}`;
	}
}

class PrismRhombus extends Prism {
	static type = TYPE_PRISM_RHOMBUS;
	constructor(posRot, material, nature, rx, h, rz, skew) {
		super(posRot, material, nature, rx, h, rz);
		this.skew = skew;
	}
	
	bounds() {
		return giveBounds(this.pos, this.rx + Math.abs(this.skew / 2), this.ry, this.rz, this.theta, this.phi, this.rot);
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
	
	serializeGPU() {
		return super.serializeGPU().concat(this.skew);
	}
}

class PrismHexagon extends Prism {
	static type = TYPE_PRISM_HEX;
	constructor(posRot, material, nature, rx, ry, h) {
		super(posRot, material, nature, rx, ry, h);
		this.ry = this.rx;
	}

	sdf2D(relX, relY) {
		const sqrt3 = -0.866025404;
		const invSqrt3 = 1 / sqrt3;
		
		relX = Math.abs(relX);
		relY = Math.abs(relY);
		
		var relDot = 2 * Math.min(sqrt3 * relX + 0.5 * relY, 0);
		relX -= relDot * sqrt3;
		relX -= clamp(relX, -invSqrt3 * this.rx, invSqrt3 * this.rx);
		relY -= relDot * 0.5;
		relY -= this.rx;
		
		return Math.sqrt(relX * relX + relY * relY) * Math.sign(relY);
	}
	
	serialize() {
		return `PRISM-HEXAGON${super.serialize()}`;
	}
}

class PrismOctagon extends Prism {
	static type = TYPE_PRISM_OCT;
	constructor(posRot, material, nature, rx, ry, h) {
		super(posRot, material, nature, rx, ry, h);
		this.ry = this.rx;
	}

	// express() {
	// 	return [];
	// }
	
	sdf2D(relX, relY) {
		relX = Math.abs(relX);
		relY = Math.abs(relY);
	
		const magic0 = -0.9238795325;
		const magic1 = 0.3826834323;
		const Imsqrt2 = 1 - Math.SQRT2;
		
		const dot1 = 2 * Math.min(magic0 * relX + magic1 * relY, 0);
		relX -= dot1 * magic0;
		relY -= dot1 * magic1;
		const dot2 = 2 * Math.min(-magic0 * relX + magic1 * relY, 0);
		relX -= dot1 * -magic0;
		relY -= dot1 * magic1;
		relX -= clamp(relX, -Imsqrt2 * this.rx, Imsqrt2 * this.rx);
		relY -= this.rx;
		
		return Math.sqrt(relX * relX + relY * relY) * Math.sign(relY);
	}
	
	serialize() {
		return `PRISM-OCTAGON${super.serialize()}`;
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
	static type = TYPE_RING;
	constructor(posRot, material, nature, r, ringR) {
		super(posRot, material, nature);
		this.r = r;
		this.ringR = ringR;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r + this.ringR, this.r + this.ringR, this.ringR, this.theta, this.phi, this.rot);
	}

	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const distX = Math.abs(relPos[0]);
		const distY = Math.abs(relPos[1]);
		const distZ = Math.abs(relPos[2]);
		const q = Math.sqrt(distX * distX + distY * distY) - this.r;
		return Math.sqrt(q * q + distZ * distZ) - this.ringR;
	}
	
	serialize() {
		return `RING${super.serialize()}${this.r}~${this.ringR}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.ringR];
	}
}

class Shell extends Scene3dObject {
	static type = TYPE_SHELL;
	//like sphere but the inside is hollow
	constructor(posRot, material, nature, r, thickness) {
		super(posRot, material, nature);
		this.r = r;
		this.h = thickness;
	}
	
	bounds() {
		const re = this.r + this.h;
		return giveBounds(this.pos, re, re, re, 0, 0, 0);
	}
	
	distanceToPos(pos) {
		const [relX, relY, relZ] = transformInverse(pos, this.pos, 0, 0, 0);
		const sphereDist = Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - this.r;
		return Math.abs(sphereDist) - this.h;
	}
	
	serialize() {
		return `SHELL${super.serialize()}${this.r}~${this.h}`;
	}
	
	serializeGPU() {
		return [null, this.r, this.h];
	}
}

class Sphere extends Scene3dObject {
	static type = TYPE_SPHERE;
	constructor(posRot, material, nature, r) {
		super(posRot, material, nature)
		this.r = r;
	}
	
	bounds() {
		return giveBounds(this.pos, this.r, this.r, this.r, 0, 0, 0);
	}

	distanceToPos(pos) {
		const [relX, relY, relZ] = transformInverse(pos, this.pos, 0, 0, 0);
		return Math.sqrt((relX * relX) + (relY * relY) + (relZ * relZ)) - this.r;
	}

	serialize() {
		return `SPHERE${super.serialize()}${this.r}`;
	}
	
	serializeGPU() {
		return [this.r];
	}
}

class Voxel extends Scene3dObject {
	static type = TYPE_VOXEL;
	constructor(posRot, material, nature, d, c1, c2, c3, c4, c5, c6, c7, c8) {
		super(posRot, material, nature);
		this.d = d;
		this.c = [c1, c2, c3, c4, c5, c6, c7, c8];
	}
	
	bounds() {
		var halfD = this.d / 2;
		return giveBounds(this.pos, halfD, halfD, halfD, this.theta, this.phi, this.rot);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const d = this.d;
		const halfD = this.d / 2;
		var relX = relPos[0];
		var relY = relPos[1];
		var relZ = relPos[2];
	
		const x = Math.max(0, Math.abs(relX) - halfD);
		const y = Math.max(0, Math.abs(relY) - halfD);
		const z = Math.max(0, Math.abs(relZ) - halfD);
		const boxSDF = Math.sqrt(x * x + y * y + z * z);
		
		//put into percentage coordinates
		relX = (relX / d) + 0.5;
		relY = (relY / d) + 0.5;
		relZ = (relZ / d) + 0.5;
		
		//interpolate
		const cc = this.c;
		const A = linterp(cc[0], cc[4], relY);
		const B = linterp(cc[1], cc[5], relY);
		const C = linterp(cc[2], cc[6], relY);
		const D = linterp(cc[3], cc[7], relY);
		
		const voxelSDF = halfD * linterp(linterp(A, B, relX), linterp(D, C, relX), relZ);
		return Math.max(boxSDF, voxelSDF);
	}
	
	serialize() {
		return `VOXEL${super.serialize()}${this.d}~${this.c[0]}~${this.c[1]}~${this.c[2]}~${this.c[3]}~${this.c[4]}~${this.c[5]}~${this.c[6]}~${this.c[7]}`
	}
	
	serializeGPU() {
		return [this.d, ...this.c];
	}
}