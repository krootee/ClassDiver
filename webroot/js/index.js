$(function() {
	$('#CD_text4').mouseenter(function() {
		$('#planner').effect('bounce', {
			distance : 10,
			times : 3,
			direction: 'right'
		}, 400);
	});
	$('#CD_text4').click(function() {
		window.location = 'calendar_full.html';
	});
	$('#CD_dialogabout').dialog({
		autoOpen : false,
		show : "blind",
		hide : "explode",
		closeOnEscape : true,
		position : "center",
		resizable : false,
		modal : true,
		draggable : false,
		show : "fade",
		hide : "fade",
		title : "About",
		buttons : {
			Ok : function() {
				$(this).dialog("close");
			}
		}
	});
	$('#CD_about').click(function() {
		$('#CD_dialogabout').dialog('open');
		$(".ui-dialog-titlebar").hide();
		return false;
	});
});
