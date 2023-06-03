

class Player {
	constructor() {

	}

	tick() {

	}

	draw() {

	}
}






class Texture {
	/**
	 * 
	 * @param {Image} spriteSheet the image source of the texture
	 * @param {Integer} imageSize The number of pixels per texture unit size
	 * @param {Number} drawsBeforeImageChange how many times to draw each frame before switching to the next
	 * @param {Number[]} textureSize how many units the texture is
	 * @param {Number[]} centerCoordinates what unit position should be considered the center. These are the corrdinates that will be rotated around.
	 * @param {Integer[][]} coordinates an array of frame coordinates (EX: [[1, 1], [0, 1], [0, 0]])
	 * @param {Boolean} loop should the texture loop when it's finished? 
	 */
	constructor(spriteSheet, imageSize, drawsBeforeImageChange, textureSize, centerCoordinates, coordinates, loop) {
		this.looping = loop;
		this.dims = textureSize;
		this.center = centerCoordinates;
		this.sheet = spriteSheet;
		this.size = imageSize;
		this.frames = coordinates;
		this.frame = 0;
		this.amount = 1 / drawsBeforeImageChange;
	}

	/**
	 * 
	 * @param {Number} x The x pixel to draw the center of the image at
	 * @param {Number} y The y pixel to draw the center of the image at
	 * @param {Radian} rotation how far to rotate the image clockwise
	 * @param {Number} pxUnitSize How large in pixels one image unit should display
	 */
	draw(x, y, rotation, pxUnitSize) {
		//change current frame
		this.frame += this.amount;
		if (this.frame > this.frames.length - 1) {
			this.frame = this.looping ? (this.frame % this.frames.length) : (this.frames.length - 1);
		}


		//need to offset because drawImage draws from the top left corner
		var iHat = [pxUnitSize * Math.cos(rotation), pxUnitSize * Math.sin(rotation)];
		var jHat = [iHat[1], -iHat[0]];
		var xOff = -this.center[0] * iHat[0] + this.center[1] * jHat[0];
		var yOff = -this.center[0] * iHat[1] + this.center[1] * jHat[1];
		//transforming
		ctx.translate(x + xOff, y + yOff);
		ctx.rotate(rotation);
		try {
			ctx.drawImage(this.sheet, this.size * this.frames[Math.floor(this.frame)][0], this.size * this.frames[Math.floor(this.frame)][1], this.size * this.dims[0], this.size * this.dims[1], 
						0, 0, pxUnitSize * this.dims[0], pxUnitSize * this.dims[1]);
		} catch (error) {
			console.log(error, `problem trying to draw frame ${Math.floor(this.frame)}, with frames ${JSON.stringify(this.frames)}`);
		}
		ctx.rotate(-rotation);
		ctx.translate(-(x + xOff), -(y + yOff));

		//debug info
		// ctx.beginPath();
		// ctx.strokeStyle = "#F00";
		// ctx.moveTo(x, y);
		// ctx.lineTo(x + iHat[0], y + iHat[1]);
		// ctx.stroke();
		// ctx.beginPath();
		// ctx.strokeStyle = "#0F0";
		// ctx.moveTo(x, y);
		// ctx.lineTo(x + jHat[0], y + jHat[1]);
		// ctx.stroke();
	}

	reset() {
		this.frame = 0;
	}
}