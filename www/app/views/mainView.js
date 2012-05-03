

View.Main = Backbone.View.extend({

	id: "view-main",
	className: "view animated fast",

	events: {
	},

	initialize: function(){
		
		_.bindAll(this,'render','removeView');
		
		_.extend(this, {
			spinner: null,
			scrollers: {},
			views: [],
			last_transition: ''
		});

		this.render();

		$(":not(.scrollerbox)").on('touchmove', document, function(e) {
			e.preventDefault();
		});
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
		this.fade("#spinny", turnOn);
	},

	addView: function(type, view){
		
		if( this.views[view.name] ){
			this.views[view.name].detach();
			this.views[view.name] = null;
		}
		
		this.views[view.name] = view;

		this.last_transition = type;

		$(this.el).addClass('animated ' + type);
		view.attach();
		
		
		$(view).on('close', this.removeView);
	},

	removeView: function(e){
		var view = e.currentTarget;
		if(this.last_transition){
			$(this.el).removeClass(this.last_transition);
		}
		
		view.detach();
		App.track("main", "view", "removed", view.name);
	},

	add_effect: function(target, effect){
		target.addClass(effect);
	},

	view_detail: function(company){
		
		this.addView( 'hidemove-left', new View.Detail({ sample: '123' }) );
	},

	render: function(){
		var self = this;
		$(this.el).html($("#template_mainview").html());
		$( App.container ).append(this.el);
		
  		var opts = {
		  lines: 13, length: 8, width: 4, radius: 12, rotate: 0, 
		  color: '#fff', speed: 1, trail: 60, shadow: false, 
		  hwaccel: true, className: 'spinner', zIndex: 2e9
		};

		var spin = "<div id='spinny' class='fade-out animated'></div>";
		this.spinner = new Spinner(opts).spin(spin[0]);
		$("body").append(spin);
		
		this.scrollers = {
			//main: new iScroll('main-scroll', { vScrollbar: true, hScroll: false, momentum: true ,bounce:false})
		};

		
		$("#btn-settings-open",this.el).tappable( {
			callback:function(){
				self.view_detail();
				App.track("main", "tap", "settings", "button");
			}
		});

		$("#btn-history-open",this.el).tappable( {
			callback:function(){
				self.view_history();
				App.track("main", "tap", "history", "button");
			}
		});
		
		
		return this;
	}
});
