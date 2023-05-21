







class Timeline {
	constructor() {

		this.l = {};
		this.fps = 24;
		this.layerIDs = [];
		this.names = {};
		this.layerDisplayTop = 0;
		this.onionBounds = [4, 4];
		this.onionActive = false;
		
		//t is the time in frames the timeline is at
		this.t = 0;
		//s is the layer selected
		this.s = 0;
		this.len = 1;
	}

	changeFrameTo(frame) {
		//make sure frame is valid
		if (frame < 0) {
			return false;
		}
		if (frame > this.len-1) {
			return false;
		}

		//move the playhead
		φSet(timeline_playhead, {'x': frame * (timeline_blockW + 1)});
		φSet(timeline_playbody, {'x': frame * (timeline_blockW + 1)});

		//first remove all things from the workspace
		this.makeInvisible();

		this.t = frame;

		this.makeVisible();
		//alert the tool
		if (toolCurrent.timeChange) {
			toolCurrent.timeChange();
		}
	}

	frameAt(time, layer) {
		return this.l[this.layerIDs[layer]][time];
	}

	setPropertiesForTime(t, propertyObj) {
		for (var f=this.layerIDs.length-1; f>-1; f--) {
			φSet(this.l[this.layerIDs[f]][t], propertyObj);
		}
	}

	makeInvisible() {
		var min = Math.max(this.t - (this.onionActive * this.onionBounds[0]), 0);
		var max = Math.min(this.t + (this.onionActive * this.onionBounds[1]), this.len-1);

		for (var f=min; f<=max; f++) {
			this.setPropertiesForTime(f, {'display': "none"});
		}
	}

	makeVisible() {
		//if no onion skin just do present and be done
		if (!this.onionActive) {
			this.setPropertiesForTime(this.t, {'display': "inline-block", 'filter': undefined, 'opacity': 1});
			return;
		}
		
		//past onion
		var maxF = Math.min(this.onionBounds[0]+1, this.t);
		for (var f=maxF; f>0; f--) {
			this.setPropertiesForTime(this.t - f, {
				'display': "inline-block", 
				'filter': "url(#onionPast)",
				'opacity': 0.8 * (1 - (f / maxF))
			});
		}
		
		maxF = Math.min(this.onionBounds[1]+1, this.len - 1 - this.t);
		//future onion
		for (var f=maxF; f>0; f--) {
			this.setPropertiesForTime(this.t + f, {
				'display': "inline-block", 
				'filter': "url(#onionFuture)",
				'opacity': 0.8 * (1 - f / maxF)
			});
		}
		//present
		this.setPropertiesForTime(this.t, {'display': "inline-block", 'filter': undefined, 'opacity': 1});
	}
}




/*
Here's how these should be used, and why I'm doing it this way:

CustomElements can only be an extension of an HTMLElement, not an SVGElement, so I have to do this wacky behavior.
These functions (class functions?) take in some type of svg element and update it to my custom standard, with custom js methods / properties.
The svg element must already have some necessary extra attributes for this to work. 
For example, the Symbol class requires the Use element it's taking in to already have a src= attribute, even though src= is a Symbol's attribute, not necessarily a Use's one.
This is done so I can export the classes easier. When saved, all the js properties/methods dissapear, so the key data needs to be in these attributes.
*/


function curveArrToStr(curveArr) {
	
}
function curveStrToArr(curveStr) {
	var curves = [];
	var spl = curveStr.split(" ");

	//remove the M at the start
	spl.shift();

	//set starting pos
	var start = [+spl[0], +spl[1]];
	curves = [];
	spl = spl.slice(2);


	var current = [start];
	var modeMap = {
		"L": 0,
		"Q": 1,
		"C": 2
	};

	var mode;
	while (spl.length > 0) {
		mode = modeMap[spl[0]];

		for (var b=0; b<=mode; b++) {
			current.push([+spl[2*b + 1], +spl[2*b + 2]]);
		}

		start = [+spl[2*mode + 1], +spl[2*mode + 2]];
		spl = spl.slice(2*mode + 3);
		curves.push(current);
		current = [start];
	}
	return curves;
}

