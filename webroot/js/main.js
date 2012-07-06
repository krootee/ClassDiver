var savedFilter = {};

function loadCoursesInfo() {
	$.getJSON('data/courses_info.json', function(data) {
		fillProviders(data);
		fillStreams(data);
	});
}

function fillProviders(data) {
	var options = [];
	$.each(data['providers'], function(key, val) {
		options.push('<option id="' + val[0] + '"' + (isProviderSelected(val[0]) ? ' selected="selected"' : '') + '>'
				+ val[0] + '(' + val[1] + ')' + '</option>');
	});
	$('#provider').empty();
	$(options.join('')).appendTo('#provider');
	$('#provider').multiselect({
		noneSelectedText : 'Select provider'
	});
	$('#provider').bind("multiselectclose", function() {
		applyFilter();
	});
}

function isProviderSelected(provider) {
	var result = false;
	if (savedFilter.providers) {
		$.each(savedFilter.providers, function(key, val) {
			if (val == provider) {
				result = true;
				return false;
			}
		});
	}
	return result;
}

function fillStreams(data) {
	var options = [];
	$.each(data['streams'], function(key, val) {
		options.push('<option id="' + val[0] + '"' + (isStreamSelected(val[0]) ? ' selected="selected"' : '') + '>'
				+ val[0] + '(' + val[1] + ')' + '</option>');
	});
	$('#stream').empty();
	$(options.join('')).appendTo('#stream');
	$('#stream').multiselect({
		noneSelectedText : 'Select stream'
	});
	$('#stream').bind("multiselectclose", function() {
		applyFilter();
	});
}

function isStreamSelected(stream) {
	var result = false;
	if (savedFilter.streams) {
		$.each(savedFilter.streams, function(key, val) {
			if (val == stream) {
				result = true;
				return false;
			}
		});
	}
	return result;
}

function applyFilter() {
	var filter = {
		hide_completed : !$("#showOld").is(':checked')
	};
	var selected_streams = $("#stream").multiselect("getChecked").map(function() {
		return this.id;
	}).get();
	if (selected_streams && selected_streams.length > 0) {
		filter.streams = selected_streams;
	}
	var selected_providers = $("#provider").multiselect("getChecked").map(function() {
		return this.id;
	}).get();
	if (selected_providers && selected_providers.length > 0) {
		filter.providers = selected_providers;
	}

	if (JSON.stringify(savedFilter) == JSON.stringify(filter)) { // order of properties in object matters
		return;
	}
	showLoadingScreen(true);
	setTimeout(function() {
		try {
			VMM.fireEvent(global, VMM.Timeline.Config.events.apply_filter, filter);	
		} finally {
			showLoadingScreen(false);
		}
	}, 10);
	
	saveFilter(filter);
	savedFilter = filter;
}

function saveFilter(filter) {
	$.cookie("classdiver.filter.showCompleted", !filter.hide_completed, {
		expires : 365,
		// domain : 'classdiver.com',
		path : '/'
	});
	if (filter.streams)
		$.cookie("classdiver.filter.selectedStreams", filter.streams.join('|'), {
			expires : 365,
			// domain : 'classdiver.com',
			path : '/'
		});
	if (filter.providers)
		$.cookie("classdiver.filter.selectedProviders", filter.providers.join('|'), {
			expires : 365,
			// domain : 'classdiver.com',
			path : '/'
		});
}

function readFilter() {
	var show_completed = $.cookie("classdiver.filter.showCompleted");
	var filter = {
		hide_completed : show_completed ? !show_completed : true
	};
	var selectedStreams = $.cookie("classdiver.filter.selectedStreams");
	if (selectedStreams) {
		filter.streams = selectedStreams.split('|');
	}
	var selectedProviders = $.cookie("classdiver.filter.selectedProviders");
	if (selectedProviders) {
		filter.providers = selectedProviders.split('|');
	}
	return filter;
}

function refreshCaption(button) {
	var options;
	if (button.attr('checked')) {
		options = {
			label : "Hide completed"
		};
	} else {
		options = {
			label : "Show completed"
		};
	}
	button.button("option", options);
}

function init() {
	$('#showOld').button().click(function() {
		applyFilter();
		refreshCaption($(this));
	}).attr('checked', !savedFilter.hide_completed).button("refresh");
	refreshCaption($('#showOld'));
	loadCoursesInfo();
	$(window).resize(function() {
		var newHeight = $(window).height() - 113;
		if (newHeight < 650) {
			newHeight = 650;
		}
		$("#divCalendarFull").height(newHeight);
	});
	$(window).resize();
	mixpanel.track("calendar page loaded");
}

function showLoadingScreen(show) {
	if (show) {
		$('#divLoading').show();
	} else {
		$('#divLoading').hide();
	}
	
}
