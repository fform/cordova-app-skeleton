define(['text!templates/main.html', 'libs/spin', 'libs/iscroll'],
function(template_main) {

Main = Backbone.View.extend({

	el: "#container",
	events: {
	},

	initialize: function(){
		
		_.bindAll(this,'render');
		

		_.extend(this, {
			spinner: null,
			scrollers: {}
		});

		this.render();


		// $(":not(.scroll)",document).on('touchmove', function(e) {
		// 	e.preventDefault();
		// });
	},

	fade: function(selector, turnOn, callback){
		if(turnOn){
			$(selector +":not(.animated)").addClass("fade-out animated");
			$(selector).removeClass('fade-out');
		}else{
			$(selector).addClass('fade-out');
		}
		if(callback){
			$(selector).one('webkitTransitionEnd', callback);
		}
	},

	spinny: function(turnOn){
		this.fade("#spinny", turnOn, function(){
			console.log('spinny done');
		});
	},
	
	render: function(){
		var self = this;

		$(this.el).html(template_main);
		
  		var opts = {
			  lines: 13, // The number of lines to draw
			  length: 0, // The length of each line
			  width: 5, // The line thickness
			  radius: 9, // The radius of the inner circle
			  rotate: 0, // The rotation offset
			  color: '#fff', // #rgb or #rrggbb
			  speed: 1, // Rounds per second
			  trail: 60, // Afterglow percentage
			  shadow: false, // Whether to render a shadow
			  hwaccel: true, // Whether to use hardware acceleration
			  className: 'spinner', // The CSS class to assign to the spinner
			  zIndex: 2e9 // The z-index (defaults to 2000000000)
		};
		
		var spin = $("<div>").attr('id','spinny').addClass('fade-out animated');
		this.spinner = new Spinner(opts).spin(spin[0]);
		$(this.el).append(spin);

		$(".scroll").each(function(i,e){
			
			// var id = $(e).attr("id");
			// if(id){
			// 	console.log(id);
			// 	self.scrollers[id] = new iScroll(id, { vScrollbar: false, hScroll: false, momentum: true ,bounce:false});
			// }
			
		});

		this.scrollers = {
			//main: new iScroll('main-scroll', { vScrollbar: true, hScroll: false, momentum: true ,bounce:false})
		};

		tappable("#btn-main-about", {
			noScroll: true,
			onTap:function(){
				
				$("#spinny").removeClass('fade-out');
				setTimeout(function(){
					$("#spinny").addClass('fade-out');
					$("#view-main").addClass('move-flip-lr');
					$("#view-other").removeClass('move-flip-rl');
				},1000);
			}
		});
		tappable("#btn-other-close", {
			noScroll: true,
			onTap:function(){
				$("#view-main").removeClass('move-flip-lr');
				$("#view-other").addClass('move-flip-rl');
				
			}
		});
		
		/*
			//Tappable examples
			tappable('#a', function(){
				alert('tap');
			});
			tappable('#b', {
				noScroll: true,
				onTap: function(){
					alert('tap');
				}
			});
			tappable('#c', {
				noScroll: true,
				noScrollDelay: 100,
				onTap: function(){
					alert('tap');
				}
			});
			tappable('#d', {
				activeClassDelay: 100,
				inactiveClassDelay: 100,
				onTap: function(){
					alert('tap');
				}
			});
			tappable('#e', {
				noScroll: true,
				activeClassDelay: 100,
				inactiveClassDelay: 100,
				onTap: function(){
					alert('tap');
				}
			});
			tappable('#f', {
				noScroll: true,
				noScrollDelay: 100,
				activeClassDelay: 100,
				inactiveClassDelay: 100,
				onTap: function(){
					alert('tap');
				}
			});

			//Sample Confirm
			App.confirm("Do this thing?", function(btn) {
				if (btn === 1 || btn === true) {
					//Yes
				}
			}, "Title Here", "Buy,Cancel");
		*/

		return this;
	}
});

	return Main;
});