function redrawPath(pathArr) {
	var path = `M ${pathArr[0][0][0]} ${pathArr[0][0][1]}`;
	pathArr.forEach(j => {
		switch (j.length) {
			case 2:
				path += ` L ${j[1][0]} ${j[1][1]}`;
				break;
			case 3:
				path += ` Q ${j[1][0]} ${j[1][1]} ${j[2][0]} ${j[2][1]}`;
				break;
			case 4:
				path += ` C ${j[1][0]} ${j[1][1]} ${j[2][0]} ${j[2][1]} ${j[3][0]} ${j[3][1]}`;
				break;
			default:
				console.log(`don't know what to do with length: ${j.length}`);
		}
	});
	return path;
}

function redrawLoops(loopsArr) {
	console.log(JSON.stringify(loopsArr).replaceAll("]],", "]],\n"));
	//points -> curves -> splines -> loops -> loopsArr
	var path = ``;
	var lastPoint = [];
	//need to pass in each individual spline
	loopsArr.forEach(l => {
		l.forEach(s => {
			var pathPart = redrawPath(s);
			/*this is a little trick - for some reason, the fill path stops working if you lineTo a point and then moveTo that same point.
			this detects when the points are the same, and replaces the `M x y` portion with a single comma. Since commas aren't used anywhere else in my path drawing, 
			they can be used as an alternate way to detect when splines start */

			if (arrsAreSame(s[0][0], lastPoint)) {
				for (var y=0; y<3; y++) {
					pathPart = pathPart.slice(pathPart.indexOf(" ") + 1);
				}
				pathPart = `, ${pathPart}`;
			}
			path += ` ${pathPart}`;
			lastPoint = s[s.length-1];
			lastPoint = lastPoint[lastPoint.length-1];
		});
	});
	return path.slice(1);
}

function Fill(pathObj, loops) {
	//loops are an array of an array of curves
	if (loops == undefined) {
		return;
		//if there are multiple Ms in it, then it's a multi-curve process
		if (curveStr.match(/M/g).length > 1) {
			//find each M and use it to create a new curve
			var mInd = curveStr.indexOf("M", 1);
			curves.push(curveStrToArr(curveStr.slice(0, mInd - 1)));
			// curveStr = 

			return curves;
		}
	}

	pathObj.calculateBoundingBox = () => {
		//first redraw, then use that because fills have no edges
		pathObj.redraw();
		var bounds = pathObj.getBBox();
		pathObj.bounding = [bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height];
		return pathObj.bounding;
	}

	pathObj.redraw = () => {
		φSet(pathObj, {'d': redrawLoops(pathObj.loops)});
	}

	pathObj.loops = loops;
	pathObj.curves = [].concat(...loops);
	pathObj.calculateBoundingBox();
	return pathObj;
}

