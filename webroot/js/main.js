var tg1 = {};

function calendarFullScreen() {
	$("#calendar");
}

/** ******************************************TIMELINE_Functions************************************************ */
function loadTimeline(file) {
	var tg_actor = tg1.data("timeline");
	tg_actor.loadTimeline(file, {
		fn : function(args, data) {
			if (!data || data.length == 0) {
				return;
			}
			var id = data[0].id;
			var MED = tg_actor.getMediator();
			var active = _.indexOf(MED.activeTimelines, id);
			if (active == -1) {
				toggleTimeline(id);
			}
		},
		args : {
			display : false
		},
		seize : true
	});
}

function toggleTimeline(timelineId) {
	if (!timelineId) {
		return;
	}
	var tg_actor = tg1.data("timeline");
	var MED = tg_actor.getMediator();
	var timelines = MED.getTimelineCollection();
	if (!timelines.get(timelineId)) {
		return;
	}
	MED.toggleTimeline(timelineId);
}

function unloadTimeline(timelineId) {
	if (!timelineId) {
		return;
	}
	var tg_actor = tg1.data("timeline");
	var MED = tg_actor.getMediator();
	// remove from timeline collection
	var timelines = MED.getTimelineCollection();
	timelines.remove(timelines.get(timelineId));
	$.publish(tg1.container_name + ".mediator.timelineListChangeSignal");
	// remove from active collection
	var active = _.indexOf(MED.activeTimelines, timelineId);
	if (active != -1) {
		MED.activeTimelines.splice(active, 1);
	}
	MED.refresh();
}
