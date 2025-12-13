//not strictly constants per se, but a place to store variables initialized at the start of the program that don't depend on anything

//the storage for interval event during timeline playback 
var autoplay;
var autoplayStop;

var color_debug = "#FF00FF";

var color_selectedNode = activeColor_stroke;
var color_stroke = "#000000";
var color_press = "#777777";
var color_fill = "#888888";
var color_stage = "#FFFFFF";
var color_objLast = undefined;

//Here are HTML elements that I'm keeping as a variable so vscode knows they're variables
//base is the outermost svg element
var base;
//workspace elements
var workspace_container, workspace_background, workspace_permanent, workspace_temporary;

const brush_limits = [1, 100];

var data_persistent = {
	brushSize: 8,
};

var cursor = {
	down: false,
	downType: undefined,
	x: 0,
	y: 0,
};

var debug_active = false;

var editDeltaTracker = 0;
var editDeltasFuture = [];		//changes required to get to the future (present time)
var editDeltasPast = [];		//changes required to get to the past
var editDeltasIDs = [];			//list of IDs for each change. A grouping of identical delta IDs will be treated as one action.
var editDeltasMax = 100;

const fps_limitMin = 1;
//I figure 100 is a good max number, you can't really see any individual frame less than 10ms anyways, but 144 divides better so that's the limit
const fps_limitMax = 144;

var hotkeys = [
	// ["Key", `function`, `description`],
	//where Key is "Modifier1 Modifier2 Key.code"
	//and Modifiers are: Shift Alt Force
	
	//tools
	["KeyC", `changeToolTo("Circle")`, `Circle tool`],
	["KeyI", `changeToolTo("Eyedrop")`, `Eyedropper tool`],
	["KeyK", `changeToolTo("Fill")`, `Fill tool`],
	["KeyN", `changeToolTo("Line")`, `Line tool`],
	["KeyM", `changeToolTo("Move")`, `Move tool`],
	["KeyY", `changeToolTo("Pencil")`, `Pencil tool`],
	["KeyR", `changeToolTo("Rectangle")`, `Rectangle tool`],
	["KeyJ", `changeToolTo("Transform")`, `Transform tool`],

	//timeline actions
	["KeyO", `toggleOnionSkin()`, `Toggle onion skin`],
	["Digit1", `user_keyframe(1)`, `Create blank keyframe`],
	["Digit2", `user_keyframe(2)`, `Create keyframe from existing`],
	["Shift Digit1", `user_keyframe(3)`, `Remove keyframe`],
	
	["Enter", `toggleTimelinePlayback()`, `Toggle timeline playback`],
	["Shift Enter", `toggleTimelinePlayback(true)`, `Toggle timeline playback (looping)`],
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



var layer_reorderChar = `⥌`; //close second: ⧰
var layer_reordering;



//global project variables
var project_fps = 24;

//the decimal point to quantize to
var quantizeTo = 1;
var quantizeAmount = 1 / (10 ** quantizeTo);



var timeline;

var toolCurrent;

const uidChars = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZςερτυθιοπασδφγηξκλζχψωβνμ`;
var uidCount = 0;

const workspace_margin = 0.1;
var workspace_scaleBounds = [0.02, 100];