function Spline(pathObj, curves) {
	//if curves aren't defined then figure them out from the path object itself
	if (curves == undefined) {
		curves = curveStrToArr(φGet(pathObj, "d"));
	}

	//element functions
	//unfortunately can't use "this" because javascript, I suppose I'll live with it
	var self = pathObj;
	pathObj.getPointFromT = (t) => {
		var bRef = pathObj.curves[Math.floor(t)];
		switch (bRef.length) {
			case 2:
				return linterpMulti(bRef[0], bRef[1], t % 1);
			case 3:
				return quadraticPointFromT(bRef[0], bRef[1], bRef[2], t % 1);
			case 4:
				return bezierPointFromT(bRef[0], bRef[1], bRef[2], bRef[3], t % 1);
			default:
				console.error(`unknown number of points!`);
		}
	}

	//this function will return a t, but it's not guaranteed that the t will be correct if the xy point isn't on the cubic's path
	pathObj.getTFromPoint = (x, y, verbose) => {
		if (verbose) {console.log(`finding t for ${x},${y}`);}
		var curveSplits = [4, 3];
		//say acceptable distance is a little over path distance, to forgive timing mistakes
		var acceptableDist = φGet(pathObj, "stroke-width") * 0.75;
		acceptableDist = acceptableDist * acceptableDist;
		
		var tGuess, pGuess, lines, cRef, lastSign;

		//start by checking all start points (the integer t case is easier)
		for (var c=0; c<pathObj.curves.length; c++) {
			if (distSquared(pathObj.curves[c][0][0] - x, pathObj.curves[c][0][1] - y) < acceptableDist) {
				return c;
			}
		}

		//check end point
		cRef = pathObj.curves[pathObj.curves.length-1];
		if (distSquared(cRef[cRef.length-1][0] - x, cRef[cRef.length-1][1] - y) < acceptableDist) {
			return pathObj.curves.length;
		}

		//non-integer t
		var xyp = [x, y];
		//split the spline into its curves
		for (c=0; c<pathObj.curves.length; c++) {
			cRef = pathObj.curves[c];
			lastSign = undefined;
			if (verbose) {console.log(`curve ${c} is of length ${cRef.length}`);}
			switch (cRef.length) {
				case 2:
					//it's just a line!
					tGuess = lineT(cRef[0], cRef[1], xyp);
					if (verbose) {console.log(`tGuess is ${tGuess}`);}

					//if it's on the line
					if (tGuess > 0 && tGuess < 1) {
						if (verbose) {console.log(`valid`);}
						pGuess = linterpMulti(cRef[0], cRef[1], tGuess);
						if (distSquared(pGuess[0] - x, pGuess[1] - y) < acceptableDist) {
							return c + tGuess;
						}
					}
					break;
				case 3:
					//break into lines and then check each line
					//see 4 case
					//it's impossible to get quadratics now anyways so I'm not going to bother
					break;
				case 4:
					//set up lines
					var pts = [cRef[0]];
					pts[curveSplits[1]] = cRef[3];
					for (var a=1; a<curveSplits[1]; a++) {
						pts[a] = bezierPointFromT(cRef[0], cRef[1], cRef[2], cRef[3], a / curveSplits[1]);
					}
					/*
					console.log(pts);

					//move to workspace
					for (a=0; a<curveSplits[1]; a++) {
						workspace_toolTemp.appendChild(φCreate("path", {
							'stroke': "#F0F",
							'd': `M ${pts[a][0]} ${pts[a][1]} L ${pts[a+1][0]} ${pts[a+1][1]}`
						}));
					} */
					

					//check against each line
					for (var b=0; b<curveSplits[1]; b++) {
						tGuess = lineT(pts[b], pts[b+1], xyp);

						if (tGuess < 0) {
							if (lastSign == 1) {
								//if between the start of this line and the end of last line check the corner
								if (distSquared(pts[b][0] - x, pts[b][1] - y) < acceptableDist) {
									return (c + ((b + tGuess) / curveSplits[1]));
								}
							}
						} else if (tGuess < 1) {
							//in the middle, check for connection
							if (pathObj.TXYMatches(c + ((b + tGuess) / curveSplits[1]), x, y, acceptableDist)) {
								return (c + ((b + tGuess) / curveSplits[1]));
							}
						}

						lastSign = (tGuess < 0) ? -1 : (tGuess > 1) ? 1 : 0;
					}
					break;
			}
		}


		return -1;
	}

	pathObj.TXYMatches = (t, x, y, toleranceSquared) => {
		var pt = pathObj.getPointFromT(t);
		return (distSquared(pt[0] - x, pt[1] - y) < toleranceSquared);
	}


	pathObj.calculateBoundingBox = () => {
		//take all the smaller bounding boxes and add them up
		var initialBounds = [1e1001, 1e1001, -1e1001, -1e1001];
		var width = φGet(pathObj, "stroke-width") / 2;
		pathObj.curves.forEach(c => {
			var smolBound;
			switch (c.length) {
				case 2:
					//it's short enough that I can sort manually
					smolBound = [c[0][0], c[0][1], c[1][0], c[1][1]];
					if (smolBound[0] > smolBound[2]) {
						[smolBound[0], smolBound[2]] = [smolBound[2], smolBound[0]];
					}
					if (smolBound[1] > smolBound[3]) {
						[smolBound[1], smolBound[3]] = [smolBound[3], smolBound[1]];
					}
					break;
				case 3:
					smolbound = quadraticBounds(c[0], c[1], c2);
					break;
				case 4:
					smolBound = bezierBounds(c[0], c[1], c[2], c[3]);
					break;
			}
			initialBounds[0] = Math.min(initialBounds[0], smolBound[0] - width);
			initialBounds[1] = Math.min(initialBounds[1], smolBound[1] - width);
			initialBounds[2] = Math.max(initialBounds[2], smolBound[2] + width);
			initialBounds[3] = Math.max(initialBounds[3], smolBound[3] + width);
		});

		pathObj.bounding = initialBounds;
		return initialBounds;
	}

	pathObj.copy = () => {
		var newPathObj = pathObj.cloneNode();
		return Spline(newPathObj, curves.copyWithin());
	}

	pathObj.intersectsPoint = (x, y) => {
		if (x < pathObj.bounding[0] || y < pathObj.bounding[1] || x > pathObj.bounding[2] || y > pathObj.bounding[3]) {
			return false;
		}

		//use canvas
		var spl = splineToPath2D(pathObj.curves);
		ctx.lineWidth = φGet(pathObj, "stroke-width");
		ctx.lineCap = "round";
		return ctx.isPointInStroke(spl, x, y);
	}

	//uses curves array to recalculate the path
	pathObj.redraw = () => {
		φSet(pathObj, {'d': redrawPath(pathObj.curves)});
		pathObj.calculateBoundingBox();
	}
	pathObj.splitAt = (t) => {
		var width = +φGet(pathObj, "stroke-width");
		var color = φGet(pathObj, "stroke");
		//if t is an integer this is extremely easy
		if (t % 1 == 0) {
			//trivial cases
			if (t <= 0) {
				return [undefined, pathObj];
			}
			if (t >= pathObj.curves.length) {
				return [pathObj, undefined];
			}

			return [createSpline(pathObj.curves.slice(0, t), color, width), createSpline(pathObj.curves.slice(t), color, width)];
		}

		//if t isn't an integer have to cut the curve that it goes through
		var cut = pathObj.curves[Math.floor(t)];
		switch (cut.length) {
			case 2:
				cut = [[[cut[0][0], cut[0][1]], linterpMulti(cut[0], cut[1], t % 1)], [linterpMulti(cut[0], cut[1], t % 1), [cut[1][0], cut[1][1]]]];
				break;
			case 3:
				break;
			case 4:
				cut = bezierSplit(cut[0], cut[1], cut[2], cut[3], t % 1);
				break;
		}

		//beginning
		var start = pathObj.curves.slice(0, Math.floor(t));
		start.push(cut[0]);
		start = createSpline(start, color, width);
		//end
		var end = pathObj.curves.slice(Math.ceil(t));
		end.splice(0, 0, cut[1]);
		end = createSpline(end, color, width);

		return [start, end];
	}


	//give the element its properties
	pathObj.curves = curves;
	pathObj.start = curves[0][0];
	pathObj.end = curves[curves.length-1][curves[curves.length-1].length-1];
	pathObj.calculateBoundingBox();

	return pathObj;
}

