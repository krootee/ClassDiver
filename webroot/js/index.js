$(function() {
	$('#CD_text4').mouseenter(function() {
		$('#CD_planner').effect('bounce', {
			distance : 10,
			times : 3,
			direction: 'right'
		}, 400);
	});
	$('#CD_text4').click(function() {
		window.location = 'calendar_full.html';
	});
});
