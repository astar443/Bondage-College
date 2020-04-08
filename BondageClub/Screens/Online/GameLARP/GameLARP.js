"use strict";
var GameLARPBackground = "Sheet";
var GameLARPClass = [
	{
		Name: "Matron",
		Bonus: [0.25, 0.00],
		Ability: ["Charge", "Control", "Detain"]
	},
	{
		Name: "Seducer",
		Bonus: [0.20, 0.05],
		Ability: ["Expose", "Inspire", "Seduce"]
	},
	{
		Name: "Trickster",
		Bonus: [0.15, 0.10],
		Ability: ["Confuse", "Gamble", "Hide"]
	},
	{
		Name: "Artist",
		Bonus: [0.10, 0.15],
		Ability: ["Cheer", "Costume", "Evasion"]
	},
	{
		Name: "Servant",
		Bonus: [0.05, 0.20],
		Ability: ["Rescue", "Silence", "Support"]
	},
	{
		Name: "Protector",
		Bonus: [0.00, 0.25],
		Ability: ["Cover", "Dress", "Sacrifice"]
	},
];
var GameLARPTeamList = ["None", "Red", "Green", "Blue", "Yellow", "Cyan", "Purple", "Orange", "White", "Gray", "Black"];
var GameLARPEntryClass = "";
var GameLARPEntryTeam = "";
var GameLARPStatus = "";
var GameLARPProgress = [];
var GameLARPPlayer = [];
var GameLARPOption = [];
var GameLARPAction = "";
var GameLARPInventory = [];
var GameLARPInventoryOffset = 0;
var GameLARPTurnAdmin = 0;
var GameLARPTurnPosition = 0;
var GameLARPTurnAscending = true;
var GameLARPTurnTimer = null;
var GameLARPTurnFocusCharacter = null;
var GameLARPTurnFocusGroup = null;

// Return TRUE if that character is the room creator (game administrator)
function GameLARPIsAdmin(C) {
	if (GameLARPStatus == "")
		return (ChatRoomData.Admin.indexOf(C.MemberNumber) >= 0)
	else
		return (GameLARPTurnAdmin == C.MemberNumber);
};

// Draws the LARP class/team icon of a character
function GameLARPDrawIcon(C, X, Y, Zoom) {
	if ((C != null) && (C.Game != null) && (C.Game.LARP != null) && (C.Game.LARP.Class != null) && (C.Game.LARP.Team != null) && (C.Game.LARP.Team != "") && (C.Game.LARP.Team != "None"))
		DrawImageZoomCanvas("Icons/LARP/" + C.Game.LARP.Class + C.Game.LARP.Team + ".png", MainCanvas, 0, 0, 100, 100, X, Y, 100 * Zoom, 100 * Zoom);
}

// When the screens loads
function GameLARPLoad() {
	GameLARPEntryClass = Player.Game.LARP.Class;
	GameLARPEntryTeam = Player.Game.LARP.Team;
	if (GameLARPStatus == "") GameLARPProgress = [];
}

// When the screen runs
function GameLARPRun() {

	// Draw the character, text and buttons
	DrawCharacter(Player, 50, 50, 0.9);
	MainCanvas.textAlign = "left";
	DrawText(TextGet("Title"), 550, 125, "Black", "Gray");
	DrawText(TextGet("SelectClass"), 550, 225, "Black", "Gray");
	DrawText(TextGet("SelectTeam"), 550, 325, "Black", "Gray");
	if (GameLARPStatus != "") DrawText(TextGet("Class" + Player.Game.LARP.Class), 900, 225, "Black", "Gray");
	if (GameLARPStatus != "") DrawText(TextGet("Color" + Player.Game.LARP.Team), 900, 325, "Black", "Gray");
	DrawText(TextGet((GameLARPStatus == "") ? "StartCondition" : "RunningGame"), 550, 425, "Black", "Gray");
	MainCanvas.textAlign = "center";
	DrawButton(1815, 75, 90, 90, "", "White", "Icons/Exit.png");
	if (GameLARPStatus == "") DrawBackNextButton(900, 193, 400, 64, TextGet("Class" + Player.Game.LARP.Class), "White", "", () => "", () => "");
	if (GameLARPStatus == "") DrawBackNextButton(900, 293, 400, 64, TextGet("Color" + Player.Game.LARP.Team), "White", "", () => "", () => "");
	GameLARPDrawIcon(Player, 1400, 200, 1.5);
	if (GameLARPCanLaunchGame()) DrawButton(550, 500, 400, 65, TextGet("StartGame"), "White");

}

