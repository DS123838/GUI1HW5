$(document).ready(function () {
    var tilePool = [];
    var playerHand = [];
    var totalScore = 0;
    var tileCounter = 0;

    // make tile pool
 
    function buildTilePool() {
        tilePool = [];
        for (var letter in ScrabbleTiles) {
            ScrabbleTiles[letter]["number-remaining"] =
                ScrabbleTiles[letter]["original-distribution"];
 
            for (var i = 0; i < ScrabbleTiles[letter]["original-distribution"]; i++) {
                tilePool.push(letter);
            }
        }
        updateTilesLeft();
    }
 
    // deal random tiles
 
    function dealFromPool(n) {
        var dealt = [];
        for (var i = 0; i < n && tilePool.length > 0; i++) {
            var idx = Math.floor(Math.random() * tilePool.length);
            dealt.push(tilePool.splice(idx, 1)[0]);
        }
        return dealt;
    }

    // render tiles
 
    function renderRack() {
        $("#rack").empty();
        for (var i = 0; i < playerHand.length; i++) {
            addTileToRack(playerHand[i]);
        }
    }
 
    function addTileToRack(letter) {
        tileCounter++;
        var imgSrc;
 
        if (letter === "_") {
            imgSrc = "graphics_data/Scrabble_Tiles/Scrabble_Tile_Blank.jpg";
        } else {
            imgSrc = "graphics_data/Scrabble_Tiles/Scrabble_Tile_" + letter + ".jpg";
        }
 
        var $tile = $("<img>")
            .attr("src", imgSrc)
            .attr("alt", letter)
            .attr("id",  "tile-" + tileCounter)
            .addClass("tile")
            .data("letter", letter)
            .data("value",  ScrabbleTiles[letter]["value"])
            .data("origin", "rack");  // track where it started
 
        // Make the tile draggable
        $tile.draggable({
            revert:    "invalid",   // snap back if dropped on a non target
            stack:     ".tile",     // keep dragged tile on top
            zIndex:    1000,
            opacity:   0.8,
            start: function (event, ui) {
                $(this).data("startParent", $(this).parent());
            }
        });
 
        $("#rack").append($tile);
    }
 
    // make tiles droppable
 
    function initDroppables() {
        $(".board-square").droppable({
            accept:     ".tile",
            hoverClass: "ui-droppable-hover",
 
            drop: function (event, ui) {
                var $square = $(this);
                var $tile   = ui.draggable;
 
                if ($square.hasClass("occupied")) {
                    $tile.draggable("option", "revert", true);
                    return;
                }
 
                var squareIndex = parseInt($square.data("index"));
                if (!isPlacementValid(squareIndex)) {
                    showMessage("Tiles must be placed next to each other!", "error");
                    $tile.draggable("option", "revert", true);
                    return;
                }
 
                $tile.draggable("option", "revert", false);
 
                // snap tile into the square
                $tile.css({ top: "", left: "", position: "" });
                $square.append($tile);
 
                // lock the tile so it can't be dragged again
                $tile.draggable("disable");
                $tile.css("cursor", "default");
 
                // mark square as occupied and store the letter
                $square.addClass("occupied");
                $square.data("placedLetter", $tile.data("letter"));
                $square.data("placedValue",  $tile.data("value"));
 
                // remove letter from playerHand
                var letterIdx = playerHand.indexOf($tile.data("letter"));
                if (letterIdx !== -1) {
                    playerHand.splice(letterIdx, 1);
                }
 
                // update display
                updateWordDisplay();
                updateWordScore();
                clearMessage();
            }
        });
    }
 
    function getOccupiedIndices() {
        var indices = [];
        $(".board-square.occupied").each(function () {
            indices.push(parseInt($(this).data("index")));
        });
        return indices;
    }
 
    function isPlacementValid(newIndex) {
        var occupied = getOccupiedIndices();
 
        // first tile is always valid
        if (occupied.length === 0) {
            return true;
        }
 
        for (var i = 0; i < occupied.length; i++) {
            if (newIndex === occupied[i] - 1 || newIndex === occupied[i] + 1) {
                return true;
            }
        }
        return false;
    }
 
    // calculate score
 
    function calculateWordScore() {
        var baseScore      = 0;
        var wordMultiplier = 1;
 
        $(".board-square.occupied").each(function () {
            var letterValue = parseInt($(this).data("placedValue")) || 0;
            var squareType  = $(this).data("type");
 
            if (squareType === "DL") {
                baseScore += letterValue * 2;
            } else if (squareType === "TL") {
                baseScore += letterValue * 3;
            } else {
                baseScore += letterValue;
            }
 
            if (squareType === "DW") { wordMultiplier *= 2; }
            if (squareType === "TW") { wordMultiplier *= 3; }
        });
 
        return baseScore * wordMultiplier;
    }
 
    function updateWordScore() {
        var score = calculateWordScore();
        $("#word-score").text(score);
    }
 
    // display words
 
    function updateWordDisplay() {
        var word = "";
        $(".board-square").each(function () {
            if ($(this).hasClass("occupied")) {
                word += $(this).data("placedLetter");
            }
        });
 
        // show blanks as underscores, everything else uppercase
        word = word.replace(/_/g, "_");
        $("#current-word").text(word.length > 0 ? word.toUpperCase() : "—");
    }
 
    // submit word
 
    $("#submit-btn").click(function () {
        var occupied = getOccupiedIndices();
 
        // must have at least one tile on the board
        if (occupied.length === 0) {
            showMessage("Place at least one tile on the board first!", "error");
            return;
        }
 
        if (!isTileGroupContiguous(occupied)) {
            showMessage("Your tiles have a gap — fix the word before submitting!", "error");
            return;
        }
 
        var wordScore = calculateWordScore();
        totalScore   += wordScore;
 
        var word = $("#current-word").text();
        showMessage("\"" + word + "\" scored " + wordScore + " points! Total: " + totalScore, "success");
 
        $("#total-score").text(totalScore);
 
        clearBoard();
 
        var needed = 7 - playerHand.length;
        if (tilePool.length > 0 && needed > 0) {
            var newTiles = dealFromPool(needed);
            playerHand   = playerHand.concat(newTiles);
        }
 
        renderRack();
        updateWordDisplay();
        updateWordScore();
        updateTilesLeft();
 
        if (tilePool.length === 0 && playerHand.length === 0) {
            showMessage("You've used all tiles! Final score: " + totalScore + ". Click New Game to play again.", "success");
        }
    });
 
    // make sure tiles in a word dont have gaps between them
    function isTileGroupContiguous(indices) {
        if (indices.length <= 1) { return true; }
        var sorted = indices.slice().sort(function (a, b) { return a - b; });
        for (var i = 1; i < sorted.length; i++) {
            if (sorted[i] !== sorted[i - 1] + 1) {
                return false;
            }
        }
        return true;
    }

    // clear board
    
    function clearBoard() {
        $(".board-square").each(function () {
            $(this).removeClass("occupied");
            $(this).removeData("placedLetter");
            $(this).removeData("placedValue");
            $(this).find(".tile").remove();
            var type = $(this).data("type");
            if (type !== "normal" && $(this).find(".square-label").length === 0) {
                var labelText = type; // "DL", "DW", "TL", "TW"
                $(this).append($("<span>").addClass("square-label").text(labelText));
            }
        });
    }
 
    // deal new tiles 

 
    $("#deal-btn").click(function () {
        // cant deal new tiles if tiles are on the board
        if (getOccupiedIndices().length > 0) {
            showMessage("Submit or clear your word before dealing new tiles!", "error");
            return;
        }
 
        if (tilePool.length === 0) {
            showMessage("No tiles left in the bag!", "error");
            return;
        }
 
        // return current hand to the pool (shuffle them back in)
        for (var i = 0; i < playerHand.length; i++) {
            tilePool.push(playerHand[i]);
        }
 
        playerHand = dealFromPool(7);
        renderRack();
        updateTilesLeft();
        showMessage("New tiles dealt!", "success");
    });
 
    // new game
 
    $("#reset-btn").click(function () {
        // confirm before restarting
        if (!confirm("Start a new game? Your current score will be lost.")) {
            return;
        }
 
        totalScore = 0;
        $("#total-score").text(0);
 
        clearBoard();
        buildTilePool();
 
        playerHand = dealFromPool(7);
        renderRack();
 
        updateWordDisplay();
        updateWordScore();
        updateTilesLeft();
        showMessage("New game started! Good luck!", "success");
    });
 
    function updateTilesLeft() {
        $("#tiles-left").text(tilePool.length);
    }
 
    function showMessage(msg, type) {
        $("#message")
            .text(msg)
            .removeClass("error success")
            .addClass(type || "");
    }
 
    function clearMessage() {
        $("#message").text("").removeClass("error success");
    }
 
    // initialize
 
    buildTilePool();
    playerHand = dealFromPool(7);
    renderRack();
    initDroppables();
    updateWordDisplay();
    updateWordScore();
 
});