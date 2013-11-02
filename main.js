// /* Format */
if(!String.prototype.format){
  String.prototype.format = function(){
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number){
      return (args[number] !== undefined)? args[number] : match;
    });
  };
}
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var B;


var APP = {
  echo_key: '9LEZCNKDMCA88ZHJQ',
  artist: 'Daft Punk',
  title: 'Get lucky',
  song_url: '/Hackathon/songs/daftpunk_getlucky.mp3',

  modify_playback_rate: false,

  global_multiplier: 0.8,

  songs: [
  // {
  //   artist: 'Psy',
  //   title: 'Gangnam Style',
  //   url: '/Hackathon/songs/psy.mp3',
  //   buffer: null,
  //   analyze_data: null,
  //   color: 'red',
  //   image: 'helmet1.png',
  // },
  // {
  //   artist: 'Ylvis',
  //   title: 'What does the fox say',
  //   url: '/Hackathon/songs/ylvis.mp3',
  //   buffer: null,
  //   analyze_data: null,
  //   color: 'green',
  //   image: 'helmet2.png'
  //   // image: 'bedge_grunge.png'
  // },
  // {
  //   artist: 'Rebecca Black',
  //   title: 'Friday',
  //   url: '/Hackathon/songs/friday.mp3',
  //   buffer: null,
  //   analyze_data: null,
  //   color: 'blue',
  //   image: 'helmet3.png'
  // }
    // image: 'low_c  
    {
      artist: 'Daft Punk',
      title: 'Get lucky',
      url: '/Hackathon/songs/daftpunk_getlucky.mp3',
      buffer: null,
      analyze_data: null,
      color: 'red',
      image: 'helmet1.png',
    },
    {
      artist: 'Daft Punk',
      title: 'One more time',
      url: '/Hackathon/songs/daftpunk_onemoretime.mp3',
      buffer: null,
      analyze_data: null,
      color: 'green',
      image: 'helmet2.png'
      // image: 'bedge_grunge.png'
    },
    {
      artist: 'Daft Punk',
      title: 'Aerodynamic',
      url: '/Hackathon/songs/daftpunk_aerodynamic.mp3',
      buffer: null,
      analyze_data: null,
      color: 'blue',
      image: 'helmet3.png'
      // image: 'low_contrast_linen.png'
    },
    // {
    //   artist: 'Owl City',
    //   title: 'Fireflies',
    //   url: '/Hackathon/songs/owlcity_fireflies.mp3',
    //   buffer: null,
    //   analyze_data: null,
    //   color: 'blue'
    // },
    // {
    //   artist: 'Crystal Fighters',
    //   title: 'You and I',
    //   url: '/Hackathon/songs/crystalfighters_youandi.mp3',
    //   buffer: null,
    //   analyze_data: null,
    //   color: 'green'
    // }
  ],

  echo_query_url:
    'http://developer.echonest.com/api/v4/song/search?'+
    'api_key={0}&artist={1}&title={2}&results=1&bucket=audio_summary',

  audio: null,
  slices: [],
  max_slices: 15,

  canvas: null,
  ctx: null,
  audio_el: null,
  analyze_data: null,
  audio_ctx: null,
  audio_buffer: null,

  bound_update: null,
  bound_draw: null,
  last_time: null,
  animationFrame: null,

  selected_slice: null,
  selected_blob: null,

  hovered_slice: null,

  playing_slice: null,
  playing: false,

  images: {},
  image_files: [
    '/Hackathon/helmet1.png',
    '/Hackathon/helmet2.png',
    '/Hackathon/helmet3.png',
    // '/res/subtlebackgrounds/blackorchid.png',
    // '/res/subtlebackgrounds/bedge_grunge.png',
    // '/res/subtlebackgrounds/low_contrast_linen.png'
  ],

  mouse: {
    pressed: false,
    x: 0,
    y: 0,

    slice_offset_x: 0,
    slice_offset_y: 0,

    line_x: 0,
    line_y: 0
  },

  init: function() {
    this.audio_ctx = new AudioContext();

    this.canvas = $('canvas')[0];
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // this.audio = document.createElement('audio');
    // this.audio.src = this.song_url;
    // $('body').append(this.audio);

    $(this.canvas).css('display', 'none');
    this.ctx = this.canvas.getContext('2d');

    // this.fetchMetaData();

    this.bound_draw = this.draw.bind(this);

    $(window).on('mousedown', this.mouseDown);
    $(window).on('mouseup', this.mouseUp);
    $(window).on('mousemove', this.mouseMove);
    $(window).on('click', this.onClick);
    $(window).on('dblclick', this.onDblClick);
    $(window).on('keyup', function(ev) {
      if(ev.keyCode == 32)
        APP.stop();
    });
    $(window).on('contextmenu', function() {
      return false;
    });

    // this.loadSound(this.song_url, function(buffer) {
    //   APP.audio_buffer = buffer;
    // });
    
    if(window.location.search.indexOf('modify') != -1)
      APP.modify_playback_rate = true;
    

    for(var i in this.image_files) {
      var name = this.image_files[i];
      var img = new Image();
      img.src = name;
      this.images[name.substr(name.lastIndexOf('/')+1, name.lastIndexOf('.'))] = img;
    }
    
    for(var v in this.songs) {
      this.loadSong(this.songs[v]);
    }
  },

  loadSong: function(song) {
    var self = this;

    this.fetchMetaData(song.artist, song.title, function(data) {
      song.analyze_data = data;
      self.createSongSlices(song);
      if(song.buffer) {
        $('.loading').css('display', 'none');
        $(APP.canvas).css('display', 'block');
        self.requestDraw();
      }
    });
    this.loadSound(song.url, function(buffer) {
      song.buffer = buffer;
      console.log('Buffer: ' + song.artist);
      if(song.analyze_data) {
        $('.loading').css('display', 'none');
        $(APP.canvas).css('display', 'block');
        self.requestDraw();
      }
    });
  },

  fetchMetaData: function(artist, title, fn) {
    APP.info('Fetching meta data');
    $.getJSON(
      this.echo_query_url.format(this.echo_key, artist, title),
      function(track) {
        var analysisURL = track.response.songs[0].audio_summary.analysis_url;
        APP.fetchAnalyzeData(analysisURL, fn);
      }
    );
  },

  fetchAnalyzeData: function(analysisURL, fn) {
    APP.info('Fetching analyze data');
    $.getJSON(
      "http://query.yahooapis.com/v1/public/yql",
      {
        q: "select * from json where url=\"" + analysisURL + "\"",
        format: "json"
      }, function(data) {
        APP.analyzeDataReceived(data.query.results.json, fn);
    });
  },

  analyzeDataReceived: function(data, fn) {
    console.log(data);
    this.info('Analyze data received');

    // $('.loading').css('display', 'none');
    // $(this.canvas).css('display', 'block');

    this.analyze_data = data;

    fn(data);

    // this.createSlices();
    
    // this.requestDraw();
  },

  createSongSlices: function(song) {
    // var type = 'sections';
    var type = 'bars';

    this.max_slices = Math.min(this.max_slices, song.analyze_data[type].length);

    for(var i = 0; i < this.max_slices; ++i) {
      var slice = song.analyze_data[type][i];

      this.slices.push(
        new Slice(song, i, slice.start, slice.duration)
      );
    }
  },

  mouseDown: function(ev) {
    APP.mouse.pressed = true;
    APP.mouse.x = ev.pageX;
    APP.mouse.y = ev.pageY;

    if(ev.which == 3) {
      ev.preventDefault();
      APP.selected_blob = APP.getSliceFromMouse();
      if(APP.selected_blob) {
        APP.selected_blob.blob_state = 'selected';
      }
    }
    else {
      APP.selected_slice = APP.getSliceFromMouse();
      if(APP.selected_slice) {
        // APP.selected_slice.state = 'selected';

        APP.mouse.slice_offset_x = APP.mouse.x - APP.selected_slice.x;
        APP.mouse.slice_offset_y = APP.mouse.y - APP.selected_slice.y;
      }
    }

    

    // APP.requestDraw();

    return false;
  },
  mouseUp: function(ev) {
    APP.mouse.pressed = false;
    APP.mouse.x = ev.pageX;
    APP.mouse.y = ev.pageY;

    if(APP.selected_blob) {
      var slice = APP.getSliceFromMouse();

      if(slice) {
        APP.selected_blob.connectTo(slice);
      }

      APP.selected_blob.blob_state = 'none';
      APP.selected_blob = null;
    }

    if(APP.selected_slice) {
      // APP.selected_slice.state = 'none';
      APP.selected_slice = null;
    }
  },
  mouseMove: function(ev) {
    APP.mouse.x = ev.pageX;
    APP.mouse.y = ev.pageY;

    if(APP.mouse.pressed) {
      APP.mouseDrag();
    } else {
      APP.checkHover();
    }
  },
  onDblClick: function(ev) {
    APP.mouse.x = ev.pageX;
    APP.mouse.y = ev.pageY;

    var slice = APP.getSliceFromMouse();

    if(slice) {
      APP.stop();
      APP.play(slice);
    }
  },
  onClick: function(ev) {
    APP.mouse.x = ev.pageX;
    APP.mouse.y = ev.pageY;

    if(ev.which == 2) {
      var slice = APP.getSliceFromMouse();

      slice.removeConnections();
    }
  },

  getSliceFromMouse: function() {
    return this.getSliceFromPoint(this.mouse.x, this.mouse.y);
  },
  getSliceFromPoint: function(x, y) {
    // For each slice in this.slices
    for(var slice_n = 0, slice_len = this.slices.length; slice_n < slice_len; ++slice_n){
      var slice = this.slices[slice_n];
      if(slice.pointInside(x, y)) {
        return slice;
      }
    }
    return null;
  },

  getBlobSliceFromMouse: function() {
    return this.getBlobSliceFromPoint(this.mouse.x, this.mouse.y);
  },
  getBlobSliceFromPoint: function(x, y) {
    // For each slice in this.slices
    for(var slice_n = 0, slice_len = this.slices.length; slice_n < slice_len; ++slice_n){
      var slice = this.slices[slice_n];
      
      if(slice.pointInsideBlob(x, y)) {
        return slice;
      }

    }
    return null;
  },

  mouseDrag: function() {
    if(this.selected_blob) {
      this.dragLineFromBlob();
    }
    else if(this.selected_slice) {
      this.dragSlice();
    }
  },

  dragSlice: function() {
    this.selected_slice.x = this.mouse.x - this.mouse.slice_offset_x;
    this.selected_slice.y = this.mouse.y - this.mouse.slice_offset_y;
  },
  dragLineFromBlob: function() {
  },

  checkHover: function() {
    this.slices.forEach(function(t) {
      // if(t.state === 'hovered')
      //   t.state = 'none';
      // if(t.blob_state === 'hovered')
      //   t.blob_state = 'none';
    });

    var t = this.getBlobSliceFromMouse();

    if(t && t.blob_state != 'selected')
      t.blob_state = 'hovered';

    if(!t) {
      t = this.getSliceFromMouse();

      if(this.hovered_slice && t !== this.hovered_slice) {
        this.hovered_slice.stopHover();
        this.hovered_slice = null;
      }

      if(t) {
        t.startHover();
        this.hovered_slice = t;
      }
    }
    else {
      if(this.hovered_slice) {
        this.hovered_slice.stopHover();
        this.hovered_slice = null;
      }
    }

    // this.requestDraw();
  },

  requestDraw: function() {
    if(this.animationFrame)
      return;

    this.animationFrame = requestAnimationFrame(this.bound_draw);
  },

  play: function(slice) {
    var first;
    if(!slice) {
      slice = null;
      // For each slice in this.slices
      for(var slice_n = 0, slice_len = this.slices.length; slice_n < slice_len; ++slice_n){
        var t_slice = this.slices[slice_n];
        
        if(t_slice.hasConnections()) {
          slice = t_slice;
          break;
        }
      }
    }
    

    function f(){
      if(!this.playing)
        return;

      slice = slice.getNextConnection();
      if(slice) {
        this.playing_slice = slice;
        slice.play(callback);
      }
      else {
        this.playing = false;
      }
    }
    var callback = f.bind(this);

    if(slice) {
      if(this.hovered_slice) {
        this.hovered_slice.stopPreview();
      }

      this.playing = true;
      this.playing_slice = slice;
      slice.play(callback);
    }
  },
  stop: function() {
    this.playing = false;
    if(this.playing_slice)
      this.playing_slice.stop();
  },

  draw: function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw line
    if(this.selected_blob) {
      this.ctx.beginPath();

      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 3;
      var blob_pos = this.selected_blob.getBlobCenter();
      this.ctx.moveTo(blob_pos[0], blob_pos[1]);
      this.ctx.lineTo(this.mouse.x, this.mouse.y);
      this.ctx.stroke();
    }

    // For each slice in this.slices
    for(slice_n = 0, slice_len = this.slices.length; slice_n < slice_len; ++slice_n){
      var slice = this.slices[slice_n];
      
      slice.drawConnections(this.ctx);
    }

    // For each slice in this.slices
    for(var slice_n = 0, slice_len = this.slices.length; slice_n < slice_len; ++slice_n){
      var slice = this.slices[slice_n];
      
      slice.draw(this.ctx);
    }


    

    this.animationFrame = null;

    this.requestDraw();
  },

  info: function(message) {
    $('#info').html(message);
  },

  loadSound: function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(){
      APP.audio_ctx.decodeAudioData(xhr.response, function(buffer){
        callback(buffer);
      });
    };
    xhr.open('GET', url);
    xhr.send();
  }
};