// Runs the game from the chat room
function GameLARPRunProcess() {

	// If the player is an admin, she can make player skip their turns
	if ((GameLARPStatus == "Running") && (CurrentTime > GameLARPTurnTimer) && GameLARPIsAdmin(Player)) ServerSend("ChatRoomGame", { GameProgress: "Skip" });

	// Clears the focused character if it's not the player turn
	if ((GameLARPTurnFocusCharacter != null) && ((GameLARPStatus != "Running") || (GameLARPPlayer[GameLARPTurnPosition].ID != 0))) GameLARPTurnFocusCharacter = null;

	// If we must show the focused character and available abilities
	if (GameLARPTurnFocusCharacter != null) {

		// Draw the room dark background
		DrawImageZoomCanvas("Backgrounds/" + ChatRoomData.Background + "Dark.jpg", MainCanvas, 500, 0, 1000, 1000, 0, 0, 1000, 1000);

		// In inventory selection mode
		if (GameLARPTurnFocusGroup != null) {

			// Draw the label and buttons
			DrawText(OnlineGameDictionaryText("ItemSelect"), 263, 50, "White", "Gray");
			if (GameLARPInventory.length > 12) DrawButton(525, 20, 200, 60, OnlineGameDictionaryText("ItemNext"), "White");
			DrawButton(775, 20, 200, 60, OnlineGameDictionaryText("ItemCancel"), "White");

			// Prepares a 4x3 square selection with inventory from the buffer
			var X = 15;
			var Y = 110;
			for (var A = GameLARPInventoryOffset; (A < GameLARPInventory.length) && (A < GameLARPInventoryOffset + 12); A++) {
				DrawRect(X, Y, 225, 275, ((MouseX >= X) && (MouseX < X + 225) && (MouseY >= Y) && (MouseY < Y + 275) && !CommonIsMobile) ? "cyan" : "white");
				DrawImageResize("Assets/" + Player.AssetFamily + "/" + GameLARPInventory[A].Group.Name + "/Preview/" + GameLARPInventory[A].Name + ".png", X + 2, Y + 2, 221, 221);
				DrawTextFit(GameLARPInventory[A].Description, X + 112, Y + 250, 221, "black");
				X = X + 250;
				if (X > 800) {
					X = 15;
					Y = Y + 300;
				}
			}

		} else {

			// Draw all the possible options
			DrawCharacter(GameLARPTurnFocusCharacter, 500, 0, 1);
			for (var O = 0; O < GameLARPOption.length; O++)
				DrawButton(50, 35 + (O * 100), 400, 65, OnlineGameDictionaryText("Option" + GameLARPOption[O].Name).replace("OptionOdds", Math.round(GameLARPOption[O].Odds * 100)), "White");
			DrawButton(50, 900, 400, 65, OnlineGameDictionaryText("BackToCharacters"), "White");

			// Draw the timer
			MainCanvas.font = "108px Arial";
			var Time = Math.ceil((GameLARPTurnTimer - CurrentTime) / 1000);
			DrawText(((Time < 0) || (Time > 20)) ? OnlineGameDictionaryText("TimerNA") : Time.toString(), 250, 800, "Red", "White");
			MainCanvas.font = "36px Arial";

		}

	}

}

// Builds the inventory selection list
function GameLARPBuildInventory(FocusGroup) {
	GameLARPTurnFocusGroup = FocusGroup;
	GameLARPInventory = [];
	GameLARPInventoryOffset = 0;
	for(var A = 0; A < Player.Inventory.length; A++)
		if ((Player.Inventory[A].Asset != null) && (Player.Inventory[A].Asset.Group.Name == FocusGroup) && Player.Inventory[A].Asset.Enable)
			GameLARPInventory.push(Player.Inventory[A].Asset);
}

// When an option is selected for a target
function GameLARPClickOption(Name) {
	GameLARPAction = Name;
	if (Name == "RestrainLegs") return GameLARPBuildInventory("ItemFeet");
	if ((Name == "RestrainMouth") || (Name == "Silence")) return GameLARPBuildInventory("ItemMouth");
	if ((Name == "RestrainArms") || (Name == "Detain")) return GameLARPBuildInventory("ItemArms");
	ServerSend("ChatRoomGame", { GameProgress: "Action", Action: Name, Target: GameLARPTurnFocusCharacter.MemberNumber });
}

