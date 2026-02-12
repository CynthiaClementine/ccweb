//main object contract
class Scene3dObject {
	constructor(pos, color) {
		this.pos = pos;
		this.color = color;
	}

	tick() {

	}
	
	distanceToPos(pos) {
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
		return `!!!UNDEFINED!!!`;
	}
	
	deserialize() {
		return [];
	}
}



//cube, standard object
class Cube extends Scene3dObject {
	constructor(pos, r, RGBColor) {
		super(pos, RGBColor);
		this.r = r;
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
	
	deserialize(argStr) {
		var spl = argStr.split("~").map(a => JSON.parse(a));
		return spl;
	}
}

class Box extends Scene3dObject {
	constructor(pos, xr, yr, zr, RGBColor) {
		super(pos, RGBColor);
		this.xr = xr;
		this.yr = yr;
		this.zr = zr;
	}

	distanceToPos(pos) {
		var x = Math.max(0, Math.abs(pos[0] - this.pos[0]) - this.xr);
		var y = Math.max(0, Math.abs(pos[1] - this.pos[1]) - this.yr);
		var z = Math.max(0, Math.abs(pos[2] - this.pos[2]) - this.zr);
		return Math.sqrt(x * x + y * y + z * z);
	}

	serialize() {
		return `BOX|[${this.pos}]~${this.xr}~${this.yr}~${this.zr}~[${this.color}]`;
	}
}

class Cylinder extends Scene3dObject {
	constructor(pos, r, h, RGBColor) {
		super(pos, RGBColor);
		this.r = r;
		this.h = h;
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

class Pipe extends Scene3dObject {

}

class Portal extends Cylinder {
	constructor(pos, newWorldSTRING) {
		super(pos, 50, 50, [255, 255, 255]);
		this.newWorld = newWorldSTRING;
		this.rayTolerance = 2;
		var self = this;
		setTimeout(() => {
			self.newWorld = worlds[self.newWorld];
		}, 5);
	}

	tick() {
		if (this.distanceTo(camera) / 0.95 < ray_minDist) {
			camera.dx *= -1;
			camera.dz *= -1;
		}
	}

	distanceToObj(object) {
		var trueDist = super.distanceToPos(object.pos);
		//if the distance is small enough, transport ray to the other world
		if (trueDist < this.rayTolerance) {
			// object.world = this.newWorld;
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

class Oval extends Scene3dObject {
	constructor(pos, xr, yr, zr, RGBColor) {
		super(pos, RGBColor)
		this.xr = xr;
		this.yr = yr;
		this.zr = zr;

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

class Line extends Scene3dObject {
	constructor(pos1, pos2, radius, RGBColor) {
		super(pos1, RGBColor);
		this.posEnd = pos2;
		var lv = [pos1[0] - pos2[0], pos1[1] - pos2[1], pos1[2] - pos2[2]];
		this.lineVec = lv;
		this.lineDot = dot(lv, lv);
		this.r = radius;
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