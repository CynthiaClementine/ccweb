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

var bullet_r = 4;

var cursor_x = 0;
var cursor_y = 0;

var debug_active = false;

var pram_width = 640;
var pram_height = 480;
var pram_mode = "menu";

var settings = {
};

var stage_bufferTime = 1.0;

var stage_current;
var stage_line = 0;
var stage_boundaries = [[0, 0], [480, 480]];

var player = new Player(100, 100);
var entities = [player];
var bullets_high = [];
var bullets_low = [];
var bullets_despawnable = [];

var speed_fast = 300;
var speed_med = 200;
var speed_slow = 100;


function setup() {
	preprocessStages();
	handleResize();
	initSprites();

	anim = window.requestAnimationFrame(main);
}

function initSprites() {
	var old, wrapper, node, dims;
	var x, y, width, height;
	var multicolor, trueWrapper;
	while (embeds.children.length > 0) {
		old = embeds.children[0];
		try {
			dims = φGet(old, "dims").split("x").map(a => +a);
		} catch (er) {
			console.error(`could not get dimensions of `, old);
		}

		[x, y, width, height] = [dims[0] / -2, dims[1] / -2, dims[0], dims[1]];
		wrapper = φCreate("foreignObject", {
			"x": x,
			"y": y,
			"width": width,
			"height": height,
			"id": old.id
		});

		multicolor = φGet(old, "multicolor");
		console.log(multicolor);

		/*
			<foreignObject id="bullet_circle_o" x="-1" y="-1" width="2" height="2">
				<svg><use href="#bullet_circle" filter="url(#filter_orange)"/></svg>
			</foreignObject>
		*/
		node = old.getSVGDocument().documentElement;
		wrapper.appendChild(node);
		old.remove();
		globalDefs.appendChild(wrapper);

		if (multicolor == "true") {
			[`_r`, `_o`, `_y`, `_g`, `_b`, `_p`, `_kk`, `_k`].forEach(c => {
				trueWrapper = wrapper.cloneNode(true);
				φSet(trueWrapper, {"id": old.id + c});
				trueWrapper.innerHTML = `<svg><use href="#${old.id}" filter="url(#filter${c})"/></svg>`;
				globalDefs.appendChild(trueWrapper);
			});
		}
	}
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
	if (debug_active) {
		return;
	}

	//first figure out what part we're currently on

	//check if we have lines to process
	//99.99% of the time this'll only be 0 or 1 lines, but one frame could theoretically cover multiple
	var repeatable = true;
	if (stage_line < stageData.length && (stageData[stage_line].constructor.name == "String" || stageData[stage_line][0] < time_last)) {
		console.log(`processing line ${stage_line}`);
		processLine(stageData, dt);
	}

	//tick all the entities
	entities.forEach(e => {
		e.tick(dt, time_last);
	});
	bullets_high.forEach(b => {
		b.tick(dt);
	})

	var ind = 0;
	for (var deind=0; deind<bullets_despawnable.length; deind++) {
		ind = bullets_high.indexOf(bullets_despawnable[deind], ind);
		bullets_high.splice(ind, 1);
	}
	bullets_despawnable = [];
}

function runStageLine(stageData, dt) {
	if (stageData[stage_line].constructor.name == "String") {
		if (entities.length == 1) {
			var set = +(stageData[stage_line].split(`~`)[1]);
			//figure out how we get from current time to set time
			time_offset += time_last - set;
			stage_line += 1;
		}
		return;
	}

	for (var g=1; g<stageData[stage_line].length; g++) {
		stage_processEntity(stageData[stage_line][g]);
	}
	stage_line += 1;
}


function stage_processEntity(entityData) {
	var spl = entityData.split("~");

	var constructor;
	constructor = {
		"woody": Woody,
		"frog": Frog,
		"mage": FrogMage,
	}[spl[0]];

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
	switch (e.code) {
		case "BracketRight":
			debug_active = !debug_active;
			if (debug_active) {
				//set up all the debug circles
				[...entities, ...bullets_high].forEach(e => {
					workspace_debug.appendChild(φCreate("circle", {
						cx: e.x,
						cy: e.y,
						r: e.r,
						fill: "none",
						stroke: "#F00",
						"stroke-width": 0.4
					}));
				});
			} else {
				//clear debug circles
				workspace_debug.innerHTML = "";
			}
			break;
	}
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