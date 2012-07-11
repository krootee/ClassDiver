var CD = {
    savedFilter: {},

    readFilter: function() {
        if (Modernizr.localstorage) {
            CD.readDataFromLocalStorage();
        } else {
            CD.readDataFromCookies();
        }
        CD.fillProviders();
        CD.fillStreams();
    },

    readDataFromLocalStorage: function() {
        CD.savedFilter.hide_completed = (localStorage['filter.hideCompleted'] === "true");

        // If values is not present in localStorage (first view of page) then we will initialize it with full list
        var selectedStreams = localStorage['filter.selectedStreams'];
        if (typeof selectedStreams !== "undefined" && selectedStreams !== null) {
            CD.savedFilter.streams = selectedStreams.split('|');
        }
        else {
            CD.savedFilter.streams = CDData.streams;
        }

        var selectedProviders = localStorage['filter.selectedProviders'];
        if (typeof selectedProviders !== "undefined" && selectedProviders !== null) {
            CD.savedFilter.providers = selectedProviders.split('|');
        }
        else {
            CD.savedFilter.providers = CDData.providers;
        }
    },

    readDataFromCookies: function() {
        var hideCompleted = $.cookie("filter.hideCompleted");

        if (hideCompleted === null) {
            CD.savedFilter.hide_completed = true;
        }
        else {
            CD.savedFilter.hide_completed = hideCompleted;
        }

        // If values is not present in cookies (first view of page) then we will initialize it with full list
        var selectedStreams = $.cookie("filter.selectedStreams");
        if (selectedStreams !== null) {
            CD.savedFilter.streams = selectedStreams.split('|');
        }
        else {
            CD.savedFilter.streams = CDData.streams;
        }

        var selectedProviders = $.cookie("filter.selectedProviders");
        if (selectedProviders !== null) {
            CD.savedFilter.providers = selectedProviders.split('|');
        }
        else {
            CD.savedFilter.providers = CDData.providers;
        }
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
        filter.providers = $("#providers").multiselect("getChecked").map(function() {
            return this.id;
        }).get();

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

    showLoadingScreen: function(show) {
        if (show) {
            $('#divLoading').show();
        } else {
            $('#divLoading').hide();
        }
    },

    saveFilter: function(filter) {
        if (Modernizr.localstorage) {
            CD.saveDataToLocalStorage(filter);
        } else {
            CD.saveDataToCookies(filter);
        }
        CD.savedFilter = filter;
    },

    saveDataToLocalStorage: function(filter) {
        localStorage['filter.hideCompleted'] = filter.hide_completed;
        localStorage['filter.selectedStreams'] = filter.streams.join('|');
        localStorage['filter.selectedProviders'] = filter.providers.join('|');
    },

    saveDataToCookies: function(filter) {
        $.cookie("filter.hideCompleted", filter.hide_completed, {
            expires:365,
            domain:'www.classdiver.com',
            path:'/'
        });
        $.cookie("filter.selectedStreams", filter.streams.join('|'), {
            expires:365,
            domain:'www.classdiver.com',
            path:'/'
        });
        $.cookie("filter.selectedProviders", filter.providers.join('|'), {
            expires:365,
            domain:'www.classdiver.com',
            path:'/'
        });
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
    	$('#divLogo,#divLogoText,#menuIndex').click(function() {
    		window.location = 'index.html';
		});
        $('#showOld').button().click(function() {
            CD.applyFilter();
            CD.refreshCaption($(this));
        }).attr('checked', !CD.savedFilter.hide_completed).button("refresh");
        CD.refreshCaption($('#showOld'));

        $(window).resize(function() {
            var newHeight = $(window).height() - 118;
            if (newHeight < 650) {
                newHeight = 650;
            }
            $("#divCalendarFull").height(newHeight);
        });
        $(window).resize();

        mixpanel.track("calendar page loaded");
    }
};
