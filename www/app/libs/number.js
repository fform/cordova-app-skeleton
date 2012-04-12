function toOrdinal(m, formatting) {
	return (m + (formatting ? "<span>" : "") + ["th", "st", "nd", "rd"][(!(
	((m = m % 10) > 3) || (Math.floor(m % 100 / 10) == 1))) * m])+(formatting?"</span>":"");
}

function mysql_to_js_date(mysql_timestamp){
	var dateParts = mysql_timestamp.split(" ");
	var jsDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
	return jsDate;
}