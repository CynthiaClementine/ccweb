//events
window.onload = setup;
window.addEventListener("keydown", handleKeyPress, false);
window.addEventListener("keyup", handleKeyNegate, false);
window.addEventListener("mousemove", handleMouseMove, false);
window.addEventListener("mousedown", handleMouseDown, false);
window.addEventListener("mouseup", handleMouseUp, false);


//global vars
let animation;
let ctx;
let canvas;

var button_shiftPressed = false;

const color_background = "#f1f1f1";
const color_flowers = [
	"#9ef121",
	"#265df4",
	"#a53fdc",
	//"#ff3891",
];

const color_text = "#882288";

var cursor_down = false;
var cursor_x = 0;
var cursor_y = 0;

var flowers = [];
var flower_typeSelected = 0;
var flower_size = 7;

var grid_size = 30;
var grid_sizes = [30, 4];

var network_parameters = [2, 5, 5, 3];
var network_best;
var network_bestFitness;
var network_bestShares = 150;
var network_dropOffRate = 0.85;
var network_society = [];
var network_populationTarget = 600;
var network_survivors = 2;
var network_mutateRate = 0.1;
var network_changeAmount = 0.015;
var network_mode = "evo";


var world_time = 0;


//main functions
function setup() {
	canvas = document.getElementById("cylinderRoses");
	ctx = canvas.getContext("2d");

	setCanvasPreferences();

	//set up the network
	makeNetworkPopulation();
	animation = window.requestAnimationFrame(main);
}

function main() {
	animation = window.requestAnimationFrame(main);
	world_time += 1;

	var allGood = networkIsGood(network_best);

	//draw background
	ctx.fillStyle = color_background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	drawGrid();
	drawFlowers();

	//text foreground
	ctx.fillStyle = color_text;
	ctx.font = `${canvas.height / 30}px Ubuntu`;
	ctx.fillText(`${(network_mode == "evo") ? "evolution" : "gradient"} mode`, canvas.width * 0.01, canvas.height * 0.025);
	ctx.fillText(`loss = ${(-network_bestFitness).toFixed(3)}`, canvas.width * 0.01, canvas.height * 0.06);
	if (allGood) {
		ctx.fillText(`Everything is classified correctly.`, canvas.width * 0.01, canvas.height * 0.095);
	}
	
	//train the network if it isn't good enough
	var i = 1 + (200 * (network_mode == "grad"));
	while ((i > 0) && (network_best == undefined || !allGood)) {
		i -= 1;

		if (network_mode == "evo") {
			trainOnceEvolve();
		} else if (network_mode == "grad") {
			trainOnceBackprop();
		}
	}
}

//utility functions
function copy(obj) {
	//returns as best as possible a copy of the object, without referencing the object
	return JSON.parse(JSON.stringify(obj));
}

function drawGrid() {
	if (network_best == undefined) {
		return;
	}
	ctx.globalAlpha = 0.2;
	//create grid of squares, color it the color that the best network thinks it should be
	var testCoords;
	for (var sy=0; sy<canvas.height/grid_size; sy++) {
		for (var sx=0; sx<canvas.width/grid_size; sx++) {
			testCoords = [(sx + 0.5) * grid_size / canvas.width, (sy + 0.5) * grid_size / canvas.height];
			var output = network_best.evaluate(testCoords);

			ctx.fillStyle = color_flowers[output.indexOf(Math.max(...output))];
			ctx.fillRect(sx * grid_size, sy * grid_size, grid_size+1, grid_size+1);
		}
	}
}

function drawFlowers() {
	//flower backgrounds
	ctx.globalAlpha = 0.5;
	flowers.forEach(f => {
		ctx.fillStyle = color_flowers[f[2]];
		ctx.beginPath();
		ctx.ellipse(f[0] * canvas.width, f[1] * canvas.height, flower_size * 2, flower_size * 2, 0, 0, Math.PI * 2);
		ctx.fill();
	});
	ctx.globalAlpha = 1;

	//flower foregrounds
	flowers.forEach(f => {
		ctx.fillStyle = color_flowers[f[2]];
		ctx.beginPath();
		ctx.ellipse(f[0] * canvas.width, f[1] * canvas.height, flower_size, flower_size, 0, 0, Math.PI * 2);
		ctx.fill();
	});
}


//modified loss function that just says whether the network gets all the flowers right
function networkIsGood(network) {
	//run through all possible flowers to check
	for (var f=0; f<flowers.length; f++) {
		var output = network.evaluate([flowers[f][0], flowers[f][1]]);
		//if the flower and the guessed flower don't match, the network is wrong
		if (output.indexOf(Math.max(...output)) != flowers[f][2]) {
			return false;
		}
	}

	return true;
}

function getFitnessFor(network) {
	var loss = 0;
	var expected;
	//run through all possible flowers to check
	flowers.forEach(f => {
		//create expected
		expected = []
		expected.length = color_flowers.length;
		expected.fill(0);
		expected[f[2]] = 1;

		loss += network.evaluateLoss([f[0], f[1]], expected);
	});

	return -loss;
}

function makeNetworkPopulation() {
	//create the population: two inputs (x and y), 4 outputs (one for each of the flower colors), and a few hidden layers for funsies
	network_society = [];
	var newNet;
	for (var v=0; v<network_populationTarget; v++) {
		newNet = new Network(network_parameters);
		newNet.createNetwork();
		network_society.push(newNet);
	}
}

