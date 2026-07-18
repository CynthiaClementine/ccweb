// REALLY GOOD SDF RESOURCE:
// https://gist.github.com/munrocket/f247155fc22ecb8edf974d905c677de1

/*
we have:
see end of file for objects list. There are some others not listed there:

templates/abstract:
	Scene3dObject
	Scene3dObject_Axes
	Prism
	Spun

Meta-Objects:
	Scene3dLoop
	SceneCollection
 */


//main object contract
class Scene3dObject {
	static type = TYPE_CLASS_OBJ;
	static canCreate = true;
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
		
		this.gloopiness = 5;
		this.gloopBoost = 0;
		this.smoothness = 0;

		this.theta = posRot.theta ?? 0;
		this.phi = posRot.phi ?? 0;
		this.rot = posRot.rot ?? 0;
	}
	
	//gives the axis-aligned bounding box of the object, in [smallest pos, largest pos] terms
	bounds() {
		console.error(`bounds are not defined for ${this.constructor.name}!`);
		return augmentBounds(giveBounds(this.pos, 1, 1, 1), this.gloopiness * 2 + this.smoothness);
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
	static type = TYPE_CLASS_OBJAX;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature);
		this.rx = Math.max(rx, 0);
		this.ry = Math.max(ry, 0);
		this.rz = Math.max(rz, 0);
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot), 
		this.gloopiness * 2 + this.smoothness);
	}
	
	serialize() {
		return `${super.serialize()}${this.rx}~${this.ry}~${this.rz}`;
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz];
	}
}

class Prism extends Scene3dObject_Axes {
	static type = TYPE_CLASS_PRISM;
	constructor(posRot, material, nature, rx, h, rz) {
		super(posRot, material, nature, rx, h, rz);
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot), 
		this.gloopiness * 2 + this.smoothness);
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

class Spun extends Scene3dObject {
	static type = TYPE_CLASS_SPUN;
	constructor(posRot, material, nature, r, h) {
		super(posRot, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.h, this.theta, this.phi, 0), 
		this.gloopiness * 2 + this.smoothness);
	}
	
	sdf2D(relX, relY) {
		console.error(`2d SDF is not defined for object ${this.constructor.name}!`);
		return -1;
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, 0);
		const relX = Math.sqrt(relPos[0] * relPos[0] + relPos[2] * relPos[2]);
	}
}

class Scene3dLoop {
	static type = TYPE_CLASS_LOOP;
	/**
	* An object that contains other objects inside a looping space. 
	* Allows for large repeating spaces without needing the entire world to repeat.
	* @param {Number} xRepeats number of times in the X direction to loop the object
	* @param {Number} yRepeats number of times in the Y direction to loop the object
	* @param {Number} zRepeats number of times in the Z direction to loop the object
	* @param {Number} loopSize how large each loop is
	* @param {Scene3dObject[]} objects the set of objects inside the loop
	 */
	constructor(posRot, xRepeats, yRepeats, zRepeats, loopSize, objects) {
		this.type = this.constructor.type;
		this.pos = posRot.pos;
		this.theta = posRot.theta;
		this.phi = posRot.phi;
		this.rot = posRot.rot;
		
		this.rx = xRepeats;
		this.ry = yRepeats;
		this.rz = zRepeats;
		this.d = loopSize;
		this.objects = objects;
		if (!objects) {
			throw new Error(`No objects in Scene3dLoop!`);
		}
		//single object, absorb properties
		if (objects.length == 1) {
			var absorb = objects[0];
			this.type = absorb.type + 100;
			this.material = absorb.material;
		}
	}

	express() {
		//if there are multiple objects.. break into them
		const self = this;
		const o0 = this.objects[0];
		var arr = this.objects.map((o) => {
			var newO = deserialize(o.serialize());
			newO.pos = Pos(0, 0, 0);
			var a = new Scene3dLoop({pos: [self.pos[0] + o.pos[0], self.pos[1] + o.pos[1], self.pos[2] + o.pos[2]],
									theta: self.theta, phi: self.phi, rot: self.rot},
									self.rx, self.ry, self.rz, self.d, [newO]);
			a.parent = self;
			return a;
		});

		if (debug_flags.showLoopBounds) {
			arr.push(new BoxFrame({pos: [self.pos[0] + o0.pos[0], self.pos[1] + o0.pos[1], self.pos[2] + o0.pos[2]],
										theta: self.theta, phi: self.phi, rot: self.rot}, createDefaultMaterial(), N_NORMAL, 
										(this.rx + 0.5) * this.d, (this.ry + 0.5) * this.d, (this.rz + 0.5) * this.d, 1));
		}
		return arr;
	}
	
