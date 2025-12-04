window.onload = setup;

var colorGrid = "#FFF";
var colorBG = "#000";
var colorCoefs = ["#F00", "#0F0", "#00F"];
var colorRoots = "#F8F";

var canvasScale = 100;
var coefficients = [
	[1, 0],
	[-1, 0],
	[2, 0]
];
var dragPoint;

var canvas;
var ctx;
var centerX;
var centerY;

var pointSize = 0.04;

//setup function
function setup() {
	canvas = document.getElementById("cavalier");
	ctx = canvas.getContext("2d");

	//changing canvas size for window
	canvas.width = Math.floor(window.innerWidth * 0.9);
	canvas.height = Math.floor(window.innerHeight * 0.85);
	centerX = canvas.width / 2;
	centerY = canvas.height / 2;
	ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
	ctx.lineJoin = "round";

	main();
}

function main() {
	ctx.fillStyle = "#000";
	ctx.fillRect(-centerX, -centerY, canvas.width, canvas.height);
	//draw the grid
	drawGrid();
	drawRoots();
	drawCoefficients();
	//draw the coefficients
}


//input handling functions
function handleMouseDown_custom() {
	//if close to a point, start editing it
	var cursorWorldPos = [((cursor.x - centerX) / canvasScale), ((cursor.y - centerY) / canvasScale)];
	var minDist = 1e1001;
	var minPoint = -1;
	var dist;
	for (var j=0; j<coefficients.length; j++) {
		dist = sub(cursorWorldPos, coefficients[j]);
		dist = dist[0] ** 2 + dist[1] ** 2;
		if (dist < minDist) {
			minDist = dist;
			minPoint = j;
		}
	}

	if (minDist < pointSize) {
		dragPoint = coefficients[minPoint];
		console.log('hi', dragPoint);
	}
}

function handleMouseMove_custom() {
	if (dragPoint) {
		dragPoint[0] = (cursor.x - centerX) / canvasScale;
		dragPoint[1] = (cursor.y - centerY) / canvasScale;
		main();
	}
}

function handleMouseUp_custom() {
	dragPoint = undefined;
}







//drawing functions
function drawLine(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function drawWorldLine(x1, y1, x2, y2) {
	drawLine(x1 * canvasScale, y1 * canvasScale, x2 * canvasScale, y2 * canvasScale);
}

function drawGrid() {
	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = canvas.height / 300;
	var wo = 0.1;
	drawLine(0, -centerY, 0, centerY);
	drawLine(-centerX, 0, centerX, 0);

	//messy. fix later
	for (var n=-4; n<=4; n++) {
		drawWorldLine(n, -wo, n, wo);
		drawWorldLine(-wo, n, wo, n);
	}

}

function drawRoots() {
	var pts = quadraticFormula(...coefficients);
	pts.forEach(p => {
		drawPoint(...p, colorRoots);
	});
}

function drawPoint(worldX, worldY, color) {
	console.log(worldX, worldY, color);
	ctx.fillStyle = color;
	drawCircle(worldX * canvasScale, worldY * canvasScale, pointSize * canvasScale);
	ctx.fill();
}

function drawCoefficients() {
	for (var x=0; x<coefficients.length; x++) {
		drawPoint(coefficients[x][0], coefficients[x][1], colorCoefs[x]);
	}
}






//strictly math functions
function add(z1, z2) {
	return [z1[0] + z2[0], z1[1] + z2[1]];
}

function sub(z1, z2) {
	return [z1[0] - z2[0], z1[1] - z2[1]];
}

function neg(z) {
	return [-z[0], -z[1]];
}

function conj(z) {
	return [z[0], -z[1]];
}

//foil: (a + bi)(c + di) = ac - bd + (ad + bc)i
function mult(z1, z2) {
	return [
		z1[0] * z2[0] - z1[1] * z2[1],
		z1[0] * z2[1] - z1[1] * z2[0]
	];
}

//scales a complex number by a scalar value x
function scale(z, x) {
	return [z[0] * x, z[1] * x];
}

//messy
function div(z1, z2) {
	var c2d2 = z2[0]*z2[0] + z2[1]*z2[1];
	return [
		(z1[0] * z2[0] + z1[1] * z2[1]) / c2d2, 
		(z1[1] * z2[0] - z1[0] * z2[1]) / c2d2
	];
}

function quadraticFormula(a, b, c) {
	var J = JSON.stringify;
	//quadratic formula: (-b ± sqrt(b^2 - 4ac)) / 2a
	//reformulate this for simple operations:
	// (±sqrt(b^2 - 4ac) - b) / 2a
	var discs = sqrt(sub(mult(b, b), scale(mult(a, c), 4)));
	console.log(`
		ac: ${J(mult(a, c))}
		4ac: ${J(scale(mult(a, c), 4))}
		b2: ${J(mult(b, b))}
		disc: ${J(sub(mult(b, b), scale(mult(a, c), 4)))}
		sqrtdisc: ${J(discs)}`);
	
	return [
		div(sub(discs[0], b), scale(a, 2)),
		div(sub(discs[1], b), scale(a, 2))
	];
}

function sqrt(z) {
	//temp
	return ntrt(z, 2);
}

function cbrt(z) {
	//temp
	return ntrt(z, 3);
}

function ntrt(z, n) {
	//convert to polar coordinates
	var [r, theta] = XYToPol(z[0], z[1]);
	var sliceSize = 2 * Math.PI / n;
	console.log(`@[${r}, ${theta}]`);

	//angles are divided, distances act as normal
	//modulate so we get only the smallest possible root
	theta = (theta / n);
	r = r ** (1 / n);

	console.log(`-> @[${r}, ${theta}]`);

	//return *all* the roots
	var roots = [];
	for (var y=n-1; y>=0; y--) {
		roots[y] = polToXY(0, 0, theta + sliceSize * y, r);
	}

	console.log(`returning ${JSON.stringify(roots)}`);
	return roots;
}





//stolen from common/functions-coordinate
function polToXY(startX, startY, angle, magnitude) {
	var xOff = magnitude * Math.cos(angle);
	var yOff = magnitude * Math.sin(angle);
	return [startX + xOff, startY + yOff];
}

function rotate(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
}

//takes in xy coords and turns into polar coordinates, in [distance, angle] format
function XYToPol(x, y) {
	return [Math.sqrt(x * x + y * y), (Math.atan2(y, x) + (Math.PI * 2))];
}