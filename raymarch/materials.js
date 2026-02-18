class Material {
	constructor(color, bounciness) {
		this.color = color ?? Color(255, 0, 255);
		this.bounciness = bounciness ?? 0;
	}
	
	applyNearEffect(ray) {
		console.error(`Near effect not initialized for material ${this.constructor.name}!`);
	}
	
	applyHitEffect(ray) {
		console.error(`Hit effect not initialized for material ${this.constructor.name}!`);
	}
}

class M_Standard {
	constructor(color) {
		super(color, 0.3);
	}
	
	
	
	applyHitEffect(ray) {
	
	}
}

class M_Portal {
	constructor(world, posOffset) {
		super(Color())
	}
}