	normalAt(pos) {
		//TODO: not this
		return this.objects[0].normalAt(pos);
	}
	
	bounds() {
		return giveBounds(this.pos,
			(this.rx + 0.5) * this.d, (this.ry + 0.5) * this.d, (this.rz + 0.5) * this.d, 
			this.theta, this.phi, this.rot);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const d = this.d;
		const rx = this.rx | 0;
		const ry = this.ry | 0;
		const rz = this.rz | 0;
		var insideX = clamp(relPos[0], -rx * d, rx * d);
		var insideY = clamp(relPos[1], -ry * d, ry * d);
		var insideZ = clamp(relPos[2], -rz * d, rz * d);
		return sceneSDF(this.objects, Pos(
			modulateSigned(insideX, d) + (relPos[0] - insideX),
			modulateSigned(insideY, d) + (relPos[1] - insideY),
			modulateSigned(insideZ, d) + (relPos[2] - insideZ),
		))[0];
	}
	
	tick() {
		this.objects.forEach(o => {
			o.tick();
		});
	}
	
	serialize() {
		const grStr = this.objects.map(a => a.serialize()).join(`\n\t||`);
		const pos = this.pos;
		const [t, p, r] = [this.theta, this.phi, this.rot];
		//TODO: I've now defined this enough times that it's probably worth it to just make it a real function
		var deg = (radians) => {
			radians /= degToRad;
			return modulate(Math.round(radians), 360);
		}
		return `LOOP~[${pos[0]},${pos[1]},${pos[2]}]~X~${deg(t)}~${deg(p+Math.PI/2)}~${deg(r)}|${this.rx}~${this.ry}~${this.rz}~${this.d}\n\t||${grStr}`;
	}
	
	serializeGPU() {
		//assume self has exactly ONE object.
		var obj = this.objects[0];
		var serial = obj.serializeGPU();
		serial[7] = packageRot(this.theta, this.phi, this.rot);
		serial[8] = this.d;
		return serial;
	}
}

class SceneCollection {
	static type = TYPE_CLASS_GROUP;
	static canCreate = true+1;
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

class SceneCollectionLoose {
	static type = TYPE_CLASS_LGROUP;
	/**
	 * a SceneCollectionLoose is a wrapper around a bunch of objects. 
	 * You can apply translations / rotations to it, and it will apply them to the individual objects.
	 * It's not a SceneCollection, because it's not intended to be cohesive. 
	 * Instead, you are intended to just throw things in here, modify them, and then safely dissolve the collection.
	 */
	constructor(posRot, objects, a1, a2, a3) {
		this.type = this.constructor.type;
		if (objects && objects.type != undefined) {
			objects = [objects];
		}
		this.objects = new Set(objects);
		this.createTransform();
	}

	createTransform() {
		//variables that others will update
		this.pos = Pos(0, 0, 0);
		this.theta = 0;
		this.phi = 0;
		this.rot = 0;
		//stable variants - used to track what should actually be updated
		this.sPos = Pos(0, 0, 0);
		this.sTheta = 0;
		this.sPhi = 0;
		this.sRot = 0;

		[this.minPos, this.maxPos] = boundsForList(this.objects);
		for (var x=0; x<3; x++) {
			this.pos[x] = (this.minPos[x] + this.maxPos[x]) / 2;
			this.sPos[x] = this.pos[x];
		}
	}

	/**
	 * add an object to the collection. 
	 * @param {Scene3dObject} obj the object to add
	 */
	addObj(obj) {
		this.objects.add(obj);
		this.createTransform();
	}

	removeObj(obj) {
		this.objects.delete(obj);
		this.createTransform();
	}

