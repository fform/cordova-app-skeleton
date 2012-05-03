

View.Detail = Backbone.View.extend({
	tagName: 'div',
	className: 'view detailpage hidemove-right animated',
	transition: 'hidemove-right',
	name: "detail",

	events: {
		"click #detail-actions": "clk"
	},

	initialize: function(){
		
		_.bindAll(this,'render','clk');
		

		_.extend(this, {
			spinner: null,
			scrollers: {}
		});

		this.render();
		App.track("detail", "view", "main");
	},

	clk: function(){
		App.track("detail", "tap", "close", "button");
		$(this).trigger('close', this);
	},
	
	render: function(){
		var self = this;
		var obj = this.model.toJSON();
		
		$(this.el).html(_.template($("#template_detailview").html(), obj ));

		$("#btn-detail-close",this.el).tappable( {
			callback:function(){
				self.clk();
			}
		});

		return this;
	},

	attach: function(){
		var self = this;
		$( App.container ).append(self.el);
		_.delay(function(){ self.$el.removeClass(self.transition); });
	},

	detach: function(){
		var self = this;
		
		self.$el.addClass(self.transition).on('webkitTransitionEnd',function(){
			$(self.el).hide().detach();
		});
	}
});
