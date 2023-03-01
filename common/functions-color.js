/*
a set of functions dealing with manipulating color. Generally in hex form because that's what's most esoteric, but may also do other things


INDEX
linterp(a, b, t)
cBreakdown(hexRGBA)
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