var sections = [ 'News', 'Cal', 'About' ];
var selelctedSection = 0;
var exitHandler;
$(function() {
	$(sections).each(function(i, val) {
		$('#m' + val).mouseenter(function() {
			if (selelctedSection == i)
				return;
			var nextScreen = $('#scr' + val);
			nextScreen.css('z-index', 8);
			var nextInf = $('#inf' + val);
			nextInf.css('display', 'none');
			var selectedScreen = $('#scr' + sections[selelctedSection]);
			selelctedSection = i;
			selectedScreen.fadeOut(400, function() {
				selectedScreen.css('z-index', 1);
				selectedScreen.show();
				nextScreen.css('z-index', 9);
				nextInf.slideDown('fast');
			});
		});
	});
	$('#mNews').click(function() {
		alert("News clicked!");
	});
	$('#mCal').click(function() {
		alert("Calendar clicked!");
	});
	$('#mAbout').click(function() {
		alert("About Us clicked!");
	});
	$('#toCal').click(function() {
		window.location = 'calendar_full.html';
	});
});
