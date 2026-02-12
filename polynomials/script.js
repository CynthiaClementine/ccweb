window.onload = setup;
window.onresize = handleResize;

var colorGrid = "#FFF";
var colorBG = "#000";
var colorCoefs = ["#F00", "#0F0", "#00F"];
var colorRoots = "#FF88FF66";

var canvasScale = 100;
var coefficients = [
	[-1, 0],
	[-1, 0],
	[2, 0],
	[0, 0]
];
var multiCoefs = [
	[1, 0],
	[-1, 0],
	[2, 0]
];
var dragPoint;
var degree = 2;

var canvas;
var ctx;
var centerX;
var centerY;

var pointSize = 0.04;

var mode = `single`;

//setup function
function setup() {
	canvas = document.getElementById("cavalier");
	ctx = canvas.getContext("2d");

	//changing canvas size for window
	handleResize();

	((mode == `multi`) ? mainMulti : main)();
}

function main() {
	drawBackground();
	//draw the grid
	//single polynomial case
	switch (degree) {
		case 2:
			mainSingleQuadratic();
			break;
		case 3:
			mainSingleCubic();
			break;
	}
}

function mainSingleQuadratic() {
	drawBackground();

	//figure out all intermediate positions
	var o = [0, 0];
	var a = coefficients[0];
	var b = coefficients[1];
	var c = coefficients[2];
	var _b = neg(b);
	var b2 = mult(b, b);
	var b_2a = div(_b, scale(a, 2));
	var _4ac = scale(mult(a, c), 4);
	var disc = sub(b2, _4ac);
	var sqrtDiscs = sqrt(disc);
	var roots = quadraticFormula(...coefficients);
	var roots2 = quadraticFormulaNeg(...coefficients);

	drawGroup(coefficients, colorCoefs);

	ctx.lineWidth = canvas.height / 200;
	ctx.strokeStyle = `hsl(100, 50%, 50%)`;
	drawWorldLine(...o, ...b_2a);
	
	
	ctx.strokeStyle = `hsl(130, 50%, 50%)`;
	console.log(JSON.stringify(b2));
	drawWorldLine(...o, ...b2);
	drawWorldLine(...o, ..._4ac);
	
	ctx.strokeStyle = `hsl(160, 50%, 50%)`;
	drawWorldLine(...o, ...disc);
	
	ctx.strokeStyle = `hsl(180, 50%, 50%)`;
	drawWorldLine(...o, ...sqrtDiscs[0]);
	drawWorldLine(...o, ...sqrtDiscs[1]);
	
	ctx.strokeStyle = `hsl(210, 50%, 50%)`;
	drawWorldLine(...b_2a, ...roots[0]);
	drawWorldLine(...b_2a, ...roots[1]);

	drawGroup(roots, colorRoots);
	// drawGroup(roots2, "#00880088");
}

function mainSingleCubic() {
	drawBackground();
	drawGroup(coefficients, colorCoefs);
	drawGroup(roots, colorRoots);
}

function mainMulti() {
	ctx.fillStyle = "#000";
	ctx.fillRect(-centerX, -centerY, canvas.width, canvas.height);
	drawGrid();

	drawGroup(multiCoefs, "#262");

	//take coefficients, get all possible combinations and draw roots from it
	var num = multiCoefs.length ** (degree + 1);
	var intrep, roots;
	for (var h=0; h<num; h++) {
		intrep = h.toString(multiCoefs.length).padStart(degree + 1, "0");
		drawGroup(quadraticFormula(multiCoefs[intrep[0]], multiCoefs[intrep[1]], multiCoefs[intrep[2]]), colorRoots);
	}
}


//input handling functions
function handleMouseDown_custom() {
	var movables = ((mode == `multi`) ? multiCoefs : coefficients);

	//if close to a point, start editing it
	var cursorWorldPos = [((cursor.x - centerX) / canvasScale), ((cursor.y - centerY) / canvasScale)];
	var minDist = 1e1001;
	var minPoint = -1;
	var dist;
	for (var j=0; j<movables.length; j++) {
		dist = sub(cursorWorldPos, movables[j]);
		dist = dist[0] ** 2 + dist[1] ** 2;
		if (dist < minDist) {
			minDist = dist;
			minPoint = j;
		}
	}

	if (minDist < pointSize) {
		dragPoint = movables[minPoint];
	}
}