// Return TRUE if we intercept clicks in the chat room
function GameLARPClickProcess() {

	// Do not handle any click if no character is selected, a target is required here
	if (GameLARPTurnFocusCharacter == null) return false;

	// In inventory selection mode
	if (GameLARPTurnFocusGroup != null) {

		// If "Next" or "Cancel" is clicked
		if ((GameLARPInventory.length > 12) && (MouseX >= 525) && (MouseX < 725) && (MouseY >= 20) && (MouseY <= 80)) {
			GameLARPInventoryOffset = GameLARPInventoryOffset + 12;
			if (GameLARPInventoryOffset >= GameLARPInventory.length) GameLARPInventoryOffset = 0;
		}
		if ((MouseX >= 775) && (MouseX < 975) && (MouseY >= 20) && (MouseY <= 80)) GameLARPTurnFocusGroup = null;
		
		// Checks if one of the 4x3 inventory square is clicked
		var X = 15;
		var Y = 110;
		for (var A = GameLARPInventoryOffset; (A < GameLARPInventory.length) && (A < GameLARPInventoryOffset + 12); A++) {
			if ((MouseX >= X) && (MouseX <= X + 225) && (MouseY >= Y) && (MouseY <= Y + 275))
				ServerSend("ChatRoomGame", { GameProgress: "Action", Action: GameLARPAction, Item: GameLARPInventory[A].Name, Target: GameLARPTurnFocusCharacter.MemberNumber });
			X = X + 250;
			if (X > 800) {
				X = 15;
				Y = Y + 300;
			}
		}

	} else {

		// If we must catch the click on one of the buttons
		for (var O = 0; O < GameLARPOption.length; O++)
			if ((MouseX >= 50) && (MouseX < 450) && (MouseY >= 35 + (O * 100)) && (MouseY <= 100 + (O * 100)))
				GameLARPClickOption(GameLARPOption[O].Name);

		// If we must exit from the currently focused character
		if ((MouseX >= 50) && (MouseX < 450) && (MouseY >= 900) && (MouseY <= 965)) GameLARPTurnFocusCharacter = null;

	}

	// Flags the click as being handled
	return true;

}

// When the player clicks in the chat Admin screen
function GameLARPClick() {

	// When the user exits
	if ((MouseX >= 1815) && (MouseX < 1905) && (MouseY >= 75) && (MouseY < 165)) GameLARPExit();

	// When the user selects a new class
	if ((MouseX >= 900) && (MouseX < 1300) && (MouseY >= 193) && (MouseY < 257) && (GameLARPStatus == "")) {
		var Index = 0;
		for (var I = 0; I < GameLARPClass.length; I++)
			if (GameLARPClass[I].Name == Player.Game.LARP.Class)
				Index = I;
		if (MouseX <= 1100) Index = (Index <= 0) ? GameLARPClass.length - 1 : Index - 1;
		else Index = (Index >= GameLARPClass.length - 1) ? 0 : Index + 1;		
		Player.Game.LARP.Class = GameLARPClass[Index].Name;
	}
	
	// When the user selects a new team
	if ((MouseX >= 900) && (MouseX < 1300) && (MouseY >= 293) && (MouseY < 357) && (GameLARPStatus == "")) {
		if (MouseX <= 1100) Player.Game.LARP.Team = (GameLARPTeamList.indexOf(Player.Game.LARP.Team) <= 0) ? GameLARPTeamList[GameLARPTeamList.length - 1] : GameLARPTeamList[GameLARPTeamList.indexOf(Player.Game.LARP.Team) - 1];
		else Player.Game.LARP.Team = (GameLARPTeamList.indexOf(Player.Game.LARP.Team) >= GameLARPTeamList.length - 1) ? GameLARPTeamList[0] : GameLARPTeamList[GameLARPTeamList.indexOf(Player.Game.LARP.Team) + 1];
	}
	
	// If the administrator wants to start the game
	if ((MouseX >= 550) && (MouseX < 950) && (MouseY >= 500) && (MouseY < 565) && GameLARPCanLaunchGame()) {

		// Shuffles all players in the chat room
		for (var C = 0; C < ChatRoomCharacter.length; C++) {
			if (ChatRoomCharacter[C].MemberNumber != Player.MemberNumber) {
				ServerSend("ChatRoomAdmin", { MemberNumber: ChatRoomCharacter[C].MemberNumber, Action: "Shuffle" });
				break;
			}
		}

		// Give two seconds to the server to shuffle the room before calling the start game function (could be reviewed, maybe this is not needed)
		var waitUntil = new Date().getTime() + 2000;
		while(new Date().getTime() < waitUntil) true;
		GameLARPTurnTimer = CurrentTime + 20000;

		// Notices everyone in the room that the game starts
		var Dictionary = [];
		Dictionary.push({Tag: "SourceCharacter", Text: Player.Name, MemberNumber: Player.MemberNumber});
		ServerSend("ChatRoomChat", { Content: "LARPGameStart", Type: "Action" , Dictionary: Dictionary});

		// Changes the game status and exits
		ServerSend("ChatRoomGame", { GameProgress: "Start" });
		Player.Game.LARP.Status = "Running";
		ServerSend("AccountUpdate", { Game: Player.Game });
		ChatRoomCharacterUpdate(Player);
		CommonSetScreen("Online", "ChatRoom");

	}
	
}

