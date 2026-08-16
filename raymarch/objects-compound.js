var mesh_dotdotdot = [
	`SPHERE~[0,0,20]~0~0~90~0|color:128~0~255|10`,
	`SPHERE~[0,0,10]~0~0~90~0|color:128~64~255|10`,
	`SPHERE~[0,0,0]~0~0~90~0|color:128~128~255|10`,
	`SPHERE~[0,0,-10]~0~0~90~0|color:128~192~255|10`,
	`SPHERE~[0,0,-20]~0~0~90~0|color:128~255~255|10`
];

var mesh_skyBunny = [
	`ELLIPSE~[0,-3,0]~0~0~90~0|color:255~145~0|40~25~30`,
	`ELLIPSE~[18,14,-19]~0~0~90~0|color:255~184~25|20~10~10`,
	`ELLIPSE~[17,14,17]~0~0~90~0|color:255~185~25|20~10~10`,
	`SPHERE~[26,-1,-18]~0~0~90~0|color:0~0~0|7`,
	`SPHERE~[26,-1,19]~0~0~90~0|color:0~0~0|7`,
	// `BOX-FRAME~[0,0,0]~0~0~90~0|color:255~0~255|39~26~26~1`
];

var mesh_lamppost = [
	`CYLINDER~[0,1,0]~0~0~0~0|color:38~43~95|5~68.1`,
	`CAPSULE~[0,68,24]~0~0~90~0|color:38~43~95|5~24`,
	`SPHERE~[1,62,44]~0~0~90~0|light:255~235~162~255|4`,
];

var mesh_turtle = [
	`SPHERE~[0,-6,0]~0~0~90~0|color:31~104~59|23`,
	`BOX~[0,-14,1]~2~0~90~0|color:0~162~44|30~15~30`,
	`ELLIPSE~[0,3,21]~0~0~90~0|color:85~29~0|7~4~7`,
	`ELLIPSE~[17.931272506713867,2,-8.143157958984375]~0~332~90~0|color:85~29~0|7~2~2`,
	`ELLIPSE~[19.931272506713867,2,4.856842041015625]~0~21~90~0|color:85~29~0|7~2~2`,
	`ELLIPSE~[21.933889389038086,15,-16.16176986694336]~0~21~90~0|color:85~29~0|7~2~2`,
	`ELLIPSE~[19.933889389038086,15,-29.16176986694336]~0~332~90~0|color:85~29~0|7~2~2`,
];

class Rail extends SceneCollection {
	constructor(posRot, objects, positions, tStart, isReversible, isVelocityNormal) {
		super(posRot, objects);
		this.posList = positions ?? [[0,0,0]];
		this.lenList = [];
		this.reverses = isReversible;
		this.lenParametrize = isVelocityNormal;
		this.tStart = tStart;
		this.t = tStart;
	}

	refresh() {
		//calculate lenList
	}

	posFromT(t) {
		t = t % 2;
		if (t >= 1) {
			t = this.reverses ? (2 - t) : (t - 1);
		}

		
		
	}

	tick() {
	
	}

	serialize() {
		return `RAIL~`;
	}
}

class DotDotDot extends SceneCollection {
	static type = TYPE_MESH_DOT;
	constructor(posRot) {
		super(posRot, mesh_dotdotdot);
	}
	
	serialize() {
		return `DOTDOTDOT${super.serializeKernel()}`;
	}
}

class SkyBunny extends SceneCollection {
	static type = TYPE_ENT_SKYBUNNY;
	constructor(posRot) {
		super(posRot, mesh_skyBunny);
		
		this.posOffset = [0, 0, 0];
		this.posGoal = [0, 0, 0];
		this.dPos = [0, 0, 0];
		this.dMax = 1.5;
		this.friction = 0.99;
		this.homeR = 160;
		this.satisfyDist = 5;
		this.force = 0.06;
	}
	
