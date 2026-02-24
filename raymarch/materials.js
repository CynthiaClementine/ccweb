class Material {
	constructor(color, bounciness) {
		this.color = color ?? Color4(255, 0, 255, 255);
		this.bounciness = bounciness ?? 0;
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
	
	serialize() {
		console.error(`serialization not implemented for material ${this.constructor.name}!`);
		return `___`;
	}
}

class M_Color extends Material {
	constructor(r, g, b) {
		super(Color4(r, g, b, 255), 0.3);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray) {
		applyColor(this.color, ray.color);
		ray.localDist = ray_minDist * 2;
	}
	
	serialize() {
		return `color:${this.color[0]}~${this.color[1]}~${this.color[2]}`;
	}
}

class M_Ghost extends Material {
	constructor(r, g, b, opacity) {
		super(Color4(r, g, b, opacity), 0.1);
	}
	
	applyNearEffect(ray) {
		if (ray.color != undefined && !ray.hit) {
			applyColor(this.color, ray.color);
		}
	}
	
	applyHitEffect(ray) {}
	
	serialize() {
		return `ghost:${this.color[0]}~${this.color[1]}~${this.color[2]}~${this.color[3]}`;
	}
}

class M_Glass extends Material {
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
		ray.hit -= 1;
	}
	
	serialize() {
		return `glass:${this.color[0]}~${this.color[1]}~${this.color[2]}~${this.color[3]}`;
	}
}

class M_Portal extends Material {
	constructor(newWorldName, posOffset) {
		super(Color4(255, 255, 255, 255), 0);
		this.str = newWorldName;
		this.offset = posOffset;
		this.newWorld;
		
		
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
			ray.hit -= 1;
		}
	}
	
	applyHitEffect(ray) {
		// this.applyNearEffect(ray);
		if (this.newWorld) {
			ray.world = this.newWorld;
			ray.pos[0] += this.offset[0];
			ray.pos[1] += this.offset[1];
			ray.pos[2] += this.offset[2];
			ray.hit -= 1;
		}
		ray.localDist = ray_minDist * 2;
	}
	
	tick() {
		if (this.newWorld && this.newWorld != loading_world) {
			this.newWorld.tick();
		}
	}
	
	serialize() {
		return `portal:${this.str}~[${this.offset}]`;
	}
}

class M_Rubber extends Material {
	constructor() {
		super(Color4(47, 48, 66, 255), 1);
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
	}
	
	serialize() {
		return `rubber`;
	}
}

var materialCloud = new M_Ghost(255, 255, 255, 26);



var map_strMat = {
	"color": M_Color,
	"ghost": M_Ghost,
	"glass": M_Glass,
	"portal": M_Portal,
	"rubber": M_Rubber,
};
var map_matStr = Object.fromEntries(Object.entries(map_strMat).map(a => [a[1].name, a[0]]));