// When the user exit from this screen
function GameLARPExit() {

	// When the game isn't running, we allow to change the class or team
	if (GameLARPStatus == "") {
		
		// Notices everyone in the room of the change
		var Dictionary = [];
		Dictionary.push({Tag: "SourceCharacter", Text: Player.Name, MemberNumber: Player.MemberNumber});
		ServerSend("ChatRoomChat", { Content: "LARPChangeTeamClass", Type: "Action" , Dictionary: Dictionary});

		// Updates the player and go back to the chat room
		ServerSend("AccountUpdate", { Game: Player.Game });
		ChatRoomCharacterUpdate(Player);
		CommonSetScreen("Online", "ChatRoom");

	} else {
		Player.Game.LARP.Class = GameLARPEntryClass;
		Player.Game.LARP.Team = GameLARPEntryTeam;
		CommonSetScreen("Online", "ChatRoom");
	}

}

// Returns TRUE if the game can be launched, the player must an administrator and two different teams must be selected
function GameLARPCanLaunchGame() {
	if (Player.Game.LARP.Class != GameLARPEntryClass) return false;
	if (Player.Game.LARP.Team != GameLARPEntryTeam) return false;
	if (GameLARPStatus != "") return false;
	if (!GameLARPIsAdmin(Player)) return false;
	var Team = "";
	for (var C = 0; C < ChatRoomCharacter.length; C++)
		if ((ChatRoomCharacter[C].Game.LARP.Team != "") && (ChatRoomCharacter[C].Game.LARP.Team != "None") && (InventoryGet(ChatRoomCharacter[C], "ItemArms") == null)) {
			if (Team == "")
				Team = ChatRoomCharacter[C].Game.LARP.Team;
			else
				if (Team != ChatRoomCharacter[C].Game.LARP.Team)
					return true;
		}
	return false;
}

// Gets a specific bonus from the character class
function GameLARPGetBonus(Char, BonusType) {
	for (var C = 0; C < GameLARPClass.length; C++)
		if (Char.Game.LARP.Class == GameLARPClass[C].Name)
			return GameLARPClass[C].Bonus[BonusType];
	return 0;
}