	animate(objGroup) {
		if (debug_flags.bunnyTargets) {
			objGroup.push(createDescribedObject(TYPE_SPHERE, {
				parent: this,
				intangible: true,
			}));
		}
	}
	
	transform(objGroup) {
		var offset = this.posOffset;
		objGroup.forEach(o => {
			o.pos[0] += offset[0];
			o.pos[1] += offset[1];
			o.pos[2] += offset[2];
		});
		
		if (debug_flags.bunnyTargets) {
			var debug = objGroup[objGroup.length - 1];
			debug.pos = Pos(
				this.pos[0] + this.posGoal[0],
				this.pos[1] + this.posGoal[1],
				this.pos[2] + this.posGoal[2],
			);
		}
	}
	
	tick() {
		super.tick();
		
		if (getDistancePos(this.posGoal, this.posOffset) < this.satisfyDist) {
			//pick a new goal
			this.posGoal = [
				randomBounded(-this.homeR, this.homeR) | 0, 
				randomBounded(-this.homeR / 4, this.homeR / 4) | 0, 
				randomBounded(-this.homeR, this.homeR) | 0, 
			];
		}
		
		//attract towards goal
		var goalVec = [
			this.posOffset[0] - this.posGoal[0],
			this.posOffset[1] - this.posGoal[1],
			this.posOffset[2] - this.posGoal[2]
		];
		var goalDist = getDistancePos(goalVec, [0, 0, 0]);
		const force = this.force - Math.min(this.force / goalDist, this.force);
		goalVec = normalizeTo(goalVec, force);
		this.dPos[0] -= goalVec[0];
		this.dPos[0] *= this.friction;
		this.dPos[1] -= goalVec[1];
		this.dPos[1] *= this.friction;
		this.dPos[2] -= goalVec[2];
		this.dPos[2] *= this.friction;
		var mag = getDistancePos(this.dPos, [0, 0, 0]);
		if (mag > this.dMax) {
			this.dPos[0] = (this.dPos[0] / mag) * this.dMax;
			this.dPos[1] = (this.dPos[1] / mag) * this.dMax;
			this.dPos[2] = (this.dPos[2] / mag) * this.dMax;
		}
		
		//rotate
		var rots = cartToThetaPhi(...this.dPos);
		var oldTheta = this.theta;
		var newTheta = modulate(Math.PI / 2 - rots[0], Math.PI * 2);
		//this is super messy.. sorry
		var delta = Math.abs(newTheta - oldTheta);
		if (delta > Math.PI) {
			if (oldTheta > Math.PI) {
				oldTheta -= Math.PI * 2;
			} else {
				oldTheta += Math.PI * 2;
			}
			delta = Math.abs(newTheta - oldTheta);
		}
		if (delta > 0.1) {
			newTheta = oldTheta + 0.1 * Math.sign(newTheta - oldTheta);
		}
		this.theta = newTheta;

		this.rot = rots[1] / 2;
		
		//move
		this.posOffset[0] += this.dPos[0];
		this.posOffset[1] += this.dPos[1];
		this.posOffset[2] += this.dPos[2];
		
		loading_world.shouldRegen = true;
		this.fixRotations();
	}
	
	serialize() {
		var tprSave = [this.theta, this.phi, this.rot];
		[this.theta, this.phi, this.rot] = [0, 0, 0];
		var sup = super.serializeKernel();
		[this.theta, this.phi, this.rot] = tprSave;
		return `SKYBUNNY${sup}`;
	}
}

class Lamppost extends SceneCollection {
	static type = TYPE_MESH_LAMPPOST;
	constructor(posRot) {
		super(posRot, mesh_lamppost);
	}
	
	serialize() {
		return `LAMPPOST${super.serializeKernel()}`;
	}
}



