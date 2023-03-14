







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
function Spline(pathObj, curves) {
	//if curves aren't defined then figure them out from the path object itself
	if (curves == undefined) {
		var curveStr = φGet(pathObj, "d").split(" ");
		//remove the M at the start
		curveStr.shift();

		//set starting pos
		var start = [+curveStr[0], +curveStr[1]];
		curves = [];
		curveStr = curveStr.slice(2);


		var current = [start];
		var modeMap = {
			"L": 0,
			"Q": 1,
			"C": 2
		};

		var mode;
		while (curveStr.length > 0) {
			mode = modeMap[curveStr[0]];

			for (var b=0; b<=mode; b++) {
				current.push([+curveStr[2*b + 1], +curveStr[2*b + 2]]);
			}

			start = [+curveStr[2*mode + 1], +curveStr[2*mode + 2]];
			curveStr = curveStr.slice(2*mode + 3);
			curves.push(current);
			current = [start];
		}
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
	pathObj.calculateBoundingBox = () => {
		//take all the smaller bounding boxes and add them up
		var initialBounds = [1e1001, 1e1001, -1e1001, -1e1001];
		pathObj.curves.forEach(c => {
			var smolBound;
			switch (c.length) {
				case 2:
					//it's short enough that I can sort manually
					smolBound = [c[0][0], c[0][1], c[1][0], c[1][1]];
					if (smolBound[0] > smolBound[2]) {
						[smolBound[0], smolBound[2]] = [smolBound[2], smolBound[0]]
					}
					if (smolBound[1] > smolBound[3]) {
						[smolBound[1], smolBound[3]] = [smolBound[3], smolBound[1]]
					}
					break;
				case 3:
					smolbound = quadraticBounds(c[0], c[1], c2);
					break;
				case 4:
					smolBound = bezierBounds(c[0], c[1], c[2], c[3]);
					break;
			}
			initialBounds[0] = Math.min(initialBounds[0], smolBound[0]);
			initialBounds[1] = Math.min(initialBounds[1], smolBound[1]);
			initialBounds[2] = Math.max(initialBounds[2], smolBound[2]);
			initialBounds[3] = Math.max(initialBounds[3], smolBound[3]);
		});

		pathObj.bounding = initialBounds;
		return initialBounds;
	}

	pathObj.intersectsPoint = (x, y) => {
		if (x < pathObj.bounding[0] || y < pathObj.bounding[1] || x > pathObj.bounding[2] || y > pathObj.bounding[3]) {
			return false;
		}

		//use canvas rasterization?
		var spl = new Path2D();
		spl.moveTo(c[0][0], c[0][1]);
		curves.forEach(c => {
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

		ctx.lineWidth = φGet(pathObj, "stroke-width");
		return ctx.isPointInStroke(spl, x, y);
	}

	//uses curves array to recalculate the path
	pathObj.redraw = () => {
		var path = `M ${curves[0][0][0]} ${curves[0][0][1]}`;
		curves.forEach(j => {
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
		φSet(pathObj, {'d': path});
	}
	pathObj.splitAt = (t) => {
		//if t is an integer this is extremely easy
		if (t % 1 == 0) {
			//trivial cases
			if (t == 0) {
				return [pathObj, undefined];
			}
			if (t == pathObj.curves.length - 1) {
				return [undefined, pathObj];
			}

			return [createSpline(pathObj.curves.slice(0, t), pathObj.color, pathObj.pathWidth), createSpline(pathObj.curves.slice(t), pathObj.color, pathObj.pathWidth)];
		}

		//if t isn't an integer have to cut the curve that it goes through
		var cut = pathObj.curves[Math.floor(t)];
		switch (cut.length) {
			case 2:
				cut = [[cut[0], linterpMulti(cut[0], cut[1], t % 1)], [linterpMulti(cut[0], cut[1], t % 1), cut[1]]];
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
		start = createSpline(start, pathObj.color, pathObj.pathWidth);
		//end
		var end = end.curves.slice(Math.ceil(t));
		end.splice(0, 0, cut[1]);
		end = createSpline(end, pathObj.color, pathObj.pathWidth);
	}


	//give the element its properties
	pathObj.curves = curves;
	pathObj.color = φGet(pathObj, "stroke");
	pathObj.start = curves[0][0];
	pathObj.end = curves[curves.length-1][curves[curves.length-1].length-1];
	pathObj.bounding = pathObj.calculateBoundingBox();

	return pathObj;
}

function Frame(svgObj) {
	//reflecting properties
	svgObj.lines = svgObj.children["lines"];
	svgObj.fills = svgObj.children["fills"];

	//methods
	svgObj.fill = (x, y) => {
		//try to fill that space

		//cast a ray to the right
		// var rayCast =

		//if there's no objects it won't work

		//if there is, trace it around until the path gets back to the start

		//that loop is the region to fill
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

	svgObj.binPlace = (spline) => {
		var curves = spline.curves;
		curves.forEach(c => {
			var bbox;
			switch(c.length) {
				case 2:
					bbox = [c[0][0], c[0][1], c[1][0], c[1][1]];
					break;
				case 3:
					bbox = quadraticBounds(c[0], c[1], c[2]);
					break;
				case 4:
					bbox = bezierBounds(c[0], c[1], c[2], c[3]);
					break;
			}

			var bboxBins = bbox.map(n => Math.floor(n / cubicBinSize));
			for (var x=bboxBins[0]; x<=bboxBins[2]; x++) {
				for (var y=bboxBins[1]; y<=bboxBins[3]; y++) {
					var bin = svgObj.bin(x, y);

					/*
					//test for intersections within the bin
					var curveNums = bezIntersections(c, layerNode.cubicBins[x][y]);

					//if there are intersections split the existing curve(s)? and then add the pre-intersection curve to the canvas
					if (curveNums.length > 0) {
						splitPathsAt(layerNode, x, y);
					} */

					//actual placing - make sure self isn't already in the bin
					//TODO: this is slow, some hashing should be used to skip the checking
					if (!bin.includes(spline)) {
						bin.push(spline);
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