// Returns the odds of successfully doing an offensive action
function GameLARPGetOdds(Action, Source, Target) {

	// The basic odds are 50% + Offensive bonus of source - Defensive bonus of target
	var Odds = 0.5 + GameLARPGetBonus(Source, 0) - GameLARPGetBonus(Target, 1);

	// Struggling starts at 10% + 10% for each new unsuccessful tries, tightening the bonds will reset it to 10%
	if (Action == "Struggle") {
		Odds = 0.05;
		for (var P = 0; P < GameLARPProgress.length; P++) 
			if (GameLARPProgress[P].Success != null) {
				if ((GameLARPProgress[P].Sender == Source.MemberNumber) && (GameLARPProgress[P].Data.Target == Source.MemberNumber) && (GameLARPProgress[P].Data.GameProgress == "Action") && (GameLARPProgress[P].Data.Action == "Struggle") && !GameLARPProgress[P].Success) Odds = Odds + 0.05;
				if ((GameLARPProgress[P].Sender == Source.MemberNumber) && (GameLARPProgress[P].Data.Target == Source.MemberNumber) && (GameLARPProgress[P].Data.GameProgress == "Action") && (GameLARPProgress[P].Data.Action == "Struggle") && GameLARPProgress[P].Success) Odds = 0.05;
				if ((GameLARPProgress[P].Data.Target == Source.MemberNumber) && (GameLARPProgress[P].Data.GameProgress == "Action") && (GameLARPProgress[P].Data.Action == "RestrainArms") && GameLARPProgress[P].Success) Odds = 0.05;
				if ((GameLARPProgress[P].Data.Target == Source.MemberNumber) && (GameLARPProgress[P].Data.GameProgress == "Action") && (GameLARPProgress[P].Data.Action == "Tighten") && GameLARPProgress[P].Success) Odds = 0.05;
			}
	}

	// Many actions have fixed %
	if (["Pass", "Charge", "Control", "Hide", "Evasion", "Support", "Sacrifice", "Dress"].indexOf(Action) >= 0) return (Source.MemberNumber == Target.MemberNumber) ? 1 : 0;
	if (["Gamble"].indexOf(Action) >= 0) return (Source.MemberNumber == Target.MemberNumber) ? 0.5 : 0;
	if (["Inspire", "Cheer", "Costume", "Rescue", "Cover"].indexOf(Action) >= 0) return ((Source.MemberNumber != Target.MemberNumber) && (Source.Game.LARP.Team == Target.Game.LARP.Team)) ? 1 : 0;
	if (["Detain", "Expose", "Seduce", "Confuse", "Silence"].indexOf(Action) >= 0) return ((Source.MemberNumber != Target.MemberNumber) && (Source.Game.LARP.Team != Target.Game.LARP.Team)) ? 1 : 0;

	// Returns the % between 0 and 1
	if (Odds > 1) Odds = 1;
	if (Odds < 0) Odds = 0;
	return Odds.toFixed(2);

}

// Adds all available class abilities to the valid options
function GameLARPBuildOptionAbility(Source, Target, Option, Ability) {

	// If the ability was already used in that battle, it cannot be used anymore
	for (var P = 0; P < GameLARPProgress.length; P++) 
		if ((GameLARPProgress[P].Sender == Source.MemberNumber) && (GameLARPProgress[P].Data.GameProgress == "Action") && (GameLARPProgress[P].Data.Action == Ability))
			return;

	// If the player targets herself
	if (Source.MemberNumber == Target.MemberNumber) {

		// Abilities that can be used on yourself
		var Odds = GameLARPGetOdds(Ability, Source, Source);
		if (Ability == "Charge") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Control") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Gamble") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Hide") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Evasion") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Support") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Sacrifice") Option.push({ Name: Ability, Odds: Odds });
		if (Ability == "Dress") Option.push({ Name: Ability, Odds: Odds });

	} else {

		// If the player targets someone from her team
		var Odds = GameLARPGetOdds(Ability, Source, Target);
		if (Source.Game.LARP.Team == Target.Game.LARP.Team) {

			// Abilities that can be used on someone from your team
			if (Ability == "Inspire") Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Cheer") Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Costume") Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Rescue") Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Cover") Option.push({ Name: Ability, Odds: Odds });

		} else {

			// Abilities that are used on players from another team, cannot be used if target arms are restrained
			if (InventoryGet(Target, "ItemArms") != null) return;
			if ((Ability == "Detain") && (InventoryGet(Target, "Cloth") == null) && (InventoryGet(Target, "ItemMouth") != null) && (InventoryGet(Target, "ItemFeet") != null)) Option.push({ Name: Ability, Odds: Odds });
			if ((Ability == "Expose") && (InventoryGet(Target, "Cloth") != null)) Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Seduce") Option.push({ Name: Ability, Odds: Odds });
			if (Ability == "Confuse") Option.push({ Name: Ability, Odds: Odds });
			if ((Ability == "Silence") && (InventoryGet(Target, "Cloth") == null) && (InventoryGet(Target, "ItemMouth") == null)) Option.push({ Name: Ability, Odds: Odds });

		}

	}

}