//procedurally generated tree of branches
class Tree extends SceneCollection {
	static type = TYPE_TREE;
	constructor(posRot, material, seed, trunkAmpl, branchFactor, wobbleAmount, gain, iters) {
		super(posRot, []);
		this.material = material;
		this.seed = seed;
		this.crand = seed;
		this.ampl = trunkAmpl;
		this.rr = clamp(branchFactor, 0, 4);
		this.a = clamp(wobbleAmount, 0, 1);
		this.b = gain;
		this.iters = clamp(iters, 1, 4);

		this.bbStore = [Pos(...this.pos), Pos(...this.pos)];
	}

	includeBoundsP(point, r) {
		const min = Math.min;
		const max = Math.max;
		var bbs = this.bbStore;
		for (var d=0; d<3; d++) {
			bbs[0][d] = min(bbs[0][d], point[d] - r);
			bbs[1][d] = max(bbs[1][d], point[d] + r);
		}
	}

	bounds() {
		return [Pos(...this.bbStore[0]), Pos(...this.bbStore[1])];
	}

	rand(a, b) {
		this.crand = Math.pow((this.crand + 10), 2.81593) % 10;
		return a + (b - a)*(this.crand % 1);
	}

	//starting with a blank group, generate self
	animate(objGroup) {
		const _a = this.a;
		const _rr = this.rr;

		var material = this.material;
		
		this.crand = this.seed;
		var ampl = this.ampl;
		this.bbStore = [Pos(-ampl, -ampl, -ampl), Pos(ampl, ampl, ampl)];

		var currVecs = [[Pos(0, 0, 0), [this.rand(0 + this.theta, tau + this.theta), this.rand(pi*0.5, pi*0.4)]]];
		var newCurrs = [];
		var cRadius = Math.cbrt(ampl);
		for (var a=0; a<this.iters; a++) {
			currVecs.forEach(c => {
				//c__ for current, f__ for future (next iteration)
				const [cPos, cAng] = c;
				const cVec = polToCart(cAng[0], cAng[1], ampl);
				const fPos = Pos(
					cPos[0] + cVec[0],
					cPos[1] + cVec[1],
					cPos[2] + cVec[2],
				);
				this.includeBoundsP(fPos, cRadius);
				//generate the branch based on the vector
				var o = new Line({pos: cPos, theta:0,phi:0,rot:0}, material, N_NORMAL, ...cVec, cRadius);
				o.parent = this;
				objGroup.push(o);

				//decide what new vectors should look like
				var numBranches = (this.rand(0,1) > _rr % 1) ? Math.floor(_rr) : 1;
				for (var n=0; n<numBranches; n++) {
					//adjust the angle by a bit. It should be equal in every direction, so we do this gimbal conversion
					var xHat = polToCart(cAng[0] - (pi/2), 0,		ampl*this.rand(-_a, _a));
					var yHat = polToCart(cAng[0], cAng[1] + (pi/2), ampl*this.rand(-_a, _a));

					var fVec = [
						cVec[0] + xHat[0] + yHat[0],
						cVec[1] + xHat[1] + yHat[1],
						cVec[2] + xHat[2] + yHat[2]
					];
					var fAngle = cartToPol(...fVec);
					newCurrs.push([fPos, fAngle]);
				}
			});
			currVecs = newCurrs;
			ampl *= this.b;
			cRadius = Math.cbrt(ampl);
		}

		//fix bounds (animate is centered on origin, bounds shouldn't be)
		for (var d=0; d<3; d++) {
			this.bbStore[0][d] += this.pos[d];
			this.bbStore[1][d] += this.pos[d];
		}
	}

	serialize() {
		const ts = this;
		const mat = this.material.serialize();
		const rot = serializeRot(this.theta,this.phi,this.rot);
		return `TREE~[${ts.pos}]~X~${rot}|${mat}|${ts.seed}~${ts.ampl}~${ts.rr}~${ts.a}~${ts.b}~${ts.iters}`;
	}
}