function Slice(song, index, start, duration) {
  if(!(this instanceof Slice))
    return new Slice(index, start, duration);

  this.song = song;
  this.index = index;
  this.start_time = parseFloat(start);
  this.duration = parseFloat(duration);
  this.last_time = 0.0;
  this.played_time = 0;
  this.playback_multiplier = 1.0;

  this.image = song.image;

  this.x = (Math.random() * (window.innerWidth-100)) + 50;
  this.y = (Math.random() * (window.innerHeight-100)) + 50;
  this.r = 30;

  this.connections = [];
  this.connection_index = 0;

  this.blob_w = 10;
  this.blob_h = 10;
  this.blob_r = 2;
  this.blob_color = {
    none: '#B64926',
    hovered: '#8E2800',
    selected: '#000'
  };

  this.color = {
    none: 'rgb('+parseInt(255 - (index*(255/APP.max_slices)),10)+',0,0)',
    // none: '#468966',
    hovered: '#FFF0A5',
    selected: '#FFB03B'
  };

  var c = parseInt(255 - (index*(255/APP.max_slices)),10);

  switch(this.song.color) {
    case 'red': this.color.none = 'rgb('+c+',0,0)'; break;
    case 'green': this.color.none = 'rgb(0,'+c+',0)'; break;
    // case 'blue': this.color.none = 'rgb(0,0,'+c+')'; break;
    case 'blue': this.color.none = 'indigo';
  }

  this.state = 'none';
  this.blob_state = 'none';

  this.buffer_source = null;
  this.preview_buffer_source = null;
  this.preview_timeout_id = null;
  this.start_play = null;
  this.callback = null;
  this.interval_id = null;
}
Slice.prototype.draw = function(ctx) {
  if(!this.song.buffer)
    return;

  ctx.save();

  // Draw blob
  // ctx.fillStyle = this.blob_color[this.blob_state];
  // roundedRectFill(ctx,this.x+this.r-this.blob_w/2,this.y-this.blob_h/2,this.blob_w,this.blob_h,this.blob_r);

  var r = this.r + ((this.state == 'playing')? Math.sin(APP.audio_ctx.currentTime*4.5*this.playback_multiplier) * 7: 0);

  // Draw slice
  ctx.fillStyle = this.color[this.state] || this.color.none;
  fillOval(ctx, this.x, this.y, r + 2);

  ctx.drawImage(APP.images[this.image], this.x - this.r, this.y - this.r, this.r*2, this.r*2);

  // ctx.beginPath();
  // ctx.arc(25, 25, 25, 0, Math.PI * 2, true);
  // ctx.closePath();
  // ctx.clip();

  // ctx.drawImage(thumbImg, 0, 0, 50, 50);

  // ctx.beginPath();
  // ctx.arc(0, 0, 25, 0, Math.PI * 2, true);
  // ctx.clip();
  // ctx.closePath();

  ctx.restore();
};
Slice.prototype.drawConnections = function(ctx) {
  ctx.save();

  var blob_pos = this.getBlobCenter();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;

  for(var i = 0; i < this.connections.length; i++) {
    ctx.beginPath();
    ctx.moveTo(blob_pos[0], blob_pos[1]);
    ctx.lineTo(this.connections[i].x, this.connections[i].y);
    ctx.stroke();
  }

  ctx.restore();
};
Slice.prototype.pointInside = function(x, y) {
  return pointInCircle(x, y, this.x, this.y, this.r);

  // return (
  //   x > this.x && x < this.x+this.w &&
  //   y > this.y && y < this.y+this.h
  // );
};
Slice.prototype.pointInsideBlob = function(x, y) {
  return (
    x > (this.x+this.r-this.blob_w/2) && x < (this.x+this.r+this.blob_w/2) &&
    y > (this.y-this.blob_h/2) && y < (this.y+this.blob_h/2)
  );
};
Slice.prototype.getBlobCenter = function() {
  return [this.x /*+ this.r*/, this.y];
};
Slice.prototype.connectTo = function(slice) {
  this.connections.push(slice);
};
Slice.prototype.getNextConnection = function() {
  if(this.connections.length === 0)
    return null;

  this.connection_index = (this.connection_index+1) % this.connections.length;
  return this.connections[this.connection_index];
};
Slice.prototype.hasConnections = function() {
  return (this.connections.length > 0);
};
Slice.prototype.removeConnections = function() {
  this.connections = [];
  this.connection_index = 0;
};
Slice.prototype.updatePlaybackRate = function(value) {
  this.buffer_source.playbackRate.value = value;
};
Slice.prototype.play = function(cb) {
  if(!this.song.buffer)
    return;

  this.state = 'playing';


  var actx = APP.audio_ctx;

  this.buffer_source = actx.createBufferSource();
  this.buffer_source.buffer = this.song.buffer;
  this.buffer_source.connect(actx.destination);

  this.played_time = 0.0;
  this.last_time = actx.currentTime;
  this.calculateMultiplier();

  if(!APP.modify_playback_rate)
    this.buffer_source.playbackRate.value = APP.global_multiplier;

  this.buffer_source.start(actx.currentTime, this.start_time, this.duration);

  this.start_play = actx.currentTime;
  this.callback = cb;

  this.interval_id = setInterval(this.checkSoundTime.bind(this), 5);

  // b.stop(actx.currentTime+this.duration);

  // APP.audio.currentTime = this.start_time;
  // APP.audio.play();
  // setTimeout(cb, this.duration * 1000);
};
Slice.prototype.stop = function() {
  clearInterval(this.interval_id);
  this.state = 'none';
  if(this.buffer_source)
    this.buffer_source.stop(0);
  if(this.callback)
    this.callback(this);
};
// function f() {
//   var min = 100,
//       max = 500,
//       mid = (min+max)/2,
//       c = 0.001;

