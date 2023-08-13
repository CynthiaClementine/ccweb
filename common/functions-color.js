/*
a set of functions dealing with manipulating color. Generally in hex form because that's what's most esoteric, but may also do other things


INDEX
linterp(a, b, t)
cBreakdownRGBA(rgbaString)
cBrightness(hex)
cLinterp(hex1, hex2, percentage)
cInvert(hex)
*/


//because I don't feel like importing another import for my import
function linterp(a, b, percent) {
	return a + ((b - a) * percent);
}

/**
 * Takes in an RGBA hex code, and returns an object containing the red, green, blue, and opacity values of that color
 * @param {String} hexRGBA the value to interpret
 */
function cBreakdown(hexRGBA) {
	//if it's a short hex code
	if (hex.length == 4) {
		return {
			r: parseInt(hex[1], 16) * 17,
			b: parseInt(hex[2], 16) * 17,
			g: parseInt(hex[3], 16) * 17,
			a: 1
		};
	}
	return {
		r: parseInt(hex.slice(1, 3), 16),
		b: parseInt(hex.slice(3, 5), 16),
		g: parseInt(hex.slice(5, 7), 16),
		a: (hexRGBA.length > 7) ? parseInt(hex.slice(7, 9), 16) / 255 : 1
	};
}

function cBreakdownRGBA(rgbaString) {
	var split = rgbaString.split(" ");
	return {
		r: +split[0].slice(5, -1),
		g: +split[1].slice(0, -1),
		b: +split[2].slice(0, -1),
		a: +split[3].slice(0, -1)
	};
}

//returns a 0-1 apparent brightness of a hex color
function cBrightness(hex) { 
	if (hex == undefined) {
		return 0;
	}

	var r = parseInt(hex.slice(1, 3), 16) / 255;
	var g = parseInt(hex.slice(3, 5), 16) / 255;
	var b = parseInt(hex.slice(5, 7), 16) / 255;
	//weight different colors differently to adjust for eye perception
	return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
}


function cLinterp(hex1, hex2, percentage) {
	if (hex1 == undefined) {
		hex1 = "#000000";
	}
	if (hex2 == undefined) {
		hex2 = "#000000";
	}

	//performing a linear interpolation on all 3 aspects
	var finR = linterp(parseInt(hex1[1] + hex1[2], 16), parseInt(hex2[1] + hex2[2], 16), percentage);
	var finG = linterp(parseInt(hex1[3] + hex1[4], 16), parseInt(hex2[3] + hex2[4], 16), percentage);
	var finB = linterp(parseInt(hex1[5] + hex1[6], 16), parseInt(hex2[5] + hex2[6], 16), percentage);
	//converting back to hex
	return ("#" + Math.floor(finR).toString(16).padStart(2, "0") + Math.floor(finG).toString(16).padStart(2, "0") + Math.floor(finB).toString(16).padStart(2, "0"));
}

function cInvert(hex) {
	if (hex == undefined) {
		return "#FFFFFF";
	}

	var finR = 255 - parseInt(hex.slice(1, 3), 16);
	var finG = 255 - parseInt(hex.slice(3, 5), 16);
	var finB = 255 - parseInt(hex.slice(5, 7), 16);
	//converting back to hex
	return ("#" + Math.floor(finR).toString(16).padStart(2, "0") + Math.floor(finG).toString(16).padStart(2, "0") + Math.floor(finB).toString(16).padStart(2, "0"));
}

/**
 * takes in an RGB object, and returns an HSV object
 * @param {Object} RGBObj an object that contains r, g, and b properties
 */
function HSVtoRGB(hsvObj) {
	if (hsvObj.h < 0) {
		hsvObj.h += 360;
	}
	//I don't understand most of this but it appears to work
	var compound = hsvObj.v * (hsvObj.s / 100);
	var x = compound * (1 - Math.abs(((hsvObj.h / 60) % 2) - 1));
	var mystery = hsvObj.v - compound;
	var RGB = [0, 0, 0];

	switch(Math.floor(hsvObj.h / 60)) {
		case 0:
			RGB = [compound, x, 0];
			break;
		case 1:
			RGB = [x, compound, 0];
			break;
		case 2:
			RGB = [0, compound, x];
			break;
		case 3:
			RGB = [0, x, compound];
			break;
		case 4:
			RGB = [x, 0, compound];
			break;
		case 5:
			RGB = [compound, 0, x];
			break;
	}

	RGB = [
		Math.floor((RGB[0] + mystery) * 255), 
		Math.floor((RGB[1] + mystery) * 255), 
		Math.floor((RGB[2] + mystery) * 255)
	];

	return {
		r: RGB[0],
		g: RGB[1],
		b: RGB[2],
		a: hsvObj.a
	};
}

function RGBtoHSV(rgbObj) {
	var r = rgbObj.r / 255;
	var g = rgbObj.g / 255;
	var b = rgbObj.b / 255;
	var cMax = Math.max(r, g, b);
	var cMin = Math.min(r, g, b);
	var delta = cMax - cMin;

	var hsvObj = {
		h: 0,
		s: (cMax == 0) ? 0 : delta / cMax,
		v: cMax,
		a: rgbObj.a
	};

	//hue calculation
	if (delta == 0) {
		hsvObj.h = 0;
	} else {
		switch (cMax) {
			case r:
				hsvObj.h = 60 * (((g - b) / delta) % 6);
				break;
			case g:
				hsvObj.h = 60 * ((b - r) / delta + 2);
				break;
			case b:
				hsvObj.h = 60 * ((r - g) / delta + 4);
				break;
		}
	}
	return hsvObj;
}