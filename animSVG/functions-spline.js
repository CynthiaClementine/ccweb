/*
A place to put utility functions dealing with splines

INDEX

*/



//returns the coordinates of all intersections between the two curves
function curveCurveIntersect(curve1, curve2, tolerance) {
	//curve2 will be the one with the lowest order curve (least number of control points)
	if (curve1.length < curve2.length) {
		[curve1, curve2] = [curve2, curve1];
	}

	//if it's cubic + line
	if (curve1.length == 4 && curve2.length == 2) {
		return lineBezierIntersect_coords(curve2[0], curve2[1], curve1[0], curve1[1], curve1[2], curve1[3], tolerance);
	}

	//if they're both cubic curves
	if (curve2.length == 4) {
		return bezierBezierIntersect(curve1[0], curve1[1], curve1[2], curve1[3], 
			curve2[0], curve2[1], curve2[2], curve2[3], tolerance);
	}

	//if they're both lines
	if (curve1.length == 2) {
		//lineLine returns t-values, need to map those to coordinates
		var t = lineLineIntersect(curve1[0], curve1[1], curve2[0], curve2[1]);
		if (t.length == 0) {
			return [[]];
		}
		return [linterpMulti(curve1[0], curve1[1], t[0])];
	}
	console.error(`why haven't you handled this`);
	return;
}

//returns the coordinates of all intersections between the two splines
function splineSplineIntersect(spline1, spline2, tolerance, curveWidthSet, c) {
	//if both the splines only have 1 curve, just use the curve
	/*
	if (spline1.curves.length == 1 && spline2.curves.length == 1) {
		return curveCurveIntersect(spline1.curves[0], spline2.curves[0], tolerance);
	} */

	var orig = [spline1, spline2];
	
	//if it's the first one, make sure the splines are good
	if (curveWidthSet != true) {
		c = 1;
		spline1 = spline1.copy();
		spline2 = spline2.copy();
		φSet(spline1, {'stroke-width': tolerance / 2});
		spline1.calculateBoundingBox();
		φSet(spline2, {'stroke-width': tolerance / 2});
		spline2.calculateBoundingBox();
	}
	
	var bounds1 = spline1.bounding.copyWithin();
	var bounds2 = spline2.bounding.copyWithin();

	/*if (c > 5) {
		var nowColor = `hsl(${c*4}, 80%, ${50 - 0.04 * c}%)`;
		workspace_toolTemp.appendChild(φCreate("rect", {
			'x': bounds1[0],
			'y': bounds1[1],
			'width': bounds1[2] - bounds1[0],
			'height': bounds1[3] - bounds1[1],
			'stroke': nowColor,
			'stroke-width': 0.1,
			'fill': "none"
		}));
		workspace_toolTemp.appendChild(φCreate("rect", {
			'x': bounds2[0],
			'y': bounds2[1],
			'width': bounds2[2] - bounds2[0],
			'height': bounds2[3] - bounds2[1],
			'stroke': nowColor,
			'stroke-width': 0.1,
			'fill': "none"
		}));
	} */
	

	if (bounds1[0] > bounds2[2] || bounds1[1] > bounds2[3] || bounds1[2] < bounds2[0] || bounds1[3] < bounds2[1]) {
		return [];
	}

	//if the boxes are too small, test intersect
	var small1 = (bounds1[2] - bounds1[0] < tolerance && bounds1[3] - bounds1[1] < tolerance);
	var small2 = (bounds2[2] - bounds2[0] < tolerance && bounds2[3] - bounds2[1] < tolerance);
	// console.log(`smalls: ${small1} ${small2}, tolerance: ${tolerance}`);
	if (small1 && small2) {
		//linearize this
		var t = lineLineIntersect(spline1.start, spline1.end, spline2.start, spline2.end);
		if (t.length == 0) {
			return [[]];
		}
		return [linterpMulti(spline1.start, spline1.end, t[0])];
	}

	var children1;
	var children2;
	if (!small1 && !small2) {
		children1 = spline1.splitAt(spline1.curves.length / 2);
		children2 = spline2.splitAt(spline2.curves.length / 2);

		return (splineSplineIntersect(children1[0], children2[0], tolerance, true, c+1).concat(
			splineSplineIntersect(children1[0], children2[1], tolerance, true, c+1),
			splineSplineIntersect(children1[1], children2[0], tolerance, true, c+1),
			splineSplineIntersect(children1[1], children2[1], tolerance, true, c+1)
		));
	}

	if (small1) {
		children2 = spline2.splitAt(spline2.curves.length / 2);
		return splineSplineIntersect(spline1, children2[0], tolerance, true, c+1).concat(splineSplineIntersect(spline1, children2[1], tolerance, true, c+1));
	}


	children1 = spline1.splitAt(spline1.curves.length / 2);
	return splineSplineIntersect(children1[0], spline2, tolerance, true, c+1).concat(splineSplineIntersect(children1[1], spline2, tolerance, true, c+1));
}

function splineToPath2D(splineCurves) {
	var spl = new Path2D();
	spl.moveTo(splineCurves[0][0][0], splineCurves[0][0][1]);
	splineCurves.forEach(c => {
		switch (c.length) {
			case 2:
				spl.lineTo(c[1][0], c[1][1]);
				break;
			case 3:
				spl.quadraticCurveTo(c[1][0], c[1][1], c[2][0], c[2][1]);
				break;
			case 4:
				spl.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]);
				break;
		}
	});

	return spl;
}

function quantizeCurves(curves) {
	curves.forEach(c => {
		c.forEach(p => {
			//quantize the point
			quantize(p, quantizeAmount);
		});
	});
}

//modifies and returns the inputted array
function quantize(point, quanta) {
	point[0] = Math.round(point[0] / quanta) * quanta;
	point[1] = Math.round(point[1] / quanta) * quanta;
}