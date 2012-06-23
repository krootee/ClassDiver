/*jslint browser: true, eqeqeq: true, bitwise: true, newcap: true, immed: true, regexp: false */

/**
LazyLoad makes it easy and painless to lazily load one or more external
JavaScript or CSS files on demand either during or after the rendering of a web
page.

Supported browsers include Firefox 2+, IE6+, Safari 3+ (including Mobile
Safari), Google Chrome, and Opera 9+. Other browsers may or may not work and
are not officially supported.

Visit https://github.com/rgrove/lazyload/ for more info.

Copyright (c) 2011 Ryan Grove <ryan@wonko.com>
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

@module lazyload
@class LazyLoad
@static
@version 2.0.3 (git)
*/

LazyLoad = (function (doc) {
  // -- Private Variables ------------------------------------------------------

  // User agent and feature test information.
  var env,

  // Reference to the <head> element (populated lazily).
  head,

  // Requests currently in progress, if any.
  pending = {},

  // Number of times we've polled to check whether a pending stylesheet has
  // finished loading. If this gets too high, we're probably stalled.
  pollCount = 0,

  // Queued requests.
  queue = {css: [], js: []},

  // Reference to the browser's list of stylesheets.
  styleSheets = doc.styleSheets;

  // -- Private Methods --------------------------------------------------------

  /**
  Creates and returns an HTML element with the specified name and attributes.

  @method createNode
  @param {String} name element name
  @param {Object} attrs name/value mapping of element attributes
  @return {HTMLElement}
  @private
  */
  function createNode(name, attrs) {
    var node = doc.createElement(name), attr;

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        node.setAttribute(attr, attrs[attr]);
      }
    }

    return node;
  }

  /**
  Called when the current pending resource of the specified type has finished
  loading. Executes the associated callback (if any) and loads the next
  resource in the queue.

  @method finish
  @param {String} type resource type ('css' or 'js')
  @private
  */
  function finish(type) {
    var p = pending[type],
        callback,
        urls;

    if (p) {
      callback = p.callback;
      urls     = p.urls;

      urls.shift();
      pollCount = 0;

      // If this is the last of the pending URLs, execute the callback and
      // start the next request in the queue (if any).
      if (!urls.length) {
        callback && callback.call(p.context, p.obj);
        pending[type] = null;
        queue[type].length && load(type);
      }
    }
  }

  /**
  Populates the <code>env</code> variable with user agent and feature test
  information.

  @method getEnv
  @private
  */
  function getEnv() {
    var ua = navigator.userAgent;

    env = {
      // True if this browser supports disabling async mode on dynamically
      // created script nodes. See
      // http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
      async: doc.createElement('script').async === true
    };

    (env.webkit = /AppleWebKit\//.test(ua))
      || (env.ie = /MSIE/.test(ua))
      || (env.opera = /Opera/.test(ua))
      || (env.gecko = /Gecko\//.test(ua))
      || (env.unknown = true);
  }

  /**
  Loads the specified resources, or the next resource of the specified type
  in the queue if no resources are specified. If a resource of the specified
  type is already being loaded, the new request will be queued until the
  first request has been finished.

  When an array of resource URLs is specified, those URLs will be loaded in
  parallel if it is possible to do so while preserving execution order. All
  browsers support parallel loading of CSS, but only Firefox and Opera
  support parallel loading of scripts. In other browsers, scripts will be
  queued and loaded one at a time to ensure correct execution order.

  @method load
  @param {String} type resource type ('css' or 'js')
  @param {String|Array} urls (optional) URL or array of URLs to load
  @param {Function} callback (optional) callback function to execute when the
    resource is loaded
  @param {Object} obj (optional) object to pass to the callback function
  @param {Object} context (optional) if provided, the callback function will
    be executed in this object's context
  @private
  */
  function load(type, urls, callback, obj, context) {
    var _finish = function () { finish(type); },
        isCSS   = type === 'css',
        nodes   = [],
        i, len, node, p, pendingUrls, url;

    env || getEnv();

    if (urls) {
      // If urls is a string, wrap it in an array. Otherwise assume it's an
      // array and create a copy of it so modifications won't be made to the
      // original.
      urls = typeof urls === 'string' ? [urls] : urls.concat();

      // Create a request object for each URL. If multiple URLs are specified,
      // the callback will only be executed after all URLs have been loaded.
      //
      // Sadly, Firefox and Opera are the only browsers capable of loading
      // scripts in parallel while preserving execution order. In all other
      // browsers, scripts must be loaded sequentially.
      //
      // All browsers respect CSS specificity based on the order of the link
      // elements in the DOM, regardless of the order in which the stylesheets
      // are actually downloaded.
      if (isCSS || env.async || env.gecko || env.opera) {
        // Load in parallel.
        queue[type].push({
          urls    : urls,
          callback: callback,
          obj     : obj,
          context : context
        });
      } else {
        // Load sequentially.
        for (i = 0, len = urls.length; i < len; ++i) {
          queue[type].push({
            urls    : [urls[i]],
            callback: i === len - 1 ? callback : null, // callback is only added to the last URL
            obj     : obj,
            context : context
          });
        }
      }
    }

    // If a previous load request of this type is currently in progress, we'll
    // wait our turn. Otherwise, grab the next item in the queue.
    if (pending[type] || !(p = pending[type] = queue[type].shift())) {
      return;
    }

    head || (head = doc.head || doc.getElementsByTagName('head')[0]);
    pendingUrls = p.urls;

    for (i = 0, len = pendingUrls.length; i < len; ++i) {
      url = pendingUrls[i];

      if (isCSS) {
          node = env.gecko ? createNode('style') : createNode('link', {
            href: url,
            rel : 'stylesheet'
          });
      } else {
        node = createNode('script', {src: url});
        node.async = false;
      }

      node.className = 'lazyload';
      node.setAttribute('charset', 'utf-8');

      if (env.ie && !isCSS) {
        node.onreadystatechange = function () {
          if (/loaded|complete/.test(node.readyState)) {
            node.onreadystatechange = null;
            _finish();
          }
        };
      } else if (isCSS && (env.gecko || env.webkit)) {
        // Gecko and WebKit don't support the onload event on link nodes.
        if (env.webkit) {
          // In WebKit, we can poll for changes to document.styleSheets to
          // figure out when stylesheets have loaded.
          p.urls[i] = node.href; // resolve relative URLs (or polling won't work)
          pollWebKit();
        } else {
          // In Gecko, we can import the requested URL into a <style> node and
          // poll for the existence of node.sheet.cssRules. Props to Zach
          // Leatherman for calling my attention to this technique.
          node.innerHTML = '@import "' + url + '";';
          pollGecko(node);
        }
      } else {
        node.onload = node.onerror = _finish;
      }

      nodes.push(node);
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      head.appendChild(nodes[i]);
    }
  }

  /**
  Begins polling to determine when the specified stylesheet has finished loading
  in Gecko. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  Thanks to Zach Leatherman for calling my attention to the @import-based
  cross-domain technique used here, and to Oleg Slobodskoi for an earlier
  same-domain implementation. See Zach's blog for more details:
  http://www.zachleat.com/web/2010/07/29/load-css-dynamically/

  @method pollGecko
  @param {HTMLElement} node Style node to poll.
  @private
  */
  function pollGecko(node) {
    var hasRules;

    try {
      // We don't really need to store this value or ever refer to it again, but
      // if we don't store it, Closure Compiler assumes the code is useless and
      // removes it.
      hasRules = !!node.sheet.cssRules;
    } catch (ex) {
      // An exception means the stylesheet is still loading.
      pollCount += 1;

      if (pollCount < 200) {
        setTimeout(function () { pollGecko(node); }, 50);
      } else {
        // We've been polling for 10 seconds and nothing's happened. Stop
        // polling and finish the pending requests to avoid blocking further
        // requests.
        hasRules && finish('css');
      }

      return;
    }

    // If we get here, the stylesheet has loaded.
    finish('css');
  }

  /**
  Begins polling to determine when pending stylesheets have finished loading
  in WebKit. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  @method pollWebKit
  @private
  */
  function pollWebKit() {
    var css = pending.css, i;

    if (css) {
      i = styleSheets.length;

      // Look for a stylesheet matching the pending URL.
      while (--i >= 0) {
        if (styleSheets[i].href === css.urls[0]) {
          finish('css');
          break;
        }
      }

      pollCount += 1;

      if (css) {
        if (pollCount < 200) {
          setTimeout(pollWebKit, 50);
        } else {
          // We've been polling for 10 seconds and nothing's happened, which may
          // indicate that the stylesheet has been removed from the document
          // before it had a chance to load. Stop polling and finish the pending
          // request to prevent blocking further requests.
          finish('css');
        }
      }
    }
  }

  return {

    /**
    Requests the specified CSS URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified, the stylesheets will be loaded in parallel and the callback
    will be executed after all stylesheets have finished loading.

    @method css
    @param {String|Array} urls CSS URL or array of CSS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified stylesheets are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    css: function (urls, callback, obj, context) {
      load('css', urls, callback, obj, context);
    },

    /**
    Requests the specified JavaScript URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified and the browser supports it, the scripts will be loaded in
    parallel and the callback will be executed after all scripts have
    finished loading.

    Currently, only Firefox and Opera support parallel loading of scripts while
    preserving execution order. In other browsers, scripts will be
    queued and loaded one at a time to ensure correct execution order.

    @method js
    @param {String|Array} urls JS URL or array of JS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified scripts are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    js: function (urls, callback, obj, context) {
      load('js', urls, callback, obj, context);
    }

  };
})(this.document);
/*!
	VéritéCo Timeline Loader 0.61
	Designed and built by Zach Wise digitalartwork.net
	Date: May 29, 2012

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    http://www.gnu.org/licenses/

*/  

/* 	CodeKit Import
	http://incident57.com/codekit/
================================================== */
// @codekit-prepend "../lib/Embed.LoadLib.js";

var WebFontConfig;

if(typeof timeline_path == 'undefined' || typeof timeline_path == 'undefined') {
	// REPLACE WITH YOUR BASEPATH IF YOU WANT OTHERWISE IT WILL TRY AND FIGURE IT OUT
	var timeline_path = getScriptPath("timeline-embed.js").split("js/")[0];
}
function getScriptPath(scriptname) {
	var scriptTags = document.getElementsByTagName('script'),
		script_path = "";
	for(var i = 0; i < scriptTags.length; i++) {
		if (scriptTags[i].src.match(scriptname)) {
			script_path = scriptTags[i].src;
		}
	}
	return script_path.split('?')[0].split('/').slice(0, -1).join('/') + '/';
}

/* TIMELINE LOADER
================================================== */
(function() {
	
	
	/* VARS
	================================================== */
	var timelinejs, t, te, x, isCDN = false,
		timeline_js_version = "1.51",
		jquery_version_required = "1.7.1",
		jquery_version = "",
		ready = {
			timeout:	"",
			checks:		0,
			finished:	false,
			js:			false,
			css:		false,
			jquery:		false,
			has_jquery:	false,
			language:	false,
			font: {
				css:	false,
				js:		false
			}
		},
		path = {
			base:		timeline_path,
			css:		timeline_path + "css/",
			js:			timeline_path + "js/",
			locale:		timeline_path + "js/locale/",
			jquery:		"http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js",
			font: {
				google:	false,
				css:	timeline_path + "css/themes/font/",
				js:		"http://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js"
			}
		},
		embed_config = {
			version:	timeline_js_version,
			debug:		false,
			embed:		true,
			width:		'100%',
			height:		'650',
			source:		'https://docs.google.com/spreadsheet/pub?key=0Agl_Dv6iEbDadFYzRjJPUGktY0NkWXFUWkVIZDNGRHc&output=html',
			lang:		'en',
			font:		'default',
			css:		path.css + 'timeline.css?'+timeline_js_version,
			js:			path.js + 'timeline-min.js?'+timeline_js_version
		},
		font_presets = [
			{ name:	"Merriweather-NewsCycle",		google:	[ 'News+Cycle:400,700:latin', 'Merriweather:400,700,900:latin' ] },
			{ name:	"PoiretOne-Molengo",			google:	[ 'Poiret+One::latin', 'Molengo::latin' ] },
			{ name:	"Arvo-PTSans",					google:	[ 'Arvo:400,700,400italic:latin', 'PT+Sans:400,700,400italic:latin' ] },
			{ name:	"PTSerif-PTSans",				google:	[ 'PT+Sans:400,700,400italic:latin', 'PT+Serif:400,700,400italic:latin' ] },
			{ name:	"DroidSerif-DroidSans",			google:	[ 'Droid+Sans:400,700:latin', 'Droid+Serif:400,700,400italic:latin' ] },
			{ name:	"Lekton-Molengo",				google:	[ 'Lekton:400,700,400italic:latin', 'Molengo::latin' ] },
			{ name:	"NixieOne-Ledger",				google:	[ 'Nixie+One::latin', 'Ledger::latin' ] },
			{ name:	"AbrilFatface-Average",			google:	[ 'Average::latin', 'Abril+Fatface::latin' ] },
			{ name:	"PlayfairDisplay-Muli",			google:	[ 'Playfair+Display:400,400italic:latin', 'Muli:300,400,300italic,400italic:latin' ] },
			{ name:	"Rancho-Gudea",					google:	[ 'Rancho::latin', 'Gudea:400,700,400italic:latin' ] },
			{ name:	"Bevan-PotanoSans",				google:	[ 'Bevan::latin', 'Pontano+Sans::latin' ] },
			{ name:	"BreeSerif-OpenSans",			google:	[ 'Bree+Serif::latin', 'Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800:latin' ] },
			{ name:	"SansitaOne-Kameron",			google:	[ 'Sansita+One::latin', 'Kameron:400,700:latin' ] },
			{ name:	"Pacifico-Arimo",				google:	[ 'Pacifico::latin', 'Arimo:400,700,400italic,700italic:latin' ] }
		];
	
	
	/* BUILD CONFIG
	================================================== */
	if (typeof url_config == 'object') {
		embed_config.height = "100%";
		for (x in url_config) {
			if (Object.prototype.hasOwnProperty.call(url_config, x)) {
				embed_config[x] = url_config[x];
			}
		}
		if (embed_config.source.match("docs.google.com")) {
		
		} else if (embed_config.source.match("json")) {
		
		} else if (embed_config.source.match("storify")) {
		
		} else {
			embed_config.source = "https://docs.google.com/spreadsheet/pub?key=" + embed_config.source + "&output=html";
		}
		isCDN = true;
	} else if (typeof timeline_config == 'object') {
		for (x in timeline_config) {
			if (Object.prototype.hasOwnProperty.call(timeline_config, x)) {
				embed_config[x] = timeline_config[x];
			}
		}
	} else if (typeof config == 'object') {
		for (x in config) {
			if (Object.prototype.hasOwnProperty.call(config, x)) {
				embed_config[x] = config[x];
			}
		}
	}
	
	/* PREPARE LANGUAGE
	================================================== */
	if (embed_config.lang.match("/")) {
		path.locale = embed_config.lang;
	} else {
		path.locale = path.locale + embed_config.lang + ".js?" + timeline_js_version;
	}
	// Check for old installs still using the old method of language
	if (embed_config.js.match("locale")) {
		embed_config.lang = embed_config.js.split("locale/")[1].replace(".js", "");
		embed_config.js = path.js + 'timeline-min.js?'+timeline_js_version;
	}
	/* PREPARE
	================================================== */
	timeline_config = embed_config;
	createTimelineDiv();
	
	/* Load CSS
	================================================== */
	LazyLoad.css(embed_config.css, onloaded_css);
	
	/* Load FONT
	================================================== */
	if (embed_config.font == "default") {
		ready.font.js		= true;
		ready.font.css		= true;
	} else {
		// FONT CSS
		var fn;
		if (embed_config.font.match("/")) {
			fn				= embed_config.font.split(".css")[0].split("/");
			path.font.name	= fn[fn.length -1];
			path.font.css	= embed_config.font;
		} else {
			path.font.css	= path.font.css + embed_config.font + ".css?" + timeline_js_version;
		}
		LazyLoad.css(path.font.css, onloaded_font_css);
		
		// FONT GOOGLE JS
		for(var i = 0; i < font_presets.length; i++) {
			if (path.font.name == font_presets[i].name) {
				path.font.google = true;
				WebFontConfig = {google: { families: font_presets[i].google }};
			}
		}
		
		if (path.font.google) {
			LazyLoad.js(path.font.js, onloaded_font_js);
		} else {
			ready.font.js		= true;
		}
		
	}
	
	/* Load jQuery
	================================================== */
	try {
	    ready.has_jquery = jQuery;
	    ready.has_jquery = true;
		if (ready.has_jquery) {
			var jquery_version = parseFloat(jQuery.fn.jquery);
			if (jquery_version < parseFloat(jquery_version_required) ) {
				//console.log("NOT THE REQUIRED VERSION OF JQUERY, LOADING THE REQUIRED VERSION");
				//console.log("YOU HAVE VERSION " + jQuery.fn.jquery + ", JQUERY VERSION " + jquery_version_required + " OR ABOVE NEEDED");
				ready.jquery = false;
			} else {
				ready.jquery = true;
			}
		}
	} catch(err) {
	    ready.jquery = false;
	}
	if (!ready.jquery) {
		LazyLoad.js(path.jquery, onloaded_jquery);
	} else {
		onloaded_jquery();
	}
	
	/* On Loaded
	================================================== */
	
	function onloaded_jquery() {
		LazyLoad.js(embed_config.js, onloaded_js);
	}
	function onloaded_js() {
		ready.js = true;
		if (embed_config.lang != "en") {
			LazyLoad.js(path.locale, onloaded_language);
		} else {
			ready.language = true;
		}
		onloaded_check();
	}
	function onloaded_language() {
		ready.language = true;
		onloaded_check();
	}
	function onloaded_css() {
		ready.css = true;
		onloaded_check();
	}
	function onloaded_font_css() {
		ready.font.css = true;
		onloaded_check();
	}
	function onloaded_font_js() {
		ready.font.js = true;
		onloaded_check();
	}
	function onloaded_check() {
		if (ready.checks > 40) {
			return;
			alert("Error Loading Files");
		} else {
			ready.checks++;
			if (ready.js && ready.css && ready.font.css && ready.font.js && ready.language) {
				if (!ready.finished) {
					ready.finished = true;
					buildTimeline();
				}
			} else {
				ready.timeout = setTimeout('onloaded_check_again();', 250);
			}
		}
	};
	this.onloaded_check_again = function() {
		onloaded_check();
	};
	
	/* Build Timeline
	================================================== */
	function createTimelineDiv() {
		t = document.createElement('div');
		te = document.getElementById("timeline-embed");
		te.appendChild(t);
		t.setAttribute("id", 'timeline');
	
		if (embed_config.width.toString().match("%") ) {
			te.style.width = embed_config.width;
			te.setAttribute("class", "full-embed ");
			te.setAttribute("className", "full-embed "); 
		} else {
			te.setAttribute("class", " sized-embed");
			te.setAttribute("className", " sized-embed"); 
			embed_config.width = embed_config.width - 2;
			te.style.width = (embed_config.width) + 'px';
		}
	
		if (embed_config.height.toString().match("%") ) {
			te.style.height = embed_config.height;
		} else {
			embed_config.height = embed_config.height - 16;
			te.style.height = (embed_config.height) + 'px';
		}
		
		t.style.position = 'relative';
	}
	
	function buildTimeline() {
		VMM.debug = embed_config.debug;
		timelinejs = new VMM.Timeline();
		timelinejs.init(embed_config.source);
		if (isCDN) {
			VMM.bindEvent(global, onTimelineHeadline, "TIMELINE_HEADLINE");
		}
	};
	
	
	
})();