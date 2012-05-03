function toOrdinal(m, formatting) {
	return (m + (formatting ? "<span>" : "") + ["th", "st", "nd", "rd"][(!(
	((m = m % 10) > 3) || (Math.floor(m % 100 / 10) == 1))) * m])+(formatting?"</span>":"");
}

function mysql_to_js_date(mysql_timestamp){
	if(!mysql_timestamp) return new Date();
	// 2012-04-19 22:37:54
	var parts = mysql_timestamp.split(" ");
	var date = parts[0].split('-');
	var time = parts[1].split(':');
	var jsDate = new Date( date[0], (date[1]-1), date[2],  time[0], time[1], time[2] );
	return jsDate;
}

function format_time_from_ms(date){
	var t = date/1000,
		s = Math.floor(t) % 60,
		m = Math.floor(t / 60) % 60,
		h = Math.floor(t / 60 / 60) % 24,
		d = Math.floor(t / 60 / 60 / 24),
		w = Math.floor(d / 7),
		out = "";
		
	if(d){
		out += d + ' days ';
	}
	if(h){
		out += h + ' hours, ';
	}
	if(m){
		out += m + ' minutes, ';
	}
	if(s){
		out += s + ' seconds ';
	}

	return out;
}

function pretty_timestamp(ts){
	
	var dow = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
	var mos = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ];
	return dow[ts.getDay()] + " " + mos[ts.getMonth()] + " " + toOrdinal(ts.getDate()) + " " +
		ts.getHours()%12 + ":" + ts.getMinutes() + " " + (ts.getHours()<12 && ts.getHours()>=0 ? "am" : "pm")
}

function pretty_phone(num, pretty){
	var x = String(num).replace(/[^+0-9]/gi,''),
		a = x.substr(-10,3),
		b = x.substr(-7,3),
		c = x.substr(-4),
		out = "",
		premade = false;

	if(x[0] !== "+"){
		out += "+1";
	}else{
		out = x.substr(0, x.length-10);
	}

	if(pretty === undefined){
		return out + a + b + c;
	}

	if(x.length >= 10){
		return out + " (" + a + ") " + b +"-" + c;
	}

	throw "pretty_phone: Number is all messed up";
}