/* 
MATERIAL TYPES
0     color
1     concrete
2     rubber
3     normal
10   glass
11    ghost
20   portal
30   mirror
*/

class Material {
	static type = -1;
	constructor(color, bounciness) {
		this.color = color ?? Color4(255, 0, 255, 255);
		this.bounciness = bounciness ?? 0;
		this.type = this.constructor.type;
	}
	
	applySDFEffect(val) {
		return val;
	}
	
	applyNearEffect(ray) {
		console.error(`Near effect not initialized for material ${this.constructor.name}!`);
	}
	
	applyHitEffect(ray) {
		console.error(`Hit effect not initialized for material ${this.constructor.name}!`);
	}
	
	pushOut(ray, object, recursed) {
		const pos = ray.pos;
		const norm = object.normalAt(pos);
		const dist = ray_minDist * 2 - ray.localDist;
		pos[0] += norm[0] * dist;
		pos[1] += norm[1] * dist;
		pos[2] += norm[2] * dist;
		ray.localDist = object.distanceToPos(pos);
		if (ray.localDist < ray_minDist) {
			if (!recursed) {
				this.pushOut(ray, object, true);
			}
		}
	}
	
	serialize() {
		console.error(`serialization not implemented for material ${this.constructor.name}!`);
		return `___`;
	}
	
	serializeGPU() {
		return [this.type, [this.color[0] / 255, this.color[1] / 255, this.color[2] / 255, this.color[3] / 255]];
	}
}

class M_Color extends Material {
	static type = M_COLOR;
	constructor(r, g, b) {
		super(Color4(r, g, b, 255), 0.3);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray, obj) {
		applyColor(this.color, ray.color);
		this.pushOut(ray, obj);
		return true;
	}
	
	serialize() {
		return `color:${this.color[0]}~${this.color[1]}~${this.color[2]}`;
	}
}

class M_Glass extends Material {
	static type = M_GLASS;
	constructor(r, g, b, opacity) {
		super(Color4(r, g, b, opacity), 0.1);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray) {
		if (Math.abs(ray.localDist) < ray_minDist * 2) {
			applyColor(this.color, ray.color);
			ray.localDist = ray_minDist * 2;
		} else {
			ray.localDist = -ray.localDist;
		}
		return false;
	}
	
	serialize() {
		return `glass:${this.color[0]}~${this.color[1]}~${this.color[2]}~${this.color[3]}`;
	}
}

class M_Normal extends Material {
	static type = M_NORMAL;
	constructor() {
		super(Color4(0, 0, 0, 255), 0);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray, object) {
		const normal = object.normalAt(ray.pos);
		const color = Color4(128 + normal[0] * 127, 128 + normal[1] * 127, 128 + normal[2] * 127, 255);
		applyColor(color, ray.color);
		return true;
	}
	
	serialize() {
		return `normal`;
	}
}



var map_strMat = {
	"color": M_Color,
	"glass": M_Glass,
	"normal": M_Normal,
};
var map_matStr = Object.fromEntries(Object.entries(map_strMat).map(a => [a[1].name, a[0]]));

var map_typeMat = {};
Object.entries(map_strMat).forEach(e => {
	map_typeMat[e.type] = e;
});