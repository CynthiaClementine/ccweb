window.onload = setup;
window.onresize = handleResize;
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;
document.onkeydown = handleKeyDown;
document.onkeyup = handleKeyUp;

function setup() {

}

function handleResize() {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.96;
	var forceAspect = 0.75;

	spaceH = Math.min(spaceH, spaceW * forceAspect);
	spaceW = spaceH / forceAspect;

	canvas.width = Math.floor(spaceW);
	canvas.height = Math.floor(spaceH);
	var scaling = canvas.width / 640;
	ctx.setTransform(scaling, 0, 0, scaling, 0, 0);
	ctx.translate(320, 240);
	ctx.lineCap = "round";
	ctx.textBaseline = "middle";
}

function handleMouseDown() {

}

function handleMouseUp() {

}

function handleKeyDown() {

}

function handleKeyUp() {

}