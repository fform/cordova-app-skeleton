
var WordlistIter = function (a) {
		this.a = a;
		this.i = 0;
		this.len = a.length;
	};
WordlistIter.prototype.inc = function () {
	this.i += 1;
}
WordlistIter.prototype.val = function () {
	// This class is specialized for words; if past end of array, we return
	// '~', which is greater than 'Z' (and thus, any valid word).
	return this.i >= this.len ? '~' : this.a[this.i];
}
WordlistIter.prototype.remaining = function () {
	return this.i - this.len;
}


var UndoRedo = function (limit, update) {
		this.steps = []
		this.index = 0;
		this.limit = limit;
		this.update = update;
	};
UndoRedo.prototype.add = function (undo, redo) {
	this.steps.length = this.index; // Truncate undo array at current position.
	this.steps.push({
		undo: undo,
		redo: redo
	});
	if(this.steps.length > this.limit) {
		this.steps.shift();
	}
	this.index = this.steps.length;
	this.update();
};
UndoRedo.prototype.undo = function () {
	if(this.has_undo()) {
		var v = this.steps[--this.index].undo;
		v();
		this.update();
	}
};
UndoRedo.prototype.redo = function () {
	if(this.has_redo()) {
		var v = this.steps[this.index++].redo;
		v();
		this.update();
	}
};
UndoRedo.prototype.has_undo = function () {
	return this.index > 0;
};
UndoRedo.prototype.has_redo = function () {
	return this.index < this.steps.length;
};
UndoRedo.prototype.update = function () {
	this.update();
};


