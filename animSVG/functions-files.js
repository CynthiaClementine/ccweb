function copyStyles(destinationNode, sourceNode) {
	var containerElements = ["svg","g"];
	for (var cd = 0; cd < destinationNode.children.length; cd++) {
		var child = destinationNode.children[cd];
		if (containerElements.indexOf(child.tagName) != -1) {
			copyStyles(child, sourceNode.children[cd]);
			continue;
		}
		var style = sourceNode.children[cd].currentStyle || window.getComputedStyle(sourceNode.children[cd]);
		if (style != "undefined" || style != null) {
			for (var st = 0; st < style.length; st++){
				child.style.setProperty(style[st], style.getPropertyValue(style[st]));
			}
		}
	}
}

function exportFile() {
	φSet(workspace_permanent, {"bg": φGet(workspace_background, "fill")});
	var data = new XMLSerializer().serializeToString(workspace_permanent);

	var timeData = `<timeline len=${timeline.len} fps=${timeline.fps}>\n`;
	//list all frame-key pairs
	var currentObj = undefined;
	timeline.layerIDs.forEach(id => {
		timeData += `${id}~${timeline.names[id]}`;

		//run through all the frames in the timeline's layer
		for (var f=0; f<timeline.l[id].length; f++) {
			//every time it changes record that as a keyframe
			if (timeline.l[id][f] != currentObj) {
				currentObj = timeline.l[id][f];
				//append the shortened id and timecode
				timeData += `|${f}~${currentObj.id.slice(6)}`;
			}
		}
		//newline to separate
		timeData += "\n";
	});

	timeData += `\n</timeline>`;

	data = data + timeData;


	//file + download
	var fileObj = new Blob([data], {type: 'text/plain'});
	if (saveData != undefined) {
		window.URL.revokeObjectURL(saveData);
	}
	saveData = window.URL.createObjectURL(fileObj);
	var link = document.getElementById('download');
	link.href = saveData;
	link.click();
}

function importImage() {
	var imgObj = upload_img.files[0];
	//put the image into the images array
	images.push(imgObj);

	//display the image
	var imgURL = URL.createObjectURL(imgObj);
	imgObj.url = imgURL;
	addImageTo(frame_xb, imgObj);
}

function importFile() {
	var fileObj = upload.files[0];
	var fileReader = new FileReader();
	fileReader.onload = (evt) => {
		//function for when the text actually loads
		var textDat = evt.target.result;

		//separate out text into timeline + non-timeline data
		var timelineTexts = [];
		//there could be multiple timeline blocks so we do it this way
		while (textDat.indexOf(`<timeline`) != -1) {
			timelineTexts.push(textDat.slice(textDat.indexOf(`<timeline`) + 10, textDat.indexOf(`</timeline>`)));
			textDat = textDat.slice(0, textDat.indexOf(`<timeline`)) + textDat.slice(textDat.indexOf(`</timeline>`) + 11);
		}
		var dataText = textDat;

		import_parseWorkspaceData(dataText);

		//parse timeline data:
		import_parseTimelineData(timelineTexts[0]);

		//update visibility by changing to the current frame
		timeline.changeFrameTo(timeline.t);
	};

	fileReader.readAsText(fileObj, "UTF-8");
}

function import_parseWorkspaceData(dataText) {
	//parse real data
	var container = φCreate('g');
	container.innerHTML = dataText;
	workspace_permanent.innerHTML = container.children[0].innerHTML;

	//background color
	console.log(φGet(container.children[0], "bg"));
	φSet(workspace_background, {"fill": φGet(container.children[0], "bg")});

	

	//at this point every layer will be visible - need to make them all invisible before beginning
	for (var k=0; k<workspace_permanent.children.length; k++) {
		for (var j=0; j<workspace_permanent.children[k].children.length; j++) {
			φSet(workspace_permanent.children[k].children[j], {"display": "none"});
			// console.log(φGet(workspace_permanent.children[k].children[j], "id"), `invisible`);
		}
	}
}