//   var dist = Math.random() * (min+max) + min;

//   if(dist > max)
//     dist = max;
//   if(dist < min)
//     dist = min;

//   return [dist, 1.0 + ((dist - mid) * c)];
// }
Slice.prototype.calculateMultiplier = function() {
  // if(!APP.modify_playback_rate)
  if(window.location.search.indexOf('modify') == -1)
    return;

  // calc
  var dist = this.hasConnections() ?
    vecDistance(this.x, this.y, this.connections[this.connection_index].x, this.connections[this.connection_index].y)
    : 200;

  var min = 100,
      max = 500,
      mid = (min+max)/2,
      c = 0.001;

  if(dist > max)
    dist = max;
  if(dist < min)
    dist = min;

  var val = 1.0 + ((dist - mid) * c);

  this.playback_multiplier = val;

  this.buffer_source.playbackRate.value = this.playback_multiplier;
};
Slice.prototype.checkSoundTime = function() {
  var currTime = APP.audio_ctx.currentTime;

  this.played_time += (this.playback_multiplier * (currTime - this.last_time));
  this.last_time = currTime;

  this.calculateMultiplier();

  $('#info').text((APP.audio_ctx.currentTime - this.start_play) + ' / ' + this.played_time + ' / ' + this.duration);
  if(this.played_time >= this.duration) {
    this.stop();
  }
};
Slice.prototype.startHover = function() {
  if(APP.playing || this.state == 'playing' || !this.song.buffer || this.state == 'hovered')
    return;

  this.state = 'hovered';

  this.preview_timeout_id = setTimeout(this.startPreview.bind(this), 700);
};
Slice.prototype.stopHover = function() {
  this.stopPreview();
  clearTimeout(this.preview_timeout_id);
  // if(this.preview_buffer_source)
  //   this.preview_buffer_source.stop(0);

  if(this.state !== 'hovered')
    return;

  this.state = 'none';
};
Slice.prototype.startPreview = function() {
  this.preview_buffer_source = APP.audio_ctx.createBufferSource();
  this.preview_buffer_source.loopStart = this.start_time;
  this.preview_buffer_source.loopEnd = this.start_time + this.duration;
  this.preview_buffer_source.loop = true;
  this.preview_buffer_source.buffer = this.song.buffer;
  if(!APP.modify_playback_rate)
    this.preview_buffer_source.playbackRate.value = APP.global_multiplier;
  this.preview_buffer_source.connect(APP.audio_ctx.destination);

  this.preview_buffer_source.start(APP.audio_ctx.currentTime, this.start_time, this.duration);
};
Slice.prototype.stopPreview = function() {
  if(this.preview_buffer_source)
    this.preview_buffer_source.stop(0);
};




