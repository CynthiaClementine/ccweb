
var animations = {
	"mage_throw": {
		loop: true,
		fps: 20,
		frames: [1, 2, 3, 4,4,4,4, 5, 6,6,6, 7, 8, 1,1,1,1]
	},
	"frog": {
		loop: false,
		fps: 20,
		frames: [1,2]
	},


	"": {
		loop: false,
		fps: 20,
		frames: []
	},
}
Object.keys(animations).forEach(k => {
	animations[k].name = k;
	animations[k].len = animations[k].fps * animations[k].frames.length;
});





var conversations = {
	"intro": [
		`Welcome! This is the tutorial, in which you can learn how to play. To advance text, press Z.`,
		`The fine fellow following your cursor around is Skonk, the star of the show! She is on a grand quest that involves many obstacles.`,
		`You may learn more about that later. Or not.`,
		`Asi`

		//talk about movement, attacking
		//talk about grazing, dodging, health
		//talk about enemies
	],

	//dark forest (wow! it's like a ph reference)
	"forest-start": [
		`Skonk awoke on a morning like any other to find that her precious berry cache had gone missing.
		This was by far the worst thing to happen to her since 1955.`,
		`She immediately vowed to find the berries and get them back. To start, she ventured into the nearby forest.`,
		`However, the creatures dwelling there were not friendly. The journey would be difficult.`
	],
	"forest-mid": [

	],
	"forest-preboss": [
		`[lizord]Who goes there?`,
		`A voice boomed from across the field.`,
		`[skonk]hi,, i'm here to look for my berries,,,`,
		`The Largest Lizard revealed himself.`,
		`[lizord]Well that's a shame. I haven't seen any of your berries here. I only see all of my berries here!`,
		`[lizord]Of course, every berry I see is mine.`,
		`It was clear there would be no bargaining.`,
	],
	"forest-postboss": [
		`With the Largest Lizard defeated, berries could be given to all the forest creatures.`,
		`However, despite Skonk's best efforts, she could not find her own berries amongst the pile. They must be elsewhere.`,
		`So the search continues.`
	],

	//school
	"school-start": [

	],
	"school-mid": [

	],
	"school-preboss": [

	],
	"school-postboss": [
		`So that really was just a colossal waste of time. `
	],

	"test": [
		`[skonk]ababababababa`,
		`[lizord]awawawawawawawa`
	]
};

var conversation_colors = {
	skonk: "#552a0a",
	lizord: "#58f1fc",



	test: "#e222e9",

	default: "#FFFFFF",
}








/*each stage consists of a set of timing points and entities.
the entity data is a string following the format "type~args"
where type determines what entity it is, and args are passed in as JSON-parsed arguments to the entity
example: [1.2, `basic~`]
will spawn a basic entity 50% of the way down the left edge, at t = 1.2

basic~startX~startY~homeX~homeY		spawns a basic entity

lines that are just strings are special commands.

time~x								sets the stage time to value x
progress~x							waits until there have been no entities on the stage for [bufferTime], then sets time to x
conversation~x						has conversation x, then continues the stage


timing points are usually a time in seconds. 
However, there are a few special values that change the stage behavior.

-XX - relative time. Any negative time counts as a positive offset to the previous time
	example: [4, ""], [-0.5, ""] is the same as doing [4, ""], [4.5, ""]
*/
var stages = {
	"test": [
		// [1, `basic~-10~100~100~100`, `basic~490~100~380~100`],
		// [1e1001, `|time~2`],
		[1, `frog~-10~150~90~150`, `frog~490~150~390~150`],
		[-.2, `frog~-10~180~90~180`, `frog~490~180~390~180`],
		[-.4, `frog~-10~210~90~210`, `frog~490~210~390~210`],
		[6, `woody~120~-20~120~120`, `woody~240~-20~240~160`, `woody~360~-20~360~120`],
		`progress~7`,
		[7, `mage~-10~150~490~150`, `mage~490~170~-10~170`],
		[-.5, `mage~-10~190~490~190`, `mage~490~210~-10~210`],
		[-.5, `mage~-10~190~490~230`, `mage~490~210~-10~250`],
		[-.5, `mage~-10~190~490~270`, `mage~490~210~-10~290`],
	],
	"forest-1": [
		[1, `woody~-10~100~100~100`, `woody~490~100~380~100`],
		[1e1001],
		[2, `woody~`],
		[],
		[],
		[],
		[],
	],
	"forest-2": [

	],
};

var stage_chainings = {
	"forest": [`forest-1`, `forest-spider`, `forest-lizard`]
};
