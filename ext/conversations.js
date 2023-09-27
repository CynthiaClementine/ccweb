

function processText(textData) {

}


//hi A-16, how are you?




/*
COMMANDS LIST



FOCUS~x~y~xUnits~time
	focuses the camera on a certain xy location, with a certain zoom (set in number of x units the screen fits), done in a certain time. 
	If no arguments are given, sets the camera to its defaults, which is centered on the player with 16 units
*/


var queenOpacityHandler;
var data_conversations = {
	"pianist-playing": [
		`(you don't want to interrupt them while they're playing.)`
	],
	"pianist-clowns": [
		`My father played this song a lot.`,
		`...`,
		`I worry about replicating him a lot.`,
		`It's not that he's a bad guy, just. well.`,
		`I worry.`
	],
	"pianist-reverie": [
		`I like this song.`,
		`Well, I like all of them. That's why I play them, of course. \nBut I like this one in particular.`,
		`The top melody sounds like a small child, winding their way through the forest.`,
		`I suppose that probably sounds like nonsense. But it's structured nonsense, so..`,
		`so.`
	],
	"pianist-ballade1": [
		`I found the instructions for playing this in one of the castle basements.`, //TODO: does this require the castle have basements?
		`There were markings and scribbles all over it. That helped with learning a bit, which is nice.`,
		`I can tell whoever played it last had a hard time with it, but they kept going anyways.`,
		`Honestly, I didn't think I would be able to learn the whole thing. \nBut then one day I noticed this winged person watching me.`,
		`After I had finished with one of my run-throughs, they appproached, and said I played like I was depressed.\n`,
		`that's such a strange observation, no? Even now I'm not sure what to make of it.`,
		`But it motivated me to finish learning. Every once in a while they pop in to visit, which is nice I think.`,
	],
	"pianist-venetian": [
		`I've never been to the ocean, but I've read about it in books.`,
		`The ocean seems scary, which is a trait I try to encapsulate in the middle section.\nBut I'm not sure how great a job I do.`,
		`A lot of that is technique I can work on, \nbut some of that is the limitations of this piano.`,
		`It really is a shame the condition this is in.\n`,
		`I'm not really in a position to get it fixed though.`
	],
	"pianist-summoning": [
		`This one tells the story of a dedicated witch and a wolf. The story is beautiful, but I'm not very good at representing it.`,
		`Maybe if you got a singer `
	]

}