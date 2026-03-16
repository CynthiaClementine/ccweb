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
	constructor(type, color, bounciness) {
		this.color = color ?? Color4(255, 0, 255, 255);
		this.bounciness = bounciness ?? 0;
		this.type = type;
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
	constructor(r, g, b) {
		super(0, Color4(r, g, b, 255), 0.3);
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

class M_Concrete extends M_Color {
	constructor() {
		super(249, 248, 243);
		this.type = 1;
		this.closeColors = [
			Color4(255, 255, 255, 255),
			Color4(255, 249, 224, 255),
			Color4(242, 236, 230, 255),
			Color4(242, 252, 255, 255),
		];
		this.farColors = [
			Color4(252, 252, 249, 255),
			Color4(252, 248, 234, 255),
			Color4(245, 242, 236, 255),
			Color4(245, 250, 249, 255),
		];
		this.shimmer = 3;
	}
	
	applyHitEffect(ray, obj) {
		if (ray.totalDist > 40) {
			return super.applyHitEffect(ray, obj);
		}
		const colors = (ray.totalDist > 20) ? this.farColors : this.closeColors;
		const shimmer = this.shimmer;
		const x = modulate((ray.pos[0] * shimmer) | 0, 10);
		const y = modulate((ray.pos[1] * shimmer) | 0, 10);
		const z = modulate((ray.pos[2] * shimmer) | 0, 10);
		
		// applyColor(colors[modulate(3 * x + 7 * y + z, colors.length)], ray.color);
		applyColor(colors[modulate(x ** y + (4.6 * z | 0), colors.length)], ray.color);
		this.pushOut(ray, obj);
		return true;
	}
	
	serialize() {
		return `concrete`;
	}
}

class M_Ghost extends Material {
	constructor(r, g, b, opacity) {
		super(11, Color4(r, g, b, opacity), 0.1);
	}
	
	applyNearEffect(ray) {
		if (ray.color != undefined && !ray.hit) {
			applyColor(this.color, ray.color);
		}
	}
	
	applyHitEffect(ray) {
		return true;
	}
	
	serialize() {
		return `ghost:${this.color[0]}~${this.color[1]}~${this.color[2]}~${this.color[3]}`;
	}
}

class M_Glass extends Material {
	constructor(r, g, b, opacity) {
		super(10, Color4(r, g, b, opacity), 0.1);
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
	constructor() {
		super(3, Color4(0, 0, 0, 255), 0);
	}
	
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

class M_Portal extends Material {
	constructor(newWorldName, posOffset) {
		super(20, Color4(255, 255, 255, 255), 0);
		this.str = newWorldName;
		this.offset = posOffset;
		this.newWorld = null;
		var self = this;
		setTimeout(() => {
			self.sync();
		}, 5);
	}
	
	sync() {
		this.newWorld = worlds[this.str];
	}
	
	applyNearEffect(ray) {
		//move tracking rays earlier
		if (this.newWorld && !ray.color) {
			ray.world = this.newWorld;
			ray.pos[0] += this.offset[0];
			ray.pos[1] += this.offset[1];
			ray.pos[2] += this.offset[2];
		}
	}
	
	applyHitEffect(ray) {
		// this.applyNearEffect(ray);
		if (this.newWorld) {
			ray.world = this.newWorld;
			ray.pos[0] += this.offset[0];
			ray.pos[1] += this.offset[1];
			ray.pos[2] += this.offset[2];
		}
		ray.localDist = ray_minDist * 2;
		return false;
	}
	
	tick() {
		if (!this.newWorld) {
			this.sync();
		}
		if (this.newWorld && this.newWorld != loading_world) {
			this.newWorld.tick();
		}
	}
	
	serialize() {
		return `portal:${this.str}~[${this.offset}]`;
	}
	
	serializeGPU() {
		//indirection on newWorld reference so that it works even before syncing
		var newWorld = worlds[this.str] ?? {id: 9999};
		return [this.type, [...this.offset], newWorld.id];
	}
}

class M_Mirror extends Material {
	constructor(r, g, b, absorbance) {
		super(30, Color4(r, g, b, absorbance), 0.1);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray, parent) {
		if (ray.color[3] == 255) {
			return true;
		}
		//bounce the ray away
		//angle of incidence = angle of reflection. Or in this case, 
		//reflected = incident - 2 * normal * (incident • normal )
		
		const incident = ray.dPos;
		const normal = parent.normalAt(ray.pos);
		const product = dot(incident, normal);
		// const fresnel = (1 - product) ** 2; //(1 - product) ** reflectivity
		
		applyColor(this.color, ray.color);
		if (Number.isNaN(normal[0])) {
			return true;
		}
		
		incident[0] = incident[0] - 2 * normal[0] * product;
		incident[1] = incident[1] - 2 * normal[1] * product;
		incident[2] = incident[2] - 2 * normal[2] * product;
		this.pushOut(ray, parent);
		return (ray.hit == 1);
	}
	
	serialize() {
		return `mirror:${this.color[0]}~${this.color[1]}~${this.color[2]}~${this.color[3]}`;
	}
}

class M_Rubber extends Material {
	constructor() {
		super(2, Color4(47, 48, 66, 255), 1);
		this.lumi = 4;
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray) {
		var localVal = ((ray.pos[0] + ray.pos[2]) % 10) - 5;
		var paint = Color4(
			this.color[0] + this.lumi * localVal,
			this.color[1] + this.lumi * localVal,
			this.color[2] + this.lumi * localVal * 1.2,
			255
		);
		applyColor(paint, ray.color);
		ray.localDist = ray_minDist * 2;
		return true;
	}
	
	serialize() {
		return `rubber`;
	}
}

var materialCloud = new M_Ghost(255, 255, 255, 26);



var map_strMat = {
	"color": M_Color,
	"concrete": M_Concrete,
	"ghost": M_Ghost,
	"glass": M_Glass,
	"mirror": M_Mirror,
	"normal": M_Normal,
	"portal": M_Portal,
	"rubber": M_Rubber,
};
var map_matStr = Object.fromEntries(Object.entries(map_strMat).map(a => [a[1].name, a[0]]));