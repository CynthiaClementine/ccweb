

function processText(textData) {

}



/*
A line will treated as text to be spoken by the entity holding the conversation unless otherwise specified.
There are a few modifiers you can place at the start of lines to change this. They are:

|	a vertical pipe denotes a command to be executed. Valid commands are listed in the COMMANDS LIST.

>	An angled bracket indicates a text line that cannot be fast-forwarded through.

#	A hashtag indicates that the line should be spoken by a different entity.
	This entity is specified through $[id]$ directly after the hashtag. If no entity is specified, the player is chosen.



As well as this, there are some modifiers you can place in the body of a text line to change how it is displayed.

\n	Splits the text into multiple lines at this point.

\t	Delays the text for a few frames, before continuing

\\	immediately moves to the next line without user input



COMMANDS LIST

AUDIO~audioID~?volume
	UNIMPLEMENTED!!!!
	plays the sound effect specified by audioID. Volume setting is optional.

ACCEPT~[down/up]~action key~{code to execute}
	waits for the user to reach the specified key state 
		(rising or falling edge of specified action key) 
	and then executes the specified code.

ANIMATE~animationID~?[?????]~?entity 

DELAY~time
	wait for a certain amount of time, in seconds

EXECUTE~code
	just arbitrary code execution.

FILTER~value~f
	interpolates the filter to a certain opacity, specified by value.
	If f is set, the foreground filter is used. Otherwise, the background is used.

FOCUS~x~y~scale~time
	focuses the camera on a certain xy location, with a certain zoom (set in number of x units the screen fits), done in a certain time. 
	If no arguments are given, sets the camera to its defaults, which is centered on the player with 16 units

LOCK
	unconditionally locks the current conversation being held

MUSIC~musicID
	sets the background music to be the new music

PROPERTY~propertyID~value~?entity
	sets the property to the value specified.
	Entity by default is the entity holding the conversation.

TELEPORT~x~y~?entity
	teleports a specified entity to coordinates (x,y)
	Entity by default is the entity holding the conversation.

UNLOCK
	unconditionally unlocks the conversation directly after the current one

WALK

*/

var nm_warrior = `Jeff`;
var nm_mage = `Lilian`;