// Build a clickable menu for everything that can be tempted on a character
function GameLARPBuildOption(Source, Target) {

	// If the source clicks on herself, she can always pass her turn and do nothing
	var Option = [];
	if (Source.MemberNumber == Target.MemberNumber) Option.push({ Name: "Pass", Odds: GameLARPGetOdds("Pass", Source, Source) });

	// If the source is restrained, she only has the struggle option on herself
	if ((InventoryGet(Source, "ItemArms") != null) && (Source.MemberNumber == Target.MemberNumber))
		Option.push({ Name: "Struggle", Odds: GameLARPGetOdds("Struggle", Source, Source) });

	// Gets all abilities for the class and assigns which one can be used
	if (InventoryGet(Source, "ItemArms") == null) {
		var Ability = [];
		for (var C = 0; C < GameLARPClass.length; C++)
			if (Source.Game.LARP.Class == GameLARPClass[C].Name)
				Ability = GameLARPClass[C].Ability;
		for (var A = 0; A < Ability.length; A++)
			GameLARPBuildOptionAbility(Source, Target, Option, Ability[A]);
	}

	// Builds the "Strip" & "Restrain" options if the target isn't in the source team
	if ((Target.Game.LARP.Team != Source.Game.LARP.Team) && (InventoryGet(Source, "ItemArms") == null)) {

		// Some actions are different based on the target current restrains
		if (InventoryGet(Target, "Cloth") != null) Option.push({ Name: "Strip", Odds: GameLARPGetOdds("Strip", Source, Target) });
		else if (InventoryGet(Target, "ItemArms") != null) Option.push({ Name: "Tighten", Odds: GameLARPGetOdds("Tighten", Source, Target) });
		else if ((InventoryGet(Target, "ItemMouth") != null) && (InventoryGet(Target, "ItemFeet") != null)) Option.push({ Name: "RestrainArms", Odds: GameLARPGetOdds("RestrainArms", Source, Target) });
		else {
			if (InventoryGet(Target, "ItemFeet") == null) Option.push({ Name: "RestrainLegs", Odds: GameLARPGetOdds("RestrainLegs", Source, Target) });
			if (InventoryGet(Target, "ItemMouth") == null) Option.push({ Name: "RestrainMouth", Odds: GameLARPGetOdds("RestrainMouth", Source, Target) });
		}

	}

	// Returns all valid options
	return Option;

}

// Returns the character based on the member number
function GameLARPGetPlayer(MemberNumber) {
	for (var C = 0; C < GameLARPPlayer.length; C++)
		if (GameLARPPlayer[C].MemberNumber == MemberNumber)
			return GameLARPPlayer[C];
	return null;
}

// Processes an action for a player
function GameLARPProcessAction(Action, ItemName, Source, Target, RNG) {

	// Skip if the characters aren't valid
	if ((Source == null) || (Target == null)) return;

	// Gets the item description in the user language
	var ItemDesc = "";
	if (ItemName != "") {
		var A;
		if (Action == "RestrainLegs") A = AssetGet(Target.AssetFamily, "ItemLegs", ItemName);
		if ((Action == "RestrainArms") || (Action == "Detain")) A = AssetGet(Target.AssetFamily, "ItemArms", ItemName);
		if ((Action == "RestrainMouth") || (Action == "Silence")) A = AssetGet(Target.AssetFamily, "ItemMouth", ItemName);
		if ((A != null) && (A.Description != null)) ItemDesc = A.Description;
	}

	// If the odds are successful (0% never succeeds, 100% always succeeds)
	var Odds = GameLARPGetOdds(Action, Source, Target);
	if ((Odds >= 0.01) && ((Odds >= 1) || (Odds >= RNG.toFixed(2)))) {

		// Regular restrain actions
		if (Action == "RestrainLegs") InventoryWear(Target, ItemName, "ItemFeet", null, 6);
		if ((Action == "RestrainArms") || (Action == "Detain")) InventoryWear(Target, ItemName, "ItemArms", null, 6);
		if ((Action == "RestrainMouth") || (Action == "Silence")) InventoryWear(Target, ItemName, "ItemMouth", null, 6);
		if (Action == "Struggle") InventoryRemove(Target, "ItemArms", null, 5);

		// Strip / Expose removes the cloth items
		if ((Action == "Strip") || (Action == "Expose")) {
			InventoryRemove(Target, "Cloth");
			InventoryRemove(Target, "ClothLower");
			InventoryRemove(Target, "ClothAccessory");
		}

		// Publishes the success
		GameLARPAddChatLog("Option" + Action + "Success", Source, Target, ItemDesc, RNG, Odds, "#00B000");
		GameLARPProgress[GameLARPProgress.length - 1].Success = true;

	} else {

		// Publishes the failure
		GameLARPAddChatLog("Option" + Action + "Fail", Source, Target, ItemDesc, RNG, Odds, "#B00000");
		GameLARPProgress[GameLARPProgress.length - 1].Success = false;

	}

}

