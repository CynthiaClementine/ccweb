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
		this.nature = 0;
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

var map_strObj = {
	"FRACTAL": Fractal,
	
	//in here for editor purposes
	"PLAYER": Player,
	"PLAYER-DEBUG": Player_Debug,
	"PLAYER-NOCLIP": Player_Noclip,
};
var map_objStr = Object.fromEntries(Object.entries(map_strObj).map(a => [a[1].name, a[0]]));

var map_typeObj = {};
Object.entries(map_strObj).forEach(e => {
	map_typeObj[e.type] = e;
});