function setCanvasPreferences() {
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
}

function sigmoidAnti(x) {
	var val = sigmoid(x, 0, 1);
	return val * (1 - val);
}

function trainOnceEvolve() {
	//first get the fitness values for all the networks
	var pairedArr = [];
	network_society.forEach(n => {
		//create the pairing
		var pairing = [getFitnessFor(n), n];

		//put it into the array, in order of fitness
		for (var a=0; a<pairedArr.length; a++) {
			if (pairedArr[a][0] < pairing[0]) {
				pairedArr.splice(a, 0, pairing);
				a = pairedArr.length + 50;
			}
		}
		
		//if the pairing hasn't been placed yet, place it now
		if (a < pairedArr.length + 5) {
			pairedArr.push(pairing);
		}
	});

	//save the best one
	[network_bestFitness, network_best] = pairedArr[0];

	//turn the paired array into population 
	var populationPullArr = [];
	var shares = network_bestShares;
	pairedArr.forEach(p => {
		for (var a=0; a<shares; a++) {
			populationPullArr.push(p[1]);
		}
		shares = Math.ceil(shares * network_dropOffRate);
	});

	var newPopulation = [];
	//populate the new generation
	while (newPopulation.length < network_populationTarget) {
		//choose parents
		var parent1 = Math.floor(randomBounded(0, populationPullArr.length-0.01));
		var parent2 = Math.floor(randomBounded(0, populationPullArr.length-0.01));
		//make sure the parents aren't the same 
		while (parent1 == parent2) {
			parent2 =  Math.floor(randomBounded(0, populationPullArr.length-0.01));
		}

		//convert indeces to actual parent references
		parent1 = populationPullArr[parent1];
		parent2 = populationPullArr[parent2];

		//create network
		newPopulation.push(parent1.createChildWith(parent2));
	}

	//replace society
	network_society = newPopulation;
}

function trainOnceBackprop() {
	//if the best isn't defined, define it as whatever
	if (network_best == undefined) {
		network_best = network_society[0];
		network_bestFitness = getFitnessFor(network_best);
	}

	//take the best, send it through one epoch of the flower data
	var temp = network_bestFitness;
	flowers.forEach(f => {
		expected = []
		expected.length = color_flowers.length;
		expected.fill(0);
		expected[f[2]] = 1;

		network_best.trainOnce([f[0], f[1]], expected);
	});
	
	network_bestFitness = getFitnessFor(network_best);

	if (network_bestFitness < temp) {
		console.log(`network got worse`);
	}
}


function handleKeyPress(a) {
	switch (a.code) {
		case "ShiftLeft":
			button_shiftPressed = true;
			break;
		//refactor this bit later
		case "Digit0":
			flower_typeSelected = 0;
			break;
		case "Digit1":
			flower_typeSelected = 1;
			break;
		case "Digit2":
			flower_typeSelected = 2;
			break;


		case "Space":
			//toggle between large and small grid
			grid_size = (grid_size == grid_sizes[0]) ? grid_sizes[1] : grid_sizes[0];
			break;
		case "KeyM":
			network_mode = (network_mode == "evo") ? "grad" : "evo";
			break;
		// case "Digit3":
		// 	flower_typeSelected = 3;
		// 	break;
	}
}

function handleKeyNegate(a) {
	switch (a.code) {
		case "ShiftLeft":
			button_shiftPressed = false;
			break;
	}
}

function handleMouseDown(a) {
	cursor_down = true;

	//get cursor position
	var canvasArea = canvas.getBoundingClientRect();
	cursor_x = a.clientX - canvasArea.left;
	cursor_y = a.clientY - canvasArea.top;

	if (cursor_x <= 0 || cursor_x > canvas.width) {
		return;
	}

	if (cursor_y <= 0 || cursor_y > canvas.height) {
		return;
	}

	//get the distance to the closest flower
	var cCX = cursor_x / canvas.width;
	var cCY = cursor_y / canvas.height;
	var minDist = flower_size * 1.5 / canvas.height;
	var closestIndex;

	for (var f=0; f<flowers.length; f++) {
		if (Math.sqrt((flowers[f][0] - cCX) ** 2 + (flowers[f][1] - cCY) ** 2) < minDist) {
			closestIndex = f;
			minDist = Math.sqrt((flowers[f][0] - cCX) ** 2 + (flowers[f][1] - cCY) ** 2);
		}
	}

	//add / remove a dot
	if (button_shiftPressed) {
		//remove the closest flower
		if (closestIndex != undefined) {
			flowers.splice(closestIndex, 1);
		}
	} else {
		//add a flower at the current position
		flowers.push([cursor_x / canvas.width, cursor_y / canvas.height, flower_typeSelected]);
	}

	if (network_mode == "evo") {
		trainOnceEvolve();
	} else if (network_mode == "grad") {
		trainOnceBackprop();
	}
}

function handleMouseMove(a) {
	var canvasArea = canvas.getBoundingClientRect();
	cursor_x = a.clientX - canvasArea.left;
	cursor_y = a.clientY - canvasArea.top;
}

function handleMouseUp(a) {
	cursor_down = false;
}