class Worm extends SceneCollection {
	static type = TYPE_ENT_WORM;
	constructor(posRot, material, nature, range) {
		super(posRot, []);
		this.range = 80;
		this.segments = 6;
		this.endPos = Pos(0, this.range, 0);

		this.vecs = [];
		this.r = 3.5;
		for (var v=0; v<this.segments; v++) {
			this.vecs[v] = Pos(0, this.range / this.segments, 0);
		}
	}

	animate(objGroup) {
		var refPos = Pos(0, 0, 0);
		for (var v=0; v<this.vecs.length; v++) {
			var o = new Line({pos: refPos}, new M_Color(40, 0, 40), N_NORMAL, ...this.vecs[v], this.r);
			o.parent = this;
			objGroup.push(o);
			refPos = Pos(
				refPos[0] + this.vecs[v][0],
				refPos[1] + this.vecs[v][1],
				refPos[2] + this.vecs[v][2],
			);
		}
		var head = new Sphere({pos: this.endPos}, new M_Color(60, 0, 40), N_NORMAL, this.r * 1.5);
		head.parent = this;
		objGroup.push(head);
	}

	tick() {
		//uhh target player I guess.
		var len = getDistancePos(player.pos, this.pos);
		var goalLen = Math.max(len - player.width * 4, 0);
		var targ = Pos(
			camera.pos[0] - this.pos[0],
			camera.pos[1] - this.pos[1],
			camera.pos[2] - this.pos[2]
		);
		targ[0] *= goalLen / len;
		targ[1] *= goalLen / len;
		targ[2] *= goalLen / len;
		
		var dTarg = [
			targ[0] - this.endPos[0],
			targ[1] - this.endPos[1],
			targ[2] - this.endPos[2],
		];
		if (Math.hypot(...dTarg) > 1) {
			dTarg = normalize(dTarg);
		} else {
			dTarg[0] *= 0.6; dTarg[1] *= 0.6; dTarg[2] *= 0.6;
		}
		this.endPos[0] += dTarg[0];
		this.endPos[1] += dTarg[1];
		this.endPos[2] += dTarg[2];
		this.vecs = fabrik(this.vecs, this.endPos, 1);
		loading_world.shouldRegen = true;
	}

	serialize() {
		return `WORM${super.serializeKernel()}`;
	}
}







var map_strObj = {
	"BLOB": Blobble,
	"BOX": Box,
	"BOX-FRAME": BoxFrame,
	"CUBE": Cube,
	"CAPSULE": Capsule,
	"CATENARY": Catenary,
	"CYLINDER": Cylinder,
	"DISH": Dish,
	"ELLIPSE": Ellipsoid,
	"FRACTAL": Fractal,
	"GYROID": Gyroid,
	"LINE": Line,
	"OCTAHEDRON": Octahedron,
	"PRISM-TRIGON": PrismTri,
	"PRISM-HEXAGON": PrismHexagon,
	"PRISM-OCTAGON": PrismOctagon,
	"PRISM-RHOMBUS": PrismRhombus,
	"RING": Ring,
	"RING-BOX": RingBox,
	"RING-TRI": RingTri,
	"SHELL": Shell,
	"SINGULARITY": Singularity,
	"SPHERE": Sphere,
	"TERRAIN": Terrain,
	"TRI": Triangle,
	"VOXEL": Voxel,
	
	"DOTDOTDOT": DotDotDot,
	"SKYBUNNY": SkyBunny,
	"LAMPPOST": Lamppost,
	"WORM": Worm,
	"TREE": Tree,
	
	//in here for editor purposes
	"PLAYER": Player,
	"PLAYER-DEBUG": Player_Debug,
	"PLAYER-NOCLIP": Player_Noclip,
	
	"LOOP": Scene3dLoop,
	"GROUP-L": SceneCollectionLoose,
};
var map_objStr = Object.fromEntries(Object.entries(map_strObj).map(a => [a[1].name, a[0]]));

var map_typeObj = {};
Object.entries(map_strObj).forEach(e => {
	map_typeObj[e[1].type] = e[1];
});