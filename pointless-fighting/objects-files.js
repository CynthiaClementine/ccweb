class AudioChannel {
	constructor(volume) {
		this.volume = volume;
		this.currentVolume = volume;
		this.targetAudio = undefined;
		this.audio = undefined;
		this.time = 0;
	}

	tick() {
		//if the current sound isn't played, then play it. Also does looping.
		if (this.audio != undefined) {
			if (this.audio[0].paused || this.audio[0].currentTime + audio_tolerance >= this.audio[0].duration) {
				this.time = 0;
				this.reset();
			}

			//if past the correct time, do loop
			if (this.audio[1] && this.audio[0].currentTime + audio_tolerance >= this.audio[3]) {
				//I do it this way so that the time subtracted will always be the same, even if there's imprecision in exactly when the subtraction happens.
				this.audio[0].currentTime -= this.audio[3] - this.audio[2];
			}
		}

		//changing audio
		this.change();

		//set volume
		if (this.audio != undefined) {
			this.audio[0].volume = this.volume * (1 - (this.time / audio_fadeTime));
		}
	}

	change() {
		//if the audios are different, fade them out and then play
		if (this.targetAudio != this.audio) {
			this.time += 1;

			//if time is up, snap volume up and change audio
			//alternatively, a change from undefined happens instantly
			if (this.time > audio_fadeTime || this.audio == undefined) {
				this.time = 0;
				if (this.audio != undefined) {
					this.audio[0].pause();
				}
				this.audio = this.targetAudio;
				if (this.audio != undefined) {
					this.reset();
				}
			}
		} else {
			if (this.time > 0) {
				console.log('time is too great!!');
			}
		}
	}

	//starts playing the current audio file, from the beginning
	reset() {
		this.audio[0].currentTime = 0;
		this.audio[0].volume = this.volume;
		this.audio[0].play();
	}
}



class Palette {
	constructor(image, spriteSize) {
		this.sheet = image;
		this.size = spriteSize;
	}

	drawTexture(dataNum, worldX, worldY, drawX, drawY, drawSize) {
		var mappedNum = tileImage_map[dataNum];
		if (mappedNum == undefined) {
			console.error(`"${dataNum}" is not in the tile mapping!`);
			return;
		}

		if (mappedNum >= 96) {
			//terrain
			ctx.drawImage(this.sheet, this.size * Math.abs(worldX % 3), this.size * (Math.abs(worldY % 2) + ((mappedNum - 96) * 2)), this.size, this.size, drawX, drawY, drawSize, drawSize);
		} else {
			//special tiles
			ctx.drawImage(this.sheet, this.size * Math.abs(worldX % 3), this.size * Math.abs(worldY % 2), this.size, this.size, drawX, drawY, drawSize, drawSize);
			ctx.drawImage(this.sheet, this.size * (4 + mappedNum % 12), this.size * Math.floor(mappedNum / 12), this.size, this.size, drawX, drawY, drawSize, drawSize);
		}
	}
}


class Palette_Empty {
	constructor() {
	}

	drawTexture(dataNum, worldX, worldY, drawX, drawY, drawSize) {
		drawSize -= 2;
		if (dataNum !== " ") {
			ctx.fillRect(drawX + 1, drawY + 1 + (drawSize * (1 - render_vSquish)), drawSize, drawSize * render_vSquish);

			if (dataNum !== "0") {
				ctx.fillStyle = color_text_light;
				ctx.fillText(dataNum, drawX + (drawSize / 2), drawY + drawSize * render_vSquish * 0.8);
				ctx.fillStyle = color_collision;
			}
		}
	}
}


//"image coordinates" are units of spriteSize each.
class Texture {
	constructor(image, spriteSize, imgX, imgY, width, height, centerCoords) {
		this.sheet = image;
		//the scale from image coordinates to pixel coordinates
		this.size = spriteSize;
		//the starting point of the texture drawing
		this.imgX = imgX;
		this.imgY = imgY;
		this.imgW = width;
		this.imgH = height;
		this.cX = centerCoords[0];
		this.cY = centerCoords[1];
	}

	drawTexture() {
	}
}

class Texture_Animated {
	constructor(image, spriteSize, widthInImageCoords, heightInImageCoords, centerCoords, frameOffsets, drawsBeforeImageChange, loopingBOOLEAN) {
		this.sheet = image;
		this.size = spriteSize;
		this.w = widthInImageCoords;
		this.h = heightInImageCoords;
		this.center = centerCoords;

		this.frames = frameOffsets;
		this.frame = 0;
		this.frameSpeed = 1 / drawsBeforeImageChange;
		this.loop = loopingBOOLEAN;
	}

	drawTexture(drawX, drawY, squareSize) {
		//draw the texture
		try {
			var frame = this.frames[Math.floor(this.frame)];
			ctx.drawImage(this.sheet, this.size * frame[0], this.size * frame[1], this.size * this.w, this.size * this.h, drawX - (squareSize * this.center[0]), drawY - (squareSize * this.center[1]), squareSize * this.w, squareSize * this.h);
		} catch (er) {
			console.error(er, `problem drawing animated texture! On frame ${this.frame} with frames ${JSON.stringify(this.frames)}`);
		}

		//do looping stuff
		this.frame += this.frameSpeed;
		if (this.frame >= this.frames.length) {
			if (this.loop) {
				this.frame = 0;
			} else {
				this.frame = this.frames.length - 1;
			}
		}
	}
}

//for a set of textures that aren't necessarily connected to each other in a linear order
class Texture_Set {
	constructor(image, spriteSize, frameData) {
		//frame data is an array of [position, dimensions, center], which are all in image coords
		this.sheet = image;
		this.sz = spriteSize;
		this.frames = frameData;
	}

	drawTexture(frame, drawX, drawY, squareSize) {
		try {
			var frm = this.frames[frame];
			ctx.drawImage(this.sheet, this.sz * frm[0][0], this.sz * frm[0][1], this.sz * frm[1][0], this.sz * frm[1][1], drawX - (squareSize * frm[2][0]), drawY - (squareSize * frm[2][1]), squareSize * frm[1][0], squareSize * frm[1][1]);
		} catch (er) {
			console.error(`problem drawing texture with parameters ${frame}, ${drawX}, ${drawY}, ${squareSize}, in set ${JSON.stringify(this.frames)}!`);
		}
	}
}