function Frame(svgObj) {
	//reflecting properties
	svgObj.lines = svgObj.children["lines"];
	svgObj.fills = svgObj.children["fills"];

	//exports an object with a copy of all the lines, fills, and cubic bins
	svgObj.exportCopyObj = () => {

	}

	svgObj.loadFromCopy = (copyObj) => {
		
	}

	svgObj.highlightFilledBins = () => {
		for (var y=0; y<svgObj.cubicBins.length; y++) {
			for (var x=0; x<svgObj.cubicBins[y].length; x++) {
				if (svgObj.bin(x, y).length > 0) {
					workspace_toolTemp.appendChild(φCreate("rect", {
						'x': x * cubicBinSize,
						'y': y * cubicBinSize,
						'width': cubicBinSize,
						'height': cubicBinSize,
						'fill': "rgba(225, 0, 255, 0.25)",
					}));
				}
			}
		}
	}

	//safely gives the bin in bin coordinates
	svgObj.bin = (xBin, yBin) => {
		//check y
		if (svgObj.cubicBins[yBin] == undefined) {
			svgObj.cubicBins[yBin] = [];
		}

		//check x
		if (svgObj.cubicBins[yBin][xBin] == undefined) {
			svgObj.cubicBins[yBin][xBin] = [];
		}

		//now that there's for sure a bin there, return it
		return svgObj.cubicBins[yBin][xBin];
	}

	//safely gives the bin at certain xy coordinates
	svgObj.binAt = (x, y) => {
		x = Math.floor(x / cubicBinSize);
		y = Math.floor(y / cubicBinSize);

		return svgObj.bin(x, y);
	}

	//
	/**
	 * gets all the objects in a rectangular set of bins
	 * @param {Integer} x bin x to start at
	 * @param {Integer} y bin y to start at
	 * @param {Integer} endX bin x to end at, inclusive
	 * @param {Integer} endY bin y to end at, inclusive
	 * @returns {Array[Objects]} an array of all the objects in those bins
	 */
	svgObj.binGet = (x, y, endX, endY) => {
		var objs = [];
		var nowBin;
		for (var j=y; j<=endY; j++) {
			for (var i=x; i<=endX; i++) {
				nowBin = svgObj.bin(i, j);
				if (nowBin.length > 0) {
					nowBin.forEach(o => {
						if (!objs.includes(o)) {
							objs.push(o);
						}
					});
				}
			}
		}
		return objs;
	}

	svgObj.getBounds = () => {
		var b1 = svgObj.getBBox();
		//adjust a bit to account for potential line thickness
		return [b1.x - 10, b1.y - 10, b1.x + b1.width + 10, b1.x + b1.height + 10];
	}

	svgObj.binModifyLine = (spline, line, removing) => {

	}

	svgObj.binModify = (spline, removing) => {
		assignRID(spline);
		// console.log(`${removing ? "un" : ""}binning ${spline.id}`);
		if (spline.loops != undefined) {
			return;
		}
		var curves = spline.curves;
		//the width is the diameter, not the radius
		var width = φGet(spline, "stroke-width") / 2;
		curves.forEach(c => {
			var bbox;
			switch(c.length) {
				case 2:
					//		<!--//lines are special, they can be super large so they get their own collision -->
					bbox = [c[0][0], c[0][1], c[1][0], c[1][1]];
					if (c[0][0] > c[1][0]) {
						[bbox[0], bbox[2]] = [bbox[2], bbox[0]];
					}
					if (c[0][1] > c[1][1]) {
						[bbox[1], bbox[3]] = [bbox[3], bbox[1]];
					}
					// if (debug_active) {console.log(bbox);}
					break;
				case 3:
					bbox = quadraticBounds(c[0], c[1], c[2]);
					break;
				case 4:
					bbox = bezierBounds(c[0], c[1], c[2], c[3]);
					break;
			}

			//extend the bounding box by the width of the spline
			bbox[0] -= width;
			bbox[1] -= width;
			bbox[2] += width;
			bbox[3] += width;
			// if (debug_active) {console.log(bbox);}


			var bboxBins = bbox.map(n => Math.floor(n / cubicBinSize));
			var bin;
			for (var x=bboxBins[0]; x<=bboxBins[2]; x++) {
				for (var y=bboxBins[1]; y<=bboxBins[3]; y++) {
					bin = svgObj.bin(x, y);

					// if (x == 40 && y == 8) {
					// 	console.log(`${removing ? "un" : ""}binning ${spline.id}`);
					// }
					/*
					//test for intersections within the bin
					var curveNums = bezIntersections(c, layerNode.cubicBins[x][y]);

					//if there are intersections split the existing curve(s)? and then add the pre-intersection curve to the canvas
					if (curveNums.length > 0) {
						splitPathsAt(layerNode, x, y);
					} */

					//actual placing - make sure self isn't already in the bin
					//TODO: this is slow, some hashing should be used to skip the checking
					if (removing) {
						var ind = bin.indexOf(spline);
						if (ind != -1) {
							bin.splice(ind, 1);
						}
					} else {
						// console.log(`pushing to ${x}, ${y}`, bin.includes(spline));
						if (!bin.includes(spline)) {
							bin.push(spline);
						}
					}
				}
			}
		});
	}

	//cubic bins
	var wh = φGet(workspace_background, ['width', 'height']);
	svgObj.cubicBins = [];
	for (var y=0; y<Math.ceil(wh[1]/cubicBinSize); y++) {
		svgObj.cubicBins.push([]);
		for (var x=0; x<Math.ceil(wh[0]/cubicBinSize); x++) {
			svgObj.cubicBins[y].push([]);
		}
	}
	//place all splines into the cubic bins



	return svgObj;
}







function Symbol(useObj) {
	/*
	src - the timeline object ID to pull from
	frameStart - the frame of the src timeline to start the symbol on
	frameOffset - the number of frames after the start frame of the current display frame
	behavior - how the symbol should handle change over time
		Static - never change from the starting frame
		Traverse - play the src timeline once, then stop
		Loop - wrap around to start once finished
		Bounce - reverse and head to frame 0 after hitting the end
	*/




	return useObj;
}


// class Symbol extends SVGUseElement {
// 	constructor() {
// 		super();
// 	}

// 	static get observedAttributes() {
		
// 		return ["src", "frameStart", "frameOffset", "behavior"];
// 	}

// 	//only called for the observed attributes
// 	attributeChangedCallback(attribute, oldVal, newVal) {

// 	}
// }
// customElements.define('symbol-bin', Symbol, {extends: 'SVG use'});