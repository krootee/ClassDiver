var CD = {
	savedFilter: {},

    html5Storage: {
        get: function(key) {
            return localStorage[key];
        },
        set: function(key, value) {
            localStorage[key] = value;
        }
    },

    cookieStorage: {
        get: function(key) {
            return $.cookie(key);
        },
        set: function(key, value) {
            $.cookie(key, value, { expires: 365, domain: 'www.classdiver.com', path: '/' });
        }
    },

    readFilter: function() {
		if (Modernizr.localstorage) {
            CD.storage = CD.html5Storage;
        }
        else {
            CD.storage = CD.cookieStorage;
        }

        CD.readData();
        CD.fillProviders();
        CD.fillStreams();
    },

    readData: function() {
        CD.savedFilter.hide_completed = (CD.storage.get('filter.hideCompleted') === "true");

        // If values is not present (first view of page) then we will initialize it with full list
        var selectedStreams = CD.storage.get('filter.selectedStreams');
        if (typeof selectedStreams !== "undefined" && selectedStreams !== null) {
            CD.savedFilter.streams = selectedStreams.split('|');
        }
        else {
            CD.savedFilter.streams = CDData.streams;
        }

        var selectedProviders = CD.storage.get('filter.selectedProviders');
        if (typeof selectedProviders !== "undefined" && selectedProviders !== null) {
            CD.savedFilter.providers = selectedProviders.split('|');
        }
        else {
            CD.savedFilter.providers = CDData.providers;
        }
    },

    fillProviders: function() {
        $('#providers').empty();
        $.each(CDData.providers, function(key, provider) {
            $('#providers').append('<option id="' + provider.name + '"' + (CD.isProviderSelected(provider.name) ? ' selected="selected"' : '') + '>' + provider.name + '</option>');
			$('#' + provider.name).data('color_index', provider.color);
        });
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
        $('#streams').empty();
        $.each(CDData.streams, function(key, stream) {
            $('#streams').append('<option id="' + stream + '"' + (CD.isStreamSelected(stream) ? ' selected="selected"' : '') + '>' + stream + '</option>');
        });
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

    applyFilter: function(uid) {
        var filter = {
            hide_completed: !$("#showOld").is(':checked')
        };

        // do not use .val() from dropdown - its bugged!!!
        filter.streams = $("#streams").multiselect("getChecked").map(function(){
            return this.value;
        }).get();

        filter.providers = $("#providers").multiselect("getChecked").map(function(){
            return this.value;
        }).get();

        CD.showLoadingScreen(true);
		setTimeout(function() {
			try {
				if (typeof uid != 'undefined') {
					filter.uid = uid;
				}
				VMM.fireEvent(global, VMM.Timeline.Config.events.apply_filter, filter);
			} finally {
				CD.showLoadingScreen(false);
			}
		}, 10);
        CD.saveFilter(filter);
    },

	onDataLoad: function(_dates) {
		CD.showLoadingScreen(false); 
		CD.populateSearchBox(_dates);
	},
	
    showLoadingScreen: function(show) {
        if (show) {
            $('#divLoading').show();
        } else {
            $('#divLoading').hide();
        }
    },

    saveFilter: function(filter) {
		CD.storage.set('filter.hideCompleted', filter.hide_completed);
		CD.storage.set('filter.selectedStreams', filter.streams.join('|'));
		CD.storage.set('filter.selectedProviders', filter.providers.join('|'));
        CD.savedFilter = filter;
    },

    refreshCaption: function(button) {
        button.button("option", {
			label : button.attr('checked') ? "Hide completed" : "Show completed"
		});
    },

    init: function() {
    	$('#divLogoText,#menuIndex').click(function() {
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
    },

    populateSearchBox: function(_dates) {
        var availableTags = [];

        for (var i = 0; i < _dates.length;i++) {
            if (_dates[i].asset != undefined) {

                // this is a valid course; add it to the list
                var entry = _dates[i].provider + ": " + _dates[i].headline + " (" + _dates[i].date + ") // " + _dates[i].instructors;
                
                availableTags.push({ label: entry, value: i });
            }
        }

        $( "#searchbox" ).autocomplete({
            source: availableTags,
            minLength: 2,
            delay: 50
        });

        $( "#searchbox" ).bind( "autocompleteselect", function(event, ui) {

            // ui.item.value contains the slide number
			VMM.fireEvent(global, VMM.Timeline.Config.events.go_to_event, {byUid: false, id: ui.item.value});

            // this causes the contents of the search box to be cleared; otherwise the slide number would have been shown
            $(this).val(''); return false;
        });

        $( "#searchbox" ).bind( "autocompletefocus", function(event, ui) {

            // this causes the contents of the search box to not be modified when changing focus using the keyboard
            return false;
        });

        $( "#searchbox" ).blur( function() {

            // this causes the contents of the search box to be cleared in case the search box loses focus, and nothing was selected
            $(this).val('');
        });
    },
	
	onNavigateToHidden: function(filter_delta, uid) {
		if (confirm("Change current filter settings to display item?")) {
			$("#showOld").attr("checked", !filter_delta.hide_completed);
			CD.refreshCaption($("#showOld"));

			$("#providers").find("[id='" + filter_delta.provider + "']").attr("selected", "selected");
			$("#streams").find("[id='" + filter_delta.stream + "']").attr("selected", "selected");

			$("#providers").multiselect("refresh");
			$("#streams").multiselect("refresh");

			// show dialog
			CD.applyFilter(uid);
			return true;
		}
		return false;
	}
};
