/*
Presentz - A web library to show synchronized video + slides presentations

Copyright (C) 2012 Federico Fissore

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
(function() {
  var BlipTv, Html5Video, IFrameSlide, ImgSlide, NoSlide, Presentz, RvlIO, SlideShare, SlideShareOEmbed, SpeakerDeck, SwfSlide, Video, Vimeo, Youtube, root, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Video = (function() {
    function Video(playStates, pauseStates, finishStates, presentz) {
      this.playStates = playStates;
      this.pauseStates = pauseStates;
      this.finishStates = finishStates;
      this.presentz = presentz;
      this.isInPauseState = true;
    }

    Video.prototype.handleEvent = function(event) {
      var listener, listeners, _i, _len;

      this.isInPlayState = __indexOf.call(this.playStates, event) >= 0;
      this.isInPauseState = __indexOf.call(this.pauseStates, event) >= 0 || !this.isInPlayState;
      this.isInFinishState = __indexOf.call(this.finishStates, event) >= 0;
      if (this.isInPlayState) {
        this.presentz.startTimeChecker();
        listeners = this.presentz.listeners.play;
      } else if (this.isInPauseState || this.isInFinishState) {
        this.presentz.stopTimeChecker();
        if (this.isInPauseState) {
          listeners = this.presentz.listeners.pause;
        } else if (this.isInFinishState) {
          listeners = this.presentz.listeners.finish;
        }
      }
      if (listeners != null) {
        for (_i = 0, _len = listeners.length; _i < _len; _i++) {
          listener = listeners[_i];
          listener();
        }
      }
      if (this.isInFinishState && this.presentz.currentChapterIndex < (this.presentz.presentation.chapters.length - 1)) {
        this.presentz.changeChapter(this.presentz.currentChapterIndex + 1, 0, true);
      }
    };

    return Video;

  })();

  Html5Video = (function() {
    function Html5Video(presentz, videoContainer, width, height) {
      this.presentz = presentz;
      this.videoContainer = videoContainer;
      this.width = width;
      this.height = height;
      this.video = new Video(["play"], ["pause"], ["ended"], this.presentz);
      this.elementId = this.presentz.newElementName();
    }

    Html5Video.prototype.handle = function(video) {
      return true;
    };

    Html5Video.prototype.changeVideo = function(videoData, wouldPlay) {
      var $videoContainer, playerOptions,
        _this = this;

      this.wouldPlay = wouldPlay;
      $videoContainer = jQuery(this.videoContainer);
      $videoContainer.empty();
      $videoContainer.append("<video id=\"" + this.elementId + "\" controls preload=\"none\" src=\"" + videoData.url + "\" width=\"100%\" height=\"100%\"></video>");
      playerOptions = {
        timerRate: 500,
        success: function(me) {
          _this.onPlayerLoaded(me);
        }
      };
      new MediaElementPlayer("#" + this.elementId, playerOptions);
    };

    Html5Video.prototype.onPlayerLoaded = function(player) {
      var eventHandler,
        _this = this;

      this.player = player;
      eventHandler = function(event) {
        _this.video.handleEvent(event.type);
      };
      this.player.addEventListener("play", eventHandler, false);
      this.player.addEventListener("pause", eventHandler, false);
      this.player.addEventListener("ended", eventHandler, false);
      this.player.load();
      if (this.wouldPlay) {
        this.play();
      }
    };

    Html5Video.prototype.currentTime = function() {
      return this.player.currentTime;
    };

    Html5Video.prototype.skipTo = function(time, wouldPlay) {
      if (wouldPlay == null) {
        wouldPlay = false;
      }
      if ((this.player != null) && this.player.currentTime > 0) {
        this.player.setCurrentTime(time);
        if (wouldPlay) {
          this.play();
        }
        true;
      }
      return false;
    };

    Html5Video.prototype.play = function() {
      return this.player.play();
    };

    Html5Video.prototype.pause = function() {
      return this.player.pause();
    };

    Html5Video.prototype.isPaused = function() {
      return this.video.isInPauseState;
    };

    return Html5Video;

  })();

  Vimeo = (function() {
    function Vimeo(presentz, videoContainer, width, height) {
      this.presentz = presentz;
      this.videoContainer = videoContainer;
      this.width = width;
      this.height = height;
      this.receiveVideoInfo = __bind(this.receiveVideoInfo, this);
      this.video = new Video(["play"], ["pause"], ["finish"], this.presentz);
      this.wouldPlay = false;
      this.currentTimeInSeconds = 0.0;
      this.vimeoCallbackFunctionName = this.presentz.newElementName("callback");
      if (typeof window !== "undefined" && window !== null) {
        window[this.vimeoCallbackFunctionName] = this.receiveVideoInfo;
      }
      this.elementId = this.presentz.newElementName();
    }

    Vimeo.prototype.changeVideo = function(videoData, wouldPlay) {
      var ajaxCall;

      this.videoData = videoData;
      this.wouldPlay = wouldPlay;
      ajaxCall = {
        url: "http://vimeo.com/api/v2/video/" + (this.videoId(this.videoData)) + ".json",
        dataType: "jsonp",
        jsonpCallback: this.vimeoCallbackFunctionName
      };
      jQuery.ajax(ajaxCall);
    };

    Vimeo.prototype.videoId = function(videoData) {
      var id;

      id = videoData.url;
      id = id.substr(id.lastIndexOf("/") + 1);
      if (id.indexOf("?") !== -1) {
        id = id.substr(0, id.indexOf("?"));
      }
      return id;
    };

    Vimeo.prototype.receiveVideoInfo = function(data) {
      var iframe, movieUrl, onReady, videoHtml,
        _this = this;

      movieUrl = "http://player.vimeo.com/video/" + (this.videoId(this.videoData)) + "?api=1&player_id=" + this.elementId;
      if (jQuery("#" + this.elementId).length === 0) {
        videoHtml = "<iframe id=\"" + this.elementId + "\" src=\"" + movieUrl + "\" width=\"" + this.width + "\" height=\"" + this.height + "\" frameborder=\"0\"></iframe>";
        jQuery(this.videoContainer).append(videoHtml);
        iframe = jQuery("#" + this.elementId)[0];
        onReady = function(id) {
          _this.onReady(id);
        };
        $f(iframe).addEvent("ready", onReady);
      } else {
        iframe = jQuery("#" + this.elementId)[0];
        iframe.src = movieUrl;
      }
    };

    Vimeo.prototype.handle = function(video) {
      return video.url.toLowerCase().indexOf("//vimeo.com/") !== -1;
    };

    Vimeo.prototype.onReady = function(id) {
      var _this = this;

      this.player = $f(id);
      this.player.addEvent("play", function() {
        _this.video.handleEvent("play");
      });
      this.player.addEvent("pause", function() {
        _this.video.handleEvent("pause");
      });
      this.player.addEvent("finish", function() {
        _this.video.handleEvent("finish");
      });
      this.player.addEvent("playProgress", function(data) {
        _this.currentTimeInSeconds = data.seconds;
      });
      this.player.addEvent("loadProgress", function(data) {
        _this.loadedTimeInSeconds = parseInt(parseFloat(data.duration) * parseFloat(data.percent));
      });
      if (this.wouldPlay) {
        this.wouldPlay = false;
        this.play();
      }
    };

    Vimeo.prototype.currentTime = function() {
      return this.currentTimeInSeconds;
    };

    Vimeo.prototype.skipTo = function(time, wouldPlay) {
      if (wouldPlay == null) {
        wouldPlay = false;
      }
      if (time <= this.loadedTimeInSeconds) {
        this.player.api("seekTo", time + 2);
        if (wouldPlay) {
          this.play();
        }
        true;
      }
      return false;
    };

    Vimeo.prototype.play = function() {
      return this.player.api("play");
    };

    Vimeo.prototype.pause = function() {
      return this.player.api("pause");
    };

    Vimeo.prototype.isPaused = function() {
      return this.video.isInPauseState;
    };

    return Vimeo;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.Vimeo = Vimeo;

  Youtube = (function() {
    var IFRAME_API;

    IFRAME_API = "//www.youtube.com/iframe_api";

    function Youtube(presentz, videoContainer, width, height) {
      this.presentz = presentz;
      this.videoContainer = videoContainer;
      this.width = width;
      this.height = height;
      this.handleEvent = __bind(this.handleEvent, this);
      this.onReady = __bind(this.onReady, this);
      this.video = new Video([1], [-1, 2], [0], this.presentz);
      this.elementId = this.presentz.newElementName();
    }

    Youtube.prototype.ensureYoutubeIframeAPILoaded = function(callback) {
      var $scripts, firstScriptTag, script;

      if (jQuery("script[src=\"" + IFRAME_API + "\"]").length === 0) {
        script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = IFRAME_API;
        $scripts = jQuery("script");
        if ($scripts.length === 0) {
          jQuery(this.videoContainer)[0].appendChild(script);
        } else {
          firstScriptTag = $scripts[0];
          firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
        }
        window.onYouTubeIframeAPIReady = function() {
          return callback();
        };
      } else {
        callback();
      }
    };

    Youtube.prototype.changeVideo = function(videoData, wouldPlay) {
      var _this = this;

      this.wouldPlay = wouldPlay;
      this.ensureYoutubeIframeAPILoaded(function() {
        if (jQuery("#" + _this.elementId).length === 0) {
          jQuery(_this.videoContainer).append("<div id=\"" + _this.elementId + "\"></div>");
          _this.player = new YT.Player(_this.elementId, {
            height: _this.height,
            width: _this.width,
            videoId: _this.videoId(videoData),
            playerVars: {
              rel: 0,
              wmode: "opaque"
            },
            events: {
              onReady: _this.onReady,
              onStateChange: _this.handleEvent
            }
          });
        } else {
          _this.player.cueVideoById(_this.videoId(videoData));
        }
      });
    };

    Youtube.prototype.videoId = function(videoData) {
      var id, lowercaseUrl;

      lowercaseUrl = videoData.url.toLowerCase();
      id = videoData.url;
      if (lowercaseUrl.indexOf("//youtu.be/") !== -1) {
        id = id.substr(id.lastIndexOf("/") + 1);
        if (id.indexOf("?") !== -1) {
          id = id.substr(0, id.indexOf("?"));
        }
      } else if (lowercaseUrl.indexOf("//youtube.com/") !== -1 || lowercaseUrl.indexOf("//www.youtube.com/") !== -1) {
        id = id.substr(id.indexOf("v=") + 2);
        if (id.indexOf("&") !== -1) {
          id = id.substr(0, id.indexOf("&"));
        }
      }
      return id;
    };

    Youtube.prototype.onReady = function() {
      if (this.wouldPlay) {
        return this.play();
      }
    };

    Youtube.prototype.handleEvent = function(event) {
      this.video.handleEvent(event.data);
    };

    Youtube.prototype.handle = function(video) {
      var lowerCaseUrl;

      lowerCaseUrl = video.url.toLowerCase();
      return lowerCaseUrl.indexOf("//youtu.be/") !== -1 || lowerCaseUrl.indexOf("//youtube.com/") !== -1 || lowerCaseUrl.indexOf("//www.youtube.com/") !== -1;
    };

    Youtube.prototype.currentTime = function() {
      var _ref;

      if (((_ref = this.player) != null ? _ref.getCurrentTime : void 0) != null) {
        return this.player.getCurrentTime();
      }
      return 0;
    };

    Youtube.prototype.skipTo = function(time, wouldPlay) {
      var _ref;

      if (wouldPlay == null) {
        wouldPlay = false;
      }
      if (((_ref = this.player) != null ? _ref.seekTo : void 0) != null) {
        if (wouldPlay || this.isPaused()) {
          this.player.seekTo(time, true);
        }
        if (wouldPlay) {
          this.play();
        }
        true;
      }
      return false;
    };

    Youtube.prototype.play = function() {
      return this.player.playVideo();
    };

    Youtube.prototype.pause = function() {
      return this.player.pauseVideo();
    };

    Youtube.prototype.isPaused = function() {
      return this.video.isInPauseState;
    };

    return Youtube;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.Youtube = Youtube;

  BlipTv = (function() {
    function BlipTv(presentz, videoContainer, width, height) {
      this.presentz = presentz;
      this.video = new Html5Video(this.presentz, videoContainer, width, height);
    }

    BlipTv.prototype.changeVideo = function(videoData, wouldPlay) {
      var ajaxCall;

      this.wouldPlay = wouldPlay;
      ajaxCall = {
        url: videoData.url,
        dataType: "jsonp",
        data: "skin=json",
        jsonpCallback: "presentz.videoPlugin.receiveVideoInfo"
      };
      jQuery.ajax(ajaxCall);
    };

    BlipTv.prototype.receiveVideoInfo = function(data) {
      var fakeVideoData;

      fakeVideoData = {
        url: data[0].Post.media.url
      };
      this.video.changeVideo(fakeVideoData, this.wouldPlay);
      this.player = this.video.player;
      this.skipTo = this.video.skipTo;
    };

    BlipTv.prototype.handle = function(video) {
      return video.url.toLowerCase().indexOf("http://blip.tv") !== -1;
    };

    BlipTv.prototype.currentTime = function() {
      return this.video.currentTime();
    };

    BlipTv.prototype.skipTo = function(time, wouldPlay) {
      if (wouldPlay == null) {
        wouldPlay = false;
      }
      return this.video.skipTo(time, wouldPlay);
    };

    BlipTv.prototype.play = function() {
      return this.video.play();
    };

    BlipTv.prototype.pause = function() {
      return this.video.pause();
    };

    return BlipTv;

  })();

  ImgSlide = (function() {
    function ImgSlide(presentz, slideContainer) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.preloadedSlides = [];
    }

    ImgSlide.prototype.handle = function(slide) {
      return slide.url != null;
    };

    ImgSlide.prototype.changeSlide = function(slide) {
      var $img, $slideContainer;

      $img = jQuery("" + this.slideContainer + " img");
      if ($img.length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        $slideContainer.append("<img src=\"" + slide.url + "\"/>");
      } else {
        $img.attr("src", slide.url);
      }
    };

    ImgSlide.prototype.preload = function(slide) {
      var image, _ref;

      if ((_ref = slide.url, __indexOf.call(this.preloadedSlides, _ref) >= 0)) {
        return;
      }
      image = new Image();
      image.src = slide.url;
      this.preloadedSlides.push(slide.url);
    };

    return ImgSlide;

  })();

  SlideShare = (function() {
    function SlideShare(presentz, slideContainer, width, height) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.width = width;
      this.height = height;
      this.currentSlide = 0;
      this.elementId = this.presentz.newElementName();
      this.swfId = this.presentz.newElementName();
    }

    SlideShare.prototype.handle = function(slide) {
      if (slide.url == null) {
        return false;
      }
      return slide.url.toLowerCase().indexOf("slideshare.net") !== -1;
    };

    SlideShare.prototype.slideId = function(slide) {
      return slide.url.substr(slide.url.lastIndexOf("/") + 1, slide.url.lastIndexOf("#") - 1 - slide.url.lastIndexOf("/"));
    };

    SlideShare.prototype.slideNumber = function(slide) {
      return parseInt(slide.url.substr(slide.url.lastIndexOf("#") + 1));
    };

    SlideShare.prototype.changeSlide = function(slide) {
      var $slideContainer, $swf, atts, currentSlide, docId, flashvars, nextSlide, params, player;

      $swf = jQuery("#" + this.swfId);
      if ($swf.length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        $slideContainer.append("<div id=\"" + this.elementId + "\"></div>");
        docId = this.slideId(slide);
        params = {
          allowScriptAccess: "always",
          wmode: "opaque"
        };
        atts = {
          id: this.swfId
        };
        flashvars = {
          doc: docId,
          rel: 0
        };
        swfobject.embedSWF("http://static.slidesharecdn.com/swf/ssplayer2.swf", this.elementId, this.width, this.height, "8", null, flashvars, params, atts);
        this.currentSlide = 0;
      } else {
        player = $swf[0];
        nextSlide = this.slideNumber(slide);
        if (player.getCurrentSlide != null) {
          currentSlide = player.getCurrentSlide();
          if (nextSlide === (currentSlide + 1)) {
            player.next();
          } else {
            player.jumpTo(this.slideNumber(slide));
            this.currentSlide = player.getCurrentSlide();
          }
        }
      }
    };

    return SlideShare;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.SlideShare = SlideShare;

  SlideShareOEmbed = (function() {
    function SlideShareOEmbed(presentz, slideContainer) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.elementId = this.presentz.newElementName();
      this.preloadedSlides = [];
      this.slideInfo = {};
    }

    SlideShareOEmbed.prototype.handle = function(slide) {
      if (slide.url == null) {
        return false;
      }
      return slide.url.toLowerCase().indexOf("slideshare.net") !== -1 && (slide.public_url != null);
    };

    SlideShareOEmbed.prototype.slideNumber = function(slide) {
      return parseInt(slide.url.substr(slide.url.lastIndexOf("#") + 1));
    };

    SlideShareOEmbed.prototype.ensureSlideInfoFetched = function(slidePublicUrl, callback) {
      var _this = this;

      if (this.slideInfo[slidePublicUrl] != null) {
        return callback();
      }
      jQuery.ajax({
        url: "http://www.slideshare.net/api/oembed/2",
        data: {
          url: slidePublicUrl,
          format: "json"
        },
        dataType: "jsonp",
        success: function(slideinfo) {
          _this.slideInfo[slidePublicUrl] = slideinfo;
          return callback();
        }
      });
    };

    SlideShareOEmbed.prototype.urlOfSlide = function(slide) {
      var slideInfo;

      slideInfo = this.slideInfo[slide.public_url];
      if (slideInfo.conversion_version === 2) {
        return "" + slideInfo.slide_image_baseurl + (this.slideNumber(slide)) + slideInfo.slide_image_baseurl_suffix;
      } else {
        return "" + slideInfo.slide_image_baseurl + "-slide-" + (this.slideNumber(slide)) + slideInfo.slide_image_baseurl_suffix;
      }
    };

    SlideShareOEmbed.prototype.changeSlide = function(slide) {
      var $slideContainer,
        _this = this;

      if (jQuery("#" + this.elementId).length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        $slideContainer.append("<div id=\"" + this.elementId + "\"></div>");
      }
      this.ensureSlideInfoFetched(slide.public_url, function() {
        var $img;

        $img = jQuery("#" + _this.elementId + " img");
        if ($img.length === 0) {
          return jQuery("#" + _this.elementId).append("<img src=\"" + (_this.urlOfSlide(slide)) + "\"/>");
        } else {
          return $img.attr("src", _this.urlOfSlide(slide));
        }
      });
    };

    SlideShareOEmbed.prototype.preload = function(slide) {
      var _this = this;

      if (slide.public_url == null) {
        return;
      }
      this.ensureSlideInfoFetched(slide.public_url, function() {
        var image, url;

        url = _this.urlOfSlide(slide);
        if ((__indexOf.call(_this.preloadedSlides, url) >= 0)) {
          return;
        }
        image = new Image();
        image.src = url;
        return _this.preloadedSlides.push(url);
      });
    };

    return SlideShareOEmbed;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.SlideShareOEmbed = SlideShareOEmbed;

  SwfSlide = (function() {
    function SwfSlide(presentz, slideContainer, width, height) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.width = width;
      this.height = height;
      this.preloadedSlides = [];
      this.elementId = this.presentz.newElementName();
      this.swfId = this.presentz.newElementName();
      this.preloadSlideContainerId = this.presentz.newElementName();
      this.preloadSlideId = this.presentz.newElementName();
    }

    SwfSlide.prototype.handle = function(slide) {
      if (slide.url == null) {
        return false;
      }
      return slide.url.toLowerCase().indexOf(".swf") !== -1;
    };

    SwfSlide.prototype.changeSlide = function(slide) {
      var $slideContainer, atts, params, swfslide;

      if (jQuery("#" + this.swfId).length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        $slideContainer.append("<div id=\"" + this.elementId + "\"></div>");
        params = {
          wmode: "opaque"
        };
        atts = {
          id: this.swfId
        };
        swfobject.embedSWF(slide.url, this.elementId, this.width, this.height, "8", null, null, params, atts);
      } else {
        swfslide = jQuery("#" + this.swfId)[0];
        swfslide.data = slide.url;
      }
    };

    SwfSlide.prototype.preload = function(slide) {
      var atts, _ref,
        _this = this;

      if ((_ref = slide.url, __indexOf.call(this.preloadedSlides, _ref) >= 0)) {
        return;
      }
      jQuery("#" + this.preloadSlideId).remove();
      jQuery(this.slideContainer).append("<div id=\"" + this.preloadSlideContainerId + "\"></div>");
      atts = {
        id: "" + this.preloadSlideId,
        style: "visibility: hidden; position: absolute; margin: 0 0 0 0; top: 0;"
      };
      swfobject.embedSWF(slide.url, "" + this.preloadSlideContainerId, "1", "1", "8", null, null, null, atts, function() {
        return _this.preloadedSlides.push(slide.url);
      });
    };

    return SwfSlide;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.SwfSlide = SwfSlide;

  SpeakerDeck = (function() {
    function SpeakerDeck(presentz, slideContainer, width, height) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.width = width;
      this.height = height;
      this.currentSlide = 0;
      this.elementId = this.presentz.newElementName();
    }

    SpeakerDeck.prototype.handle = function(slide) {
      if (slide.url == null) {
        return false;
      }
      return slide.url.toLowerCase().indexOf("speakerdeck.com") !== -1;
    };

    SpeakerDeck.prototype.changeSlide = function(slide) {
      var $slideContainer, nextSlide, receiveMessage, script, slideId,
        _this = this;

      if (jQuery("" + this.slideContainer + " iframe.speakerdeck-iframe").length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        slideId = slide.url.substring(slide.url.lastIndexOf("/") + 1, slide.url.lastIndexOf("#"));
        receiveMessage = function(event) {
          var data;

          if (event.origin.indexOf("speakerdeck.com") === -1) {
            return;
          }
          _this.speakerdeckOrigin = event.origin;
          _this.speakerdeck = event.source;
          data = JSON.parse(event.data);
          if (data[0] === "change") {
            return _this.currentSlide = data[1].number;
          }    
        };
        window.addEventListener("message", receiveMessage, false);
        script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = "http://speakerdeck.com/assets/embed.js";
        script.setAttribute("class", "speakerdeck-embed");
        script.setAttribute("data-id", slideId);
        $slideContainer[0].appendChild(script);
        this.pingInterval = setInterval(function() {
          var $speakerDeckIframe;

          $speakerDeckIframe = jQuery("" + _this.slideContainer + " iframe.speakerdeck-iframe");
          if ($speakerDeckIframe.length > 0 && $speakerDeckIframe[0].contentWindow) {
            return $speakerDeckIframe[0].contentWindow.postMessage(JSON.stringify(["ping"]), "*");
          }
        }, 500);
      } else {
        if (this.speakerdeck != null) {
          nextSlide = this.slideNumber(slide);
          this.speakerdeck.postMessage(JSON.stringify(["goToSlide", nextSlide]), this.speakerdeckOrigin);
        } else {
          console.log("no speakerdeck");
        }
      }
    };

    SpeakerDeck.prototype.slideNumber = function(slide) {
      return parseInt(slide.url.substr(slide.url.lastIndexOf("#") + 1));
    };

    SpeakerDeck.prototype.slideId = function(slide) {
      return slide.url.substr(slide.url.lastIndexOf("/") + 1, slide.url.lastIndexOf("#") - 1 - slide.url.lastIndexOf("/"));
    };

    return SpeakerDeck;

  })();

  IFrameSlide = (function() {
    function IFrameSlide(presentz, slideContainer) {
      this.presentz = presentz;
      this.slideContainer = slideContainer;
      this.iframeSelector = "" + this.slideContainer + " iframe.iframe-slide-container";
    }

    IFrameSlide.prototype.handle = function(slide) {
      return slide.url != null;
    };

    IFrameSlide.prototype.changeSlide = function(slide) {
      var $iframe, $slideContainer;

      $iframe = jQuery(this.iframeSelector);
      if ($iframe.length === 0) {
        $slideContainer = jQuery(this.slideContainer);
        $slideContainer.empty();
        $slideContainer.append("<iframe frameborder=\"0\" class=\"iframe-slide-container\" src=\"" + slide.url + "\"></iframe>");
      } else {
        $iframe.attr("src", slide.url);
      }
    };

    return IFrameSlide;

  })();

  RvlIO = (function(_super) {
    __extends(RvlIO, _super);

    function RvlIO() {
      _ref = RvlIO.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    RvlIO.prototype.handle = function(slide) {
      if (slide.url == null) {
        return false;
      }
      return slide.url.toLowerCase().indexOf("rvl.io") !== -1;
    };

    return RvlIO;

  })(IFrameSlide);

  NoSlide = (function() {
    function NoSlide() {}

    NoSlide.prototype.handle = function(slide) {
      return slide.url == null;
    };

    NoSlide.prototype.changeSlide = function() {};

    return NoSlide;

  })();

  Presentz = (function() {
    var EMPTY_FUNCTION, toWidthHeight;

    EMPTY_FUNCTION = function() {};

    toWidthHeight = function(str) {
      var parts, widthHeight;

      parts = str.split("x");
      return widthHeight = {
        width: jQuery.trim(parts[0]),
        height: jQuery.trim(parts[1])
      };
    };

    function Presentz(videoContainer, videoWxH, slideContainer, slideWxH) {
      var sizeOfSlide, sizeOfVideo;

      sizeOfVideo = toWidthHeight(videoWxH);
      sizeOfSlide = toWidthHeight(slideWxH);
      this.availableVideoPlugins = {
        vimeo: new Vimeo(this, videoContainer, sizeOfVideo.width, sizeOfVideo.height),
        youtube: new Youtube(this, videoContainer, sizeOfVideo.width, sizeOfVideo.height),
        bliptv: new BlipTv(this, videoContainer, sizeOfVideo.width, sizeOfVideo.height),
        html5: new Html5Video(this, videoContainer, sizeOfVideo.width, sizeOfVideo.height)
      };
      this.availableSlidePlugins = {
        slideshare: new SlideShare(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        slideshareoembed: new SlideShareOEmbed(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        swf: new SwfSlide(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        speakerdeck: new SpeakerDeck(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        image: new ImgSlide(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        iframe: new IFrameSlide(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        rvlio: new RvlIO(this, slideContainer, sizeOfSlide.width, sizeOfSlide.height),
        none: new NoSlide()
      };
      this.videoPlugins = [this.availableVideoPlugins.vimeo, this.availableVideoPlugins.youtube, this.availableVideoPlugins.bliptv];
      this.slidePlugins = [this.availableSlidePlugins.slideshare, this.availableSlidePlugins.slideshareoembed, this.availableSlidePlugins.swf, this.availableSlidePlugins.speakerdeck, this.availableSlidePlugins.rvlio, this.availableSlidePlugins.none];
      this.defaultVideoPlugin = this.availableVideoPlugins.html5;
      this.defaultSlidePlugin = this.availableSlidePlugins.image;
      this.currentChapterIndex = -1;
      this.currentSlideIndex = -1;
      this.listeners = {
        slidechange: [],
        videochange: [],
        timechange: [],
        play: [],
        pause: [],
        finish: []
      };
      this.isSynchronized = true;
    }

    Presentz.prototype.registerVideoPlugin = function(name, plugin) {
      this.availableVideoPlugins[name] = plugin;
      this.videoPlugins.push(plugin);
    };

    Presentz.prototype.registerSlidePlugin = function(name, plugin) {
      this.availableSlidePlugins[name] = plugin;
      this.slidePlugins.push(plugin);
    };

    Presentz.prototype.init = function(presentation) {
      var chapter, slide, _i, _j, _len, _len1, _ref1, _ref2;

      this.presentation = presentation;
      if (this.intervalSet) {
        this.stopTimeChecker();
      }
      this.currentChapterIndex = -1;
      this.currentSlideIndex = -1;
      _ref1 = this.presentation.chapters;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        chapter = _ref1[_i];
        chapter.video._plugin = this.findVideoPlugin(chapter.video);
        _ref2 = chapter.slides;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          slide = _ref2[_j];
          slide._plugin = this.findSlidePlugin(slide);
        }
        if ((chapter.duration == null) && (chapter.slides != null) && chapter.slides.length > 0) {
          chapter.duration = chapter.slides[chapter.slides.length - 1].time + 5;
        }
      }
    };

    Presentz.prototype.on = function(eventType, callback) {
      return this.listeners[eventType].push(callback);
    };

    Presentz.prototype.changeChapter = function(chapterIndex, slideIndex, play, callback) {
      var listener, targetChapter, targetSlide, _i, _len, _ref1;

      if (callback == null) {
        callback = EMPTY_FUNCTION;
      }
      targetChapter = this.presentation.chapters[chapterIndex];
      if (targetChapter == null) {
        return callback("no chapter at index " + chapterIndex);
      }
      targetSlide = targetChapter.slides[slideIndex];
      if (targetSlide == null) {
        return callback("no slide at index " + slideIndex);
      }
      if (chapterIndex !== this.currentChapterIndex || (this.currentChapterIndex !== -1 && this.presentation.chapters[this.currentChapterIndex].video._plugin.skipTo(targetSlide.time, play))) {
        this.changeSlide(chapterIndex, slideIndex);
        if (chapterIndex !== this.currentChapterIndex) {
          targetChapter.video._plugin.changeVideo(targetChapter.video, play);
          targetChapter.video._plugin.skipTo(targetSlide.time, play);
          _ref1 = this.listeners.videochange;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            listener = _ref1[_i];
            listener(this.currentChapterIndex, this.currentSlideIndex, chapterIndex, slideIndex);
          }
        }
        this.currentChapterIndex = chapterIndex;
      }
      callback();
    };

    Presentz.prototype.changeSlide = function(chapterIndex, slideIndex) {
      var listener, next4Slides, nextSlide, previousSlideIndex, slide, _i, _j, _len, _len1, _ref1;

      slide = this.presentation.chapters[chapterIndex].slides[slideIndex];
      slide._plugin.changeSlide(slide);
      previousSlideIndex = this.currentSlideIndex;
      this.currentSlideIndex = slideIndex;
      next4Slides = this.presentation.chapters[chapterIndex].slides.slice(slideIndex + 1, +(slideIndex + 5) + 1 || 9e9);
      for (_i = 0, _len = next4Slides.length; _i < _len; _i++) {
        nextSlide = next4Slides[_i];
        if (nextSlide._plugin.preload != null) {
          nextSlide._plugin.preload(nextSlide);
        }
      }
      _ref1 = this.listeners.slidechange;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        listener = _ref1[_j];
        listener(this.currentChapterIndex, previousSlideIndex, chapterIndex, slideIndex);
      }
    };

    Presentz.prototype.checkSlideChange = function(currentTime) {
      var candidateSlide, listener, slide, slides, _i, _j, _len, _len1, _ref1;

      slides = this.presentation.chapters[this.currentChapterIndex].slides;
      for (_i = 0, _len = slides.length; _i < _len; _i++) {
        slide = slides[_i];
        if (slide.time <= currentTime) {
          candidateSlide = slide;
        }
      }
      if ((candidateSlide != null) && slides.indexOf(candidateSlide) !== this.currentSlideIndex) {
        this.changeSlide(this.currentChapterIndex, slides.indexOf(candidateSlide));
      }
      _ref1 = this.listeners.timechange;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        listener = _ref1[_j];
        listener(currentTime);
      }
    };

    Presentz.prototype.findVideoPlugin = function(video) {
      var plugin, plugins;

      if ((video._plugin_id != null) && (this.availableVideoPlugins[video._plugin_id] != null)) {
        return this.availableVideoPlugins[video._plugin_id];
      }
      plugins = (function() {
        var _i, _len, _ref1, _results;

        _ref1 = this.videoPlugins;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          plugin = _ref1[_i];
          if (plugin.handle(video)) {
            _results.push(plugin);
          }
        }
        return _results;
      }).call(this);
      if (plugins.length > 0) {
        return plugins[0];
      }
      return this.defaultVideoPlugin;
    };

    Presentz.prototype.findSlidePlugin = function(slide) {
      var plugin, plugins;

      if ((slide._plugin_id != null) && (this.availableSlidePlugins[slide._plugin_id] != null)) {
        return this.availableSlidePlugins[slide._plugin_id];
      }
      plugins = (function() {
        var _i, _len, _ref1, _results;

        _ref1 = this.slidePlugins;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          plugin = _ref1[_i];
          if (plugin.handle(slide)) {
            _results.push(plugin);
          }
        }
        return _results;
      }).call(this);
      if (plugins.length > 0) {
        return plugins[0];
      }
      return this.defaultSlidePlugin;
    };

    Presentz.prototype.synchronized = function(isSynchronized) {
      this.isSynchronized = isSynchronized;
      if (this.intervalSet && !this.isSynchronized) {
        this.stopTimeChecker();
      }
      if (!this.intervalSet && this.isSynchronized && !this.isPaused()) {
        return this.startTimeChecker();
      }
    };

    Presentz.prototype.startTimeChecker = function() {
      var timeChecker,
        _this = this;

      if (!this.isSynchronized) {
        return;
      }
      clearInterval(this.interval);
      this.intervalSet = true;
      timeChecker = function() {
        _this.checkState();
      };
      this.interval = setInterval(timeChecker, 500);
    };

    Presentz.prototype.stopTimeChecker = function() {
      clearInterval(this.interval);
      this.intervalSet = false;
    };

    Presentz.prototype.checkState = function() {
      if (this.currentChapterIndex !== -1) {
        this.checkSlideChange(this.presentation.chapters[this.currentChapterIndex].video._plugin.currentTime());
      }
    };

    Presentz.prototype.newElementName = function(prefix) {
      if (prefix != null) {
        return "" + prefix + "_" + (Math.round(Math.random() * 1000000));
      } else {
        return "element_" + (Math.round(Math.random() * 1000000));
      }
    };

    Presentz.prototype.pause = function() {
      if (this.currentChapterIndex !== -1) {
        return this.presentation.chapters[this.currentChapterIndex].video._plugin.pause();
      }
    };

    Presentz.prototype.isPaused = function() {
      if (this.currentChapterIndex !== -1) {
        return this.presentation.chapters[this.currentChapterIndex].video._plugin.isPaused();
      }
    };

    Presentz.prototype.play = function() {
      if (this.currentChapterIndex !== -1) {
        return this.presentation.chapters[this.currentChapterIndex].video._plugin.play();
      }
    };

    Presentz.prototype.next = function() {
      if (this.presentation.chapters[this.currentChapterIndex].slides.length > this.currentSlideIndex + 1) {
        this.changeChapter(this.currentChapterIndex, this.currentSlideIndex + 1, true);
        return true;
      }
      if (this.presentation.chapters.length > this.currentChapterIndex + 1) {
        this.changeChapter(this.currentChapterIndex + 1, 0, true);
        return true;
      }
      return false;
    };

    Presentz.prototype.previous = function() {
      if (this.currentSlideIndex - 1 >= 0) {
        this.changeChapter(this.currentChapterIndex, this.currentSlideIndex - 1, true);
        return true;
      }
      if (this.currentChapterIndex - 1 >= 0) {
        this.changeChapter(this.currentChapterIndex - 1, this.presentation.chapters[this.currentChapterIndex - 1].slides.length - 1, true);
        return true;
      }
      return false;
    };

    return Presentz;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  if (root.presentz == null) {
    root.presentz = {};
  }

  root.presentz.Presentz = Presentz;

  root.Presentz = Presentz;

}).call(this);