var Application = (function () {
	var game, squares, tiles, selected_tile, undo;

	var UNDO_LIMIT = 100;

	var WIDTH = 320;
	var HEIGHT = 460;
	var TRANSITION_TIME = 300;	//In ms

	var DEFAULT_GAME_ID = 1;

	var is_touch_device = !! ('ontouchstart' in window);
	var CHANGING_GAME = false;
	var MOVE_COUNT = 0;
	score_check = {};
	
	var dictionaries = {};

	var cTriangleUp = '&#9650;'; // 25B2
	var cTriangleDown = '&#9660;'; // 25BC
	var cCircle = '&#9679;'; // 25CF
	var cUndo = '&#8630;'; // 21B6 - anticlockwise top semicircle arrow
	var cRedo = '&#8631;'; // 21B7 - clockwise top semicircle arrow
	var scoreAnim = [{
		color: '#f44',
		symbol: cTriangleDown
	}, // Down
	{
		color: '#fff',
		symbol: cCircle
	}, // No change
	{
		color: '#4f4',
		symbol: cTriangleUp
	} // Up
			    ];

	var boggle_score = [
		0, // 0
			0, // 1
			0, // 2
			1, // 3
			1, // 4
			2, // 5
			3, // 6
			5, // 7
			11 // 8+
			];
	var letter_values = {
		'A':2,		'B':10,		'C':6,		'D':5,
		'E':1,		'F':8,		'G':9,		'H':4,
		'I':3,		'J':12,		'K':11,		'L':6,		
		'M':7,		'N':3,		'O':2,		'P':10,		
		'Qu':13,	'R':5,		'S':4,		'T':1,		
		'U':7,		'V':12,		'W':8,		'X':12,		
		'Y':9,		'Z':13
	};

	var submitted_score = 0,
		best_s = null,
		last_score = 0,
		last_wordlist = [],
		last_wordscore = {},
		score_history = [],
		score_function, dictionary;

	var Application = function () {};
	Application._last_move = {};

	var track_times = {};


	function track(category, action, label, value) {
		if(0 || _gaq) {
			var now = (new Date()).getTime();
			if(action == 'view') {
				track_times[category] = now;
				if(category == 'main' && !track_times['swap']) {
					track_times['swap'] = now;
				}
			} else if(action == 'close' && track_times[category]) {
				value = Math.round((now - track_times[category]) / 10);
				track_times[category] = 0;
			} else if(action == 'swap') {
				value = Math.round((now - track_times['swap']) / 10);
				track_times['swap'] = now;
			}
			if(_gaq) {
				_gaq.push(['_trackEvent', category, action, label, value]);
			}
		}

		if(App.iOS() && !App.isSimulator()){
			window.plugins.TestFlight.passCheckpoint(
				function(){},function() {}, category + (action?"/"+action:"") + (label?"/"+label:"") + (value?"/"+value:"")
			);
			
		}
	}

	Application.track_it = function(category, action, label, value) {
		track(category, action, label, value);
	}
	/**
	 * Inserts commas into a number: "1234567" -> "1,234,567".
	 */
	function commafy(n) {
		n = '' + n;
		parts = []
		while(n.length > 3) {
			parts.unshift(n.substr(-3));
			n = n.slice(0, -3);
		}
		parts.unshift(n);
		return parts.join(',');
	}

	/**
	 * Creates and shows or hides an disabling div overlay.
	 */
	function disable_overlay(elt, disable_elt, click_func) {
		var $elt = $(elt);

		var $overlay = $(".ui-disable-overlay",$elt);//elt._disable_overlay
		
		
		if(disable_elt) {
			$overlay = $('<div></div>');
			$overlay.addClass('ui-disable-overlay').css({
				width: $elt.width(),
				height: $elt.height(),
				'z-index': 1000
			});
			$elt.append($overlay);
			if(click_func) {
				$overlay.on(App.touch_or_click, click_func);
			}
		} else {
			$overlay.remove();
			if(click_func) {
				$overlay.off();
			}
		}
	}

	/**
	 * For a normal move: move_tile(tile_to_move, destination_square).
	 * For an undo: move_tile(null, null, 'undo');
	 * For a redo: move_tile(null, null, 'redo');
	 */
	function move_tile(tile_a, square_or_tile_b, undo) {

		// If tile dropped on another tile, set $square_b to square under the tile.
		var $square_b;
		if(square_or_tile_b._square) {
			// square_or_tile_b is a tile
			$square_b = square_or_tile_b._square;
		} else {
			// square_or_tile_b is a square
			$square_b = square_or_tile_b._tile[0]._square;
		}

		if(undo) {
			var from_square = tile_a._square[0];
			var to_square = $square_b[0];
			if(from_square !== to_square) {
				undo.add(function () {
					move_tile(tile_a, from_square);
				}, // undo
				function () {
					move_tile(tile_a, to_square);
				}); // redo
			}
		}

		var $square_a = tile_a._square;
		var $tile_b = $square_b[0]._tile;
		var $tile_a = tile_a._square[0]._tile;

		// If the tile wasn't moved outside it's original square, just reset
		// its position.
		if(tile_a == $square_b[0]._tile[0]) {
			$tile_a.offset($square_a.offset());
		}

		$square_a[0]._tile = $tile_b;
		$tile_b[0]._square = $square_a;
		$tile_b.offset($square_a.offset());
		$square_b[0]._tile = $tile_a;
		$tile_a[0]._square = $square_b;
		$tile_a.offset($square_b.offset());

		// Update the score and save the game state after each tile swap.
		var prev_score = last_score;
		var current_score = update_score(2);
		Application.submit_score(true, current_score);
		var last_move = {
			'current_score': current_score.score,
			'tile_a': $($tile_a).data('letter'),
			'tile_b': $($tile_b).data('letter'),
			'last_score': prev_score ? prev_score : current_score
		};
		$.extend(Application._last_move, last_move);
		MOVE_COUNT += 1;
		if(game.board_type === "free" && (MOVE_COUNT==5 || MOVE_COUNT==15 || MOVE_COUNT==35)){
			App.confirm(LOCAL['promo_' + Math.ceil(Math.random()*2)], function(btn){
				if (btn === 1 || btn === true) {
					Application.track_it('upsell','click','buy',MOVE_COUNT);
					Application.show_menu();
				}else{
					Application.track_it('upsell','click','cancel',MOVE_COUNT);
				}
			}, "Wordswap","Oh yeah!,No Thanks");
		}

		Application.save_game();
	}

	function update_undo_redo() {
		$('#main-header-undobtn').attr('disabled', undo.has_undo() ? false : 'disabled');
		$('#main-header-redobtn').attr('disabled', undo.has_redo() ? false : 'disabled');
	}

	function event_extract_coords(e) {
		if(e.originalEvent && ((!e.pageX) || (typeof e.pageX !== 'number'))) {
			e = e.originalEvent;
		}
		// MobileSafari returns pageX and pageY of 0 for touchend events,
		// have to look in changedTouches array.
		if(e.pageX && typeof e.pageX === 'number' && e.pageX > 0 && e.pageY > 0) {
			return {
				type: e.type,
				pageX: e.pageX,
				pageY: e.pageY
			};
		}
		if(e.changedTouches && e.changedTouches[0]) {
			return {
				type: e.type,
				pageX: e.changedTouches[0].pageX,
				pageY: e.changedTouches[0].pageY
			};
		}

		return null;
	}

	// Initialize board.
	Application.set_game = function (igame) {
		var $board = $('#board');
		var $row;
		var irow = 0;

		game = igame;
		squares = [];
		tiles = [];
		selected_tile = null;
		submitted_score = 0;
		best_s = null;
		last_score = 0;
		last_wordlist = [];
		last_wordscore = {};
		score_history = [];

		undo = new UndoRedo(UNDO_LIMIT, update_undo_redo);
		undo.update();

		var matches = game.score_function.split('-');
		if(matches.length > 1) {
			game.score_function = matches[0];
			game.penalty_function = matches[1];
		} else {
			game.penalty_function = 'none';
		}

		score_function = score_functions[game.score_function];
		if(!score_function) {
			score_function = score_functions['boggle'];
		}

		// Load dictionary if not already loaded.
		if(!dictionaries[game.dictionary]) {
			$.ajax({
				url: 'assets/lib/js/' + game.dictionary + '.js',
				async: false,
				cache: true,
				success: function (data) { // data, textStatus, jqXHR
					dictionaries[game.dictionary] = eval(data);
				},
				dataType: 'script'
			});
		}
		dictionary = dictionaries[game.dictionary];

		var score_re = /^([A-Z]+)(\d+)$/i;

		$board.html('');
		for(var i = 0; i < game.width * game.width; i++) {
			if(i % game.width == 0) {
				if($row) {
					$board.append($row);
				}
				$row = $('<div id="row_' + irow + '"></div>');
				irow++;
			}
			var $square = $('<div id="square_' + i + '" class="square"></div>');
			squares.push($square);

			$square[0]._index = i;

			var match = score_re.exec(game.layout[i]);
			if(match) {
				if(!game.score) {
					game.score = [];
				}
				game.layout[i] = match[1];
				game.score[i] = match[2];
			}

			var $tile = $('<div id="tile_' + i + '" class="tile unselectable">' + game.layout[i] + (game.score ? '<span class="letterscore unselectable">' + game.score[i] + '</span>' : '') + '</div>');
			tiles.push($tile);

			$tile[0]._square = $square;
			$tile.data('square',$square);
			$tile[0]._letter = game.layout[i];
			$tile.data('letter',game.layout[i]);
			
			$tile[0]._score = game.score ? parseInt(game.score[i]) : 1;
			$tile.data('score',game.score ? parseInt(game.score[i]) : 1);
			$tile[0]._index = i;
			$tile.data('index',i);
			$square[0]._tile = $tile;
			$square.data('tile',$tile);

			$square.append($tile);
			$row.append($square);
		}
		$board.append($row);

		var ts; // Remember last touchstart event across all tiles.
		$('.tile').draggable({
			distance: 10,
			revert: 'invalid',
			containment: $('#board'),
			stack: '.tile',
			cursorAt: is_touch_device ? {
				//bottom: -20
			} : null
		})
		// Click event only fired if element is not dragged:
		.on('click touchend', function (e) {
			// On MobileSafari, it seems that e.target is sometimes not the .tile
			// element, but a child of it.  Look back up the DOM tree to find
			// the .tile.
			var target = $(e.target).closest('.tile')[0];
			var te = event_extract_coords(e);
			if(ts && te && te.type == 'touchend' && (Math.abs(te.pageX - ts.pageX) > 10 || Math.abs(te.pageY - ts.pageY) > 10)) {
				// On Firefox we get a click event only if there was not a
				// drag; if there was a drag the click is filtered.
				// On MobileSafari, we get a touchstart and touchend event always.
				// If we get a touchend and the element moved more than 10 pixels
				// then the draggable code will handle it, and we want to ignore it.
				$(selected_tile).removeClass('tile-selected');
				selected_tile = null;
				return;
			}
			if(selected_tile) {
				// A tile is already selected: Briefly highlight the new tile, then
				// swap the selected tile with the new one.
				var tile1 = selected_tile;
				var tile2 = target;
				$(tile2).addClass('tile-selected');
				selected_tile = null;
				setTimeout(function () {
					$(tile1).removeClass('tile-selected');
					$(tile2).removeClass('tile-selected');
					track('main', 'swap', 'tap');
					move_tile(tile1, tile2, undo);
				}, 250);
			} else {
				// No tile is selected: select.
				selected_tile = target;
				$(selected_tile).addClass('tile-selected');
			}
		}).on('touchstart', function (e) {
			ts = event_extract_coords(e);
		});

		$('.square').droppable({
			hoverClass: 'square-hover',
			drop: function (event, ui) {
				selected_tile = null;
				track('main', 'swap', 'drag');
				move_tile(ui.draggable[0], this, undo);
			}
		});

		// Set the height of the wordlist div on mobile devices.
		if(window.screen.width <= 320) {
			var $worddelta = $('#main-worddelta');
			var $worddelta_height = $(window).height() - $worddelta.position().top - 16;
			$worddelta.height($worddelta_height);
		}
	};

	// Displays game picker dialog.
	Application.show_games = function () {
		$('#select_game_tbody').html('');
		$.ajax({
			url: APIURL + '/gamelist.json',
			success: function (data) { // data, textStatus, jqXHR
				var $tbody = $('<tbody id="select_game_tbody" />');
				data['games'].forEach(function (g) {
					var $tr = $('<tr' + (g.game_id == game.id ? ' class="selected"' : '') + '><td>' + g.name + '</td><td>' + g.end_time + '</td><td class="score">' + g.high_score + '</td></tr>').on('click', function () {
						Application.change_game(g.game_id);
						$('#select_game_div').dialog('close');
					});
					$tbody.append($tr);
				});
				$('#select_game_tbody').replaceWith($tbody);
			},
			complete: function () { // jqXHR, textStatus
				$('#select_game_div').dialog({
					modal: true,
					draggable: false,
					width: 300,
					position: [5, 80]
				});
			}
		});
	};

	// Displays submit_username form.
	Application.show_submit_username = function () {
		localStorage.clear();

		$('#username-form').validate();
		$('#username-form-wrap').show();

		

		// $('#username-form-wrap').css({
		// 	top: '0',
		// 	left: '0',
		// 	'display': ''
		// }).show();
		// $('#uf_name').blur();
		// Attempt to focus the username input field.
		// I cannot get this to work on MobileSafari, which is very frustrating.
		// According to info on the web, MobileSafari does not support input
		// autofocus for usability concerns.
		//$('#uf_name').focus().select();
	};

	Application.submit_username = function () {
		$.ajax({
			type: 'POST',
			url: APIURL + '/player.json',
			data: $('#username-form').serialize(),
			success: function (data, status, jqXHR) {
				localStorage.clear();
				localStorage.setItem('player_name', data.player_name);
				localStorage.setItem('player_id', data.player_id);
				localStorage.setItem('games',JSON.stringify({}));
				//$('#username-form-div').hide();
				$('#username-form-div').CSSAnimate({top: HEIGHT, left:0}, 400, "ease-in", "all", function() {
					$('#username-form-wrap').hide();
				});
				Application.show_menu();
			},
			error: function (jqXHR, status, errorThrown) {
				$('#username-form-error').text(jqXHR.responseText).css('color', 'red');
			},
			dataType: 'json'
		});
	};

	Application.show_history = function(){
		track('history', 'view');
		disable_overlay($('#main')[0], true, Application.hide_history);

		var hislist=[],
			hisname = 'history_' + localStorage.getItem('last_game_id'),
			h = JSON.parse(localStorage.getItem(hisname) && localStorage.getItem(hisname) != "undefined" ? localStorage.getItem(hisname) : "{}");
		
		for(var j in h){
			try{
				hislist.push({
					'move':h[j].m,
					'running': h[j].s ? h[j].s : '',
					'change_points': h[j].p ? h[j].p : 0,
					'change_words': h[j].w  ? h[j].w : 0
				});
			}catch(e){
				console.log("Failed history");
			}
			
		}
		
		var html = "";
		for (var i = hislist.length - 1; i >= 0; i--) {
			html += "<li data-move='"+i+"'>" +
			"<span class='hl-abs hl-move'>" + i + "</span>" + 
			"<span class='hl-abs hl-movedesc'>" + hislist[i].move + "</span>" + 
			"<span class='hl-abs hl-running'>" + hislist[i].running + "</span>" + 
			(hislist[i].change_points >= 1 || hislist[i].change_points <= -1 ? 
			"<span class='hl-abs hl-changepoints'>" + hislist[i].change_points + " Points</span>"
			: "") +
			(hislist[i].change_words >= 1 || hislist[i].change_words <= -1 ? 
			"<span class='hl-abs hl-changewords'>" + hislist[i].change_words + " Word"+(hislist[i].change_words > 1 || hislist[i].change_words < -1 ? "s":"")+"</span>"
			: "") +
			"</li>";
		};
		$("#history-list").html(html);
		setTimeout(function () {
			App.scrollers.history.refresh();
		}, 0);

		$('#history-div').show();

		// $('#main').css({
		// 	top: '0',
		// 	left: '0'
		// }).CSSAnimate({top:0,left:-280}, 400, "ease-in", "all", function() {
			
		// });
		$("#main").css({'-webkit-transform':'translate3d(-280px, 0px, 0px)'});
	}

	Application.hide_history = function(){
		track('history', 'close');
		$('#main').css({'-webkit-transform':'translate3d(0px, 0px, 0px)'});
		setTimeout(function(){
			$('#history-div').hide();
			disable_overlay("#main", false);
		},TRANSITION_TIME);
		// $('#main').CSSAnimate({top:0,left:0}, 400, "ease-in", "all", function() {
		// 	$('#history-div').hide();
		// 	disable_overlay("#main", false);
		// });
	}

	Application.show_menu = function(){
		track('menu', 'view');
		
		Application.refresh_games();
		
		$("#menu").css({'-webkit-transform':'translate3d(0px, 0px, 0px)'}).data('isOpen',true);
		$("#menu .touched").removeClass('touched');
		$("#spinny").hide();

	}

	Application.hide_menu = function(){
		track('menu', 'hide');
		$("#menu").css({'-webkit-transform':'translate3d(0px, 460px, 0px)'}).data('isOpen',false);
		setTimeout(function(){
			//$('#menu').hide();
		},TRANSITION_TIME);
		// $('#menu').CSSAnimate({top:HEIGHT}, 400, "ease-in", "all", function() {
		// 	$('#menu').hide();
		// });
	}

	// Displays leaderboard dialog.
	Application.show_leaderboard = function () {
		track('leaderboard', 'view');
		var $main = $('#main');
		$.ajax({
			url: APIURL + '/leaderboard.json',
			data: {
				id: game.id,
				player_id: localStorage.getItem('player_id')
			},
			timeout: 2000,
			// Don't wait more than 2 seconds for leaderboard.
			cache: false,
			success: function (data) { // data, textStatus, jqXHR
				$('#leaderboard-score span').html("Highest Score: " + data.player.score);
				var lbhtml = "";
				for(var i in data.leaderboard){
					lbhtml += "<li class='"+(data.leaderboard[i].player_id === localStorage.getItem('player_id') ? 'leader-me':'')+"'>" + 
					"<span class='leader-rank'>"+ toOrdinal(Number(i)+1, true) + "</span>" +
					"<span class='leader-name'>"+ data.leaderboard[i].name + "</span>" +
					"<span class='leader-score'>"+ data.leaderboard[i].score + "</span>" +
					"<span class='leader-when'>"+ data.leaderboard[i].when + "</span>" +
					"</li>";
				}
				$('#leaderboard').html(lbhtml);
				setTimeout(function () {
					App.scrollers.leaderboard.refresh();
				}, 0);
			},
			complete: function () { // jqXHR, textStatus
				disable_overlay($main[0], true, Application.hide_leaderboard);
				$('#leaderboard-div').show();
				// $main.css({
				// 	top: '0',
				// 	left: '0'
				// }).CSSAnimate({top:0,left:280}, 400, "ease-in", "all", function() {});
				$("#main").css({'-webkit-transform':'translate3d(280px, 0px, 0px)'});
			}
		});
	};
	Application.hide_leaderboard = function () {
		track('leaderboard', 'close');
		// $('#main').CSSAnimate({top:0,left:0}, 400, "ease-in", "all", function() {
		// 	$('#leaderboard-div').hide();
		// 	disable_overlay("#main", false);
		// });
		$("#main").css({'-webkit-transform':'translate3d(0px, 0px, 0px)'});
		setTimeout(function(){
			$('#leaderboard-div').hide();
			disable_overlay("#main", false);
		},TRANSITION_TIME);
	};

	// Submits the score to the leaderboard service.
	// @param {boolean} async  Call should be made asynchronously.  Optional,
	//   default true.  Call with async false before getting leaderboard to
	//   ensure that leaderboard has the player's latest score.
	// @param {Object} s Current score.  Optional, will be calculated
	//   if it is not passed.
	Application.submit_score = function (async, s) {
		if(localStorage.getItem('player_id') === null) {
			return;
		}

		if(typeof async == 'undefined') {
			async = true;
		}
		if(typeof s == 'undefined') {
			s = update_score(0);
		}

		if((!best_s) || (best_s.score < s.score)) {
			best_s = s;
			best_p = state_rep(true);
		}


		if(submitted_score < best_s.score) {
			
			track('main', 'score', '', s.score);
			
			Application.update_game_local(localStorage.getItem('last_game_id'), {
				'score':best_s.score,
				'position':JSON.stringify(best_p)
			});
			
			$.ajax({
				type: 'POST',
				async: async,
				url: APIURL + '/position.json',
				data: {
					'id': game.id,
					'player_id': localStorage.getItem('player_id'),
					'board_id': localStorage.getItem('last_game_id'),
					'score': best_s.score,
					'position': state_rep(),
					'best_position': JSON.stringify(best_s.position)
				},
				success: function (data) {
					submitted_score = data.score;
					var s = parseInt(data.score, 10);

					$('#main-header-position').text('' + data.rank + '/' + data.total);
					if(CHANGING_GAME || MOVE_COUNT<2){
						return;
					}

						if(s >= 2500 && !score_check['seen2500']){
							App.alert(LOCAL.progress_reached_2500);
							 score_check['seen2500'] = true;
						}
						else if(s >= 2000 && s < 2500 && !score_check['seen2000']){
							App.alert(LOCAL.progress_reached_2000);
							score_check['seen2000'] = true;
						}else if(s >= 1900 && s< 2000 && !score_check['seen1900']){
							App.alert(LOCAL.progress_reached_1900);
							score_check['seen1900'] = true;
						}else if(s >= 1500 && s < 1900 && !score_check['seen1500']){
							App.alert(LOCAL.progress_reached_1500);
							score_check['seen1500'] = true;
						}else if(s >= 1000 && s < 1500 && !score_check['seen1000']){
							App.alert(LOCAL['progress_reached_1000_' + Math.ceil(Math.random()*2)]);
							score_check['seen1000'] = true;
						}else if(s >= 900 && s < 1000 && !score_check['seen900']){
							App.alert(LOCAL.progress_reached_900);
							score_check['seen900'] = true;
						}
					
					
				},
			});
		}
	};
	Application.gm = function(){
		return MOVE_COUNT;
	}

	var score_functions = {
		boggle: function (length, tile_score) {
			var l = length < boggle_score.length ? length : boggle_score.length - 1;
			return boggle_score[l];
		},
		tilescore: function (length, tile_score) {
			return tile_score;
		},
		'tilescore*length': function (length, tile_score) {
			return tile_score * length;
		}
	};

	var WORD_BEGINNING = 1,
		WORD_MIDDLE = 2,
		WORD_END = 4,
		TILE_CLASSES = ['', 'b', 'm', 'bm', 'e', 'be', 'me', 'bme'];

	/**
	 * Computes the score for all words starting at the given position and
	 * direction.
	 * @param {integer} i starting square
	 * @param {String} dir direction: 'h'=left; 'v'=down
	 * @param {Array} attrs (in/out) array of squares, indexed by position,
	 *   describing the attributes of that square.
	 *   { wordcount: int, h: horizontal_attributes, v: vertical_attributes }
	 * @returns {Array} array of words found as { word: WORD, score: WORD_SCORE }
	 */
	function update_score_word(i, dir, attrs) {
		// dir == 0: across; dir == 1: down.
		var bound = dir == 'v' ? game.width * game.width : i - (i % game.width) + game.width;
		var word = '';
		var tile_score = 0;
		var words = [];
		var increment = dir == 'v' ? game.width : 1;
		var istart = i;
		while(i < bound) {
			var letter = squares[i][0]._tile[0]._letter;
			word += letter;
			tile_score += squares[i][0]._tile[0]._score;
			var found = dictionary(word.toLowerCase());
			if(found) {
				if(word.length >= game.min_word_length) {
					words.push({
						word: word.toUpperCase(),
						score: score_function(word.length, tile_score)
					});
					for(var j = istart; j <= i; j += increment) {
						attrs[j].wordcount += 1;
						if(j == istart) {
							attrs[j][dir] |= WORD_BEGINNING;
						} else if(j <= i - increment) {
							attrs[j][dir] |= WORD_MIDDLE;
						} else {
							attrs[j][dir] |= WORD_END;
						}
					}
				}
			}
			i += increment;
		}
		return words;
	}

	function manhattan_distance(i, j) {
		var ix = i % game.width,
			iy = Math.floor(i / game.width),
			jx = j % game.width,
			jy = Math.floor(j / game.width);

		return Math.abs(jx - ix) + Math.abs(jy - iy);
	}

	/**
	 * Computes the score for a board position, updates the word list, the
	 * tile classes (which determines each tile's background sprite), and
	 * the score.
	 * @param {integer} show
	 *   0: Don't update score display (submitting score);
	 *   1: Update score display without animation (switching games);
	 *   2: Update score display with animation (after a move).
	 * @returns {Object} an object with
	 *   { score: SCORE, position: COMMA_SEPARATED_LIST_OF_TILES }
	 */
	function update_score(show) {
		var score = 0;
		var wordlist = [];
		var wordscore = {};
		var attrs = new Array(game.width * game.width);
		var words_added = [],
			words_removed = [];

		for(var i = 0; i < game.width * game.width; i++) {
			attrs[i] = {
				wordcount: 0,
				h: 0,
				v: 0
			};
		}
		// With the current scoring implementation, if the word grid constains
		// more than one instance of a word, only the highest-scoring instance
		// is counted.  The word instances can have different scores because the
		// individual scores are attached to the tiles, not the letters.
		var add_word = function (e) {
				if(!wordscore[e.word]) {
					score += e.score;
					wordscore[e.word] = e.score;
					wordlist.push(e.word);
				} else if(e.score > wordscore[e.word]) {
					score += e.score - wordscore[e.word];
					wordscore[e.word] = e.score;
				}
			};
		var gwidth = 6;
				var position = [];
				for(var i = 0; i < gwidth * gwidth; i++) {
						//position.push(squares[i][0]._tile[0]._letter);
						position.push($(squares[i]).data('tile').data('index'));
						update_score_word(i, 'h', attrs).forEach(add_word);
						update_score_word(i, 'v', attrs).forEach(add_word);
					}
		wordlist.sort();
		if(game.penalty_function == 'manhattan') {
			var penalty = 0;
			for(var i = 0; i < game.width * game.width; i++) {
				penalty += manhattan_distance(i, squares[i][0]._tile[0]._index);
			}
			score -= penalty;
		}
		if(show) {
			// Update tile classes.
			squares.forEach(function (e, i) {
				e[0]._tile
				// Remove all existing classes.
				.removeClass()
				// Add appropriate class for word beginning/middle/end.
				.addClass(function (index) {
					var classes = ['tile', 'unselectable'];
					classes.push('word-tile-' + TILE_CLASSES[attrs[i].h] + '-' + TILE_CLASSES[attrs[i].v]);
					return classes.join(' ');
				});
			});
			// Update words added/removed lists.
			
			if(show > 1) {
				var oi = new WordlistIter(last_wordlist);
				var ni = new WordlistIter(wordlist);
				while(oi.remaining() || ni.remaining()) {
					if(oi.val() == ni.val()) {
						oi.inc();
						ni.inc();
					} else if(oi.val() < ni.val()) {
						words_removed.push(oi.val());
						oi.inc();
					} else {
						words_added.push(ni.val());
						ni.inc();
					}
				}
			}
			var append_score = function (w) {
					var score = wordscore[w] || last_wordscore[w];
					return w + '<span class="score">' + score + '</span>';
				};
			$('#main-worddelta-table').html('<tr><th>Words Added (' + words_added.length + ')</th><th>Words Removed (' + words_removed.length + ')</th></tr>' + (words_added.length > 0 || words_removed.length > 0 ? '<tr><td>' + $.map(words_added, append_score).join('\n') + '</td><td>' + $.map(words_removed, append_score).join('\n') + '</td></tr>' : ''));
			// Update score in header.
			var score_string = commafy(score);
			$('#score-background').html(score_string);
			if(show > 1) {
				// Animate score up/down.
				var updown = score < last_score ? 0 : score == last_score ? 1 : 2;
				$('#score-overlay').html(score_string + scoreAnim[updown].symbol).css({
					opacity: 1,
					color: scoreAnim[updown].color
				}).animate({
					opacity: .0
				}, {
					queue: false,
					duration: 2000,
					easing: 'linear',
				});
			}
			// Update word count in header.
			$('#wordcount-background').html(wordlist.length);

		}

		var update_words = {w: (words_added.length - words_removed.length)};
		$.extend(Application._last_move, update_words);

		last_score = score;
		last_wordlist = wordlist;
		last_wordscore = wordscore;
		return {
			score: score,
			position: position
		};
	};

	/**
	 * Shows the word list.
	 */
	Application.show_wordlist = function () {
		track('wordlist', 'view');
		var formatted_wordlist = $.map(last_wordlist, function (e, i) {
			return e + '<span class="score">' + last_wordscore[e] + '</span>';
		});

		// Update word list.
		var n = Math.ceil(formatted_wordlist.length / 2);
		$('#wordlist-table-tbody').html('<tr><td>' + formatted_wordlist.slice(0, n).join('\n') + '</td><td>' + formatted_wordlist.slice(n).join('\n') + '</td></tr>');

		$('#wordlist-div').show();

		// Find the height of the wordlist table, and then slide the main
		// div up just enough to reveal it.
		var offset = $('#wordlist-table').offset();
		var $main = $('#main');
		disable_overlay($main[0], true, Application.hide_wordlist);
		$('#main-wordlist-showbtn').addClass('close');
		$main.css({
			top: '0',
			left: '0'
		}).css({'-webkit-transform':'translate3d(0px, '+(offset.top-460-14)+'px, 0px)'});
	};
	Application.hide_wordlist = function () {
		track('wordlist', 'close');
		$('#main-wordlist-showbtn').removeClass('close');
		$("#main").css({'-webkit-transform':'translate3d(0px, 0px, 0px)'});
		setTimeout(function() {
			$('#wordlist-div').hide();
			disable_overlay("#main", false);
		},TRANSITION_TIME);
	};

	/**
	 * Returns a representation of the current board state.
	 */
	function state_rep(raw) {
		var state = [];
		squares.forEach(function (e) {
			state.push(e[0]._tile[0]._index);
		});
		if(raw === true){
			return state;
		}else{
			return JSON.stringify(state);
		}
		
	}

	Application.state_scramble = function (){
		Application.track_it('history','click','scramble')
		var s = state_rep(true);
		s.sort(function(){return (Math.round(Math.random())-0.5); });
		
		state_set(JSON.stringify(s));
	}
	/**
	 * Sets the current board state.
	 * @param {String} state Target board state, as returned by state_rep().
	 */
	function state_set(new_state, undo, skip_history_save) {
		if(new_state) {
			var old_state = state_rep();
			var state;

			if(undo) {
				undo.add(function () {
					state_set(old_state);
				}, // undo
				function () {
					state_set(new_state);
				}); // redo
			}

			
			if(new_state[0] !== "["){
				new_state = "[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]";
			}
			
			state = JSON.parse(new_state);
			

			squares.forEach(function (e) {
				delete e._tile;
			});
			tiles.forEach(function (e) {
				delete e._square;
			});
			state.forEach(function (e, i) {
				var $square = $('#square_' + i);
				var $tile = tiles[e];
				$square[0]._tile = $tile;
				$tile[0]._square = $square;
				$tile.offset($square.offset());
			});
		}

		var current_score = update_score(undo ? 2 : 1);
		Application.submit_score(true, current_score);
		Application.save_game(skip_history_save);
	}

	/**
	 * Saves the current board position to local storage.
	 */
	function save_state(state_name, skip_history_save) {
		var s_rep = state_rep(true);
		localStorage.setItem('state_' + state_name, JSON.stringify(s_rep));
		var hist_store_name = 'history_' + localStorage.getItem('last_game_id');

		if(!skip_history_save){
			if(!localStorage.getItem(hist_store_name) || localStorage.getItem(hist_store_name) == "undefined"){
				localStorage.setItem(hist_store_name,"[]");
			}
			var hist = localStorage.getItem(hist_store_name),
				hist_list = JSON.parse(hist),
				letter_swap = (Application._last_move.tile_a? Application._last_move.tile_a + ' , ' + Application._last_move.tile_b : ""),
				new_item = {
					l: s_rep,
					m: letter_swap,
					p: (Application._last_move.current_score - Application._last_move.last_score),
					s: Application._last_move.current_score,
					w: Application._last_move.w
				};
			hist_list.push(new_item);
			if(hist_list.length > 100){
				hist_list.shift();
			}
		}else{
			/* TODO: Handle undo history */
		}

		localStorage.setItem(hist_store_name, JSON.stringify(hist_list));
	}

	/**
	 * Restores the board position from local storage.
	 */
	function restore_state(state_name, switching_game, saved_position) {
		if(typeof switching_game == 'undefined') {
			switching_game = false;
		}
		if(saved_position){
			state_set(saved_position, false, true);
		}else{
			state_set(localStorage.getItem('state_' + state_name), switching_game ? null : undo);
		}
		
	}

	Application.load_best_position = function(){
		var game_id = localStorage.getItem('last_game_id');
		var pos = Application.get_game_local(game_id, 'position');
		if(pos){
			state_set(pos, false, true);
		}
	}

	/**
	 * Fetches and initializes the board with a new game, asynchronously.
	 */
	Application.change_game = function (game_id) {
		// If we have an existing game, save its state.
		if(game) {
			save_state("auto_" + game.id, true);
		}

		if(!game_id) {
			game_id = DEFAULT_GAME_ID;
		}

		CHANGING_GAME = true;
		MOVE_COUNT = 0;
		score_check = {};

		$("#board").empty();
		$("#score-background").empty();
		$("#wordcount-background").empty();

		$.ajax({
			url: APIURL + '/layout.json',
			data: {
				'id': game_id,
				'player_id': localStorage.getItem('player_id')
			},
			success: function (data) {
				$("#spinny").hide();
				Application.set_game(data); // Updates game.
				localStorage.setItem('last_game_id', game_id);
				Application.update_game_local(game_id, data, true);

				restore_state("auto_" + game.id, true, data.position);
				CHANGING_GAME = false;
			},
		});
	};

	Application.update_game_local = function(game_id, val, reset){
		var g = JSON.parse(localStorage.getItem('games'));

		if(reset){
			g[game_id] = {
				'id':val.id,
				'score':val.score,
				'position':val.position
			};
		}else{
			$.extend(g[game_id],val);
		}
		
		localStorage.setItem('games',JSON.stringify(g));
	}

	Application.get_game_local = function(game_id, key){
		var g = JSON.parse(localStorage.getItem('games'));

		return (g[game_id] !== undefined ? g[game_id][key] : undefined);
		
	}

	Application.save_game = function (skip_history_save) {
		if(game) {
			save_state("auto_" + game.id, skip_history_save);
		}
	};

	Application.undo = function () {
		track('main', 'click', 'undo');
		undo.undo();

		var hist_store_name = 'history_' + localStorage.getItem('last_game_id');
		
		var hist = localStorage.getItem(hist_store_name),
			hist_list = JSON.parse(hist);

		if(hist_list.length > 100){
			hist_list.pop();
		}

		localStorage.setItem(hist_store_name, JSON.stringify(hist_list));
	};
	Application.redo = function () {
		track('main', 'click', 'redo');
		undo.redo();
	};

	Application.show_help = function (from) {
		track('help', 'view', from);
		$("#help").show();
		$("#help").css({'-webkit-transform':'translate3d(0px, 0px, 0px)'});
		setTimeout(function () {
			App.scrollers.help.refresh();
		}, 0);
	};
	Application.hide_help = function () {
		track('help', 'close');
		$("#help").css({'-webkit-transform':'translate3d(320px, 0px, 0px)'});
		setTimeout(function(){
			//$("#help").hide();
		},1000);
	};
	Application.show_rules = function () {
		
		$('#help-rules-text:hidden').slideDown();
		$("#help-rulesbtn").fadeOut();

		track('help', 'click', 'rules');
	};

	Application.show_intro = function () {
		track('intro', 'view');

		$('#intro').show().css({
			top: '0',
			left: '0'
		});

	}

	Application.reset = function () {
		localStorage.clear();
		document.location = '/';
	}

	Application.buy_game = function(game_id){

		$.ajax({
			type: 'POST',
			url: APIURL + '/newgame.json',
			data: {
				'board_id': game_id,
				'player_id': localStorage.getItem('player_id')
			},
			success: function (data, status, jqXHR) {
				track('menu', 'buy', 'success');
				Application.restore_game(game_id);
				if(data.type === 'pay'){
					App.alert("You are now a part of the " + data.name + " Tournament", function(){}, "Purchased!");
				}
				if(data.type === 'free'){
					App.alert(LOCAL.free_welcome, function(){}, "Wordswap", LOCAL.free_welcome_btn);
				}
				
				localStorage.setItem('history_' + game_id, "[]");
				Application.refresh_games();
			},
			error: function (jqXHR, status, errorThrown) {
				App.alert("Cannot purchase game " + game_id +" at this time. Try again later?");
			},
			dataType: 'json'
		});

		
	}

	Application.refresh_games = function(){
		
		$.ajax({
			type: 'GET',
			url: APIURL + '/gamelist.json',
			data: {
				'player_id': localStorage.getItem('player_id')
			},
			success: Application.refresh_games_draw,
			error: function (jqXHR, status, errorThrown) {
							},
			dataType: 'json'
		});

		
	}

	Application.refresh_games_draw = function(data){
		var html ="", playing_html="", available_html="", coming_html="",
			b_types = {'pay':"Tournament",'free':"Practice"},
			game, time_left;

		for(var i in data.games){
			game = data.games[i];
			
			if(game.status === "playing"){
				var best_local = Application.get_game_local(game.game_id, 'score');

				playing_html += 
				"<li><div class='menu-lboard active-board' data-game='"+game.game_id+"'>"+
				"<span class='lboard-abs lboard-type'>"+b_types[game.type]+" Board</span>"+
				"<span class='lboard-abs lboard-name'>"+game.name+"</span>"+
				"<span class='lboard-abs lboard-left'>"+game.time_left+" Days Left</span>"+
				"<span class='lboard-abs lboard-score-def'>Your best</span>"+
				"<span class='lboard-abs lboard-score'>"+(best_local > game.score ? best_local : game.score)+"</span>"+
				"</div></li>";
				
			}else if(game.status === "available"){
				available_html +=
				"<li><div class='menu-lboard' data-game='"+game.game_id+"'>"+
				"<span class='lboard-abs lboard-type'>"+b_types[game.type]+" Board</span>"+
				"<span class='lboard-abs lboard-name'>"+game.name+"</span>"+
				"<span class='lboard-abs lboard-description'>"+game.description+"</span>"+
				"<span class='lboard-abs lboard-left'>"+game.time_left+" Days Left</span>"+
				(game.type === 'free' ?
				"<span class='lboard-abs lboard-btn'><button class='btn-startfree' data-game='"+game.game_id+"' data-gamename='"+game.name+" "+b_types[game.type]+"'>Start Free</button></span>"
				:
				"<span class='lboard-abs lboard-btn'><button class='btn-buynow' data-game='"+game.game_id+"' data-gamename='"+game.name+" "+b_types[game.type]+"'>Buy Now $"+game.price+"</button></span>"
				)+
				"</div></li>";
			}else if(game.status === "coming"){
				var d = mysql_to_js_date(game.start_time).toLocaleDateString();
				coming_html += "<li class='menu-lsoon'>"+ game.description+", "+ game.start_time.split(' ')[0] +"</li>";
			}else if(game.status === "done"){
				/* Do something with done games eventually */
			}
		}

		html += "<li class='menu-logo'><img src='assets/img/logo_wordswap.png'/></li>" +
			(playing_html !== ""?
				"<li class='menu-lsection'>Playing</li>" +
				playing_html
			:"")+
			(available_html !== ""?
				"<li class='menu-lsection'>Now Available</li>"+
				available_html
			:"")+
			(coming_html !== ""?
				"<li class='menu-lsection'>Coming soon</li>"+
				coming_html
			:"");
		
		$("#menu ul").html(html);
		
		setTimeout(function () {
			App.scrollers.menu.refresh();
		}, 0);

	}

	Application.restore_game = function (game_id) {
		//console.log("Restore_game: " + game_id + " last:"+ localStorage.getItem('last_game_id'));
		if(game_id && game_id == localStorage.getItem('last_game_id')){
			$("#spinny").hide();
			Application.hide_menu();
			return;
		}
		
		


		var $intro = $('#intro');
		if($intro.is(':visible')) {
				$intro.CSSAnimate({top: HEIGHT, left:0}, 400, "ease-in", "all", function() {
				$intro.hide();
			});
			track('intro', 'close');
		}
		track('main', 'view', game_id);
		//If Game is still available

		if(localStorage.getItem('player_id') === null) {
			Application.show_submit_username();
			$("#spinny").hide();
		}else{
			$("#username-form-wrap").hide();
			$("#spinny").show();
			Application.change_game(game_id || localStorage.getItem('last_game_id'));
			Application.hide_menu();
		}
		
		
	}

	return Application;

})();