	tick() {
		//apply transform delta, if there is one
		console.log(`ticking`);
		if (this.theta != this.sTheta || this.phi != this.sPhi || this.rot != this.sRot) {
			const dt = this.theta - this.sTheta;
			const dp = this.phi - this.sPhi;
			const dr = this.rot - this.sRot;

			this.objects.forEach(o => {
				o.pos[0] -= this.sPos[0];
				o.pos[1] -= this.sPos[1];
				o.pos[2] -= this.sPos[2];
				var newTrans = transformTransform(o.pos, o.theta, o.phi, o.rot, this.sPos, dt, dp, dr);
				o.pos = newTrans.pos;
				o.theta = newTrans.theta;
				o.phi = newTrans.phi;
				o.rot = newTrans.rot;
			});

			this.sTheta = this.theta;
			this.sPhi = this.phi;
			this.sRot = this.rot;
			
			loading_world.shouldRegen = true;
		}

		//apply translation
		if (getDistancePos(this.pos, this.sPos) > 0.01) {
			const diff = [
				this.pos[0] - this.sPos[0],
				this.pos[1] - this.sPos[1],
				this.pos[2] - this.sPos[2],
			];
			this.objects.forEach(o => {
				o.pos[0] += diff[0];
				o.pos[1] += diff[1];
				o.pos[2] += diff[2];
			});

			for (var t=0; t<3; t++) {
				this.minPos[t] += diff[t];
				this.maxPos[t] += diff[t];
				this.sPos[t] = this.pos[t];
			}
			loading_world.shouldRegen = true;
		}
	}

	//remove self from the objectsArray and add each of the constituent parts to said array
	break(objectsArr) {
		
	}
	
	serialize() {
		const grStr = Array.from(this.objects).map(a => a.serialize()).join(`\n\t||`);
		const pos = this.sPos;
		return `GROUP-L~[${pos[0]},${pos[1]},${pos[2]}]~X~0~90~0|\n\t||${grStr}`;
	}

