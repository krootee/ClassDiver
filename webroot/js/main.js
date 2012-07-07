var CD = {
    savedFilter: {},

    readFilter: function() {
        var hideCompleted = $.cookie("classdiver.filter.hideCompleted");

        if (hideCompleted === null) {
            CD.savedFilter.hide_completed = true;
        }
        else {
            CD.savedFilter.hide_completed = hideCompleted;
        }

        var selectedStreams = $.cookie("classdiver.filter.selectedStreams");
        if (selectedStreams) {
            CD.savedFilter.streams = selectedStreams.split('|');
        }
        else {
            // handle case when cookies are not set - initial load of page or cookies were cleared
            CD.savedFilter.streams = CDData.streams;
        }

        var selectedProviders = $.cookie("classdiver.filter.selectedProviders");
        if (selectedProviders) {
            CD.savedFilter.providers = selectedProviders.split('|');
        }
        else {
            // handle case when cookies are not set - initial load of page or cookies were cleared
            CD.savedFilter.providers = CDData.providers;
        }

        CD.fillProviders();
        CD.fillStreams();
    },

    fillProviders: function() {
        var options = [];
        $.each(CDData.providers, function(key, provider) {
            options.push('<option id="' + provider + '"' + (CD.isProviderSelected(provider) ? ' selected="selected"' : '') + '>' + provider + '</option>');
        });
        $('#providers').empty();
        $(options.join('')).appendTo('#providers');
        $('#providers').multiselect({
            noneSelectedText : 'Select providers'
        });
        $('#providers').bind("multiselectclick", CD.applyFilter)
			.bind("multiselectcheckall", CD.applyFilter)
			.bind("multiselectuncheckall", CD.applyFilter);
    },

    isProviderSelected: function(provider) {
        var result = false;
        if (CD.savedFilter.providers) {
            $.each(CD.savedFilter.providers, function(key, val) {
                if (val === provider) {
                    result = true;
                    return false;
                }
            });
        }
        return result;
    },

    fillStreams: function() {
        var options = [];
        $.each(CDData.streams, function(key, stream) {
            options.push('<option id="' + stream + '"' + (CD.isStreamSelected(stream) ? ' selected="selected"' : '') + '>' + stream + '</option>');
        });
        $('#streams').empty();
        $(options.join('')).appendTo('#streams');
        $('#streams').multiselect({
            noneSelectedText : 'Select streams'
        });
        $('#streams').bind("multiselectclick", CD.applyFilter)
				 	.bind("multiselectcheckall", CD.applyFilter)
					.bind("multiselectuncheckall", CD.applyFilter);
    },

    isStreamSelected: function(stream) {
        var result = false;
        if (CD.savedFilter.streams) {
            $.each(CD.savedFilter.streams, function(key, val) {
                if (val === stream) {
                    result = true;
                    return false;
                }
            });
        }
        return result;
    },

    applyFilter: function() {
        var filter = {
            hide_completed : !$("#showOld").is(':checked')
        };
        filter.streams = $("#streams").multiselect("getChecked").map(function() {
            return this.id;
        }).get();
//        if (selected_streams && selected_streams.length > 0) {
//            filter.streams = selected_streams;
//        }
        filter.providers = $("#providers").multiselect("getChecked").map(function() {
            return this.id;
        }).get();
//        if (selected_providers && selected_providers.length > 0) {
//            filter.providers = selected_providers;
//        }
		if (JSON.stringify(CD.savedFilter) == JSON.stringify(filter)) { // order of properties in object matters
			return;
		}
		CD.showLoadingScreen(true);
		setTimeout(function() {
			try {
				VMM.fireEvent(global, VMM.Timeline.Config.events.apply_filter, filter);
			} finally {
				CD.showLoadingScreen(false);
			}
		}, 10);
        CD.saveFilter(filter);
    },

    saveFilter: function(filter) {
        $.cookie("classdiver.filter.hideCompleted", filter.hide_completed, {
            expires : 365,
            // domain : 'classdiver.com',
            path : '/'
        });
        if (filter.streams) {
            $.cookie("classdiver.filter.selectedStreams", filter.streams.join('|'), {
                expires : 365,
                // domain : 'classdiver.com',
                path : '/'
            });
        }
        if (filter.providers) {
            $.cookie("classdiver.filter.selectedProviders", filter.providers.join('|'), {
                expires : 365,
                // domain : 'classdiver.com',
                path : '/'
            });
        }

        CD.savedFilter = filter;
    },

    refreshCaption: function(button) {
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
    },

    init: function() {
        $('#showOld').button().click(function() {
            CD.applyFilter();
            CD.refreshCaption($(this));
        }).attr('checked', !CD.savedFilter.hide_completed).button("refresh");
        CD.refreshCaption($('#showOld'));

        $(window).resize(function() {
            var newHeight = $(window).height() - 113;
            if (newHeight < 650) {
                newHeight = 650;
            }
            $("#divCalendarFull").height(newHeight);
        });
        $(window).resize();

        mixpanel.track("calendar page loaded");
    },

	showLoadingScreen: function(show) {
        if (show) {
            $('#divLoading').show();
        } else {
            $('#divLoading').hide();
        }
    
    }
};
