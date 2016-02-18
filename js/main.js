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

document.getElementById("name").value = (typeof(localStorage.name) === "undefined") ? "" : localStorage.name;
document.getElementById("exercise-number").value = (typeof(localStorage.exerciseNumber) === "undefined") ? "" : localStorage.exerciseNumber;

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
  15: {x: 5, y: 7, color: "yellow"}
};


function runCode() {
  if (running) {
    return;
  }
  running = true;
  var code = "#include \"Arduino.h\"\n" + editor.getValue() + "\n\nint main() { setup(); loop(); return 0;}\n";
  
  var gifOutput = document.getElementById("gif-output");
  gifOutput.innerHTML = "Running code . . .";
  
  var jscpp = new Worker("/js/JSCPP-WebWorker.js");
  jscpp.onmessage = function(e) {
    var data = JSON.parse(e.data);
    var newFrameManager = new FrameManager(); //Recreate the frameManager
    newFrameManager.currentFrame = data.currentFrame
    for (var i = 0; i <= data.currentFrame; i++) {
      var newFrame = new Frame();
      newFrame.ledStates = data.frames[i].ledStates;
      newFrame.ledModes = data.frames[i].ledModes;
      newFrame.postDelay = data.frames[i].postDelay;
      newFrameManager.frames.push(newFrame);
    }
    generateGif(newFrameManager);
  };
  jscpp.postMessage(code);
}

function generateGif(frameManager) {
  console.log(frameManager);
  var gifOutput = document.getElementById("gif-output");
  gifOutput.innerHTML = "Generating gif . . .";
  var gif = new GIF({workers: 4, quality: 0, workerScript: "/js/gif/gif.worker.js", width: 500, height: 195});
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");

  canvas.height = 195;
  canvas.width = 500;
  
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

  var date = new Date();
  var dateString = date.toDateString();
  var timeString = date.toLocaleTimeString();
  
  var name = document.getElementById("name").value;
  localStorage.name = name;
  var exerciseNumber = document.getElementById("exercise-number").value;
  localStorage.exerciseNumber = exerciseNumber;

  var draw_frame = function(frame, index, array) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(shieldImg, 0, 0);
    for (var i = 2; i <= 15; i++) {
      if (frame.getPinState(i) === 1) { //if it's on
        var alpha = (frame.getPinMode(i) === 1) ? 1 : 0.2; //Make sure it's an output, otherwise dim it
        var radius = 7;
        var ledDescriptor = ledLookup[i];
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ledDescriptor.color;
        ctx.strokeStyle = ledDescriptor.color;
        ctx.beginPath();
        ctx.arc(ledDescriptor.x + radius, ledDescriptor.y + radius, radius, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "black";
    ctx.font = "15px monospace";
    ctx.fillText("Frame: " + index, shieldImg.width + 10, 15);
    ctx.fillText("PostDelay: " + frame.postDelay, shieldImg.width + 10, 35);
    ctx.fillText("By " + name, shieldImg.width + 10, 55);
    ctx.fillText("Exercise " + exerciseNumber, shieldImg.width + 10, 75);

    ctx.fillText(dateString, shieldImg.width + 10, 115);
    ctx.fillText(timeString, shieldImg.width + 10, 135);
    var realDelay = (frame.postDelay === 0) ? 15 : frame.postDelay
    gif.addFrame(ctx, {copy: true, delay: realDelay});
  }
  
  frameManager.frames.forEach(draw_frame);
  gif.render();
  
  
  running = false;
}

function saveCode() {
  localStorage.code = editor.getValue();
}