function import_parseTimelineData(timeData) {
	var timeSplit = timeData.split("\n");
	timeSplit = timeSplit.filter(a => a.length > 1);

	//use the first line - timeline tag - to gather timeline properties
	var firstLine = timeSplit.shift();
	firstLine = firstLine.slice(0, -1);
	var tags = firstLine.split(" ").map(a => a.split("="));
	tags.forEach(t => {
		switch (t[0]) {
			case "len":
				changeAnimationLength(+t[1]);
				break;
			case "fps":
				timeline.fps = +t[1];
				break;
		}
	});

	//the first line is dedicated to timeline length

	//reset the timeline object and create new layers
	timeline.l = {};
	timeline.layerIDs = [];
	timeline.names = {};
	timeline_text_container.innerHTML = "";
	timeline_blocks.innerHTML = "";
	timeSplit.forEach(m => {
		var layerSplit = m.split(`|`);
		layerSplit = layerSplit.map(a => a.split("~"));
		var lID = layerSplit[0][0];

		//layerSplit becomes [[layerID, layerName], [0, id], [num, id], [num, id]...]
		//first element - resolve naming issues
		timeline.layerIDs.push(lID);
		timeline.names[lID] = layerSplit[0][1];
		timeline.l[lID] = [];
		timeline.l[lID].length = timeline.len;

		//afterwards fill in the keyframes for each layer
		for (var p=1; p<layerSplit.length; p++) {
			//fill in correct bounds
			var stopPos = (layerSplit[p+1] == undefined) ? timeline.len : +layerSplit[p+1][0];
			var refLayer = document.getElementById(`frame_${layerSplit[p][1]}`);

			for (var q=+layerSplit[p][0]; q<stopPos; q++) {
				timeline.l[lID][q] = refLayer;
			}
		}

		//update the timeline blocks for that layer
		createTimelineBlocks(lID, 0, timeline.len-1);
	});
	updateTimelineExtender();
}

/**
 * Applies a function to a node as well as all its child nodes
 * @param {Object} node the node to apply code to
 * @param {Function} func the function to apply. Takes in the node as an argument
 */
function applyFunction(node, func) {
	func(node);

	if (node.children.length > 0) {
		for (var c=0; c<node.children.length; c++) {
			applyFunction(node.children[c], func);
		}
	}
}

/**
 * Creates a canvas from a specific frame at 100% scaling
 * @param {*} frame 
 * @returns {Object} 
 /
function createCanvasFromFrame_standard(frame) {
	var output = {
		canvas: undefined,
		startsAt: [0, 0]
	};
} */

/**
 * Creates a canvas with the data of a specified frame
 * @param {Integer} frame The 0-indexed number of the timeline's frame to turn into canvas data
 * @param {Integer} width the resulting canvas width in pixels
 * @param {Integer} height the resulting canvas height in pixels
 * @param {Number} scaling the ratio of workspace units to pixels - scaling=2 results in zoom to 200%.
 * @param {0|1|2|3} detailLevel the level of detail from 0 to 3. CURRENTLY NOT WORKING FULLY, WILL ONLY BE 2 OR 0
 * 0 removes all styling, just returning raw paths and fills. 
 * 1 includes colors and line width, but removes transparency.
 * 2 is the normal level, keeping the look of the frame on-export.
 * 3 also includes onion skins, tool overlays, and UI elements.
 * @param {Number} offsetX The workspace X coordinate to translate to x=0 in pixel coordinates
 * @param {Number} offsetY The workspace Y coordinate to translate to y=0 in pixel coordinates
 * @param {Integer|undefined} layer If only rendering a specific layer, The index of the layer to render
 */
