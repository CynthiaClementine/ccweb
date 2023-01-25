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

function downloadImage(imgURI, fileName) {
	var evt = new MouseEvent("click", {
		view: window,
		bubbles: false,
		cancelable: true
	});
	var a = document.createElement("a");
	φSet(a, {
		'download': fileName,
		'href': imgURI,
		'target': '_blank'
	});
	a.dispatchEvent(evt);
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
	var data = new XMLSerializer().serializeToString(workspace_container);
	var DOMURL = window.URL || window.webkitURL || window;
	var img = new Image();
	var svgBlob = new Blob([data], {type: "image/svg+xml;charset=utf-8"});
	var url = DOMURL.createObjectURL(svgBlob);
	
	//draw image to canvas then download
	img.onload = () => {
		console.log(bbox, img.width, img.height);
		ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width / scaling, canvas.height / scaling);
		DOMURL.revokeObjectURL(url);
		if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
			var blob = canvas.msToBlob();
			navigator.msSaveOrOpenBlob(blob, fileName);
		} else {
			var imgURI = canvas.toDataURL("image/png");
			downloadImage(imgURI, fileName);
		}
		document.removeChild(canvas);
		//let it be visible again
	};
	img.src = url;
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
	var fixFunc = () => {
		timeline.changeFrameTo(saveTime);
		timeline.onionActive = saveOnion;
		φSet(workspace_background, {"stroke": "#FFFFFF"});
	}

	//canvas
	var svgFrom = workspace_container;
	var vidCanvas = document.createElement("canvas");
	var vtx = vidCanvas.getContext("2d");
	var [w, h] = φGet(svgFrom, ["width", "height"]);
	var scaleFactor = videoHeight / h;
	vidCanvas.width = w * scaleFactor;
	vidCanvas.height = videoHeight;
	var stream = vidCanvas.captureStream(0);
	var frames = [];

	// stream.addTrack(audioTrack)	Add audio track here


	//split the rendering up into parts executed by a function
	//that way it can give progress updates
	var renderFrame = (t) => {
		
	}




	//fix
}