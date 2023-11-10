

/*
Some helpful terms:

animationData - refers to the data for a single animation. You can see the specifications for an animationData in the data_textures array below.
textureData - data for a group of textures. Keep in mind that each Texture object takes in 1 animationData to run.

A textureData takes the form

{
	l: {
		[animation name 1]: Texture,
		[animation name 2]: Texture,
	},
	u: {
		[animation name 1]: Texture,
		[animation name 2]: Texture,
	},
	r: {
		[animation name 1]: Texture,
		[animation name 2]: Texture,
	},
	d: {
		[animation name 1]: Texture,
		[animation name 2]: Texture,
	}
}

where each animation has a left, up, right, and down component.
*/


var animSizesDefault = [
	[1, 1],
	[0.5, 0.5]
];
var animSizesDS = [
	[2, 2],
	[1, 1.5]
];
var vScale = 0.8;
var animGlobalMult = [1, vScale]
var data_textures = {
	//ticks per frame
	tpf: 3,
	tileSize: 120,
	Warrior: {
		sheet: getImage(`img/spritesWarrior.png`),
		/**
		 * Each animation has 4 bits of data, described here:
		* @param {Number} time_per_frame how long to display each frame before switching to the next. Often written as a fraction of 24, since I draw and time things out in 24fps.
		* @param {Number[]} dimensions how many units the texture is [w,h]
		* @param {Number[]} center_coordinates what unit position should be considered the center. When the texture is drawn, these are the coordinates mapped to the draw position.
		* @param {Integer[][]} frame_coordinates an array of frame coordinates (EX: [[1, 1], [0, 1], [0, 0]])
		*/
		idleSide: [
			4 / 24,
			...animSizesDefault,
			[[15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], 
			[15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [15, 3], [14, 3]]
		],
		idleFront: [
			4 / 24,
			...animSizesDefault,
			[[15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], 
			[15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [15, 4], [14, 4]]
		],
		idleBack: [
			4 / 24,
			...animSizesDefault,
			[[15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], 
			[15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [15, 5], [14, 5]]
		],

		walkSide: [
			1 / 30,
			...animSizesDefault,
			[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0]]
		],
		walkFront: [
			1 / 30,
			...animSizesDefault,
			[[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1]]
		],
		walkBack: [
			1 / 30,
			...animSizesDefault,
			[[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2]]
		]
	},
	DreamSkaters: {
		sheet: getImage(`img/spritesDS.png`, true),
		charge: [
			1 / 10,
			...animSizesDS,
			[[0, 1], [1, 1]]
		],
		idle: [
			2 / 24,
			...animSizesDS,
			[[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[1,0],[0,0]]
		],
		fly: [
			2 / 30,
			...animSizesDS,
			[[3,1],[4,1],[5,1]],
		],
		
		stretch: [
			1 / 20,
			...animSizesDS,
			[[1,0],[2,0],[3,0],[3,0],[4,0],[5,0]]
		],
		sad: [
			1,
			...animSizesDS,
			[[6,0]]
		]

	},
	NPCS: {
		sheet: getImage(`img/spritesNPCs.png`),
		dm1Idle: [
			1 / 10,
			...animSizesDefault,
			[[0,0]]
		],
		dm1Talk: [
			1 / 10,
			...animSizesDefault,
			[[0,0],[0,1]]
		],
		dm2Idle: [
			1 / 10,
			...animSizesDefault,
			[[1,0]]
		],
		dm2Talk: [
			1 / 10,
			...animSizesDefault,
			[[1,0],[1,1]]
		],
		dm3Idle: [
			1 / 10,
			...animSizesDefault,
			[[2,0]]
		],
		dm3Talk: [
			1 / 10,
			...animSizesDefault,
			[[2,0],[2,1]]
		],

		triIdleFront: [
			1 / 24,
			...animSizesDefault,
			[[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[3,0],[4,0]]
		],
		triIdleBack: [
			1 / 24,
			...animSizesDefault,
			[[3,1]]
		],
		triIdleSide: [
			1 / 24,
			...animSizesDefault,
			[[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[3,2],[4,2]]
		],

		childIdleFront: [
			1 / 24,
			...animSizesDefault,
			[[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[5,0],[6,0]]
		],
		childIdleBack: [
			1 / 24,
			...animSizesDefault,
			[[5,1]]
		],
		childIdleSide: [
			1 / 24,
			...animSizesDefault,
			[[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[5,2],[6,2]]
		],

		farmerIdleFront: [
			1 / 24,
			...animSizesDefault,
		]
	},
	Roofs: {
		//Most of the roofs, with the exception of the waterfall, aren't animated.
		//Due to this, they use a simplified version that's just [x, y], [width, height], [relativeXCenter, relativeYCenter]
		sheet: getImage(`img/roofs.png`, true),
		sheet2: getImage(`img/roofs2.png`, true),
		tileSize: 60,

		waterfall: [
			1 / 6,
			[16, 34],
			[8, 0],
			[[0,0], [1,0], [2,0], [3,0], [4,0]],
		],

		villageHouseS: [
			[49, 62],
			[7, 13],
			[3.5, 12.7]
		],
		villageHouseM: [
			[38, 56],
			[11, 19],
			[5.5, 18.7]
		],
		villageHouseL: [
			[25, 56],
			[13, 19],
			[9, 17.8]
		],
		villageHouseXL: [
			[25, 33],
			[21, 22],
			[12, 17.7]
		],

		badlandHouse: [
			[67, 42],
			[13, 18],
			[6.5, 18]
		],
		badlandShed: [
			[56, 45],
			[11, 15],
			[5.5, 15]
		],

		badTree1: [
			[0, 0],
			[2, 6],
			[1, 5.5]
		],
		badTree2: [
			[2, 0],
			[2, 6],
			[1, 5.5],
		],
		badTree3: [
			[4, 0],
			[4, 10],
			[1.8, 9.5]
		],
		badTree4: [
			[0, 6],
			[3, 11],
			[1.5, 10.5]
		],
		badTreeL1: [
			[8, 0],
			[9, 14],
			[4.5, 13.5]
		],
		badTreeL2: [
			[3, 14],
			[9, 10],
			[5, 9.5]
		],
		badLump: [
			[3, 10],
			[5, 3],
			[2.5, 2.6]
		],







		birchCanopy1: [
			[0, 39],
			[8, 8]
		],
		birchCanopy2: [
			[8, 39],
			[7, 7]
		],
		birchCanopy3: [
			[15, 39],
			[8, 8]
		],
		birchCanopy4: [
			[23, 39],
			[7, 7]
		],
		birchBranches1: [
			[0, 47],
			[6, 7]
		],
		birchBranches2: [
			[6, 47],
			[6, 7]
		],
		birchBranches3: [
			[12, 47],
			[7, 6]
		],
		birchBranches4: [
			[19, 47],
			[7, 6]
		],

		oakCanopy1: [
			[12, 0],
			[11, 10]
		],
		oakCanopy2: [
			[0, 22],
			[10, 9]
		],
		oakCanopy3: [
			[10, 22],
			[11, 12]
		],
		oakBranches1: [
			[14, 10],
			[8, 9]
		],
		oakBranches2: [
			[0, 31],
			[9, 8]
		],
		oakBranches3: [
			[21, 19],
			[10, 10]
		],
	},
	TileEntities: {
		sheet: getImage(`img/tileEntities.png`),
		sign: [
			1e1001,
			...animSizesDefault,
			[[0, 0]]
		],
		lever: [
			1e1001,
			...animSizesDefault,
			[[0, 1], [1, 1]]
		],
		torch: [
			5,
			...animSizesDefault,
			[[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[15,2]]
		],
		stickHolder: [
			1e1001,
			...animSizesDefault,
			[[0, 3], [1, 3]]
		],
		chocInven: [
			1e1001,
			...animSizesDefault,
			[[0, 4]]
		],
		chocWorld: [
			1e1001,
			...animSizesDefault,
			[[1, 4]]
		],
		sword: [
			1e1001,
			...animSizesDefault, 
			[[0, 5]]
		],
		window: [
			1e1001,
			[1, 2],
			[0.5, 1],
			[[0, 6]]
		],
		gate: [
			1e1001,
			[2, 0.5],
			[1, 0.25],
			[[3,3]],
		],
		gateFall: [
			5,
			[2, 0.5],
			[1, 0.25],
			[[3,3],[3,3.5],[3,4],[3,4.5],[3,5],[3,5.5],[3,6],[3,6.5],[3,7],[3,7.5],[3,8],[3,8.5],[3,9],[3,9.5]]
		],
		zText: [
			1e1001,
			...animSizesDefault,
			[[15,0]]
		]
	},

	//specific entities - moths, (clouds)?
};






//texture classes - I moved them here to un-clutter the objects.js file

class Texture {
	/**
	 * A texture, used to draw animated images quickly.
	 * @param {Image} spriteSheet the image source of the texture
	 * @param {Integer} imageSize The number of pixels per texture unit size
	 * @param {data} textureData Various data about the texture. See the top of textures.js.
	 * @param {Boolean} loop whether the texture should loop or freeze after finishing.
	 * @param {Boolean} backwards whether the texture should be drawn horizontally mirrored
	 */
	constructor(spriteSheet, imageSize, textureData, loop, backwards) {
		//split textureData into its component parts
		var [imageChangeTime, textureSize, centerCoordinates, coordinates] = textureData;
		this.backwards = backwards ?? false;
		this.looping = loop;
		this.dims = textureSize;
		this.center = centerCoordinates;
		this.sheet = spriteSheet;
		this.size = imageSize;
		this.frames = coordinates;
		this.frame = 0;
		this.changeTime = imageChangeTime;
	}

	/**
	 * 
	 * @param {Number} x The x pixel to draw the center of the image at
	 * @param {Number} y The y pixel to draw the center of the image at
	 * @param {Number} pxUnitSize How large in pixels one image unit should display
	 * @param {Number} dt How many milliseconds this drawing spans
	 */
	draw(x, y, pxUnitSize, dt) {
		//error checking so the console isn't spammed with the longer error
		if (dt == undefined) {
			console.error(`dt is undefined!`);
			return;
		}
		//change current frame
		this.frame += dt / this.changeTime;
		if (this.frame > this.frames.length - 1) {
			this.frame = this.looping ? (this.frame % this.frames.length) : (this.frames.length - 0.01);
		}


		//need to offset because drawImage draws from the top left corner
		var xOff = -this.center[0] * pxUnitSize;
		var yOff = -this.center[1] * pxUnitSize;

		var pw = pxUnitSize * this.dims[0];
		var ph = vScale * pxUnitSize * this.dims[1];

		//transforming
		ctx.setTransform(boolToSigned(!this.backwards), 0, 0, 1, x + xOff * boolToSigned(!this.backwards), y + yOff);
		//debug rect
		if (editor_active) {
			ctx.beginPath();
			ctx.strokeStyle = "#F0F";
			ctx.lineWidth = canvas.height / 200;
			ctx.rect(0, 0, pw, ph);
			ctx.stroke();
		}
		try {
			ctx.drawImage(this.sheet, this.size * this.frames[Math.floor(this.frame)][0] * this.dims[0], vScale * this.size * this.frames[Math.floor(this.frame)][1] * this.dims[1], this.size * this.dims[0], vScale * this.size * this.dims[1], 
						0, 0, pw, ph);
		} catch (error) {
			console.log(error, `problem trying to draw frame ${Math.floor(this.frame)}, with frames ${JSON.stringify(this.frames)}`);
		}
		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	reset() {
		this.frame = 0;
	}

	rewindBy(time) {
		this.frame -= time / this.changeTime;
		while (this.frame < 0) {
			this.frame += this.frames.length;
		}
	}
}

class Roof {
	/**
	 * Creates an entity that acts as a roof/wall for a building. Accepts all different shapes of roofs, and becomes transparent when the player walks underneath a specified area.
	 * @param {Number} x The origin x coordinate of the roof, in world units
	 * @param {Number} y The origin y coordinate of the roof, in world units
	 * @param {Char} layer The world layer the roof should be on
	 * @param {Integer} sheetID the ID of the sheet to use for textures. [1-2]
	 * @param {Number[][]|String} dimensionData The texture [x,y],[width,height],[originX, originY] data 
	 * @param {?Number[][]|undefined} collisionPoly OPTIONAL: the bounding box that will make the roof transluscent
	 */
	constructor(x, y, layer, sheetID, dimensionData, collisionPoly) {
		this.sheet = (sheetID == 1) ? data_textures.Roofs.sheet : data_textures.Roofs.sheet2;
		this.sheetID = sheetID;
		this.scale = data_textures.Roofs.tileSize;
		this.sx = dimensionData[0][0];
		this.sy = dimensionData[0][1];
		this.x = x;
		this.y = y;
		this.layer = layer;
		this.w = dimensionData[1][0];
		this.h = dimensionData[1][1];

		this.offsetX = -dimensionData[2][0];
		this.offsetY = -dimensionData[2][1];

		this.collider = collisionPoly ?? [];
		this.colliderXBounds;
		this.colliderYBounds;
		this.calculateColliderBounds();

		this.alphaTime = 0;
		this.alphaTimeMax = 15;
		this.minOpacity = 0.1;
		this.maxOpacity = 1;
	}

	calculateColliderBounds() {
		this.colliderXBounds = [1e1001, -1e1001];
		this.colliderYBounds = [1e1001, -1e1001];
		this.collider.forEach(p => {
			this.colliderXBounds[0] = Math.min(this.colliderXBounds[0], p[0] - 1);
			this.colliderXBounds[1] = Math.max(this.colliderXBounds[1], p[0] + 1);
			this.colliderYBounds[0] = Math.min(this.colliderYBounds[0], p[1] - 1);
			this.colliderYBounds[1] = Math.max(this.colliderYBounds[1], p[1] + 1);
		});
	}

	tick() {
		//only check collider if the player's nearby
		if (this.alphaTime > 0) {
			this.alphaTime -= 1;
		}
		if (player.x < this.colliderXBounds[0] || player.x > this.colliderXBounds[1] || player.y < this.colliderYBounds[0] || player.y > this.colliderYBounds[1]) {
			return;
		}
		//increase alphaTime when the player is under
		//the inPoly algorithm is slightly broken in that having the same y coordinate as a corner will count as two intersections when it should count as one.
		//To fix this I adjust the y coordinate of the player to something it's very difficult for the player to line up with
		if (inPoly([player.x + 0.01, player.y + 0.01], this.collider)) {
			this.alphaTime = clamp(this.alphaTime + 2, 0, this.alphaTimeMax);
		}
	}

	draw() {
		//first check if self should be drawn at all
		if (!isOnScreen(this.x + this.offsetX, this.y + this.offsetY, this.w, this.h)) {
			return;
		}

		//draw self
		var screenPos = spaceToScreen(this.x + this.offsetX, this.y + this.offsetY);
		ctx.globalAlpha = linterp(this.maxOpacity, this.minOpacity, this.alphaTime / this.alphaTimeMax);
		ctx.drawImage(this.sheet, this.sx * this.scale, this.sy * this.scale, this.w * this.scale, this.h * vScale * this.scale, screenPos[0], screenPos[1], this.w * camera.scale, this.h * vScale * camera.scale);
		ctx.globalAlpha = 1;

		//draw collider in editor
		if (editor_active) {
			if (this.collider.length > 1) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = color_editorPolygon;
				ctx.beginPath();
				ctx.moveTo(...spaceToScreen(...this.collider[0]));
				for (var h=1; h<this.collider.length; h++) {
					ctx.lineTo(...spaceToScreen(...this.collider[h]));
				}
				ctx.lineTo(...spaceToScreen(...this.collider[0]));
				ctx.stroke();
			}
		}
	}

	giveDimensionData() {
		return [
			[this.sx, this.sy],
			[this.w, this.h],
			[-this.offsetX, -this.offsetY]
		]
	}

	giveStringData() {
		var dimData = this.giveDimensionData();

		//try to find the bit in the textures arr that's equal
		var name = roofNameFromData(dimData);
		//x, y, layer, sheetID, dimensionData, collisionPoly
		return `Roof~${this.x}~${this.y}~${this.layer}~${this.sheetID}~${(name != "") ? `data_textures.Roofs.${name}` : JSON.stringify(dimData)}~${JSON.stringify(this.collider)}`;
	}
}