// Processes the LARP game clicks, returns TRUE if the code handles the click
function GameLARPCharacterClick(C) {

	// If it's the player turn, we allow clicking on a character to get the abilities menu
	if ((GameLARPStatus == "Running") && (GameLARPPlayer[GameLARPTurnPosition].ID == 0) && (C.Game != null) && (C.Game.LARP != null) && (C.Game.LARP.Team != null) && (C.Game.LARP.Team != "") && (C.Game.LARP.Team != "None")) {
		GameLARPTurnFocusCharacter = C;
		GameLARPTurnFocusGroup = null;
		GameLARPOption = GameLARPBuildOption(Player, GameLARPTurnFocusCharacter);
	}

	// Flags that transaction as being handled
	return true;

}

// Adds the LARP message to the chat log
function GameLARPAddChatLog(Msg, Source, Target, Description, RNG, Odds, Color) {

	// Gets the message from the dictionary
	Msg = OnlineGameDictionaryText(Msg);
	Msg = Msg.replace("SourceName", Source.Name);
	Msg = Msg.replace("SourceNumber", Source.MemberNumber.toString());
	Msg = Msg.replace("TargetName", Target.Name);
	Msg = Msg.replace("TargetNumber", Target.MemberNumber.toString());
	Msg = Msg.replace("ActionRNG", Math.round(RNG * 100).toString());
	Msg = Msg.replace("ActionOdds", Math.round(Odds * 100).toString());
	Msg = Msg.replace("ItemDesc", Description);
	Msg = Msg.replace("TeamName", Description);

	// Adds the message and scrolls down unless the user has scrolled up
	var div = document.createElement("div");
	div.setAttribute('class', 'ChatMessage ChatMessageServerMessage');
	div.setAttribute('data-time', ChatRoomCurrentTime());
	if ((Color != null) && (Color != "")) div.style.color = Color;
	div.innerHTML = Msg;
	var Refocus = document.activeElement.id == "InputChat";
	var ShouldScrollDown = ElementIsScrolledToEnd("TextAreaChatLog");
	if (document.getElementById("TextAreaChatLog") != null) {
		document.getElementById("TextAreaChatLog").appendChild(div);
		if (ShouldScrollDown) ElementScrollToEnd("TextAreaChatLog");
		if (Refocus) ElementFocus("InputChat");
	}

}

// Sets the new turn player and publish it in the chat room
function GameLARPNewTurnPublish(NewPlayerPosition, Ascending, Msg) {

	// Sets the new position and turn order, the timer is 20 seconds (10 seconds if arms are restrained), then publish in the chat log
	GameLARPTurnPosition = NewPlayerPosition;
	GameLARPTurnAscending = Ascending;
	GameLARPTurnTimer = CurrentTime + (GameLARPPlayer[GameLARPTurnPosition].CanInteract() ? 20000 : 10000);
	GameLARPAddChatLog(Msg, Player, GameLARPPlayer[GameLARPTurnPosition], "", 0, 0);

}

// Generates a new turn for the LARP game
function GameLARPNewTurn(Msg) {

	// Resets the focus
	GameLARPTurnFocusCharacter = null;
	GameLARPTurnFocusGroup = null;

	// Cycles in the game player array ascending or descending and shifts the position
	if ((GameLARPTurnAscending) && (GameLARPTurnPosition < GameLARPPlayer.length - 1)) return GameLARPNewTurnPublish(GameLARPTurnPosition + 1, true, Msg);
	if ((GameLARPTurnAscending) && (GameLARPTurnPosition == GameLARPPlayer.length - 1)) return GameLARPNewTurnPublish(GameLARPTurnPosition, false, Msg);
	if ((!GameLARPTurnAscending) && (GameLARPTurnPosition > 0)) return GameLARPNewTurnPublish(GameLARPTurnPosition - 1, false, Msg);
	if ((!GameLARPTurnAscending) && (GameLARPTurnPosition == 0)) return GameLARPNewTurnPublish(GameLARPTurnPosition, true, Msg);

}

