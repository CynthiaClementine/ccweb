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



class DotDotDot extends SceneCollection {
	static type = 201;
	constructor(posRot) {
		super(posRot, mesh_dotdotdot);
	}
	
	serialize() {
		return `DOTDOTDOT${super.serializeKernel()}`;
	}
}

class SkyBunny extends SceneCollection {
	static type = 202;
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
		if (debug_listening) {
			objGroup.push(createDefaultObject());
		}
	}
	
	transform(objGroup) {
		var offset = this.posOffset;
		objGroup.forEach(o => {
			o.pos[0] += offset[0];
			o.pos[1] += offset[1];
			o.pos[2] += offset[2];
		});
		
		if (debug_listening) {
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







var map_strObj = {
	"BOX": Box,
	"BOX-FRAME": BoxFrame,
	"BOX-MOVING": Box_Moving,
	"CUBE": Cube,
	"CAPSULE": Capsule,
	"CYLINDER": Cylinder,
	"ELLIPSE": Ellipsoid,
	"FRACTAL": Fractal,
	"GYROID": Gyroid,
	"LINE": Line,
	"OCTAHEDRON": Octahedron,
	"PRISM-HEXAGON": PrismHexagon,
	"PRISM-OCTAGON": PrismOctagon,
	"PRISM-RHOMBUS": PrismRhombus,
	"RING": Ring,
	"SHELL": Shell,
	"SPHERE": Sphere,
	"VOXEL": Voxel,
	
	"DOTDOTDOT": DotDotDot,
	"SKYBUNNY": SkyBunny,
	
	//in here for editor purposes
	"PLAYER": Player,
	"PLAYER-DEBUG": Player_Debug,
	"PLAYER-NOCLIP": Player_Noclip,
};
var map_objStr = Object.fromEntries(Object.entries(map_strObj).map(a => [a[1].name, a[0]]));

var map_typeObj = {};
Object.entries(map_strObj).forEach(e => {
	map_typeObj[e[1].type] = e[1];
});