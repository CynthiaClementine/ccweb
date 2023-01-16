/*
INDEX
cursorIsInBounds();
drawPoint(x, y, r);
setCanvasPreferences();
updateCursorPos(a);
*/


//takes a canvas xy and converts it to a workspace xy
function canvasToWorkspace(x, y) {
	return [(x - workspace_offsetX - canvas.width * workspace_margin) / workspace_scaling, (y - workspace_offsetY - canvas.height * workspace_margin) / workspace_scaling];
}

function workspaceToCanvas(x, y) {
	return [x * workspace_scaling + (canvas.width * workspace_margin) + workspace_offsetX, y * workspace_scaling + (canvas.height * workspace_margin) + workspace_offsetY];
}

function cursorIsInBounds() {
	return (cursor.x > 0 && cursor.y > 0 && cursor.x < canvas.width && cursor.y < canvas.height);
}


function drawPoint(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

function clampWorkspace() {
	var trueWorkW = workspace_width * workspace_scaling;
	var trueWorkH = workspace_height * workspace_scaling;

	//make sure workspace is on the screen
	workspace_offsetX = clamp(workspace_offsetX, -trueWorkW, canvas.width * (1 - workspace_margin * 2))
	workspace_offsetY = clamp(workspace_offsetY, -trueWorkH, canvas.height * (1 - workspace_margin * 2))

	//if the entire workspace is small enough on the screen, center it
	if (trueWorkW < canvas.width * 0.6 && workspace_height * workspace_scaling < canvas.height * 0.6) {
		
		workspace_offsetX = (canvas.width * (0.5 - workspace_margin)) - trueWorkW / 2;
		workspace_offsetY = (canvas.height * (0.5 - workspace_margin)) - trueWorkH / 2;
	}
}


function moveWorkspace(x, y) {
	//holding control zooms instead of moving up/down
	if (button_control) {
		var hoverPos = canvasToWorkspace(cursor.x, cursor.y);
		//keep scaling in bounds
		workspace_scaling = clamp(workspace_scaling * (1 + y * 0.001), ...workspace_scaleBounds);
		var newHoverPos = canvasToWorkspace(cursor.x, cursor.y);
		var delta = [newHoverPos[0] - hoverPos[0], newHoverPos[1] - hoverPos[1]];
		workspace_offsetX += delta[0] * workspace_scaling;
		workspace_offsetY += delta[1] * workspace_scaling;
	} else {
		workspace_offsetX -= x;
		workspace_offsetY -= y;
	}
	clampWorkspace();
}



function setCanvasPreferences() {
	ctx.lineWidth = 8;
	ctx.textBaseline = "middle";
	
	//setting margins
	var workHeightAvailable = canvas.height * (1 - timeline.height - (workspace_margin * 2));
	workspace_scaling = workHeightAvailable / workspace_height;
	clampWorkspace();
}

//takes in a set of points, and uses the Ramer-Douglas-Peucker algorithm to make the line simpler
function simplifyLineRDP(points, tolerance) {
	//if it's already two points don't bother
	if (points.length == 2) {
		return points;
	}

	//find the point that's farthest away 
	var farthest = 0;
	var farthestDist = 0;
	var dist;
	for (var f=1; f<points.length-1; f++) {
		dist = pointSegmentDistance(points[f], points[0], points[points.length-1]);
		if (dist > farthestDist) {
			farthestDist = dist;
			farthest = f;
		}
	}
	
	//if it's inside the tolerance range, then all points between the two ends will be inside the tolerance and can therefore be deleted
	if (farthestDist < tolerance) {
		return [points[0], points[points.length-1]];
	}

	//if it's outside the tolerance, split the line into two lines and then do it for those (:
	var seg1 = simplifyLineRDP(points.slice(0, farthest+1), tolerance);
	var seg2 = simplifyLineRDP(points.slice(farthest), tolerance)
	seg1.pop();
	return seg1.concat(seg2);
}

//removes duplicate points right next to each other
function simplifyLineDuplicates(points) {
	var newPts = [];
	var lastX = 1e1001;
	var lastY = 1e1001;
	for (var q=0; q<points.length; q++) {
		if (points[q][0] != lastX || points[q][1] != lastY) {
			[lastX, lastY] = points[q];
			newPts.push(points[q]);
		}
	}
	return newPts;
}

//given a set of points, generates an array of bezier curves to fit those points
function fitBezier(points, tolerance) {
	//figure out tangents at start/end
	var tanLeft = normalize(d2_subtract(points[1], points[0]));
	var tanRight = normalize(d2_subtract(points[points.length-2], points[points.length-1]));

	return fitBezier_h(points, tanLeft, tanRight, tolerance);
}

//helper method that does most of the work, but it's recursive and needs preparation the user won't do
function fitBezier_h(points, tanLeft, tanRight, errTolerance) {
	var iterTolerance = errTolerance ** 2;
	var iterMax = 4;
	//if there are only two points, approximate using the side tangents
	if (points.length == 2) {
		var computeDist = Math.sqrt((points[0][0] - points[1][0]) ** 2 + (points[0][1] - points[1][1]) ** 2);
		return [[
			[points[0][0], points[0][1]],
			d2_add(points[0], d2_scaleBy(tanLeft, computeDist)),
			d2_add(points[1], d2_scaleBy(tanRight, computeDist)),
			[points[1][0], points[1][1]]
		]];
	}

	//if there are more than two points, the bezier curve will need to be fitted onto them
	var timings = segmentTimings(points);
	var bezierOutput = fitBezier_initial(points, tanLeft, tanRight, timings);
	var [error, splitPoint] = fitBezier_error(points, timings, bezierOutput);
	//if the error is good, return the curve
	if (error < errTolerance) {
		return [bezierOutput];
	}

	//if the error is small enough, try to retime / remake the curve
	if (error < iterTolerance) {
		for (var m=0; m<iterMax; m++) {
			timings = retime(points, timings, bezierOutput);
			bezierOutput = fitBezier_initial(points, tanLeft, tanRight, timings);
			[error, splitPoint] = fitBezier_error(points, timings, bezierOutput);

			//error reduction is a success (:
			if (error < errTolerance) {
				return [bezierOutput];
			}
		}
	}
	


	//if retiming failed, split the curve at the point of most error and recurse
	var tanCenter = calculateTanCenter(points, splitPoint);
	return [].concat(fitBezier_h(points.slice(0, splitPoint+1), tanLeft, tanCenter, errTolerance), fitBezier_h(points.slice(splitPoint), d2_scaleBy(tanCenter, -1), tanRight, errTolerance))
}

//uses least-squares? look into this more
//credit goes to Philip J. Schneider
//credit does not go to him for an explanation though, because he appears to have magic code that neither him or anybody else will explain.
//the comments inside this function describe basic happenings. They do not describe why things are happening.
function fitBezier_initial(points, tanLeft, tanRight, timings) {
	var pointSpan = Math.sqrt((points[0][0] - points[points.length-1][0]) ** 2 + (points[0][1] - points[points.length-1][1]) ** 2);
	var zeroTolerance = 1e-6;
	var A = [];
	var C = [[0, 0], [0, 0]];
	var X = [0, 0];
	var scale1;
	var scale2;

	//A matrix
	for (var v=0; v<points.length; v++) {
		//compute As
		scale1 = bMystery(1, timings[v]);
		scale2 = bMystery(2, timings[v]);
		A[v] = [[tanLeft[0] * scale1, tanLeft[1] * scale1], [tanRight[0] * scale2, tanRight[1] * scale2]];
	}

	//C + X matrices
	var buffer1;
	for (var w=0; w<A.length; w++) {
		C[0][0]  += d2_dot(A[w][0], A[w][0]);
		C[0][1] += d2_dot(A[w][0], A[w][1]);
		C[1][0] = C[0][1];
		C[1][1] += d2_dot(A[w][1], A[w][1]);

		buffer1 = d2_subtract(points[w], 
			d2_add(
				d2_scaleBy(points[0], bMystery(0, timings[w])), 
				d2_add(
					d2_scaleBy(points[0], bMystery(1, timings[w])),
					d2_add(
						d2_scaleBy(points[points.length-1], bMystery(2, timings[w])),
						d2_scaleBy(points[points.length-1], bMystery(3, timings[w]))
					)
				)
			)
		);

		//dot products
		X[0] += d2_dot(A[w][0], buffer1);
		X[1] += d2_dot(A[w][1], buffer1);
	}

	//calculate matrix determinants
	var det_c0c1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
	var det_c0x = C[0][0] * X[1] - C[1][0] * X[0];
	var det_xc1 = X[0] * C[1][1] - X[1] * C[0][1];
	var alphaLeft = (det_c0c1 == 0) ? 0 : det_xc1 / det_c0c1;
	var alphaRight = (det_c0c1 == 0) ? 0 : det_c0x / det_c0c1;

	//alpha < 0 is bad, and alpha = 0 means control points intersect with first/last points (also bad)
	if (alphaLeft < zeroTolerance || alphaRight < zeroTolerance) {
		var dist = pointSpan / 3;
		return [
			[points[0][0], points[0][1]],
			d2_add(points[0], d2_scaleBy(tanLeft, dist)),
			d2_add(points[points.length-1], d2_scaleBy(tanRight, dist)),
			[points[points.length-1][0], points[points.length-1][1]]
		];
	}

	//bezier points go at the start/end points, and then alpha is the length of the control point rods
	return [
		[points[0][0], points[0][1]],
		d2_add(points[0], d2_scaleBy(tanLeft, alphaLeft)),
		d2_add(points[points.length-1], d2_scaleBy(tanRight, alphaRight)),
		[points[points.length-1][0], points[points.length-1][1]]
	];
}

function bMystery(n, u) {
	var uI = 1 - u;
	switch (n) {
		case 0:
			return uI*uI*uI;
		case 1:
			return 3*u*uI*uI;
		case 2:
			return 3*u*u*uI;
		case 3:
			return u*u*u;
	}
}

//says how much error is in a bezier fitting
function fitBezier_error(points, timings, curve) {
	//TODO: does deviation from ComputeMaxError cause issues?
	var error = 0;
	var errorPoint = 0;

	var bestP;
	var dist;
	for (var p=0; p<points.length; p++) {
		bestP = bezierPointFromT(...curve, timings[p]);	
		dist = (points[p][0] - bestP[0]) ** 2 + (points[p][1] - bestP[1]) ** 2;
		if (dist > error) {
			error = dist;
			errorPoint = p;
		}
	}


	return [error, errorPoint];
}

function calculateTanCenter(points, pointIndex) {
	var tanLeft = d2_subtract(points[pointIndex-1], points[pointIndex]);
	var tanRight = d2_subtract(points[pointIndex], points[pointIndex+1]);
	var avg = [(tanLeft[0] + tanRight[0]) / 2, (tanLeft[1], tanRight[1]) / 2];

	//if the tangent is directionless (bad, would create NaNs)
	if (avg[0] == 0 && avg[1] == 0) {
		avg = rotate(tanLeft[0], tanLeft[1], Math.PI / 2);
	}
	return normalize(avg);
}

function retime(points, initialTimings, curve) {
	var uNew = [];
	for (var q=points.length-1; q>=0; q--) {
		uNew[q] = retime_findRoot(points[q], initialTimings[q], curve);
	}
	return uNew;
}

//run newton's method on the error as a function of time  
function retime_findRoot(point, time, curve) {
	//find f(t) = E
	var curvei = [];
	var curveii = [];
	
	for (var p=2; p>=0; p--) {
		curvei[p] = [
			(curve[p+1][0] - curve[p][0]) * 3,
			(curve[p+1][1] - curve[p][1]) * 3,
		];
	}
	
	for (p=1; p>=0; p--) {
		curveii[p] = [
			(curvei[p+1][0] - curvei[p][0]) * 2,
			(curvei[p+1][1] - curvei[p][1]) * 2,
		];
	}

	var bestP = bezierPointFromT(...curve, time);
	var bestPi = quadraticPointFromT(...curvei, time);
	var bestPii = [linterp(curveii[0][0], curveii[1][0], time), linterp(curveii[0][1], curveii[1][1], time)];

	//find slope
	var num = (bestP[0] - point[0]) * bestPi[0] + (bestP[1] - point[1]) * bestPi[1];
	var denom = (bestPi[0] * bestPi[0]) + (bestPi[1] * bestPi[1]) + (bestP[0] - point[0]) * bestPii[0] + (bestP[1] - point[1]) * bestPii[1];

	//add f(t)
	return (denom == 0) ? 0 : time - (num / denom);
}

function rotate(x, z, radians) {
	var sin = Math.sin(radians);
	var cos = Math.cos(radians);
	return [x * cos - z * sin, z * cos + x * sin];
}

function updateCursorPos(a) {
	var canvasArea = canvas.getBoundingClientRect();
	var past = [cursor.x, cursor.y];
	cursor.x = a.clientX - canvasArea.left;
	cursor.y = a.clientY - canvasArea.top;


	cursor.dx = cursor.x - past[0];
	cursor.dy = cursor.y - past[1];
	cursor.dist += Math.sqrt((cursor.x - past[0]) ** 2 + (cursor.y - past[1]) ** 2);
	cursor.a = Math.atan2(cursor.y - past[1], cursor.x - past[0]);
}