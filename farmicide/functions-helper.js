

function getImage(url, useOffscreenCanvas) {
	var image = new Image();
	image.src = url;

	//if using an offscreen canvas return that instead
	if (useOffscreenCanvas) {
		var nowCanvas = document.createElement('canvas');
		var nowCtx = nowCanvas.getContext('2d');
		nowCanvas.width = 0;
		nowCanvas.height = 0;

		image.onload = () => {
			//when the image loads resize the canvas and paint to it
			nowCanvas.valid = true;
			nowCanvas.width = image.width;
			nowCanvas.height = image.height;
			nowCtx.drawImage(image, 0, 0);
		}
		return nowCanvas;
	}
	return image;
}