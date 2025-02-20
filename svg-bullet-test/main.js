window.onload = setup;
window.onresize = handleResize;

window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;

window.addEventListener("load", () => {
	console.log(`loaded!`);
});

var anim;

var time_last = 0;
var time_offset = 0;

var cursor_x = 0;
var cursor_y = 0;

var pram_width = 640;
var pram_height = 480;
var pram_mode = "menu";

var settings = {

};

/*each stage consists of a set of timing points and entities.
the entity data is a string following the format "type~args"
where type determines what entity it is, and args are passed in as JSON-parsed arguments to the entity
example: [1.2, `basic~`]
will spawn a basic entity 50% of the way down the left edge, at t = 1.2


basic~startX~startY~homeX~homeY
*/
var stages = {
	"test": [
		[1, "basic~-10~100~100~100"],
		// [2, "basic~"],
	]
};

var stage_current;
var stage_boundaries = [[0, 0], [480, 480]];

var player = new Player(100, 100);
var entities = [player];
var bullets_high = [];
var bullets_low = [];


function setup() {
	handleResize();

	anim = window.requestAnimationFrame(main);
}

function main() {
	var time = (performance.now() / 1000) - time_offset;
	//25ms max. after that just give up
	var dt = Math.min(time - time_last, 25);
	time_last = time;

	switch (pram_mode) {
		case "stage":
			runStage(stage_current, dt);
			break;
		case "menu":
			break;
	}

	//handle general
	anim = window.requestAnimationFrame(main);
}

function runStage(stageData, dt) {
	var lastTime = time_last - dt;

	//first figure out what part we're currently on
	var line = 0;
	while (line < stageData.length && stageData[line][0] < lastTime) {
		line += 1;
	}

	//check if we have lines to process
	//99.99% of the time this'll only be 0 or 1 lines, but one frame could theoretically cover multiple
	while (line < stageData.length && hasTime(time_last, dt, stageData[line][0])) {
		console.log(`processing line ${line}`);
		for (var g=1; g<stageData[line].length; g++) {
			stage_processEntity(stageData[line][g]);
		}
		line += 1;
	}

	//tick all the entities
	entities.forEach(e => {
		e.tick(dt);
	});
	bullets_high.forEach(b => {
		b.tick(dt);
	})
}


function stage_processEntity(entityData) {
	var spl = entityData.split("~");

	var constructor;
	switch (spl[0]) {
		case "basic":
			constructor = Forest_Basic;
			break;
	}

	spl = spl.slice(1).map(a => JSON.parse(a));
	var ent = new constructor(...spl);
	console.log(ent);
	entities.push(ent);

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

	φSet(readout_debug2, {
		'innerHTML': `(${cursor_x.toFixed(2)}, ${cursor_y.toFixed(2)})`
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