function handleMouseMove_custom() {
	if (dragPoint) {
		dragPoint[0] = (cursor.x - centerX) / canvasScale;
		dragPoint[1] = (cursor.y - centerY) / canvasScale;
		((mode == `multi`) ? mainMulti : main)();
	}
}

function handleMouseUp_custom() {
	dragPoint = undefined;
}

function handleResize() {
	canvas.width = Math.floor(window.innerWidth * 0.95);
	canvas.height = Math.floor(window.innerHeight * 0.9);
	centerX = canvas.width / 2;
	centerY = canvas.height / 2;
	ctx.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
	ctx.lineJoin = "round";
	pointSize = (canvas.height / canvasScale) * 0.008;

	((mode == `multi`) ? mainMulti : main)();
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

function drawBackground() {
	ctx.fillStyle = "#000";
	ctx.fillRect(-centerX, -centerY, canvas.width, canvas.height);
	drawGrid();
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

function drawGroup(arr, coloring) {
	var cFunc = (coloring.constructor.name == "String") ? 
		(n) => {return coloring;} : 
		(n) => {return coloring[n];}
	;

	for (var x=0; x<arr.length; x++) {
		drawPoint(arr[x][0], arr[x][1], cFunc(x));
	}
}

function drawPoint(worldX, worldY, color) {
	ctx.fillStyle = color;
	drawCircle(worldX * canvasScale, worldY * canvasScale, pointSize * canvasScale);
	ctx.fill();
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
		z1[0] * z2[1] + z1[1] * z2[0]
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

	//angles are divided, distances act as normal
	//modulate so we get only the smallest possible root
	theta = (theta / n);
	r = r ** (1 / n);

	//return *all* the roots
	var roots = [];
	for (var y=n-1; y>=0; y--) {
		roots[y] = polToXY(0, 0, theta + sliceSize * y, r);
	}

	return roots;
}


function quadraticFormula(a, b, c) {
	var J = JSON.stringify;
	//quadratic formula: (-b ± sqrt(b^2 - 4ac)) / 2a
	//reformulate this for simple operations:
	// (sqrt(b^2 - 4ac) - b) / 2a
	var discs = sqrt(sub(mult(b, b), scale(mult(a, c), 4)));
	/*console.log(`
		a: ${J(a)}
		b: ${J(a)}
		c: ${J(a)}
		ac: ${J(mult(a, c))}
		4ac: ${J(scale(mult(a, c), 4))}
		b2: ${J(mult(b, b))}
		disc: ${J(sub(mult(b, b), scale(mult(a, c), 4)))}
		sqrtdisc: ${J(discs)}`);*/
	
	return [
		div(sub(discs[0], b), scale(a, 2)),
		div(sub(discs[1], b), scale(a, 2))
	];
}

function quadraticFormulaNeg(a, b, c) {
	var discs = sqrt(sub(mult(b, b), scale(mult(a, c), 4)));

	return [
		div(sub(neg(discs[0]), b), scale(a, 2)),
		div(sub(neg(discs[1]), b), scale(a, 2))
	];
}


function cubicFormula(a, b, c, d) {
	/*the cubic formula is a mess.
	p = b^2 - 3ac
	q = 2b^3 - 9abc + 27a^2d
	C = cbrt((q ± sqrt(q^2 - 4p^3)) / 2)
	roots = -(1/3a) * (b + C + p / C)


		roots = cbrt{q + sqrt[q^2 + (r-p^2)^3]} + 
				cbrt{q - sqrt[q^2 + (r-p^2)^3]} + p

	unfortunately, the sqrt then cbrt means we can't wait to extract multiple values until the end. 
	There really will be 6 values here. Only 3 at the end though. somehow.
	*/

	var _ac = mult(a, c);
	var _a2 = mult(a, a);
	var _b2 = mult(b, b);
	var _3ac = scale(_ac, 3);
	var _2b3 = scale(mult(_b2, b), 2);
	var _9abc = mult(_3ac, scale(b, 3));
	var _27a2d = scale(mult(_a2, d), 27);


	var p = sub(_b2, _3ac);
	var q = add(_27a2d, sub(_2b3, _9abc));
	// var C = 




	var halfRoots = sqrt(add(q2, mult(rmp2, rmp22)));
	var fullRoots1 = cbrt()
	
	//
}

function quarticFormula(a, b, c, d, e) {

}

function solve(polynomial) {

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