$(function() {
  APP.init();
});

function vecDistanceSq(x1, y1, x2, y2){
    return Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2);
}
function vecDistance(x1, y1, x2, y2){
    return Math.sqrt(vecDistanceSq(x1, y1, x2, y2));
}
function pointInCircle(px, py, cx, cy, cr){
    return (vecDistanceSq(px, py, cx, cy) < Math.pow(cr, 2));
}


function fillOval(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI*2, false);
  ctx.fill();
}

function roundedRectFill(ctx,x,y,width,height,radius){
  ctx.beginPath();
  ctx.moveTo(x,y+radius);
  ctx.lineTo(x,y+height-radius);
  ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
  ctx.lineTo(x+width-radius,y+height);
  ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
  ctx.lineTo(x+width,y+radius);
  ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
  ctx.lineTo(x+radius,y);
  ctx.quadraticCurveTo(x,y,x,y+radius);
  ctx.fill();
}


var randomColor = (function() {
  var colors = [];

  var f = function(){
    if(colors.length <= 0){
      colors = [
        '#009999',
        '#33CCCC',
        '#66CCCC',
        '#336666',
        '#006666',
        '#FF9900',
        '#CC9933',
        '#996600',
        '#FFCC33',
        '#FFCC66',
        '#FF0000',
        '#CC3333',
        '#990000',
        '#FF3366',
        '#FF6666'
      ];
    }

    return colors.splice(randomRangeInt(0, colors.length), 1)[0];
  };

  return f;
})();





