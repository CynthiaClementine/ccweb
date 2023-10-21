

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
			2 / 24,
			...animSizesDefault,
			[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0]]
		],
		walkFront: [
			2 / 24,
			...animSizesDefault,
			[[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [14, 1], [15, 1]]
		],
		walkBack: [
			2 / 24,
			...animSizesDefault,
			[[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2]]
		]
	},
	DreamSkaters: {
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
			1 / 30,
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
	},
	Roofs: {
		//the texture data here is different. Since none of the roofs are animated, there's no animation time or center.
		//Instead it's just [xPos, yPos], [xSize, ySize]
		sheet: getImage(`img/roofs.png`, true),
		tileSize: 60,
		pHouse: [
			[0, 0],
			[10, 8]
		],
		lHouse: [
			[23, 0],
			[15.9, 16]
		],
		wHouse: [
			[0, 8],
			[14, 14]
		],
		castle: [
			[39, 0],
			[]
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

	//specific entities - dream skater, moths, (clouds)?
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
			ctx.drawImage(this.sheet, this.size * this.frames[Math.floor(this.frame)][0], vScale * this.size * this.frames[Math.floor(this.frame)][1], this.size * this.dims[0], vScale * this.size * this.dims[1], 
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

class Texture_Roof {
	/**
	 * Creates an entity that acts as a roof for a building. Accepts all different shapes of roofs, and becomes transparent when the player walks underneath a specified area.
	 * @param {Image} sheet the image to use for texture reference
	 * @param {Number} tileSize pixel size of each world unit
	 * @param {Number} sheetX the left texture x coordinate, in world units
	 * @param {Number} sheetY the top texture y coordinate, in world units
	 * @param {Number} x the world x coordinate to start drawing the roof
	 * @param {Number} y the world y coordinate to start drawing the roof
	 * @param {Number} width how wide the roof is, in world units
	 * @param {Number} height how tall the roof is, in world units.
	 * @param {Number[][]} collisionPoly The [x, y] points of the polygon that counts as being under the roof. 
	 * The roof will become transparent if the player is inside this polygon.
	 */
	constructor(sheet, tileSize, sheetX, sheetY, x, y, width, height, collisionPoly) {
		this.sheet = sheet;
		this.scale = tileSize;
		this.sx = sheetX;
		this.sy = sheetY;
		this.x = x;
		this.y = y;
		this.w = width;
		this.h = height;

		this.collider = collisionPoly;
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
		if (!isOnScreen(this.x, this.y, this.w, this.h)) {
			return;
		}


		//draw self
		var screenPos = spaceToScreen(this.x, this.y);
		ctx.globalAlpha = linterp(this.maxOpacity, this.minOpacity, this.alphaTime / this.alphaTimeMax);
		ctx.drawImage(this.sheet, this.sx * this.scale, this.sy * this.scale, this.w * this.scale, this.h * this.scale, screenPos[0], screenPos[1], this.w * camera.scale, this.h * camera.scale);
		ctx.globalAlpha = 1;

		//draw collider in editor
		if (editor_active) {
			drawCircle(screenPos[0], screenPos[1], 10, "#000");

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
}