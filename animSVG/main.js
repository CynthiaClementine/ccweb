window.onload = setup;

//mouse events
window.onmousedown = handleMouseDown;
window.onmousemove = handleMouseMove;
window.onmouseup = handleMouseUp;

//key press events
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyRelease;

//trackpad gestures
window.addEventListener("wheel", handleWheel, {passive: false});

//misc
window.onresize = handleResize;
window.onbeforeunload = handleUnload;

//the storage for interval event during timeline playback 
var autoplay;
var autoplayStop;

var color_debug = "#FF00FF";

var color_selectedNode = activeColor_stroke;
var color_stroke = φGet(activeColor_stroke, "fill");
var color_fill = φGet(activeColor_fill, "fill");
var color_stage = φGet(activeColor_stage, "fill");

var base;

var button_alt = false;
var button_force = false;
var button_shift = false;

var canvas;
var ctx;

var cubicBinSize = 20;

var data_persistent = {
	brushSize: 8,
};

var cursor = {
	down: false,
	downType: undefined,
	x: 0,
	y: 0,
}

var debug_active = false;

var editDeltaTracker = 0;
var editDeltasFuture = [];		//changes required to get to the future (present time)
var editDeltasPast = [];	//changes required to get to the past
var editDeltasMax = 100;

var fps_limitMin = 1;
//I figure 100 is a good max number, you can't really see any individual frame less than 10ms anyways, but 144 divides better so that's the limit
var fps_limitMax = 144;

var hotkeys = [
	// ["Modifier1 Modifier2 Key.code", `function`, `description`],
	// ["Key", `function`, `description`],
	
	//tools
	["KeyC", `changeToolTo("Circle")`, `Circle tool`],
	["KeyI", `changeToolTo("Eyedrop")`, `Eyedropper tool`],
	["KeyK", `changeToolTo("Fill")`, `Fill tool`],
	["KeyN", `changeToolTo("Line")`, `Line tool`],
	["KeyM", `changeToolTo("Move")`, `Move tool`],
	["KeyY", `changeToolTo("Pencil")`, `Pencil tool`],
	["KeyR", `changeToolTo("Rectangle")`, `Rectangle tool`],

	//timeline actions
	["KeyO", `toggleOnionSkin()`, `Toggle onion skin`],
	["Digit1", `user_keyframe(1)`, `Create blank keyframe`],
	["Digit2", `user_keyframe(2)`, `Create keyframe from existing`],
	["Shift Digit1", `user_keyframe(3)`, `Remove keyframe`],
	
	["Enter", `toggleTimelinePlayback()`, `Toggle timeline playback`],
	["ArrowLeft", `select(timeline.s, timeline.t - 1)`, `Decrement timeline position`],
	["ArrowRight", `select(timeline.s, timeline.t + 1)`, `Increment timeline position`],
	["ArrowUp", `select(timeline.s - 1, timeline.t)`, `Select layer above`],
	["ArrowDown", `select(timeline.s + 1, timeline.t)`, `Select layer below`],
	["Force ArrowLeft", `select(timeline.s, 0)`, `Move to timeline start`],
	["Force ArrowRight", `select(timeline.s, timeline.len - 1)`, `Move to timeline end`],

	//file-wide???
	["Force KeyZ", `undo()`, `undo`],
	["Shift Force KeyZ", `redo()`, `redo`],
];

//tool-specific hotkeys. They're defined here but included in a tool class whenever a tool has them
var hotkeys_brushSize = [
	["BracketLeft", `changeBrushSize(data_persistent.brushSize - 1)`, `Decrease brush size`],
	["BracketRight", `changeBrushSize(data_persistent.brushSize + 1)`, `Increase brush size`],
];
var hotkeys_delete = [
	["Backspace", `toolCurrent.delete()`, `Delete selected object`],
];
var hotkeys_polygon = [
	["Minus", `toolCurrent.changeSides(-1)`, `Decrease number of sides`],
	["Equal", `toolCurrent.changeSides(1)`, `Increase number of sides`]
];

//the decimal point to quantize to
var quantizeTo = 1;

var timer;
var timeline = new Timeline();


var toolCurrent;

var workspace_margin = 0.1;
var workspace_scaleBounds = [0.02, 100];

var saveData;

var timeline_blockH;
var timeline_blockW;
var timeline_headHeight = 15;
var timeline_oldKeyPos = [0, 0];
var timeline_marginRight = 3;
var timeline_labelPer = 12;
var timeline_lenStore = 1;

