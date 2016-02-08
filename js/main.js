var editor = ace.edit("editor");
editor.getSession().setMode("ace/mode/c_cpp");

var code;
if (typeof(localStorage.code) === "undefined") {
  code = `
void setup() {
    
}

void loop() {
    
}`;
} else {
  code = localStorage.code;
};

editor.setValue(code);
editor.focus();

editor.commands.addCommand({
   name: "run",
   bindKey: {win: "Ctrl-Enter", mac: "Ctrl-Enter"},
   exec: runCode
});

console.log(arduino_h); 

running = false;

ledLookup = {
  2: {x: 87, y: 165, color: "red"},
  3: {x: 87, y: 140, color: "green"},
  4: {x: 87, y: 115, color: "red"},
  5: {x: 87, y: 90, color: "green"},
  6: {x: 87, y: 65, color: "red"},
  7: {x: 87, y: 35, color: "green"},
  8: {x: 87, y: 10, color: "red"},
  
  9: {x: 5, y: 165, color: "orange"},
  10: {x: 5, y: 140, color: "orange"},
  11: {x: 5, y: 115, color: "orange"},
  12: {x: 5, y: 90, color: "blue"},
  13: {x: 5, y: 65, color: "blue"},
  14: {x: 5, y: 35, color: "yellow"},
  15: {x: 5, y: 7, color: "yello"}
};


function runCode() {
  if (running) {
    return;
  }
  running = true;
  var code = "#include \"Arduino.h\"\n" + editor.getValue() + "\n\nint main() { setup(); loop(); return 0;}\n";
  //var code = editor.getValue();
  var input = "4321";
  var output = "";
  var config = {
    stdio: {
      write: function(s) {
        output += s;
      }
    },
    includes: {
      "Arduino.h": arduino_h //defined in Arduino.js
    }
  };
  
  var gifOutput = document.getElementById("gif-output");
  
  gifOutput.innerHTML = "Running code . . .";
  
  var exitCode = JSCPP.run(code, input, config);
  document.getElementById("console-output").innerHTML = JSON.stringify(frameManager);
  console.log(frameManager);
  gifOutput.innerHTML = "Generating gif . . .";
  var gif = new GIF({workers: 4, quality: 0});
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  
  canvas.height = 500;
  canvas.width = 250;
  
  var img = document.getElementById("shield-img");
  if (!img.complete || ((typeof(img.naturalWidth) !== "undefined") && img.naturalWidth === 0)) {
    gifOutput.innerHTML = "Please wait for the page to finish loading";
    running = false;
    return;
  }
  
  var on_finished = function(gif) {
    gifOutput.innerHTML = "";
    var img = document.createElement("img");
    img.src = URL.createObjectURL(gif);
    gifOutput.appendChild(img);
  }
  gif.on("finished", on_finished);
  
  var shieldImg = document.getElementById("shield-img");

  var draw_frame = function(frame, index) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(shieldImg, 0, 0);
    for (var i = 2; i <= 15; i++) {
      if (frame.getPinState(i) === 1) { //if it's on
        var alpha;
        if (frame.getPinMode(i) === 1) { //if it's an output
          alpha = 1;
        } else {
          alpha = 0.2;
        }
        var radius = 7;
        var ledDescriptor = ledLookup[i];
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ledDescriptor.color;
        ctx.beginPath();
        ctx.arc(ledDescriptor.x + radius, ledDescriptor.y + radius, radius, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();
        
        gif.addFrame(canvas, {copy: true, delay: frame.postDelay});
      }
    }
  }
  
  frameManager.frames.forEach(draw_frame);
  gif.render();
  
  
  running = false;
}

function saveCode() {
  localStorage.code = editor.getValue();
}