// var echoKey = '9LEZCNKDMCA88ZHJQ';
// var soundId = '6ed9a7277d93c4407d73a2caac79af49';

// var echo_id = null;
// var sc_id = null;
// var sc_stream_url = null;

// var artist = 'daft punk';
// var song = "get lucky";
// // var song_id = "SOBFMZQ13E279A0048";
// // var song_id = "TRRBHAK139155E1516";
// var song_url = '/Hackathon/daftpunk_getlucky.mp3';
// // var song_url = 'http://static.echonest.com/BeatDriver/TRRBHAK139155E1516.mp3';




// var audio = null;
// var timeout_id = null;
// var slices = [];

// var echo_url =
//   'http://developer.echonest.com/api/v4/song/search?'+
//   'api_key={0}&artist={1}&title={2}&results=1&bucket=audio_summary'.format(echoKey, artist, song);
// $.getJSON(
//   echo_url,
//   function(track) {
    
//     var analysisURL = track.response.songs[0].audio_summary.analysis_url;

//     info('Fetching analyze data');

//     $.getJSON("http://query.yahooapis.com/v1/public/yql", {
//       q: "select * from json where url=\"" + analysisURL + "\"",
//       format: "json"
//     }, function(data) {
//       console.log(data.query.results.json);

//       info('Analyze data received');