// Builds the full player list
function GameLARPBuildPlayerList() {
	GameLARPPlayer = [];
	for (var C = 0; C < ChatRoomCharacter.length; C++)
		if ((ChatRoomCharacter[C].Game != null) && (ChatRoomCharacter[C].Game.LARP != null) && (ChatRoomCharacter[C].Game.LARP.Team != null) && (ChatRoomCharacter[C].Game.LARP.Team != "") && (ChatRoomCharacter[C].Game.LARP.Team != "None"))
			GameLARPPlayer.push(ChatRoomCharacter[C]);
}

// Returns TRUE if the game ends and runs the end scripts
function GameLARPContinue() {

	// See if there's at least 2 teams in which players have free arms, return TRUE if that's the case
	var Team = "";
	for (var C = 0; C < ChatRoomCharacter.length; C++)
		if ((ChatRoomCharacter[C].Game.LARP.Team != "") && (ChatRoomCharacter[C].Game.LARP.Team != "None") && (InventoryGet(ChatRoomCharacter[C], "ItemArms") == null)) {
			if (Team == "")
				Team = ChatRoomCharacter[C].Game.LARP.Team;
			else
				if (Team != ChatRoomCharacter[C].Game.LARP.Team)
					return true;
		}

	// If there's a winning team, we announce it and stop the game
	if (Team != "") {

		// Shows the winning team and updates the player status
		GameLARPAddChatLog("EndGame", Player, Player, OnlineGameDictionaryText("Team" + Team), 0, 0);
		GameLARPStatus = "";
		Player.Game.LARP.Status = "";
		ServerSend("AccountUpdate", { Game: Player.Game });

		// Calculate the reputation gained, the longer the game took, the higher it will rise the rep, times 2 if the player team won
		var RepGain = Math.round(GameLARPProgress.length / GameLARPPlayer.length * ((Player.Game.LARP.Team == Team) ? 0.6 : 0.3));
		if (RepGain > 0) DialogChangeReputation("LARP", RepGain);
		ChatRoomCharacterUpdate(Player);
		return false;

	} else return true;

}

// Processes the LARP game messages
function GameLARPProcess(P) {
	if ((P != null) && (typeof P === "object") && (P.Data != null) && (typeof P.Data === "object") && (P.Sender != null) && (typeof P.Sender === "number") && (P.RNG != null) && (typeof P.RNG === "number")) {

		// The administrator can start the LARP game, he becomes the turn admin in the process
		if ((ChatRoomData.Admin.indexOf(P.Sender) >= 0) && (P.Data.GameProgress == "Start")) {
			GameLARPStatus = "Running";
			GameLARPTurnAdmin = P.Sender;
			GameLARPTurnPosition = -1;
			GameLARPTurnAscending = true;
			GameLARPBuildPlayerList();
			GameLARPProgress = [];
			GameLARPProgress.push({ Sender: P.Sender, Time: CurrentTime, RNG: P.RNG, Data: P.Data });
			GameLARPNewTurn("TurnStart");
		}

		// The turn administrator can skip turns after the delay has ran out
		if ((GameLARPStatus == "Running") && (GameLARPTurnAdmin == P.Sender) && (P.Data.GameProgress == "Skip")) {
			GameLARPProgress.push({ Sender: P.Sender, Time: CurrentTime, RNG: P.RNG, Data: P.Data });
			GameLARPNewTurn("TurnSkip");
		}

		// The current turn player can trigger an action
		if ((GameLARPStatus == "Running") && (GameLARPPlayer[GameLARPTurnPosition].MemberNumber == P.Sender) && (P.Data.GameProgress == "Action") && (P.Data.Action != null) && (P.Data.Target != null)) {

			// Before we process it, we make sure the action is valid by checking all possible options
			var Source = GameLARPGetPlayer(P.Sender);
			var Target = GameLARPGetPlayer(P.Data.Target);
			if ((Source != null) && (Target != null)) {
				var Option = GameLARPBuildOption(Source, Target);
				for (var O = 0; O < Option.length; O++)
					if (Option[O].Name == P.Data.Action) {
						GameLARPProgress.push({ Sender: P.Sender, Time: CurrentTime, RNG: P.RNG, Data: P.Data });
						GameLARPProcessAction(P.Data.Action, P.Data.Item, Source, Target, P.RNG);
						if (GameLARPContinue()) GameLARPNewTurn("TurnNext");
						return;
					}
			}

		}

	}
}