var uidChars = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZςερτυθιοπασδφγηξκλζχψωβνμ`;
var uidCount = 0;


function setup() {
	base = document.getElementById("base");
	canvas = document.getElementById("convos");
	ctx = canvas.getContext("2d");
	changeToolTo("Pencil");

	//setting up variables that depend on document
	[timeline_blockW, timeline_blockH] = φGet(MASTER_frameBoxPath, ["width", "height"]);
	timeline_blockW = +timeline_blockW;
	timeline_blockH = +timeline_blockH;

	
	addLayer("Layer 1");
	resizeTimeline(undefined, 100);

	testTimeline();
	handleResize();
	// debug_active = true;
}

function testTimeline() {
	var testSuite = {
		layerAdd: true,
		intersects: false,
		fills: false,
		keyframes: true,
		apple: true,
	}
	//helpful functions
	function r() {
		return [
			Math.round(Math.random() * 500),
			Math.round(Math.random() * 500),
		];
	}

	function create(points) {
		// toolCurrent.layerSelected = layer;
		changeToolTo("Pencil")
		toolCurrent.autoBuffer(points);
		var splines = toolCurrent.pushToWorkspace();
		toolCurrent.reset();
		return splines;
	}

	if (testSuite.layerAdd) {
		//add layers
		addLayer("Layer 2");
		addLayer("Layer 3");
	}

	if (testSuite.intersects) {
		//draw on the first frame of the first layer
		create([[-402,313], [1000,41]]);
		create([[0,0], [731,41]]);
		
		//these check for intersection detection
		create([[724.4, 150.3],[814.9, 156.3],[918.2, 143.1],[878.7, 101.5],[810.7, 93.4],[800.7, 200.4],[840, 200],[840, 130]]);
		create([[0, 500], [100,500], [723,380], [723, 280]]);
		create([[693,323.5],[694,323.5],[697,322.5],[701,322.5],[706,321.5],[712,320.5],[719,320.5],[727,320.5],[737,320.5],[745,320.5],[754,320.5],[762,320.5],[768,321.5],[775,323.5],[780,325.5],[785,328.5],
			[790,331.5],[795,335.5],[799,338.5],[803,342.5],[807,346.5],[808,348.5],[813,354.5],[813,356.5],[816,361.5],[816,363.5],[817,366.5],[818,371.5],[819,374.5],[819,376.5],[819,381.5],[819,385.5],[819,387.5],
			[819,392.5],[819,394.5],[819,397.5],[818,400.5],[817,403.5],[816,405.5],[815,407.5],[813,409.5],[811,412.5],[808,414.5],[805,415.5],[801,417.5],[796,419.5],[791,420.5],[786,422.5],[778,422.5],[770,423.5],
			[762,424.5],[754,424.5],[737,424.5],[725,421.5],[711,414.5],[696,407.5],[682,400.5],[668,393.5],[661,390.5],[647,382.5],[636,379.5],[627,374.5],[624,373.5],[619,371.5],[616,370.5],[613,368.5],[611,368.5],
			[610,367.5]]);
		create([[88, 258], [322, 333], [322, 248], [173, 370]]);

		create([[402.3,285.6],[580,180.5]]);
		create([[431.8,181.9],[662.1,256.0]]);
		create([[642.0,217],[379.4,275.5]]);

		create([[175,456.5],[175,457.5],[175,458.5],[175,459.5],[175,460.5],[175,462.5],[176,463.5],[177,466.5],[179,469.5],[182,473.5],[186,478.5],[190,482.5],[195,487.5],[200,492.5],[206,496.5],[212,501.5],
			[219,506.5],[226,511.5],[232,515.5],[239,519.5],[245,523.5],[251,526.5],[257,530.5],[261,532.5],[266,535.5],[270,537.5],[278,541.5],[285,544.5],[289,546.5],[296,548.5],[301,550.5],[307,552.5],[309,553.5],
			[313,554.5],[317,555.5],[320,556.5],[322,557.5],[324,557.5],[325,558.5],[326,558.5],[328,558.5],[329,558.5],[331,558.5],[332,558.5],[334,558.5],[336,558.5],[339,558.5],[341,558.5],[343,558.5],[345,558.5],
			[347,558.5],[349,558.5],[350,557.5],[352,556.5],[353,556.5],[354,555.5],[356,554.5],[357,554.5],[358,553.5],[359,552.5],[361,551.5],[362,550.5],[363,549.5],[364,548.5],[365,548.5],[366,547.5],[368,546.5],
			[368,545.5],[369,545.5],[370,544.5],[370,543.5],[371,542.5],[371,541.5],[372,541.5],[372,540.5],[372,539.5],[373,538.5],[373,537.5],[373,536.5],[373,535.5],[373,534.5],[373,533.5],[373,532.5],[373,531.5],
			[373,530.5],[373,529.5],[372,528.5],[372,527.5],[371,527.5],[370,526.5],[369,526.5],[368,526.5],[367,526.5],[366,525.5],[365,525.5],[364,525.5],[363,524.5],[361,524.5],[360,523.5],[357,523.5],[356,523.5],
			[353,522.5],[350,522.5],[347,521.5],[343,521.5],[342,521.5],[338,520.5],[336,520.5],[333,519.5],[331,518.5],[328,518.5],[325,516.5],[324,515.5],[320,513.5],[317,511.5],[316,509.5],[312,506.5],[310,503.5],
			[307,500.5],[304,497.5],[301,494.5],[299,490.5],[295,486.5],[293,482.5],[290,477.5],[288,472.5],[286,464.5],[284,458.5],[284,452.5],[282,447.5],[282,441.5],[282,439.5],[281,431.5],[281,429.5],[281,423.5],
			[281,421.5],[281,419.5],[281,417.5],[281,415.5],[281,414.5],[281,413.5],[281,412.5]]);
		randomizeColorsFor(frame_xb);
	}
	
	if (testSuite.fills) {
		// debug_active = true;
		// fill(821, 179);
		fill(530, 227.5);
	}
	

	
	
	


	//simulation of drawing on different keyframes
	if (testSuite.keyframes) {
		changeAnimationLength(10);
		makeKeyframe(0, 4);
		
		timeline.changeFrameTo(6);
		
		setColorRGBA(255, 128, 0, 1);
		
		makeKeyframe(1, 5);
		select(1, 5);

		/*
		create([[398,142],[402,142],[405,142],[415,142],[425,142],[431,142],[443,142],[456,142],[467,142],[479,142],[490,142],[498,141],[507,140],[514,138],[521,137],[528,135],[534,134],[540,132],
			[542,132],[547,131],[552,130],[556,130],[559,129],[561,128],[562,128],[563,128],[564,128],[565,128],[565,128],[565,128],[565,128],[565,130],[565,133],[566,136],[567,141],[567,146],[568,153],
			[568,160],[568,167],[568,174],[568,181],[568,188],[568,191],[568,197],[568,202],[568,205],[568,209],[568,211],[568,213],[568,213],[568,214],[568,214],[568,214],[568,214]]);
		create([[410,507],[614,390],[844,406],[1015,376],[1134,275],[1161,181],[1157,100]]);
		create([[590,495],[582,495],[581,496],[580,496],[577,496],[576,497],[575,498],[573,498],[569,500],[567,502],[565,503],[563,504],[562,505],[559,508],[558,509],[555,513],[554,515],[553,516],[552,518],[552,520],[551,521],[550,524],[550,526],[550,529],[550,532],[549,534],[549,541],[550,541],[550,543],[551,544],[553,545],[557,546],[560,547],[563,547],[568,548],[571,549],[575,549],[580,550],[585,551],[589,552],[593,552],[597,552],[600,553],[609,553],[612,552],[613,552],[616,551],[618,550],[618,550],[619,549]]);
		create([[362,241],[362,220],[379,196],[393,188],[410,184],[445,184],[469,202],[489,227],[498,246],[503,282],[496,295],[482,306],[455,313],[406,313],[396,306],[388,292],[388,268],[405,258],[426,258],[438,270],[438,278],[410,308],[372,322],[327,333],[272,331]]);
		create([[705,432],[760,430],[881,402],[922,395],[960,394]]);
		
		create([[629,167],[629,173],[635,189],[656,220],[668,232],[689,247],[713,256],[729,259],[764,262],[815,262],[840,255],[856,242],[864,232],[873,208],[876,187],[875,154],[867,142],[851,129],[831,122],
			[821,121],[789,121],[777,127],[765,138],[754,151],[748,161],[741,182],[740,194],[740,218],[742,225],[753,243],[768,259],[793,279],[802,283],[818,289],[851,294],[876,294],[893,290],[924,280],
			[942,272],[959,262],[980,242],[991,227],[1045,169],[1045,167]]);
		makeUnKeyframe(1, 5);
		
		select(2, 2);
		setColorRGBA(255, 0, 255, 0.5);
		// create([r(), r(), r(), r(), r(), r()]);
		create([[295,60],[300,59],[311,55],[334,45],[369,31],[413,14],[439,5],[464,-5],[485,-13],[512,-23],[527,-28],[539,-31],[543,-32],[551,-36],[556,-37],[559,-38],[563,-38],[562,-37],[556,-33],
			[547,-28],[536,-20],[512,-3],[481,18],[461,31],[441,48],[421,61],[382,90],[363,106],[351,117],[341,125],[339,128],[338,128],[338,129],[349,129],[358,127],[369,124],[379,122],[394,117],
			[412,112],[433,107],[455,102],[476,95],[499,87],[520,80],[529,77],[562,67],[574,63],[577,60],[585,57],[590,56],[594,54],[596,54],[597,53],[598,53],[597,53],[587,56],[568,66],[539,83],
			[500,106],[458,131],[422,155],[402,170],[392,177],[389,180],[383,184],[378,190],[377,190],[376,191],[376,192],[378,192],[384,190],[390,187],[410,181],[420,179],[432,175],[446,172],[461,168],
			[477,164],[486,163],[499,161],[512,158],[527,156],[534,154],[539,153],[546,152],[549,152],[551,151],[549,151],[546,153],[539,156],[527,163],[519,167],[497,179],[490,183],[488,184],[487,184],
			[487,185],[494,185],[501,184],[507,183],[537,183],[534,186],[532,187],[529,191],[514,206],[513,209],[508,213],[508,214],[520,214],[526,213],[533,212],[536,211],[540,211],[542,210],[540,211],
			[538,212],[535,214],[534,216],[532,218],[530,219]]);
		makeKeyframe(2, 2);
		*/
	}

	/*
	

	setColorRGBA(128, 128, 255, 1);
	var interPoly = [[268.9,261.2],[257.6,274],[254.8,281.1],[252,283.9],[246.3,300.9],[246.3,330.6],[247.7,333.4],[247.7,340.5],[252,350.4],[252,356.1],[256.2,368.8],[256.2,387.2],[249.1,407],[244.9,414.1],
	[244.9,416.9],[226.5,446.6],[225.1,453.7],[218,467.9],[216.6,491.9],[223.6,511.8],[236.4,530.2],[243.5,534.4],[295.8,541.5],[321.3,541.5],[341.1,533],[385,524.5],[397.7,518.8],[411.9,507.5],
	[420.4,494.8],[430.3,486.3],[434.5,479.2],[435.9,479.2],[441.6,469.3],[444.4,467.9],[447.3,460.8],[448.7,460.8],[450.1,450.9],[451.5,450.9],[451.5,436.7],[445.8,428.3],[443,428.3],[438.8,425.4],
	[427.4,424],[426,422.6],[404.8,422.6],[399.1,424],[379.3,433.9],[338.3,465],[317.1,489.1],[305.7,494.8],[287.3,508.9],[284.5,513.2],[260.4,527.3],[256.2,527.3],[237.8,534.4],[222.2,535.8],
	[157.1,535.8],[141.6,533],[121.7,524.5],[104.8,510.3],[99.1,500.4],[96.3,490.5],[96.3,467.9],[99.1,459.4],[106.2,450.9],[131.7,432.5],[133.1,429.7],[141.6,424],[157.1,407],[160,405.6],
	[160,402.8],[162.8,401.4],[164.2,397.1],[165.6,397.1],[167,392.9],[168.5,392.9],[168.5,390],[169.9,390],[171.3,385.8],[172.7,385.8],[174.1,380.1],[175.5,380.1],[175.5,375.9],[176.9,375.9],
	[176.9,371.6],[178.4,371.6],[181.2,357.5]];
	var interPoly2 = [[166,299],[162,306],[159,318],[159,362],[167,383],[175,394],[185,403],[213,414],[233,418],[257,419],[293,412],[311,406],[329,397],[344,385],[350,378],[355,368],[360,353],[363,338],
	[363,306],[356,287],[341,269],[335,265],[321,265],[315,268],[309,274],[304,282],[304,285],[297,298],[288,308],[262,323],[258,324],[253,325],[229,324],[223,319],[222,315],[219,313],[218,310],
	[205,300],[197,287],[190,283],[174,283],[168,290],[166,294],[166,299]];
	var interPoly3 = [[333,201.5],[347,225.5],[360,242.5],[384,281.5],[431,369.5]];
	var interPoly4 = [[590,202.5],[602,203.5],[620,209.5],[670,218.5],[732,225.5],[743,225.5],[756,194.5],[764,168.5],[768,163.5],[778,190.5],[786,220.5],[788,235.5],[790,242.5],[793,246.5],
		[793,243.5],[799,233.5],[812,217.5],[823,200.5],[829,198.5],[835,207.5],[849,237.5],[851,240.5],[853,240.5],[876,211.5],[879,209.5],[888,194.5],[891,192.5],[906,248.5],[913,267.5],[916,271.5]];
	var interPoly5 = [[501,247.5],[478,264.5],[451,294.5],[434,310.5],[412,344.5],[385,378.5],[375,395.5],[369,402.5]];
	
	spl1 = create(interPoly2); //closed path
	spl2 = create(interPoly); //self-intersecting squiggle that intersects spl1 thrice
	spl3 = create(interPoly3); //line close to spl1
	spl4 = create(interPoly4); //far away wibbly resistor-type shape
	spl5 = create(interPoly5); //r -> l diagonal line that only intersects spl3

	// toolCurrent.reset();

	// console.log(spl1);
	
	/*
	console.log(spl1, spl2);
	polyCollider = potrace(interPoly2);
	var intersections = splineSplineIntersect(spl1, spl2, 0.1);
	console.log(intersections);

	intersections.forEach(g => {
		workspace_toolTemp.appendChild(φCreate("circle", {
			'cx': g[0],
			'cy': g[1],
			'r': 1,
			'fill': "#F0F",
			'stroke': "#0FF"
		}));
	}); */
	// debug_active = true;

	if (testSuite.apple) {
		makeUnKeyframe(2, 5);
		makeKeyframe(2, 5);
		setColorRGBA(255, 0, 0, 1);
		// create([[159.64,140.41],[133.3,147.72],
		// 	[118.57,157.85],
		// 	[112.94,200],[210.28,200],
		// 	[156.27,146.03],[133.2,147.72],[121.94,152.22]]);
		// fill(148, 172);
		

		// create([[795.37,160],[782.11,167.32],
		// 	[737.44,193.49],[760.47,221.76],[810.72,183.03],
		// 	[790.85,167.32],[766.06,167.32]]);

		// create([[550,195.5],[490,195.5],
		// 	[340,250.5],[576,267.5],
		// 	[513,195.5],[450,180]]);
		// randomizeColorsFor(frame_xh);
		create([[303.23,198.45],[302.51,198.45],[302.51,197.73],[301.79,197.73],[301.79,197.01],[301.07,197.01],[300.36,196.29],[299.64,196.29],[298.92,196.29],[298.2,195.58],[297.49,195.58],[296.05,194.86],[294.62,194.86],[293.18,194.86],[290.31,194.86],[288.88,194.86],[286.72,194.86],[285.29,194.86],[282.42,194.86],[279.55,194.86],[278.11,194.86],[274.53,194.86],[273.81,195.58],[271.66,196.29],[269.5,197.01],[267.35,197.73],[265.2,199.16],[263.76,199.16],[262.33,199.88],[260.89,200.6],[259.46,201.32],[258.02,202.03],[256.59,203.47],[255.87,203.47],[254.44,204.19],[253.72,205.62],[253,206.34],[251.57,207.77],[251.57,209.21],[250.85,210.64],[250.13,212.08],[249.41,213.51],[249.41,214.95],[249.41,216.38],
			[249.41,218.54],[249.41,219.97],[249.41,223.56],[249.41,224.99],[249.41,226.43],[249.41,229.3],[249.41,230.73],[250.13,232.17],[251.57,234.32],[252.28,235.76],[253.72,237.19],[255.15,239.34],[256.59,240.78],[258.02,241.5],[259.46,242.93],[260.89,244.37],[262.33,245.08],[264.48,246.52],[265.92,247.24],[269.5,248.67],[270.22,248.67],[272.37,249.39],[274.53,249.39],[278.11,250.11],[279.55,250.11],[282.42,250.11],[283.85,250.11],[287.44,250.11],[289.59,248.67],[291.75,247.24],[293.9,245.8],[296.05,244.37],[296.77,243.65],[298.2,240.78],[300.36,238.63],[301.07,236.47],[301.07,235.04],[301.79,232.89],[301.79,229.3],[302.51,227.15],[302.51,224.99],[302.51,222.12],[302.51,219.25],[302.51,217.1],
			[302.51,214.95],[302.51,212.8],[301.79,210.64],[301.79,209.21],[301.07,207.77],[300.36,206.34],[300.36,204.9],[299.64,204.19],[298.92,202.75],[298.2,202.03],[298.2,201.32],[297.49,200.6],[296.77,199.88],[296.77,199.16],[296.05,199.16],[296.05,198.45],[295.33,198.45],[295.33,197.73],[295.33,197.01],[295.33,196.29],[295.33,195.58],[295.33,194.86],[295.33,194.14],[295.33,193.42],[296.05,193.42],[296.05,192.71],[296.77,192.71],[296.77,191.99],[296.77,191.27],[296.77,190.55],[296.77,189.84],[296.77,189.12],[296.77,188.4],[296.77,187.68],[296.77,186.97],[296.77,186.25],[297.49,185.53],[297.49,184.81],[297.49,184.1],[298.2,183.38],[298.92,182.66],[298.92,181.94],[299.64,181.23],[300.36,180.51],
			[301.07,179.79],[301.79,179.07],[302.51,177.64],[303.94,176.92],[304.66,176.2],[306.1,174.77],[307.53,174.05],[308.25,173.33],[309.68,172.62],[311.12,171.9],[312.55,171.18],[313.27,170.46],[314.71,170.46],[315.42,169.75],[317.58,169.03],[318.29,169.03],[321.16,169.03],[321.88,168.31],[323.32,168.31],[325.47,168.31],[326.9,167.59],[329.06,167.59],[330.49,167.59],[331.93,167.59],[333.36,167.59],[334.8,167.59],[336.23,167.59],[337.67,167.59],[338.38,167.59],[339.82,167.59],[341.25,168.31],[341.97,168.31],[342.69,169.03],[343.41,169.75],[344.12,170.46],[344.84,171.18],[345.56,171.9],[346.28,172.62],[346.28,173.33],[346.99,174.05],[347.71,175.49],[348.43,176.2],[348.43,177.64],[349.15,178.36],
			[349.15,179.79],[349.86,181.23],[350.58,182.66],[350.58,184.1],[350.58,185.53],[351.3,186.97],[351.3,188.4],[352.02,189.84],[352.02,191.99],[352.02,193.42],[352.02,194.86],[352.02,197.01],[352.02,199.88],[352.02,200.6],[352.02,203.47],[352.02,204.9],[352.02,207.77],[352.02,209.93],[352.02,212.08],[352.02,214.95],[352.02,217.1],[352.02,218.54],[352.02,222.84],[352.02,224.28],[352.02,227.86],[352.02,230.02],[352.02,232.17],[353.45,235.04],[355.6,237.91],[357.04,240.78],[359.19,243.65],[361.34,246.52],[364.21,248.67],[367.08,251.54],[369.24,252.98],[370.67,254.41],[374.98,257.28],[377.13,258],[380,259.43],[383.59,260.15],[387.89,260.87],[391.48,261.59],[395.78,261.59],[400.09,261.59],
			[404.39,261.59],[408.7,261.59],[413,261.59],[417.31,260.87],[421.61,259.43],[425.2,257.28],[428.79,256.56],[432.38,254.41],[435.25,252.26],[438.83,250.11],[440.99,248.67],[442.42,246.52],[444.57,244.37],[445.29,241.5],[446.73,238.63],[446.73,235.04],[447.44,231.45],[447.44,227.15],[447.44,223.56],[447.44,222.12],[446.73,219.25],[446.01,217.1],[445.29,214.23],[443.86,212.8],[441.7,211.36],[440.99,210.64],[438.83,209.21],[437.4,208.49],[435.96,207.77],[433.81,207.77],[432.38,207.06],[430.22,207.06],[428.79,207.06],[426.64,206.34],[425.2,206.34],[423.77,206.34],[421.61,206.34],[420.18,206.34],[419.46,206.34],[418.03,207.06],[417.31,207.77],[416.59,207.77],[415.87,208.49],[414.44,209.21],
			[413.72,209.93],[413,210.64],[412.29,212.08],[411.57,213.51],[411.57,214.95],[410.85,216.38],[410.85,217.82],[410.13,220.69],[410.13,222.84],[410.13,224.99],[410.13,227.86],[410.85,229.3],[411.57,232.17],[413,235.04],[415.16,237.91],[416.59,240.06],[418.74,242.93],[420.9,245.08],[423.05,247.95],[425.92,250.82],[428.07,252.98],[430.94,255.13],[433.81,257.28],[435.96,259.43],[438.83,261.59],[440.99,263.02],[444.57,265.89],[446.73,267.33],[450.31,269.48],[453.18,271.63],[455.34,273.78],[458.21,275.22],[461.08,277.37],[463.23,279.52],[464.66,280.96],[466.82,283.83],[468.25,286.7],[469.69,289.57],[470.4,293.15],[471.84,296.74],[471.84,300.33],[472.56,302.48],[472.56,307.5],[472.56,308.94],
			[472.56,313.96],[472.56,316.83],[472.56,319.7],[471.12,322.57],[470.4,323.29],[468.25,327.59],[466.82,329.03],[464.66,331.18],[463.95,331.9],[460.36,334.05],[458.21,335.49],[456.77,336.2],[455.34,336.92],[451.03,338.36],[450.31,339.07],[446.73,340.51],[443.86,341.23],[442.42,341.94],[438.12,344.1],[437.4,344.1],[432.38,346.25],[429.51,346.97],[426.64,347.68],[424.48,348.4],[422.33,349.12],[420.18,349.84],[417.31,350.55],[415.16,351.27],[413,351.99],[410.85,351.99],[407.98,352.71],[406.55,352.71],[405.11,353.42],[400.81,353.42],[400.09,353.42],[397.94,353.42],[394.35,353.42],[392.2,353.42],[389.33,353.42],[387.17,353.42],[385.74,353.42],[382.87,353.42],[380.72,353.42],[379.28,353.42],[377.13,353.42],
			[374.98,353.42],[372.82,353.42],[371.39,353.42],[369.24,353.42],[367.08,353.42],[365.65,353.42],[362.78,353.42],[360.63,353.42],[357.76,353.42],[355.6,352.71],[354.17,352.71],[352.02,352.71],[350.58,351.99],[348.43,351.27],[346.99,351.27],[345.56,350.55],[343.41,350.55],[342.69,349.84],[341.25,349.84],[340.54,349.12],[339.82,349.12],[338.38,349.12],[337.67,348.4],[336.95,347.68],[336.23,347.68],[335.51,346.97],[334.8,346.97],[333.36,346.97],[332.64,346.25],[331.93,346.25],[331.93,345.53],[331.21,345.53],[330.49,344.81],[329.77,344.81],[329.06,344.1],[328.34,344.1],[328.34,343.38],[327.62,343.38],[326.9,343.38],[326.9,342.66],[326.19,342.66],[325.47,341.94],[324.75,341.23],[324.03,341.23],
			[324.03,340.51],[323.32,340.51],[323.32,339.79],[322.6,339.79],[322.6,339.07],[321.88,339.07],[321.16,339.07],[321.16,338.36],[320.45,338.36],[320.45,337.64],[319.73,336.92],[319.01,336.92],[319.01,336.2],[318.29,336.2],[318.29,335.49],[317.58,335.49],[317.58,334.77],[316.86,334.05],[316.86,333.33],[316.14,332.62],[315.42,331.9],[315.42,331.18],[315.42,330.46],[314.71,330.46],[314.71,329.75],[314.71,329.03],[313.99,329.03],[313.99,328.31],[313.99,327.59],[313.27,327.59],[313.27,326.88],[313.27,326.16],[312.55,326.16],[312.55,325.44],[312.55,324.72],[311.84,324.72],[311.84,324.01],[311.84,323.29],[311.12,323.29],[311.12,322.57],[311.12,321.85],[310.4,321.85],[310.4,321.14],[309.68,321.14],
			[309.68,320.42],[308.97,320.42],[308.97,319.7],[308.25,319.7],[308.25,318.98],[307.53,318.98],[307.53,318.27],[306.81,318.27],[306.1,317.55],[305.38,317.55],[304.66,316.83],[303.94,316.83],[303.23,316.11],[302.51,316.11],[301.79,315.4],[301.07,315.4],[299.64,315.4],[298.92,315.4],[298.2,314.68],[296.77,314.68],[296.05,314.68],[294.62,314.68],[293.9,313.96],[292.46,313.96],[291.75,313.96],[290.31,313.24],[288.88,313.24],[287.44,313.24],[286.01,313.24],[284.57,312.53],[282.42,312.53],[280.27,311.81],[278.11,311.09],[275.24,310.37],[272.37,309.66],[268.79,309.66],[265.92,308.22],[264.48,307.5],[258.74,306.07],[256.59,305.35],[253.72,304.63],[250.85,303.2],[247.98,302.48],[245.11,301.05],[241.52,299.61],
			[237.93,298.18],[234.35,296.02],[230.76,294.59],[227.89,292.44],[225.02,291],[223.58,290.28],[219.28,286.7],[216.41,285.26],[214.26,283.11],[211.39,280.24],[209.23,278.09],[206.36,274.5],[202.78,270.91],[200.62,266.61],[197.75,261.59],[194.17,256.56],[192.01,251.54],[189.14,245.8],[187.71,241.5],[185.56,237.19],[184.12,232.17],[183.4,227.86],[182.69,222.84],[182.69,217.82],
			[182.69,213.51],[182.69,209.21],[182.69,204.19],[182.69,200.6],[182.69,195.58],[182.69,191.99],[183.4,188.4],[184.84,184.81],[185.56,181.94],[186.27,179.07],[187.71,175.49],[189.14,172.62],[190.58,170.46],[192.73,166.88],[194.88,163.29],[197.75,159.7],[201.34,155.4],[205.65,151.09],[209.23,146.79],[212.82,143.2],[214.26,141.76],[217.13,138.89],[220,136.74],[224.3,132.44],[225.02,131.72],[228.61,128.85],[230.76,127.41],[232.91,125.98],[235.78,123.83],[238.65,122.39],[242.24,120.96],[246.54,118.8],[250.85,117.37],[255.87,115.22],[261.61,113.06],[266.63,111.63],[273.09,109.48],[278.11,108.04],[283.85,106.61],[289.59,105.17],[295.33,104.45],[301.07,103.74],[306.1,103.02],[311.12,102.3],[315.42,102.3],
			[317.58,102.3],[324.75,102.3],[327.62,102.3],[331.93,102.3],[335.51,102.3],[339.82,102.3],[344.12,102.3],[349.15,102.3],[353.45,103.02],[357.04,103.74],[362.06,103.74],[365.65,104.45],[369.24,105.89],[373.54,106.61],[376.41,107.32],[380,108.04],[384.3,109.48],[387.17,110.19],[390.76,111.63],[394.35,112.35],[398.65,113.78],[402.96,115.22],[407.26,117.37],[411.57,118.09],[415.87,120.24],[418.74,121.67],[423.05,123.11],[425.92,124.54],[429.51,126.7],[432.38,128.13],[433.81,128.85],[438.12,131],[440.99,132.44],[443.14,133.87],[445.29,136.02],[446.73,136.74],[450.31,139.61],[452.47,141.05],[454.62,143.2],[456.77,145.35],[458.92,146.79],[461.08,148.94],[463.23,150.37],[465.38,152.53],[467.53,154.68],[470.4,157.55],[472.56,160.42],[475.43,163.29],[478.3,166.88],[481.17,170.46],[484.04,174.05],[486.91,177.64],[489.78,181.23],[491.93,184.81],[494.08,188.4],
			[495.52,191.27],[496.95,194.86],[498.39,197.01],[499.82,200.6],[500.54,202.75],[501.26,204.19],[503.41,207.77],[504.13,210.64],[504.13,212.08],[505.56,214.23],[506.28,216.38],[507,218.54],[507,219.97],[507.71,223.56],[508.43,224.28],[508.43,226.43],[509.15,229.3],[509.87,230.73],[510.58,233.6],[510.58,234.32],[511.3,236.47],[511.3,238.63],[512.02,240.78],[512.74,242.93],[513.45,245.08],[514.17,246.52],[514.89,247.95],[514.89,250.11],[515.61,251.54],[516.32,252.98],[517.04,254.41],[517.76,255.85],[519.19,257.28],[519.19,258.72],[520.63,260.15],[521.34,261.59],[522.78,263.02],[524.21,264.46],[524.93,265.89],[527.08,268.04],[528.52,269.48],[529.95,270.91],[531.39,272.35],[532.82,273.78],[534.98,275.22],[537.13,277.37],[538.56,278.09],[540,279.52],[542.15,280.24],[543.59,281.67],[545.74,282.39],[547.17,283.11],[549.33,283.83],[550.76,284.54],[552.2,285.26],[552.91,285.26],[554.35,285.26],[555.78,285.26],[556.5,285.26],[557.94,285.26],[558.65,285.26],[560.09,285.26],[560.81,285.26],[562.24,284.54],[562.96,283.11],[565.11,281.67],[566.55,280.24],[567.98,278.8],[569.42,276.65],[570.13,274.5],[570.85,273.06],[573,270.19],[573.72,268.76],[574.44,266.61],[575.87,264.46],[577.31,260.87],[577.31,260.15],[578.74,256.56],[579.46,255.13],[579.46,252.98],[580.18,251.54],[580.18,249.39],[580.18,247.95],[580.18,245.8],[580.18,244.37],[580.18,241.5],[580.18,239.34],[580.18,237.91],[580.18,235.04],[580.18,232.17],[580.18,229.3],[580.18,227.15],[580.18,224.99],[580.18,222.12],[580.18,219.97],[580.18,218.54],[580.18,216.38],[580.18,214.23],[580.18,211.36],[580.18,210.64],[580.18,208.49],[580.18,207.06],[579.46,205.62],[579.46,204.19],[578.74,202.75],[578.74,202.03],[578.74,201.32],[578.74,200.6],[578.74,199.88],[578.74,199.16],[578.03,198.45],[578.03,197.73],[578.03,197.01],[578.03,196.29],[578.03,195.58],[577.31,195.58]])
		// fill(107.40709045516041, 337.87215492598284);
	}
}

function handleKeyPress(a) {
	if (debug_active) {
		console.log(a.key);
	}
	//if it's a special button
	switch (a.key) {
		case "Shift":
			button_shift = true;
			return;
		case "Alt":
			button_alt = true;
			return;
		case "Control":
		case "Meta":
			button_force = true;
			return;
		case "Escape":
			toolCurrent.escape();
			cursor.down = false;
			return;
	}

	//make sure to allow zooming in / out
	if (a.code != "Minus" && a.code != "Equal") {
		a.preventDefault();
	}

	var keys = [];
	if (button_shift) {keys.push("Shift");}
	if (button_alt) {keys.push("_Alt_");}
	if (button_force) {keys.push("Force");}
	keys.push(a.code);
	keys.sort();

	var hotkeysArr = hotkeys;
	if (toolCurrent.hotkeys) {
		hotkeysArr = hotkeysArr.concat(toolCurrent.hotkeys);
	}

	var possibleHots = hotkeysArr.filter(j => j[0].includes(a.code));

	//go through each possible hotkey and make sure it doesn't have a modifier that's not pressed
	var split;
	for (var h=0; h<possibleHots.length; h++) {
		split = possibleHots[h][0].split(" ").sort();

		//if the exact same keys are pressed, great! Break out early
		if (arrsAreSame(keys, split)) {
			eval(possibleHots[h][1]);
			return;
		}

		//checking for non-pressed modifiers
	}

	// eval(possibleHots[0][1]);

	//sort the remaining hotkeys by number of buttons they require

	//execute the command that requires the most buttons pressed, because it's probably what the user intended
}

function handleKeyRelease(a) {
	switch (a.key) {
		case "Shift":
			button_shift = false;
			return;
		case "Alt":
			button_alt = false;
			return;
		case "Control":
		case "Meta":
			button_force = false;
			return;
	}
}

// function handleMouseDown_

function handleMouseDown(a) {
	//don't bother with the help box
	if (φOver(help_container)) {
		return;
	}
	cursor.down = true;
	cursor.x = a.clientX;
	cursor.y = a.clientY;
	
	//if the ignoreDown tag is set, pretend the event didn't occur
	if (φGet(a.target, 'ignoredown')) {
		return;
	}

	
	//use element to decide the type of being down
	cursor.downType = undefined;
	if (!φOver(base)) {
		console.log('returning');
		return;
	}

	//I don't use an 'over' detection for this because it causes issues with some areas having the cursor change but the mouse technically being "over" the workspace instead
	//this method makes sure that the user can resize the timeline when they think they can
	if (a.target.id == "timeline_edge_detector") {
		cursor.downType = "timeEdge";
		return;
	}

	if (a.target.id == "timeline_extender") {
		cursor.downType = "timeExtend";
		return;
	}

	if (φOver(timeline_blocks_container)) {
		var cPos = cursorTimelinePos();
		var [oldW, oldH] = [timeline.t, timeline.s];
		var [newW, newH] = [Math.floor(cPos[0]), Math.floor(cPos[1])];
		
		
		if (newH < 0) {
			//if it's over the playhead
			cursor.downType = "timePlayhead";
			return;
		} 
		if (newH >= timeline.layerIDs.length) {
			//if it's not over the blocks
			return;
		}
		
		//if it's repeated the last selection, allow movement
		if (newW == oldW && newH == oldH) {
			timeline_oldKeyPos = [oldW, oldH];
			cursor.downType = "timeDragging";
			return;
		}
		
		//change selection
		select(newH, newW);
		cursor.downType = "timeBlockzone";
		return;
	}
	if (φOver(timeline_container)) {
		cursor.downType = "time";
		return;
	}

	//sidebar detection
	if (a.target.id == "sidebar_edge_detector") {
		cursor.downType = "sideEdge";
		return;
	}

	if (φOver(sidebar_container)) {
		return;
	}

	

	cursor.downType = "work";
	toolCurrent.mouseDown(a);
}

function handleMouseMove(a) {
	cursor.x = a.clientX;
	cursor.y = a.clientY;

	//different behavior depending on the type of down-ness
	if (cursor.down) {
		switch (cursor.downType) {
			case "timeDragging":
				var pos = cursorTimelinePos();
				var box = timeline_selector.getBoundingClientRect();

				//constrain pos to be inside the timeline
				pos[0] = clamp(pos[0], 0.5, timeline.len-0.5);
				pos[1] = clamp(pos[1], 0.5, timeline.layerIDs.length-0.5);
				//update the selection box
				φSet(timeline_selector, {
					'x': pos[0] * (timeline_blockW + 1) - (box.width / 2),
					'y': timeline_headHeight + pos[1] * (timeline_blockH + 1) - (box.height / 2)
				});
				break;
			case "timeEdge":
				var box = base.getBoundingClientRect();
				var cursorVbaseY = cursor.y - box.y;
				var goodHeight = box.height - cursorVbaseY;

				φSet(timeline_container, {'hinv': goodHeight});
				resizeTimeline(box.width, clamp(goodHeight, 0, box.height));
				resizeSidebar(undefined, box.height - goodHeight);
				break;
			case "timeExtend":
				var xRel = cursorRelativeTo(timeline_extender)[0] - 3;
				if (Math.abs(xRel) > timeline_blockW) {
					var extraFrames = Math.round(xRel / timeline_blockW);
					changeAnimationLength(clamp(timeline.len + extraFrames, 1, 1e1001));
				}
				break;
			case "timePlayhead":
				updatePlayheadPosition();
				break;
			case "timeBlockzone":
				//drag the selection box around
				break;
			case "sideEdge":
				var height = φGet(sidebar_background, "height");
				var newWidth = clamp(cursorRelativeTo(base)[0], 0, φGet(base, "width"));
				resizeSidebar(newWidth, height);
				break;
			case "time":
				break;
			case "work":
				toolCurrent.mouseMove(a);
				break;
			case "pickerAB":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				var cy = (cursor.y - box.y) / box.height;
				cx = clamp(cx, 0, 1);
				cy = clamp(cy * (11 / 10), 0, 1);
				
				setColorRGBA(Math.floor(cy * 255), Math.floor(cx * 255), "", "");
				break;
			case "pickerC":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				cx = clamp(cx, 0, 1);
				setColorRGBA("", "", cx * 255, "");
				break;
			case "pickerD":
				var box = sidebar_colorPicker.getBoundingClientRect();
				var cx = (cursor.x - box.x) / box.width;
				cx = clamp(cx, 0, 1);

				setColorRGBA("", "", "", cx);
				break;
			default:
				console.log(`unknown down type: ${cursor.downType}`);
		}
	}
}

//for calling from the document, where variables can't be accessed
function setDownType(val) {
	console.log(val);
	cursor.downType = val;
}

function handleMouseUp(a) {
	if (cursor.downType == "work") {
		toolCurrent.mouseUp(a);
	}
	if (cursor.downType == "timeDragging") {
		//figure out where the keyframe should go
		var pos = cursorTimelinePos();
		var p = timeline_oldKeyPos;
		pos[0] = clamp(Math.floor(pos[0]), 0, timeline.len-1);
		pos[1] = clamp(Math.floor(pos[1]), 0, timeline.layerIDs.length-1);

		//if the selection box has been moved, shift the keyframes as well
		if (pos[0] != p[0] || pos[1] != p[1]) {
			timeline.t = pos[0];
			timeline.s = pos[1];

			//move the keyframe
			makeKeyframe(pos[1], pos[0], timeline.l[timeline.layerIDs[p[1]]][p[0]]);
			makeUnKeyframe(p[1], p[0]);
			updatePlayheadPosition();
	
			//put the selection box back where it should be
			φSet(timeline_selector, {
				'x': pos[0] * (timeline_blockW + 1),
				'y': timeline_headHeight + pos[1] * (timeline_blockH + 1)
			});
		}
	}
	if (cursor.downType == "timeExtend") {
		var prevLen = timeline_lenStore;
		
		
		//if the timeline's gotten longer it's easy to make edit history for that - reversing an increase in time can't get rid of any keyframes
		if (timeline.len > timeline_lenStore) {
			recordAction(() => {
				changeAnimationLength(timeline.len);
				timeline_lenStore = timeline.len;
			}, () => {
				changeAnimationLength(prevLen);
				timeline_lenStore = timeline.len;
			});
		} else {
			//if it's gotten shorter, ??????????
		}

		timeline_lenStore = timeline.len;
		
	}
	cursor.down = false;
}

//runs the bare essentials of the page
function handleResize(a) {
	var spaceW = window.innerWidth * 0.96;
	var spaceH = window.innerHeight * 0.95;
	var timeDims = timeline_background.getBoundingClientRect();
	var sideDims = sidebar_background.getBoundingClientRect();
	
	resizeWorkspace(spaceW, spaceH);
	resizeTimeline(spaceW, Math.min(spaceH, timeDims.height));
	resizeSidebar(Math.min(sideDims.width, spaceW), spaceH - Math.min(spaceH, timeDims.height));

	clampWorkspace();
}

function resizeWorkspace(spaceW, spaceH) {
	φSet(bg, {
		'width': spaceW,
		'height': spaceH
	});
	φSet(base, {
		'width': spaceW,
		'height': spaceH,
		'viewBox': `0 0 ${spaceW} ${spaceH}`,
	});
}

function handleWheel(a) {
	a.preventDefault();
	if (φOver(timeline_background)) {
		moveTimeline(a.deltaX, a.deltaY);
	} else {
		moveWorkspace(a.deltaX, a.deltaY);
	}
}

function resizeSidebar(w, h) {
	var minPickerWidth = 250;
	var maxPickerWidth = 340;
	var toolWidth = 50;

	if (w == undefined || h == undefined) {
		var oldDims = φGet(sidebar_background, ["width", "height"]);
		w = w ?? oldDims[0];
		h = h ?? oldDims[1];
	}
	w = +w;
	h = +h;
	
	w = Math.max(w, toolWidth + minPickerWidth);

	//if the panel is wide enough, put color properties to the side. If it's too small, they'll go below instead
	var sideProps = false;
	var pickerWidth = w - toolWidth;
	if (pickerWidth > maxPickerWidth) {
		pickerWidth = minPickerWidth;
		sideProps = true;
	}
	var pickerHeight = pickerWidth * 1.1;
	var squareSize = +φGet(activeColor_stroke, "width");

	φSet(sidebar_background, {
		'width': w,
		'height': h
	});
	φSet(toolbar_container, {
		'x': w - toolWidth,
		'height': h
	});
	φSet(toolbar_background, {
		'height': h
	});

	φSet(sidebar_edge_detector, {
		'x': w - 5,
		'height': h
	});

	φSet(sidebar_colorPicker, {
		'width': pickerWidth,
		'height': pickerHeight,
	});
	φSet(sidebar_activeColors, {
		'width': pickerWidth,
		'y': sideProps ? (pickerHeight + 20) : Math.max((h - squareSize - 20), (pickerHeight + 20))
	});
}

//resizes timeline to the specified width and height
function resizeTimeline(w, h) {
	var spaceH = φGet(base, "height");
	var invH = spaceH - h;

	if (w == undefined || h == undefined) {
		var oldDims = φGet(timeline_background, ["width", "height"]);
		w = w ?? oldDims[0];
		h = h ?? oldDims[1];
	}
	w = +w;
	h = +h;

	//these two lines aren't confusing at all I'm sure
	φSet(timeline_container, {
		'hinv': h,
		'y': invH
	});
	φSet(timeline_background, {
		'width': w,
		'height': h,
	});
	φSet(timeline_edge_detector, {
		'width': w,
	});
	φSet(timeline_playhead, {
		'height': h
	});
}

function updateTimelineExtender() {
	//always set it to the end of the timeline, with the height of the number of layers
	φSet(timeline_extender, {
		'x': (timeline_blockW + 1) * (timeline.len + 0.5),
		'height': (timeline_blockH + 1) * timeline.layerIDs.length
	});
}

function cursorTimelinePos() {
	var timeB = timeline_blocks.getBoundingClientRect();
	return [(cursor.x + 1 - timeB.x) / (timeline_blockW+1), (cursor.y - timeB.y) / (timeline_blockH+1)];
}
function updatePlayheadPosition() {
	var hoverPos = cursorTimelinePos();
	hoverPos = [Math.floor(hoverPos[0]), Math.floor(hoverPos[1])];
	
	//make sure hover pos is in bounds as well
	hoverPos[0] = clamp(hoverPos[0], 0, timeline.len-1);
	if (hoverPos[0] != timeline.t) {
		select(timeline.s, hoverPos[0]);
	}
}

function handleUnload(e) {
	//in the unlikely event that a browser is being used which allows custom escape messages
	(e || window.event).returnValue = `Are you sure you want to exit? You may have unsaved changes.`;
	return `Are you sure you want to exit? You may have unsaved changes.`;
}