//       splitSong(data.query.results.json);
//     });


//   }
// );
// info('Fetching song data');


// $(function() {
//   var audio_el = $('<audio>', {
//     controls: false
//   });
//   var source_el = $('<source>');

//   source_el.attr('src', song_url);
//   audio_el.append(source_el);

//   audio = audio_el[0];

//   $('body').append(audio_el);
// });



// function splitSong(analyze_json) {
//   var length = 50;
//   var type = 'bars';

//   var i = 0;
//   var time = analyze_json[type][0].start;
//   while(i < length && i < analyze_json[type].length) {
//     var bar = analyze_json[type][i++];

//     slices.push(new Slice(i, bar.start, bar.duration));

//     time += bar.duration;
//   }
// }

// var q_index = 1;
// function playSliceQueue(index) {
//   var our_index = ++q_index;
//   index = index || 0;

//   function callback() {
//     if(our_index !== q_index)
//       return;
//     var s = slices[index++];
//     s.play(callback);
//   }
//   callback();
// }

// function Slice(index, start, duration) {
//   if(!(this instanceof Slice))
//     return new Slice(index, start, duration);

//   this.index = index;
//   this.start_time = start;
//   this.duration = duration;

//   this.el = $('<div>');
//   this.el.addClass('slice');
//   var self = this;
//   this.el.click(function() {
//     playSliceQueue(self.index);
//   });
//   $('body').append(this.el);
// }
// Slice.prototype.play = function(callback) {
//   audio.currentTime = this.start_time;
//   audio.play();
//   $('.slice.active').removeClass('active');
//   this.el.addClass('active');
//   var self = this;
//   var id = timeout_id = setTimeout(callback || function() {
//     if(id === timeout_id) {
//       // audio.pause();
//       self.el.removeClass('active');
//     }
//   }, this.duration * 1000);
// };



