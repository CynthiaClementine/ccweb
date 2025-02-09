window.onload = setup;
window.onresize = handleResize;

window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;

var anim;

var time_last = 0;

var cursor_x = 0;
var cursor_y = 0;

var pram_width = 640;
var pram_height = 480;

var settings = {

};

var entities = [new Player(100, 100)];
var bullets_high = [];
var bullets_low = [];


function setup() {
	handleResize();

	anim = window.requestAnimationFrame(main);
}

function main() {
	var time = performance.now();
	//25ms max. after that just give up
	var dt = Math.min(time - time_last, 25) / 1000;
	time_last = time;

	//handle all entities
	entities.forEach(e => {
		e.tick(dt);
	});

	//handle general 
	anim = window.requestAnimationFrame(main);
}






function handleMouseDown(e) {

}

function handleMouseMove(e) {
	var area = workspace_container.getBoundingClientRect();
	cursor_x = (e.clientX - area.left) / area.width * pram_width;
	cursor_y = (e.clientY - area.top) / area.height * pram_height;

	//keeping cursor in bounds
	cursor_x = clamp(cursor_x, 0, pram_width);
	cursor_y = clamp(cursor_y, 0, pram_height);

	φSet(workspace_zoomText, {
		'innerHTML': `(${cursor_x}, ${cursor_y})`
	});
}


function handleKeyPress(e) {

}


function handleKeyRelease(e) {

}

function handleResize() {
	//resize workspace to be slightly larger than the actual document size. It's ok because we're disabling scroll bars so they'll never know
	var w =  window.innerWidth;
	var h = window.innerHeight;
	φSet(base, {
		'width': w,
		'height': h,
	});
}