function createCanvasFromFrame(frame, width, height, scaling, detailLevel, offsetX, offsetY, layer) {
	offsetX = offsetX ?? 0;
	offsetY = offsetY ?? 0;
	// console.log(width, height);
	var largeContainer = φCreate("svg");
	var canvas = document.createElement("canvas");
	var atx = canvas.getContext("2d");
	
	//canvas will be all white to start, make sure to specify that isn't a true color
	canvas.isValid = false;
	canvas.startX = offsetX;
	canvas.startY = offsetY;
	canvas.width = width;
	canvas.height = height;
	//this tag doesn't appear to actually do anything but I've been told by the browser to have it, so maybe it'll work in a future update
	canvas.willReadFrequently = true;

	if (debug_active) {
		putPot.innerHTML = "";
		putPot.appendChild(canvas);
	}
	
	//put elements into the container
	largeContainer.appendChild(workspace_background.cloneNode());
	var layerRange = (layer == undefined) ? [0, timeline.layerIDs.length-1] : [layer, layer];
	for (var f=layerRange[1]; f>=layerRange[0]; f--) {
		largeContainer.appendChild(timeline.l[timeline.layerIDs[f]][frame].cloneNode(true));
	}
	var props = φGet(workspace_container, ['x', 'y', 'width', 'height', 'viewBox']);
	var propVB = props[4].split(" ").map(a => +a);
	φSet(largeContainer, {
		'x': props[0],
		'y': props[1],
		'width': width / scaling,
		'height': height / scaling,
		//workspace X start, workspace Y start, workspace Width, workspace Height
		'viewBox': `${propVB[0] + offsetX} ${propVB[1] + offsetY} ${width / scaling} ${height / scaling}`
	});

	console.log(`viewBox is ${propVB[0] + offsetX} ${propVB[1] + offsetY} ${width / scaling} ${height / scaling}`);

	//remove styling if it's necessary
	if (detailLevel == 0) {
		applyFunction(largeContainer, (n) => {
			φSet(n, {
				'stroke': "#000",
				'stroke-width': "var('pxUnits4')"
			});
		});
		//changing the width and height of largeContainer has no effect on image dimensions, so I'm not going to do it
		φSet(largeContainer, {'fill': "#FFF", 'stroke': "none"});
		//remove the edge
		largeContainer.removeChild(largeContainer.children[0]);
	}

	atx.clearRect(0, 0, canvas.width, canvas.height);
	//fill with white
	atx.fillStyle = "#FFF";
	atx.fillRect(0, 0, canvas.width, canvas.height);
	atx.fillStyle = "#F00";
	atx.fillRect(0, 0, 10, 10);

	//turn the svg into image data
	var data = new XMLSerializer().serializeToString(largeContainer);
	var img = new Image();
	//this image will crop everything? Why?
	var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
	var url = URL.createObjectURL(svgBlob);
	
	//draw image to canvas then download
	console.log(scaling);
	img.src = url;
	img.onload = () => {
		// putPot.innerHTML = `<img src="${url}"></img>`;
		console.log(`img dims / canvas dims`, img.width, img.height, canvas.width, canvas.height);
		atx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
		URL.revokeObjectURL(url);
		canvas.isValid = true;
	};

	return canvas;
}

function downloadData(URI, fileName) {
	var evt = new MouseEvent("click", {
		view: window,
		bubbles: false,
		cancelable: true
	});
	var link = document.createElement("a");
	φSet(link, {
		'download': fileName,
		'href': URI,
		'target': '_blank'
	});
	link.dispatchEvent(evt);
}

/**
 * Downloads the current frame as a PNG image.
 * @param {Integer} imageHeight The height in pixels the image should render at
 * @param {String} fileName The name of the exported file
 */
function downloadTimelineAsImage(imageHeight, fileName) {
	//make sure the edge isn't visible
	φSet(workspace_background, {"stroke": "none"});

	var svgFrom = workspace_container;

	//set up canvas
	var canvas = document.createElement("canvas");
	var bbox = svgFrom.getBBox();
	var [w, h, scaling] = φGet(svgFrom, ["width", "height", "scaling"]);
	var scaleFactor = imageHeight / h;
	canvas.width = w * scaleFactor;
	canvas.height = imageHeight;
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	//turn the svg into image data
	var data = new XMLSerializer().serializeToString(svgFrom);
	var img = new Image();
	var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
	var url = URL.createObjectURL(svgBlob);
	
	//draw image to canvas then download
	img.src = url;
	img.onload = () => {
		ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width / scaling, canvas.height / scaling);
		URL.revokeObjectURL(url);
		downloadData(canvas.toDataURL("image/png"), fileName);
		// document.removeChild(canvas);
		//let it be visible again
	};
	φSet(workspace_background, {"stroke": "#FFFFFF"});
}

