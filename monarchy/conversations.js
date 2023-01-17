

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
	"armorySpheres-s": [
		`A small pile of cannon spheres.`
	],
	"armorySpheres-m": [
		`A medium-sized pile of cannon spheres.`
	],
	"armorySpheres-l": [
		`An infinite number of tiny cannon spheres
		packed neatly into this one spot.`
	],
	"armoryCannon": [
		`It's a cannon.`
	],
	"armoryArmor": [
		`Suits of armor.`
	],

	"importHelper": [
		`W A S D <- ^ | `
	],
	//stealth route
	"stealth-failKill": [
		`You had no weapon to kill the king with.`,
		`The king called his guards in to arrest you.`,
		`You are now in the castle jail.`,
	],
	"stealth-failCaught": [
		`You have been arrested.`,
		`You are now in the castle jail.`,
	],
	"jail-unlock": [
		`|EXECUTE~unlockCastleGate("jailLever", "jailGate");`
	],
	"swordPickup": [
		`|EXECUTE~player.changeWeaponTo(2);`,
		`|PROPERTY~DELETE~true`,
	],
	"swordIgnore": [
		`This is a sword.`,
		`If you knew how to use a sword,
		maybe it would be worth collecting.`
	],

	//guard
	"guard-noWeapon": [
		`You want to get in the castle?`,
		`A peasant? With no credentials?`,
		`Don't make me laugh. 
		Maybe come back with a note from your lord.`,
		`|UNLOCK`
	],
	"guard-partnerKilled": [
		`I'm not going to stop you.`,
		`When a stranger fizzles your partner you don't ask questions.`
	],
	"guard-noWeapon2": [
		`No entry.`,
	],
	"guard-weapon": [
		`What's this? You want to battle?`,
		`Listen, kid. I'm really not in the mood.`,
		`|ANIMATE~attack~4~player`,
		`|EXECUTE~audio_sfxChannel.play("fxMiss");`,
		`|DELAY~40`,
		`Fine. But don't say I didn't warn you.`,
		`|UNLOCK`,
		`|EXECUTE~fightStart_guard();`,
	],
	"guard-weapon2": [
		`|EXECUTE~fightStart_guard();`
	],
	"guard-defeated": [
		`|MUSIC~none`,
		`|TELEPORT~116~61~player`,
		`|FOCUS~116~60.5~10~30`,
		`|DELAY~20`,
		`|EXECUTE~data_persistent.boss = 1;`,
		`|WALK~-0.75~-1.75~player`,
		`|EXECUTE~unlockCastleGate("bridgeLever", "bridgeGate");`,
		`|DELAY~100`,
		`|WALK~0.75~-1~player`,
		`|FOCUS~116~54~~20`,
		`|WALK~0~-6~player`,
		`|FOCUS~~~~40`
	],


	//lord
	"lord-intro": [
		`I'm very busy. What is it that you want?`,
		`You want to learn about the art of sword fighting?
		Oh I am glad indeed.`,
		`I used to be quite the fighter when I was younger!
		I'm happy to teach an enthusiastic youth the basic concepts.`,
		`Of course, you'll never be quite as good as I am, but no matter.`,
		`|WALK~-6~1`,
		`|ANIMATE~reach`,
		`|EXECUTE~getEntityFromID('lordStickTop').textureActive.frame = 1;`,
		`|ANIMATE~grab`,
		`|WALK~6~2`,
		`|WALK~0~1`,
		`|ANIMATE~give`,
		`|EXECUTE~player.changeWeaponTo(1);`,
		`|EXECUTE~lockWitchDoor(1);`,
		`|ANIMATE~idle`,
		`Let us go outside.`,
		`|FILTER~1~f`,
		`|TELEPORT~16~12`,
		`|TELEPORT~16~14~player`,
		`|FOCUS~~~~1`,
		`|FILTER~0~f`,
		`|EXECUTE~getEntityFromID('lordStickMiddle').textureActive.frame = 1;`,
		`The first thing you need to know is how to maneuver quickly.
		If you're in a tough situation,
		dashing away is often your best line of defense.`,
		`To dash, you must press shift and then a direction.`,
		`|ACCEPT~down~Shift~{player.convoPartner.finishConversationCommand();}`,
		`Try dashing to the left now.`,
		`|ACCEPT~down~Left~{
			player.dx = -1;
			player.dash();
			player.convoPartner.finishConversationCommand();
		}`,
		``,
		`Good!`,
		`Swinging your weapon is also simple, just press Z.`,
		`|ACCEPT~down~Interact~{
			player.locked = false;
			player.attack_start();
			audio_sfxChannel.play("fxMiss");
			player.locked = true;
			player.convoPartner.finishConversationCommand();
		}`,
		``,
		`Acceptable. Now you will be tested.`,
		`|UNLOCK`,
		`|EXECUTE~fightStart_lord();`
	],
	"lord-youLose": [
		`|TELEPORT~16~12`,
		`|TELEPORT~16~14~player`,
		`|PROPERTY~a~-1.571~player`,
		`It appears I have won.`,
		`That is alright, it is to be expected. I have more experience.`,
		`Either way, you now know the basics. 
		If you wish to spar again, I will be in my manor.`,
		`|EXECUTE~data_persistent.lordFirst = false;`,
		`|FILTER~1~f`,
		`|TELEPORT~31~14`,
		`|FILTER~0~f`,
	],
	"lord-activate": [
		`|EXECUTE~fightStart_lord();`
	],
	"lord-youLose2": [
		`|TELEPORT~16~12`,
		`|TELEPORT~16~14~player`,
		`|PROPERTY~a~-1.571~player`,
		`You did well. But I have won regardless.`,
		`|FILTER~1~f`,
		`|TELEPORT~31~14`,
		`|FILTER~0~f`,
	],
	"lord-youWin": [
		`|TELEPORT~16~12`,
		`|TELEPORT~16~14~player`,
		`|PROPERTY~a~-1.571~player`,
		`(ouch)\\`,
		`Ha! Perhaps I shouldn't have gone easy on you!`,
		`Good job today; now go have fun.`,
		`|EXECUTE~data_persistent.pastLord = true;`,
		`|FILTER~1~f`,
		`|TELEPORT~31~14`,
		`|FILTER~0~f`,
		`|UNLOCK`
	],
	"lord-youWin2": [
		`Oh, I am weary from our session.`,
		`We both have work to do anyways.
		Come back tomorrow if you want to spar again!`,
		`|WALK~0~1~player`,
		`|UNLOCK`
	],
	"lord-youWin3": [
		`Come back later.`,
		`|WALK~0~1~player`
	],

	"lord-hasSword": [
		`You have a sword? Well now.`,
		`Did I not know better, I would think you wanted me dead.`,
		`No, thank you.`
	],
	"lord-hasSword2": [
		`Where did you get that sword anyways?`
	],
	"lord-hasSword3": [
		`Don't fritter away your lunch break over here.`
	],
	"lord-hasMagic": [
		`I don't trust your expression.`,
		`|WALK~0~2~player`,
	],




	//witch text
	"witch-intro": [
		`|FOCUS~44.5~108`,
		`Ah! Hello!`,
		`|WALK~2~-6`,
		`|PROPERTY~a~-1.571`,
		`What brings you here, my dear?`,
		`Interesting, you want to overthrow the monarchy.`,
		`Upset the social hierarchy.
		Sieze power for yourself, perhaps, even.`,
		`Well! Sounds like a fun project, I'm glad to help!`,
		`|WALK~-2~3`,
		`|WALK~2~-3`,
		`|PROPERTY~a~-1.571`,
		`Alright, what we're going to do is
		make it easier for you to access magic.
		When we're done, you'll be able to use it at any time.
		Hopefully.`,
		`Or you'll be a pile of ash, but there's an
		extremely low probability of that happening.
		Let's keep on the positive side, shall we?`, 
		`Here, drink this.`,
		`Alright, now focus.`,
		`|FILTER~0.5`,
		`|FOCUS~44.5~104~10~60`,
		`|EXECUTE~
			enableSpaceOrbs(); 
			player.magicLearned = true;
		`,
		`You should be able to feel the energy all around you.`,
		`The space, filled with potential.`,
		`|ACCEPT~down~Magic~{
			player.charge();
			player.convoPartner.finishConversationCommand();
		}`,
		`Try holding space.`,
		`|ACCEPT~up~Magic~{
			player.discharge();
			player.convoPartner.finishConversationCommand();
		}`,
		``,
		`Amazing! You're a natural!`,
		`|EXECUTE~disableSpaceOrbs();`,
		`|FILTER~0`,
		`Now you should be able to do this in the future.
		Just stay very calm, tap into the energy around you,
		and then release it.`,
		`Have fun! Remember me when you rule the world~!`,
		`|WALK~0~-2~player`,
		`|EXECUTE~lockWitchDoor(1);`,
		`|EXECUTE~lockLordDoor(1);`,
		`|UNLOCK`,
		`|FOCUS`
	],
	"witch-outside": [
		`Hello again!`,
		`It does good for a body to get outside every once in a while, 
		you know?`,
		`Of course you know.`,
		`I don't believe you need any help from me for the time being.`,
		`Run along now~`
	],
	"witch-seenRoom": [
		`So you've seen my old quarters.`,
		`Yes, it's true, I used to work in the castle.`,
		`Then I had a\t\t change of profession.
		My superiors did not approve.`,
		`Ah, but I'm getting stuck in the past.
		It is all alright.
		They are no longer my superiors.`,
		`Anyways, I don't believe you need anything more 
		from an old lady like me.`,
		`Toodles, dearie~`,
	],
	"witch-pastQueen": [
		`You've gotten past her! Congratulations!`,
		`Yes, yes, we go way back. 
		Too far back.`,
		`...`,
		`'Gotten past her'. What am I, a fool? 
		You have killed her. That is that.`,
		`A decisive solution, to say the least.`,
		`...`,
		`I\t.\t.\t.`,
		`I became a witch to get away from these sorts of things.`,
		`.\t\t.\t\t.\t\t.\t\t`,
		`Ha! Silly old me, spoiling the mood.
		You run along now! Not much left to do!`,
		`|UNLOCK`
	],
	"witch-pastQueen2": [
		`Run along now~`
	],
	"witchDoor": [
		`It's locked.`,
		`Perhaps it will be unlocked later.`,
		`Or perhaps not. Who's to tell with these things?`
	],
	"witchDoor-weapon": [
		`It's locked.`,
		`There's a sign on the door.`,
		`"No weapons permitted!"`,
	],
	"witchFirewood": [
		`Chopped wood, most likely intended
		to be burnt in a fire.`
	],
	"a witches diary": [
		`(This book is written in flowing cursive.)`,
		`Am I not, in the end, the biggest coward?`,
		`"A change of profession."`,
		`I dance, dance. How long can I do the devil dance?
		In the end, there's nowhere to go.
		Everywhere is all the same.`,
		`The poison is all in my mind. 
		No potion brew or spell cast can save me when I look in the mirror, 
		when I feel the cold air on my skin. `,
		`Bars, bars, heavy iron bars. `,
		`(In the margins a note is scribbled.)
		This isn't productive.`
	],



	"npc1": [
		`|FOCUS~17~55.5~12~30`,
		`I do not fear death.
		I kicked the bucket long ago.`,
		`That's why it's tipped over,
		and why I put my bed in the center of my room.`,
		`|FOCUS`,
	],
	"npc2-1": [
		`Hi. I'm wise and experienced, so I know where everything is.`,
		`And now I'll tell you where everything is.`,
		`North of us is our lord's manor.
		He gave me sparring lessons when I was young.`,
		`West of us is the field.
		But you already know where that is,
		since you go there every day.`,
		`East of us, through a stretch of forest, is the Castle.
		The King lives there.`,
		`And south of us? That's where the old wizard lives.
		They do questionable magic down there.`,
		`|UNLOCK`,
	],
	"npc2-2": [
		`MMMMM. Yes.
		Lord north, field west, castle east, and wizard south.`,
		`Good advice to remember for chess and in real life.`
	],
	"npc3-1": [
		`|PROPERTY~DELETE~true~npc3Z`,
		`Oh! Hi.. I was sleeping.
		->(z)`,
		`That's why there was a Z above my head.`,
		`And why I put a z into my speech.`,
		`Now I will cease our chatter.
		I have better things to attend to.`,
		`|PROPERTY~da~0.1`,
		`|UNLOCK`,
	],
	"npc3-2": [
		`|PROPERTY~da~0`,
		`These are my better things.`,
		`It may not look like much, but 
		spinning in this one spot truly is 
		the spice of the sauce of the gander.`,
		`|PROPERTY~da~0.1`
	],
	"npc4-1": [
		`The name's Henry. James Henry.`,
		`The age is three. Twenty three.`,
		`|UNLOCK`
	],
	"npc4-2": [
		`In a profession where people die young, fear the old one.`,
		`That's why you should be scared of me, 
		a grizzled geezer out here in the cold.`
	],
	"story-1": [
		`|PROPERTY~a~-1.571`,
		`I like to look out at the world from here.`,
		`Creation\t.\t.\t. it sure is beautiful.`,
		`|DELAY~150`,
		`Hey.\t\t\t How about this;
		if you bring me all the chocolate in the land,
		I'll tell you a story.`,
		`Does that sound fun to you?`,
		`|UNLOCK`,
	],
	"story-2": [
		`|PROPERTY~a~-1.571`,
		`It's a nice view.`
	],
	"story-3": [
		`I see you have all the chocolate. That's neat!`,
		`I will, of course, be taking it now.`,
		`|EXECUTE~player.chocolate = 0;`,
		`|UNLOCK`,
		`Here's a story.`,
		`Long ago, there lived a king.
		He wasn't the very best,
		but he was royalty, and he ruled over his subjects kindly.`,
		`One day, as there occasionally is, an invasion began.
		The king sent his knights into battle.
		They were trained well, 
		but this army had three curious figures in their midsts.`,
		`A stony-eyed general,
		a glowing woman,
		and a violet advisor.`,
		`The king's defenders were completely destroyed, 
		and the king was cast into exile.
		The new clique quickly took power,
		and used that power to further oppress all the lower classes.`,
		`This new group still rules over us to this day,
		and most likely will continue to rule for a good while.`,
		`What you, my friend, must realize,
		is that this new group has done nothing wrong.`,
		`Every event in this story, 
		from the first king taking power to the second group seizing it, 
		was equally authored by divine will.`,
		`And far from me to question the will of a deity, 
		but I have to wonder.
		If our systems of leadership produce
		harmful leaders as rapidly as good ones,
		maybe we're being told to change our system.`,
		`Perhaps not. What do I know? 
		I'm just a man in the cold, after all.`,
		`|PROPERTY~a~-1.571`
	],
	"story-4": [
		`|PROPERTY~a~-1.571`,
		`In every shooting star I see her beams.`,
		`|UNLOCK`,
	],
	"story-5": [
		`|PROPERTY~a~-1.571`,
		`Go on now,
		I'm sure you have important business to attend to.`
	],
	"npc6": [
		`Anachronism is poggers, yo.`
	],
	"npcGhost": [
		`hi`,
		`i've been stuck in here for years. 
		now everyone else has evacuated the castle
		but i'm still here.`,
		`in fact i'm actually a ghost`,
		`|PROPERTY~dy~0.051`,
		`|PROPERTY~do~-0.05`,
		`>g\t\to\t\to\t\td\t\t\tb\t\t\ty\t\t\te\t\t\t\t.\t\t\t\t.\t\t\t\t.\\`
	],

	"horse1": [
		`Neigh`,
		`Whinny`
	],
	"horse2-1": [
		`Neigh`,
		`I yearn to escape to a place far away from here.
		My life is so much more than just grazing and spinning around.
		But will I ever make it? Will I ever find the motivation?
		Rationalizing the familiar is all too easy.`,
		`Where would I go? Everywhere is all the same.`,
		`Neigh`,
		`|UNLOCK`
	],
	"horse2-2": [
		`horse`
	],
	"horse3": [
		`(this horse has a long face.)`,
		`(but.. it's a horse. They all have long faces.)`
	],
	"horse4": [
		`horse noises`
	],
	"horse5": [
		`horse`,
	],


	"castleLibrary-1": [
		`It's a bookshelf filled with books.
		You read a few titles.`,
		`"How to conquer the world: in 5 easy steps"`,
		`"The ancient art of crushing your enemies"`,
		`"The Little Prince"`,
		`"What to do with people who want you murdered"`,
		`You decide you have better things to do.`,
		`|UNLOCK`,
	],
	"castleLibrary-2": [
		`No time for reading right now.`
	],
	"castleLibrary2": [
		`It's a bookshelf filled with mysterious books.`
	],
	"wRoomTable": [
		`The scrolls on this table are covered in detailed writings
		as well as a few drawings.`,
		`You read the words 'perception field' and
		decide it's not worth your time.`
	],
	"wRoomBed": [
		`A comfy-looking bed for one person.`
	],

	"knights-stick": [
		`|PROPERTY~x~1e1001~queen`,
		`This.. will not do.`,
		`Are we honestly expected to fight a commoner? 
		With a stick? Hardly a fair fight.`,
		`A kitchen knife would be a better choice.`,
		`Arrangements can be made.
		In the armory, there are spare swords.`,
		`Go grab one of those, and then we will battle.`,
		`|UNLOCK`
	],
	"knights-stick2": [],
	"knights-sword": [
		`|FILTER~1~f`,
		`|PROPERTY~a~1.571`,
		`|FOCUS~141.5~16~~1`,
		`|TELEPORT~141.5~20~player`,
		`|FILTER~0~f`,
		`Let us begin.`,
		`|EXECUTE~fightStart_knights();`,
	],
	"knights-defeat": [
		`|PROPERTY~a~1.571`,
		`|PROPERTY~a~-1.571~player`,
		`|TELEPORT~141.5~20~player`,
		`|FOCUS~141.5~16~~1`,
		`Cease!
		Cease your attack!`,
		`I concede you are quite skilled with the blade. 
		You may do as you please, and I will not attempt to stop you.`,
		`It has been an honor.`,
		`|EXECUTE~data_persistent.boss = 2;`,
		`|UNLOCK`
	],
	"knights-defeat2": [
		`Please, leave me be.`
	],

	"angel-melee": [
		`|PROPERTY~a~1.571`,
		`|FOCUS~141.5~18.5`,
		`|TELEPORT~141.5~25~player`,
		`|MUSIC~angelIntro`,
		`|WALK~0~-5~player`,
		`Ah! Hello!`,
		`You have been causing quite the stir, you know.`,
		`You could have just knocked. We accept visitors.`,
		`If you have a complaint, I am sure it can be resolved
		over a nice cup of tea.
		And some cake.`,
		`Alright, alright.
		I understand when my messages are unwanted.`,
		`I have.. never been much the fighting type.`,
		`|FOCUS~141.5~16~~15`,
		`So you're going to fight these fine gentlemen instead.
		Enjoy~`,
		`|EXECUTE~data_persistent.boss = 1.5;`,
		`|WALK~1~-4.5`,
		`|WALK~-0.5~-2.25`,
		`|UNLOCK`,
		`|EXECUTE~getEntityFromID("knight2").startConversation();`
	],
	"angel-meleePassOff": [
		`|EXECUTE~getEntityFromID("knight2").startConversation();`
	],
	"angel-standard": [
		`|PROPERTY~a~1.571`,
		`|FOCUS~141.5~18.5`,
		`|TELEPORT~141.5~25~player`,
		`|EXECUTE~
			getEntityFromID("knight1").DELETE = true;
			getEntityFromID("knight2").DELETE = true;
			getEntityFromID("knight3").DELETE = true;`,
		`|MUSIC~angelIntro`,
		`|WALK~0~-5~player`,
		`Well hello there! Who might you be?
		No, do not answer. I already know.`,
		`You are quite full of surprises today.`,
		`Me? I am the Queen.`,
		`You appear to be trying to assassinate my dearest,
		which is...\ta bit of an issue.`,
		`Do you maybe want to\t.\t. turn back, perhaps? 
		This can all be forgiven? \t\tEt \t\tCetera?`,
		`\t\t\t\t.\t\t\t\t.\t\t\t\t.`,
		`Not going to happen. Alright.`,
		`Let's just get on with it.`,
		`|PROPERTY~a~0`,
		`|ANIMATE~transform`,
		`|FOCUS~~19~~10`,
		`|UNLOCK`,
		`|EXECUTE~fightStart_angel();`
	],
	"angel-standard2": [
		`|EXECUTE~fightStart_angel();`
	],
	"angel-defeat": [
		`|FOCUS~141.5~18~~1`,
		`|PROPERTY~a~0`,
		`|TELEPORT~141.5~18~player`,
		`|PROPERTY~a~-1.571~player`,
		`|ANIMATE~fall`,
		`|EXECUTE~data_persistent.boss = 2;`,
		`Quite \t\tunfortunate.`,
		`|DELAY~10`,
		`I worked years\t\t to prevent this type of thing from happening,
		and it's all undone in an instant?`,
		`|DELAY~10`,
		`Ha. \t\t\tKind of funny if you think about it.`,
		`|DELAY~80`,
		`|ANIMATE~crack~1`,
		`|EXECUTE~audio_sfxChannel.play("fxShatter");`,
		`|DELAY~60`,
		`|PROPERTY~do~-0.04`,
		`|DELAY~25`,
		`|PROPERTY~DELETE~true`,
	],
	
	"angel-stealth": [
		`|FOCUS~141.5~18.5`,
		`Oh! Goodness! You're not supposed to be here!`,
		`|EXECUTE~imprisonPlayer();`,
	],

	"fieldChocolate-1": [
		`|EXECUTE~player.chocolate += 1;`,
		`|EXECUTE~data_persistent.chocos[0] = 1;`,
		`You found a chocolate bar in the field!`,
		`|UNLOCK`,
		`|PROPERTY~DELETE~true`,
	],
	"fieldChocolate-2": [
		`|EXECUTE~player.chocolate += 1;`,
		`|EXECUTE~data_persistent.chocos[1] = 1;`,
		`You found another chocolate bar in the field!`,
		`The harvest is bountiful this year.`,
		`|PROPERTY~DELETE~true`,
	],
	"fieldChocolate-3": [
		`You search through the dirt, 
		but try as you might, 
		there is no more chocolate to be found.`
	],
	"binChocolate-1": [
		`|EXECUTE~player.chocolate += 1`,
		`|EXECUTE~data_persistent.chocos[2] = 1;`,
		`You took a chocolate bar from the container.`,
		`|UNLOCK`
	],
	"binChocolate-2": [
		`You looked through the container.`,
		`|EXECUTE~player.chocolate += 1`,
		`|EXECUTE~data_persistent.chocos[2] = 2;`,
		`There's another chocolate bar inside!`,
		`|UNLOCK`
	],
	"binChocolate-3": [
		`Your hands scrape at the walls of the container.
		Clawing, desparate for another treat.
		Is this truly where the chocolate well runs dry?`,
		`Then, in the depths, you feel something.`,
		`|EXECUTE~player.chocolate += 1`,
		`|EXECUTE~data_persistent.chocos[2] = 3;`,
		`You absorbed yet another 'bar.`,
		`|UNLOCK`
	],
	"binChocolate-4": [
		`Sadly, the container is empty.`
	],

	"storageBarrels": [
		`There are barrels here.
		They're filled with flour.`
	],
	"storageSpices": [
		`Herbs and spices.`
	],
	"storageBread": [
		`Bread and cheese.`,
		`The cheese looks like it's a gift.
		That's because it's so gouda`
	],

	"kitchenBarrel": [
		`This barrel is filled with water.`
	],
	"kitchenTray": [
		`A tray. It's a little dirty,
		but not too dirty.`,
		`A reasonable amount of dirty. 
		Y'know, the amount of dirty that a once used kitchen tray
		would be if it was half-washed.`
	],
	"kitchenFireplace": [
		`Fireplace`
	],


	"king-baseline": [
		`hey um so um how'd you do this?`
	],
	"king-intro": [
		`|PROPERTY~a~0`,
		`|DELAY~100`,
		`|FOCUS~115.9~13~9.7~100`,
		`|WALK~^~117.2~13.1~player`,
		`|WALK~-0.5~0~player`,
		`|LOCK`,
		//super scuffed but I don't feel like rewriting how conversations start
		`|EXECUTE~window.setTimeout(() => {
			getEntityFromID("king").startConversation();
		}, 25);`,
	],

	"king-sword": [
		`|EXECUTE~localStorage_writeEnding(1);`,
		`|FOCUS~115.9~13~9.7~1`,
		`|EXECUTE~player.chocolate = 0;`,
		`You dare threaten us?`,
		`You do not know the powers you trifle with.`,
		`|WALK~-0.75~0~player`,
		`Listen to me.
		We have been chosen to rule this kingdom. 
		Without us, these people are lost.
		Truly lost!`,
		`|WALK~-0.4~0~player`,
		`They need me!`,
		`You cann\\ot`,
		`|MUSIC~none`,
		`|ANIMATE~attack~3~player`,
		`|EXECUTE~audio_sfxChannel.play("fxHit");`,
		`|ANIMATE~stab~0`,
		`|PROPERTY~dy~-0.05`,
		`|PROPERTY~dy~-0.15`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.1375`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.1`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.075`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.055`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.03`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.015`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.01`,
		`|DELAY~1`,
		`|PROPERTY~dy~-0.005`,
		`|DELAY~1`,
		`|PROPERTY~dy~0`,
		`|DELAY~20`,
		`|WALK~-0.5~-2~player`,
		`|WALK~-0.95~-0.15~player`,
		`|PROPERTY~a~3~player`,
		`|PROPERTY~a~2.9~player`,
		`|PROPERTY~a~2.6~player`,
		`|PROPERTY~a~2.3~player`,
		`|PROPERTY~a~2.0~player`,
		`|PROPERTY~a~1.9~player`,
		// `|ANIMATE~reach~~player`,
		//add player to entities list so they're layered overtop the king
		`|EXECUTE~world_entities.push(player);`,
		`|ANIMATE~crown~0~player`,
		`|ANIMATE~stabCrownless~0`,
		`|DELAY~210`,
		`|FILTER~0.5~f`,
		`|FILTER~1~f`,
		`|EXECUTE~endGame();`,
	],
	"king-magic": [
		`|EXECUTE~localStorage_writeEnding(2);`,
		`|FOCUS~115.9~13~9.7~1`,
		`|EXECUTE~player.chocolate = 0;`,
		`We are very dissapointed in you.`,
		`|EXECUTE~player.charge();`,
		`|DELAY~20`,
		`You could have been so good to this world, 
		and yet you have chosen a dark path.`,
		`Nevertheless, we are merciful. 
		If you so choose n\\ow`,
		`|EXECUTE~player.magicActiveAnim = player.magicHoldAnimation;`,
		`|EXECUTE~player.discharge();`,
		`|DELAY~9`,
		`|MUSIC~none`,
		`|EXECUTE~audio_sfxChannel.play("fxHit");`,
		`|ANIMATE~vaporize`,
		`|DELAY~10`,
		`|WALK~-1.73~0~player`,
		`|ANIMATE~crown~0~player`,
		`|ANIMATE~vaporizeCrownless~0`,
		`|DELAY~255`,
		`|FILTER~0.5~f`,
		`|FILTER~1~f`,
		`|EXECUTE~endGame();`,
	],
	"outro-oneEnding": [
		`Congratulations!`,
		`You have reached the end!`,
		``,
		`But was this the only way`,
		`events could have transpired?`,
	],
	"outro-allEndings": [
		`Congratulations!`,
		`You have reached the end!`,
		``,
		`But were these the only ways`,
		`events could have transpired?`,
		``,
		`In this world at least, yes.`,
		`Thank you for playing!`,
	]

}