// var ECHONEST_KEY = '9LEZCNKDMCA88ZHJQ';
// var SOUNDCLOUD_ID = '6ed9a7277d93c4407d73a2caac79af49';

// var sound;




// SC.initialize({
//   client_id: "6ed9a7277d93c4407d73a2caac79af49"
// });

// var sound_search_url =
//   'http://api.soundcloud.com/tracks.json?client_id={0}&q={1}&limit={2}&downloadable=true'.format(SOUNDCLOUD_ID, 'Timbuktu', 10);

// // $.getJSON(sound_search_url, function(tracks) {

// //   console.log(tracks[0]);

// //   $('body').append('<h1>'+tracks[0].title+'</h1>');


// //   SC.stream("/tracks/"+tracks[0].id, function(c_sound){
// //     sound = c_sound;
// //     process(sound);
// //   });
// // });

// var echo_url =
//   'http://developer.echonest.com/api/v4/song/profile?api_key={0}&id=SONWCPE12B3A138A4E&bucket=audio_summary'.format(ECHONEST_KEY);

// $.getJSON(echo_url, function(data) {
//   console.log(data);
// });






// function process(sound) {
//   sound.play();
//   setTimeout(function() {
//     sound.pause();
//     var slices = 50;
//     var slice_duration = sound.duration / slices;

//     for(var i = 0; i < slices; i++) {
//       new Slice(sound.setPosition(i*slice_duration), i*slice_duration, slice_duration);
//     }
//   }, 3000);
// }