	distanceToPos() {
		console.error(`Do not call the SDF for Loose Collections!`);
		return -1;
	}
	express() {
		console.error(`don't.`);
	}
}



class Box extends Scene3dObject_Axes {
	static type = TYPE_BOX;
	constructor(posRot, material, nature, rx, ry, rz) {
		super(posRot, material, nature, rx, ry, rz);
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.rx, this.ry, this.rz, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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
	static type = -15;
	constructor(posRot, material, nature, rx, ry, rz, pos2) {
		super(posRot, material, nature, rx, ry, rz);
		this.posBase = Pos(...this.pos);
		this.posEnd = pos2;
		this.nature = N_GLOOP;
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.rx + 12, this.ry + 12, this.rz + 12, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
	}
	
	//warning: does not mesh well with portal surfaces. fix before finishing
	tick() {
		var lastPos = this.pos;
		this.pos = [
			this.posBase[0] + 100 * Math.sin(world_time / 80),
			this.posBase[1],
			this.posBase[2]
		];
		this.dPos = [
			(this.pos[0] - lastPos[0]),
			(this.pos[1] - lastPos[1]),
			(this.pos[2] - lastPos[2]),
		]
		loading_world.shouldRegen = true;
	}
}

class BoxFrame extends Scene3dObject_Axes {
	static type = TYPE_BOXFRAME;
	constructor(posRot, material, nature, rx, ry, rz, thickness) {
		super(posRot, material, nature, rx, ry, rz);
		this.e = thickness;
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.rx + this.e, this.ry + this.e, this.rz + this.e, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.h + this.r, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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

class Cone extends Scene3dObject {
	static type = TYPE_CONE;
	constructor(posRot, material, nature, r, h) {
		super(posRot, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.h, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		
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
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.r, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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

class Cylinder extends Scene3dObject {
	static type = TYPE_CYLINDER;
	constructor(posRot, material, nature, r, h) {
		super(posRot, material, nature);
		this.r = r;
		this.h = h;
	}
	
	bounds() {
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.h, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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

//like a line but with 2 separate radii
class Dish extends Scene3dObject {
	static type = TYPE_DISH;
	constructor(posRot, material, nature, rx, ry, rz, ra, rb) {
		super(posRot, material, nature);
		this.rx = rx;
		this.ry = ry;
		this.rz = rz;
		this.r = ra;
		this.ringR = rb;
		//it doesn't really make sense for dishes to be affected by transformations. So they're not.
		if (this.theta || this.phi || this.rot) {
			console.error(`${this.serialize()}: Dishes should not be rotated!`);
			this.theta = 0;
			this.phi = 0;
			this.rot = 0;
		}
		this.calc();
	}
	
	calc() {
		console.log(`calculating!`);
		this.lineVec = Pos(this.rx, this.ry, this.rz);
		this.lineDot = dot(this.lineVec, this.lineVec);
	}
	
	bounds() {
		const r = this.r;
		const rr = this.ringR;
		const posEnd = Pos(this.pos[0] + this.rx, this.pos[1] + this.ry, this.pos[2] + this.rz);
		return augmentBounds([Pos(
			Math.min(this.pos[0] - r, posEnd[0] - rr),
			Math.min(this.pos[1] - r, posEnd[1] - rr),
			Math.min(this.pos[2] - r, posEnd[2] - rr),
		), Pos (
			Math.max(this.pos[0] + r, posEnd[0] + rr),
			Math.max(this.pos[1] + r, posEnd[1] + rr),
			Math.max(this.pos[2] + r, posEnd[2] + rr),
		)], this.gloopiness * 2 + this.smoothness);
	}
	
	
//	fn sdCappedCone(p: vec3f, a: vec3f, b: vec3f, ra: f32, rb: f32) -> f32 {
//   let rba = rb - ra;
//   let baba = dot(b - a, b - a);
//   let papa = dot(p - a, p - a);
//   let paba = dot(p - a, b - a) / baba;
//   let x = sqrt(papa - paba * paba * baba);
//   let cax = max(0.0, x - select(rb, ra, paba < 0.5));
//   let cay = abs(paba - 0.5) - 0.5;
//   let k = rba * rba + baba;
//   let f = clamp((rba * (x - ra) + paba * baba) / k, 0.0, 1.0);
//   let cbx = x - ra - f * rba;
//   let cby = paba - f;
//   let s = select(1., -1., cbx < 0.0 && cay < 0.0);
//   return s * sqrt(min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
// }
	
	distanceToPos(pos) {
		const rba = this.ringR - this.r;
		const b_a = this.lineVec;
		const p_a = transformInverse(pos, this.pos, 0, 0, 0);
		const baba = dot(b_a, b_a);
		const papa = dot(p_a, p_a);
		const paba = dot(p_a, b_a) / baba;
		const x = Math.sqrt(papa - paba * paba * baba);
		const cax = Math.max(0, x - (paba < 0.5) ? this.r : this.ringR);
		const cay = Math.abs(paba - 0.5) - 0.5;
		const k = rba * rba + baba;
		const f = clamp((rba * (x - this.r) + paba * baba) / k, 0, 1);
		const cbx = x - this.r - f * rba;
		const cby = paba - f;
		const s = (cbx < 0.0 && cay < 0.0) ? -1 : 1;
		return s * Math.sqrt(Math.min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
	
		//   let rba = rb - ra;
//   let baba = dot(b - a, b - a);
//   let papa = dot(p - a, p - a);
//   let paba = dot(p - a, b - a) / baba;
//   let x = sqrt(papa - paba * paba * baba);
//   let cax = max(0.0, x - select(rb, ra, paba < 0.5));
//   let cay = abs(paba - 0.5) - 0.5;
//   let k = rba * rba + baba;
//   let f = clamp((rba * (x - ra) + paba * baba) / k, 0.0, 1.0);
//   let cbx = x - ra - f * rba;
//   let cby = paba - f;
//   let s = select(1., -1., cbx < 0.0 && cay < 0.0);
//   return s * sqrt(min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
	}
	
	serialize() {
		return `DISH${super.serialize()}${this.rx}~${this.ry}~${this.rz}~${this.r}~${this.ringR}`;
	}
	
	serializeGPU() {
		return [this.r, this.rx, this.ry, this.rz, this.ringR];
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
		return augmentBounds(
			giveBounds(this.pos, 10000, 10000, 10000, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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
		this.offP = Pos(rx, ry, rz);
		this.posEnd = Pos(
			this.pos[0] + rx,
			this.pos[1] + ry,
			this.pos[2] + rz
		);
		//it doesn't really make sense for lines to be affected by transformations. So they're not.
		if (this.theta || this.phi || this.rot) {
			console.error(`${this.serialize()}: Lines should not be rotated!`);
			this.theta = 0;
			this.phi = 0;
			this.rot = 0;
		}
		this.r = thickness;
		// this.posData = [
		// 	[this.pos, ABSOLUTE],
		// 	[this.posEnd, RELATIVE]
		// ];
	}

	express() {
		this.refresh();
		var base = [this];
		if (debug_listening) {
			// var o1 = createDefaultObject();
			var o2 = createDefaultObject();
			// o1.r = this.r * 1.5;
			// o1.pos = this.pos;
			// o1.parent = this;
			o2.r = this.r * 1.5;
			o2.pos = this.posEnd;
			o2.parent = this;
			base.push(o2);
		}
		return base;
	}

	selectFrom(obj) {
		if (obj == this) {
			return this;
		}
		const endDist = getDistancePos(obj.pos, this.posEnd);
		const startDist = getDistancePos(obj.pos, this.pos);
		if (endDist < startDist) {
			return new Point(this.offP, this.pos);
		} else {
			return new Point(this.pos);
		}
	}

	refresh() {
		const off = this.offP;
		this.posEnd = Pos(this.pos[0] + off[0], this.pos[1] + off[1], this.pos[2] + off[2]);
	}
	
	bounds() {
		this.refresh();
		const p = this.pos;
		const pE = this.posEnd;
		const r = this.r;
		return augmentBounds([Pos(
			Math.min(p[0] - r, pE[0] - r),
			Math.min(p[1] - r, pE[1] - r),
			Math.min(p[2] - r, pE[2] - r),
		), Pos (
			Math.max(p[0] + r, pE[0] + r),
			Math.max(p[1] + r, pE[1] + r),
			Math.max(p[2] + r, pE[2] + r),
		)], this.gloopiness * 2 + this.smoothness);
	}
	
	distanceToPos(pos) {
		//lambda = clamp((P-A)•(B-A)/(B-A)•(B-A), 0, 1)
		//then closest = linterp(A, B, lambda)
		//dist = dist to closest
		const base = this.pos;
		const lineVec = this.offP;
		const lineDot = dot(lineVec, lineVec);
		const apVec = [pos[0] - base[0], pos[1] - base[1], pos[2] - base[2]];
		const l = clamp(dot(apVec, lineVec) / lineDot, 0, 1);
			
		return (getDistance(pos[0], pos[1], pos[2], 
				linterp(base[0], base[0] + lineVec[0], l), linterp(base[1], base[1] + lineVec[1], l), linterp(base[2], base[2] + lineVec[2], l)) - this.r);
	}
	
	serialize() {
		return `LINE${super.serialize()}${this.offP[0]}~${this.offP[1]}~${this.offP[2]}~${this.r}`;
	}
	
	serializeGPU() {
		return [null, ...this.offP, this.r];
	}
}

//editor-only class 
class Point {
	constructor(pos, offset) {
		offset = offset ?? Pos(0, 0, 0);
		this.pos = Pos(pos[0] + offset[0], pos[1] + offset[1], pos[2] + offset[2]);
		this.store = pos;
		this.offset = offset;
		this.theta = 0;
		this.phi = 0;
		this.rot = 0;

		this.nature = N_NORMAL;
	}

	tick() {
		this.store[0] = this.pos[0] - this.offset[0];
		this.store[1] = this.pos[1] - this.offset[1];
		this.store[2] = this.pos[2] - this.offset[2];
		loading_world.shouldRegen = true;
	}
}

class Triangle extends Scene3dObject {
	static type = TYPE_TRIANGLE;
	constructor(posRot, material, nature, p2x, p2y, p2z, thickness, p3x, p3y, p3z) {
		super(posRot, material, nature);
		this.p1 = this.pos;
		this.off2 = Pos(p2x, p2y, p2z);
		this.off3 = Pos(p3x, p3y, p3z);
		this.p2 = Pos(this.pos[0] + p2x, this.pos[1] + p2y, this.pos[2] + p2z);
		this.p3 = Pos(this.pos[0] + p3x, this.pos[1] + p3y, this.pos[2] + p3z);
		
		if (this.theta || this.phi || this.rot) {
			console.error(`${this.serialize()}: Lines should not be rotated!`);
			this.theta = 0;
			this.phi = 0;
			this.rot = 0;
		}
		this.r = thickness;
		// this.posData = [
		// 	[this.pos, ABSOLUTE],
		// 	[this.off2, RELATIVE],
		// 	[this.off3, RELATIVE],
		// ];
	}

	refresh() {
		const p = this.pos;
		this.p2 = Pos(p[0] + this.off2[0], p[1] + this.off2[1], p[2] + this.off2[2]);
		this.p3 = Pos(p[0] + this.off3[0], p[1] + this.off3[1], p[2] + this.off3[2]);
	}

	express() {
		this.refresh();
		var base = [this];
		if (debug_listening) {
			base.push(createDescribedObject(TYPE_SPHERE, {
				r: this.r * 1.5,
				parent: this,
				pos: this.p2,
			}));
			base.push(createDescribedObject(TYPE_SPHERE, {
				r: this.r * 1.5,
				parent: this,
				pos: this.p3,
			}));
		}
		return base;
	}

	selectFrom(obj) {
		if (obj == this) {
			return this;
		}

		//point 2
		if (getDistancePos(obj.pos, this.p2) < 1) {
			return new Point(this.off2, this.pos);
		}

		//point 3
		if (getDistancePos(obj.pos, this.p3) < 1) {
			return new Point(this.off3, this.pos);
		}

		return this;
	}
	
	bounds() {
		this.refresh();
		return augmentBounds([Pos(
			Math.min(this.pos[0], this.p2[0], this.p3[0]),
			Math.min(this.pos[1], this.p2[1], this.p3[1]),
			Math.min(this.pos[2], this.p2[2], this.p3[2]),
		), Pos (
			Math.max(this.pos[0], this.p2[0], this.p3[0]),
			Math.max(this.pos[1], this.p2[1], this.p3[1]),
			Math.max(this.pos[2], this.p2[2], this.p3[2]),
		)], this.r + this.gloopiness * 2 + this.smoothness);
	}
	
	//ough
	distanceToPos(pos) {
		const a = this.pos;
		const b = this.p2;
		const c = this.p3;
		const pa = [pos[0] - a[0], pos[1] - a[1], pos[2] - a[2]];
		const pb = [pos[0] - b[0], pos[1] - b[1], pos[2] - b[2]];
		const pc = [pos[0] - c[0], pos[1] - c[1], pos[2] - c[2]];
		const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
		const cb = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
		const ac = [a[0] - c[0], a[1] - c[1], a[2] - c[2]];

		const nor = cross(ba, ac);

		const s1 = Math.sign(dot(cross(ba, nor), pa));
		const s2 = Math.sign(dot(cross(cb, nor), pb));
		const s3 = Math.sign(dot(cross(ac, nor), pc));

		if (s1 + s2 + s3 < 2) {
			//outside tri
			const d1 = segmentDist2(ba, pa);
			const d2 = segmentDist2(cb, pb);
			const d3 = segmentDist2(ac, pc);
			return Math.sqrt(Math.min(d1, d2, d3));
		}

		//inside tri
		const nd = dot(nor, pa);
		return Math.sqrt((nd * nd) / dot(nor, nor));
	}
	
	serialize() {
		return `TRI${super.serialize()}${this.off2[0]}~${this.off2[1]}~${this.off2[2]}~${this.r}~${this.off3[0]}~${this.off3[1]}~${this.off3[2]}`;
	}
	
	serializeGPU() {
		return [this.r, this.off2[0], this.off2[1], this.off2[2], fencepost32, this.off3[0], this.off3[1], this.off3[2]];
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
		var relX = Math.abs(relPos[0]);
		var relY = Math.abs(relPos[1]);
		var relZ = Math.abs(relPos[2]);
		
		var A = -1 / this.rx;
		var B = -1 / this.ry;
		var C = -1 / this.rz;
		var d = A*relX + B*relY + C*relZ + 1;
		return Math.abs(d) / Math.sqrt(A*A + B*B + C*C);
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
		return augmentBounds(
			giveBounds(this.pos, this.rx + Math.abs(this.skew / 2), this.ry, this.rz, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
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
		return augmentBounds(
			giveBounds(this.pos, this.r + this.ringR, this.r + this.ringR, this.ringR, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
	}

	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, 0);
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

class Terrain extends Scene3dObject_Axes {
	static type = TYPE_TERRAIN;
	constructor(posRot, material, nature, rx, ry, rz, baseAmplitude, baseFrequency, octaves, lacunarity, gain) {
		super(posRot, material, nature, rx, ry, rz);
		this.ampl = baseAmplitude;
		this.freq = baseFrequency;
		this.n = octaves;
		this.a = lacunarity;
		this.b = gain;
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const relBoxX = Math.abs(relPos[0]) - this.rx;
		const relBoxY = Math.abs(relPos[1]) - this.ry;
		const relBoxZ = Math.abs(relPos[2]) - this.rz;
		const boxsdf = Math.hypot(Math.max(relBoxX, 0), Math.max(relBoxY, 0), Math.max(relBoxZ, 0));
		
		const octaves = this.n;
		
		var y = 0;
		var ampl = this.ampl;
		var freq = this.freq;
		for (var i=0; i<octaves; i++) {
			var val = noise(relPos[0] * freq, relPos[2] * freq);
			y += ampl * val;
			freq *= this.a;
			ampl *= this.b;
		}
		var terrsdf = (relPos[1] - y) / 2;
		
		return Math.max(boxsdf, terrsdf);
	}
	
	serialize() {
		return `TERRAIN${super.serialize()}~${this.ampl}~${this.freq}~${this.n}~${this.a}~${this.b}`;
	}
	
	serializeGPU() {
		return [null, this.rx, this.ry, this.rz, this.n, this.ampl, this.freq, this.a, this.b];
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
		return augmentBounds(
			giveBounds(this.pos, re, re, re, 0, 0, 0),
		this.gloopiness * 2 + this.smoothness);
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
		return augmentBounds(
			giveBounds(this.pos, this.r, this.r, this.r, 0, 0, 0),
		this.gloopiness * 2 + this.smoothness + 10 * (this.material.type == M_GRAVITY));
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

class Singularity extends Sphere {
	static type = TYPE_SINGULARITY;
	constructor(posRot, r, mass) {
		super(posRot, null, N_FOG, r);
		this.mass = mass;
		this.material = new M_Gravity(0, 0, 0, 1);
		this.material.syncWith(this);
	}
	
	serialize() {
		var sup = super.serialize().split(`|`);
		return `SINGULARITY${sup[0].slice(6)}||${sup[2]}~${this.mass}`;
	}
}

class Voxel extends Scene3dObject {
	static type = TYPE_VOXEL;
	constructor(posRot, material, nature, r, c1, c2, c3, c4, c5, c6, c7, c8) {
		super(posRot, material, nature);
		this.r = r;
		this.c = [c1, c2, c3, c4, c5, c6, c7, c8];
	}
	
	bounds() {
		var halfD = this.r;
		return augmentBounds(
			giveBounds(this.pos, halfD, halfD, halfD, this.theta, this.phi, this.rot),
		this.gloopiness * 2 + this.smoothness);
	}
	
	distanceToPos(pos) {
		const relPos = transformInverse(pos, this.pos, this.theta, this.phi, this.rot);
		const d = this.r * 2;
		const halfD = this.r;
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
		return `VOXEL${super.serialize()}${this.r * 2}~${this.c[0]}~${this.c[1]}~${this.c[2]}~${this.c[3]}~${this.c[4]}~${this.c[5]}~${this.c[6]}~${this.c[7]}`
	}
	
	serializeGPU() {
		return [this.r * 2, ...this.c];
	}
}