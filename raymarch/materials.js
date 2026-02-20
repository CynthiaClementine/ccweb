class Material {
	constructor(color, bounciness) {
		this.color = color ?? Color(255, 0, 255);
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
}

class M_Color extends Material {
	constructor(r, g, b) {
		super(Color(r, g, b), 0.3);
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray) {
		ray.color[0] = this.color[0];
		ray.color[1] = this.color[1];
		ray.color[2] = this.color[2];
	}
}

class M_Rubber extends Material {
	constructor() {
		super(Color(47, 48, 66), 1);
		this.lumi = 4;
	}
	
	applyNearEffect(ray) {}
	
	applyHitEffect(ray) {
		var localVal = ((ray.pos[0] + ray.pos[2]) % 10) - 5;
		ray.color[0] = this.color[0] + this.lumi * localVal;
		ray.color[1] = this.color[1] + this.lumi * localVal;
		ray.color[2] = this.color[2] + this.lumi * localVal * 1.2;
	}
}

class M_Ghost extends Material {
	constructor(color, opacity) {
		super(color, 0.1);
		this.opacity = opacity;
	}
	
	applyNearEffect(ray) {
		if (ray.color != undefined && !ray.hit) {
			ray.color[0] = linterp(ray.color[0], this.color[0], this.opacity);
			ray.color[1] = linterp(ray.color[1], this.color[1], this.opacity);
			ray.color[2] = linterp(ray.color[2], this.color[2], this.opacity);
		}
	}
	
	applyHitEffect(ray) {}
}

class M_Portal extends Material {
	constructor(newWorldSTRING, posOffset) {
		super(Color(255, 255, 255), 0);
		this.offset = posOffset;
		var self = this;
		setTimeout(() => {
			if (worlds[newWorldSTRING]) {
				self.newWorld = worlds[newWorldSTRING];
			}
		}, 5);
	}
	
	applyNearEffect(ray) {
		//move tracking rays earlier
		if (this.newWorld && !ray.color) {
			ray.world = this.newWorld;
			ray.pos[0] += this.offset[0];
			ray.pos[1] += this.offset[1];
			ray.pos[2] += this.offset[2];
			ray.hit = false;
		}
		//if it's an unhit ray, make it the color of the new world background
		if (ray.color != undefined && !ray.hit) {
			ray.color = ray.world.getBgColor();
		}
	}
	
	applyHitEffect(ray) {
		// this.applyNearEffect(ray);
		if (this.newWorld) {
			ray.world = this.newWorld;
			ray.pos[0] += this.offset[0];
			ray.pos[1] += this.offset[1];
			ray.pos[2] += this.offset[2];
			ray.hit = false;
		}
		//if it's an unhit ray, make it the color of the new world background
		if (ray.color != undefined && !ray.hit) {
			ray.color = ray.world.getBgColor();
		}
	}
}




var materialCloud = new M_Ghost(Color(255, 255, 255), 0.1);