var data_conversations = {
	"placeholder": [
		`how doth the little crocodile\nimprove his shining tail,`,
		`and pour the waters of the nile\non every golden scale.`,
		`how cheerfully he seems to grin,\nhow neatly spreads his claws,`,
		`and welcomes little fishes in with gently smiling jaws!`
	],

	//developer commentary

	//badlands
	"landDweller-intro": [
		`Alright, alright.`,
		`Well? What do you want?`,
		`#Um.\nI was just walking around, and found your house here.`,
		`Just walking around? *Just walking around?*`,
		`Why don't you come in? It's not often I get people stumbling upon my house out here.`,
		//timeskip
		`Yep. I live out here. \nMost others have lost their respect for this land, \nbut not me.`,
		`My family's lived and worked this land for generations.\nIt's a bit harder now, you can blame those oh-so-lovely tech enthusiasts up in the city for that.`,
		`But We're not about to change our ways just because things get a bit difficult.`,
		`#What happened to the land?`,
		`Well have you looked at it? Not exactly the paragon of bountiful.\nYet not too long before your time, this was a proper meadow.\nThe guys in the city don't like having to travel all over for their resources.\nDon't like relying on people like me.`,
		`So they came up with a way to divert the resources from this land directly into their homes.\nCaused all sorts of problems, of course. Things like this always do.`,
		`I don't want to pretend things were all hunky dory before. The city's bureaucrats are always looking for ways to make sure they're on top.`,
		`But they're not getting me!\nI'm still here! And every once in a while, they'll need me.\nThey can't ignore everything outside their little walled garden so easily.`,
		`#Ah.`,
		`Listen kid. What's your name?`,
		`#`
	],


	//city
	"citie-1": [`I love how fast ext delivers packages. You know you can get same-day delivery for free? Incredible.`],
	"citie-2": [`I used to be an adventurer like you. But then I realized the city's just better.`],
	"citie-conspiracist": [`The city council doesn't want you to know...\nthey're putting chemicals in the water..\nDihydrogen monoxide...\n`],
	"citie-conspiracist2": [`Nobody's ever seen the northmost side of the city -\next keeps that under lock and key.\nWhat are they hiding?`],
	"citie-conspiracist3": [`They've got a creature locked up in the basement...\nit's not right. Animal cruelty I say.`],
	"citie-conspiracist3-freed": [
		`They've got a creature locked up in the basement...`,
		`#Yeah, I know. I freed it.`,
		`Oh goodness! \tYes!\nWonderful \tWonderful!\nNow we can get to work on the real threat.....\n`,
		`the clouds`,
	],
	"citie-conspiracist4": [
		`they;re just floating there...`
	],

	"burning-1": [
		`It's terrible! It's terrible!\nThis building burnt down!`,
		`#...Aren't all these buildings made of stone?`,
		`Yes! That's the terrible part!\nWe have no idea why it burned down!\nOh, help us please!`,
		`#Ok, Ok, just calm down. I'm sure we can figure it out. Right, ${nm_mage}?`,
		`#$mage$Honestly, I'm not super enthused about spending more time in the city\ndoing tasks that aren't related to our actual goal.`,
		`#You'd just let this mystery go unsolved? The victims of this fire go unavenged?`,
		`#$mage$....`,
		`#$mage$Fine. We can give it a shot.`
	],
	"burning-2": [
		`Please figure out who did this,\nI'm counting on you!`
	],
	"burning-3": [
		``
	],

	"pianist-playing": [
		`#(you don't want to interrupt them while they're playing.)`
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
	"pianist-ballade1-response": [
		`I knew the person who wrote this.`,
		`#$pianist$Oh! That's incredible!`,
		`#$pianist$I heard they died of tuberculosis though.\nThat must have been tragic.`,
		`Well, yes.\nBut `
		//TODO: come back to this. is this dialogue too cringy?
	],
	"pianist-venetian": [
		`I've never been to the ocean, but I've read about it in books.`,
		`The ocean seems scary, which is a trait I try to encapsulate in the middle section.\nBut I'm not sure how great a job I do.`,
		`A lot of that is technique I can work on, \nbut some of that is the limitations of this piano.`,
		`It really is a shame the condition this is in.\n`,
		`I'm not really in a position to get it fixed though.`
	],
	"pianist-summoning": [
		`This one tells the story of a dedicated witch and a wolf.\nThe story is beautiful, but it requires a singer,\nand I'm not very good at singing.`,
		`Maybe if you got a singer? `
	],


	//main town
	"townie-1": [`I used to be an adventurer like you. Then I got bored.`],
	"townie-2": [`I remember the good old days. So many more travellers used to pass through this town.`],
	"townie-3": [`Legend has it that the man who buried his gold also buried his soul.... creepy.`],
	"townie-4": [`When I was a kid I was scared of moths, but now I know they're just gentle giants.`],
	"townie-5": [`Leave me alone. I'm busy solving differential equations.`],
	"townie-skirt": [
		`Is there anything better than a good spinny skirt?\nThat's right. I thought not.`,
		`...`,
		`...Maybe a good mug of hot chocolate.`
	],
	"townie-pub": [
		`Looks like you got some food in you.\nThat'll keep your energy up for a while.\nMake sure to eat, or you won't be able to do things like.\n\t\t\twalking.`,
		`What? You haven't eaten?`,
		`oh\t.\t.\t.\t.\t.\t.\t.\t\t.\t\t.\t\t.\t\t.\t\t\\`
	],

	"dsFinder-1": [
		`Have you heard the legend of the dream skaters?`,
		`My father said that they were giant woogly creatures that eat space clouds!\nBut I don't trust him.`,
		`Hey.\nYou wanna go find them?`,
		`My father said he saw one once, through the forest southwest of town.\nI bet if we go there, we could see one as well.`,
	],
	"dsFinder-2": [
		`This was farther than I thought it would be.`,
		`The forest sure is scary sometimes.`,
		`...`,
		`Well, do you see anything?`,
		//ds appears
		`Woah! Over there!`,
		`They really *are* real!`,
		//ds disappears
		`Well! I gotta get back to my house.\nSee you later, stramger`,
		//child leaves
	],
	"dsFinder-done": [
		`I shoved 12 candy bars into a drawer, well guess what they ALL MELTED.`
	],

	"dark-1": [
		//small beat track plays
		`|MUSIC~`,
		`#$dark1$We are the dark merchants.`,
		`#$dark2$From the dark.`,
		`#$dark3$We take the light things`,
		`#$dark2$and make them dark.`,
		`#$dark1$You thought the world was normal`,
		`#$dark2$well it is dark`,
		`#$dark3$When we appear it's surely`,
		`#$dark2$dark....`,
		`#$dark1$Absolutely terrible.`,
		`#$dark2$What? You told me to just say dark a bunch!`,
		`#$dark1$Yeah, because you kept messing up the cooler lines we had for you earlier!\nNow we just sound edgy.`,
		`#$dark3$we're very nice people.\nWe find value in both the darkness and the light of the world.\nThat's why we're awake during the daytime,\nwhich is the time it is right now.`,
		`#$dark1$Agreed.`,
	],
	"dark-2": [
		`#$dark1$We're the dark merchants,`,
		`#$dark2$We see into your soul.`,
		`#$dark3$When one is new around here`,
		`#$dark2$Seeing us is quite a goal.`,
		`#$dark1$We used live in canyons north,`,
		`#$dark2$but moths took all our land.`,
		`#$dark3$Now we live in this here house`,
		`#$dark2$and darkness is our brand.`
	],

	//bismuth gardens


	//LLC
	"llc-enter": [
		`#$mage$Look, I'm just saying,\nthere are no people here.\nWe probably aren't going to find any answers.`,
		`#and I don't understand why you're so insistant\non refusing to explore this area.`,
		`#$mage$...`,
		`#Like if you've got a valid reason, please by all means tell me,\nbut if not I'm just going to go in without you.`,
		`#$mage$Ok look.`,
		`#$mage$I used to live in the walled city,\nand I remember back when people used to live here.`,
		`#$mage$There was a big battle between the people in these canyons and the ext corporation.\nI think the dark merchants could get you up to speed better than I could.`,
		`#$mage$But the point is - either you live here,\nwhich would be terrible, because your home got destroyed,`,
		`#$mage$Or we're gonna need to get into the city,\nwhich is not an easy task,\nand which I'd really prefer not to do.`,
		`#Oh.`,
		`#No, that is valid.\n\t\tBut that also kind of means I do have to go through here.`,
		`#$mage$What? Why?`,
		`#Because if I have lived here, that's a msytery solved, and the only other place left is the city, right?`,
		`#I lived here, we don't have to visit the city.\nI don't, we climb back out and do that difficult thing.`,
		`#$mage$.\tAlright.`
	],
	"llc-cannon": [
		`#$mage$Woo! That was fun!`,
		`#$warrior$I'd rather never do that again.`,
		`#$warrior$I most certainly did not live here in the past.`,
		`#$mage$Alright well.\nWe're in luck. Check this out!`,
		`#$warrior$A cannon?`,
		//skip this explanation if the player's already recieved it from the dark merchants
		`#$mage$When the canyon people were fighting ext,\nthey built a cannon to fire at the city wall.`,
		`#$mage$With enough flow energy,\nit could do a pretty substantial amount of damage.`,
		`#$mage$But it was never used.\nExt cut off flow energy entirely to this one region,\nmeaning it could never charge.`,
		`#$warrior$Oh.`,
		`#$warrior$You're experienced with this stuff though, right? Could you power it up?`,
		`#$mage$I could. It might agitate the wildlife though. Can you cover me while I work this?`,
		`#$warrior$I'll do my best!`,
	],
	"llc-finish": [

	],

	//temple
	


	//ext headquarters
	"ext-reception": [
		`#Hello, we'd like to talk to the leader of this place.`,
		`That... why? Can I help you?`,
		`#Look. I was teleported across the world because of your systems.\nI'm looking to make sure something like that doesn't happen again.`,
		`oh.\nWell, I can schedule you a meeting with our complaints department.`,
		`#When is the next meeting available?`,
		`just about 3\t\t\t\t\t\t\t\t\t d\t\tecades.`,
		`#Oh dear goodness\\`,
		`#is there no way to talk to the CEO?? Or *any* employee?`,
		`Nope.\nAll busy.\nSorry.`,
		`#$mage$What about thta door labelled 'complaints'?`,
		`oh\t.\t.\t. that door\t\t isn't real\t.`,
		``,
		`#Ok.`,
		`#Here's what's going to happen.\nI am going to go through that door and talk to someone.`,
		`I'll have to call security if you do that.`,
		`#$mage$You know what?`,
		//moves receptionist out of the way
		`#$mage$Alright, let's go.`
	],



	//dev commentaries
	"comm-intro": `Hi! Welcome to the developer commentary section!
		I wanted to put something like this in my game, because I think there are some interesting bits to how this game works, and how it changed over time, 
		and I don't necessarily want that information to be lost to time, or to just be locked in my brain. 
		Any time I have something I considered interesting to say about the game creation process, I've placed a bubble like this one around the world, and interacting with it will play an audio file.
		There are also subtitles available in the settings.
		If you're reading this, you already knew that. (:`,
	
	"comm-scaling": `One of the big obvious limitations I had to work around was the screen scaling. I built this game off of the engine that ran monarch, and monarch had a 16 tile wide screen, so this game had that as well. 
		However, the most common problem I saw people run into when they played monarch was that the camera was too zoomed in - they would get lost, or they would cover areas more than once, 
		because there weren't enough details on-screen to register where they were. 
		This was a pretty big problem, especially because I knew this would be a larger game. So I started with making the terrain more dense.
		
		I knew the player wouldn't be able to see things that far off the screen, so I made it impossible to go downwards, and put the town directly above the player.
		Theoretically, this would mean they would be sure to end up there.
		The second thing I did was to mostly decouple the tiles from the actual terrain. While this game still uses tiles for coordinate tracking, there can be multiple walls or even entities per tile.
		That, combined with more detailed art, helped a little (I hope)`,

	"comm-layers": `The world of ext is, for the most part, completely euclidian. The map is one rectangular grid. But it really helps to have at least a bit of an escape from that,
		especially when I'm already trying to fit more space into less space. So the layering system was born. I didn't want to go full 3d, but I did want a little depth, so the world has 3 layers stacked on each other.
		Each layer corresponds to a primary color, going r » g » b in ascending order, and the player will switch between those layers when necessary. Most things in the main world are on the red layer, but the bosses and this training ring are on the green layer.
		The blue layer also gets a few things, although it's used less, because if I had the space, I could just use the green layer.
		Although the green layer is on top of the red layer, it can still be used as a "below" layer, because it basically looks the same. `,

	"comm-artistry": `I made all of the artwork for this game, which was difficult at times because I'm not a professional artist. 
		When I started sketching out the broad strokes, doing an area was as easy as drawing a lumpy shape and filling it in. But obviously that wasn't going to hold up in the final game.
		As I did more of the art, I started to realize I didn't particularly like how it looked. This section of cliffs originally looked like this *show image*
		Which looked fine zoomed out, the way I usually view it in the editor, but looks childlike when zoomed in. The lines are too thick, and there's not enough detail.
		So those were the main issues I tried to fix. I limited myself to only drawing with line thickness 5, and made sure to add detailing, and tried to edit while zoomed in more.
		A lot of areas were like this. The world is large enough that I can work on one area, go to another, and then when I've come back to the first one I realize it doesn't look good and I have to change things.
		It does hurt a little to have to redo things, because it feels a little like the art I did earlier was pointless then, but eventually it does get better. And the art looks passable enough for my standards.`
}

var data_convoThreads = {
	"dm": [
		[true, "dark-1"],
		[false, "dark-2"]
	],
	"dsFind": [
		[true, "dsFinder-1"],
		[false, "dsFinder-2"],
		[false, "dsFinder-done"]
	]
}


//this error checking bit is probably unnecessary but it could save me some headache later
function validateConvoThreads() {
	var ents = Object.keys(data_convoThreads);
	ents.forEach(t => {
		data_convoThreads[t].forEach(l => {
			if (data_conversations[l[1]] == undefined) {
				console.error(`${l[1]} is not a valid conversation!`);
			}
		});
	});
}
validateConvoThreads();