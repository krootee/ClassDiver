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
		// $('#scr' + val).mouseenter(function() {
		// if (exitHandler)
		// clearTimeout(exitHandler);
		// });
		// $('#scr' + val).mouseleave(function() {
		// exitHandler = setTimeout(function() {
		// alert("expired");
		// }, 5000);
		// });
	});
	$('#toCal').click(function() {
		window.location = 'calendar_full.html';
	});
});