/**
 * Uses the data in the timeline to generate an mp4(?) video 
 * @param {Integer} videoHeight The height in pixels that the video should render at
 * @param {String} fileName The name of the exported file
 */
function downloadTimelineAsVideo(videoHeight, fileName) {
	//set up timeline for exporting
	var saveTime = timeline.t;
	var saveOnion = timeline.onionActive;

	//don't want previous timeline modifiers to be in the final video
	timeline.onionActive = false;
	timeline.changeFrameTo(0);
	φSet(workspace_background, {"stroke": "none"});
	
	//canvas
	var svgFrom = workspace_container;
	var vidCanvas = document.createElement("canvas");
	var vtx = vidCanvas.getContext("2d");
	var [w, h, scaling] = φGet(svgFrom, ["width", "height", "scaling"]);
	var scaleFactor = videoHeight / h;
	vidCanvas.width = w * scaleFactor;
	vidCanvas.height = videoHeight;
	var recorder = new CCapture({
		name: fileName,
		format: 'webm',
		framerate: timeline.fps,
	});

	var frames = [];
	var framesToLoad = timeline.len;
	//make sure the frame array is already long enough (for optimization)
	frames[timeline.len-1] = undefined;

	
	//this function has to go in here because it makes reference to local variables
	var finishVideo = () => {
		//append each frame to the video
		recorder.start();
		for (var b=0; b<timeline.len; b++) {
			//TODO: this drawing could be done async? or drawing could start while images are still loading
			vtx.drawImage(frames[b], 0, 0, frames[b].width, frames[b].height, 0, 0, vidCanvas.width / scaling, vidCanvas.height / scaling);
			recorder.capture(vidCanvas);
		}
		recorder.stop();
		recorder.save();

		//undo workspace + timeline changes
		timeline.changeFrameTo(saveTime);
		timeline.onionActive = saveOnion;
		φSet(workspace_background, {"stroke": "#FFFFFF"});

		//yoink from ffmpeg docs
		// const {createFFmpeg, fetchFile} = FFmpeg;
		// const ffmpeg = createFFmpeg({ log: true });
		// const transcode = async ({target: {files}}) => {
		// 	const {name} = files[0];
		// 	await ffmpeg.load();
		// 	ffmpeg.FS('writeFile', name, await fetchFile(files[0]));
		// 	await ffmpeg.run('-i', name, `${fileName}.mp4`);
		// 	const data = ffmpeg.FS('readFile', `${fileName}.mp4`);
		// 	const video = document.getElementById('player');
		// 	video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
		// }
		// transcode()
		// document.getElementById('uploader').addEventListener('change', transcode);
	}


	//svg setup

	//split the rendering up into parts executed by a function
	//that way it can give progress updates
	var DOMURL = window.URL || window.webkitURL || window;
	var setupFrame = (t) => {
		timeline.changeFrameTo(t);
		var data = new XMLSerializer().serializeToString(svgFrom);
		var img = new Image();
		var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
		var url = DOMURL.createObjectURL(svgBlob);
		img.src = url;
		
		//draw image to canvas then download
		img.onload = () => {
			frames[t] = img;
			framesToLoad -= 1;
			console.log(framesToLoad);
			if (framesToLoad <= 0) {
				finishVideo();
			}
		};
	}

	for (var b=0; b<timeline.len; b++) {
		setupFrame(b);
	}
}



function video_renderFrame(t, svgFrom, drawCanvas, scaling, ) {

}