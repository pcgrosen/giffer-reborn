"use strict";
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

var fileInput = document.getElementById("input-file");
var currentFile = null;
var files = null;
fileInput.addEventListener("change", function(event) {
  currentFile = null;
  files = fileInput.files;
  if (files.length > 1) {
    document.getElementById("next-page-button").style = "";
    document.getElementById("num-remaining").style = "";
  }
  nextJSON();
}, false);

function nextJSON() {
  if (currentFile == null) {
    currentFile = -1;
  }
  if ((currentFile + 1) >= files.length) {
    return;
  }
  currentFile++;
  document.getElementById("num-remaining").innerHTML = "(" + ((files.length - 1) - currentFile) + ((((files.length - 1) - currentFile) === 1) ? " page remaining)" : " pages remaining)");
  if ((currentFile + 1) >= files.length) {
    document.getElementById("next-page-button").style = "visibility: hidden;";
    document.getElementById("num-remaining").style = "visibility: hidden;";
  }
  loadFile(files[currentFile]);
}

function loadFile(file) {
  document.getElementById("console-output").innerHTML = "Loading file . . .";
  var reader = new FileReader();
  reader.onload = function(event) {
    try {
      var obj = JSON.parse(event.target.result);
      editor.setValue(obj.code);
      var gifOutput = document.getElementById("gif-output");
      gifOutput.innerHTML = "";
      if (obj.img !== null) {
	var img = document.createElement("img");
	img.src = obj.img;
	img.id = "output-image";
	gifOutput.appendChild(img);
      }
      document.getElementById("console-output").innerHTML = obj.consoleOutput;
      document.getElementById("name").value = obj.name;
      document.getElementById("exercise-number").value = obj.exercise;
    }
    catch (e) {
      document.getElementById("console-output").innerHTML = "Error: File is corrupt."; 
    }
  };
  reader.onerror = function(event) {
    document.getElementById("console-output").innerHTML = "Couldn't read " + file.name + " (Error: " + event.target.error.code + ")";
  };
  reader.readAsText(file);
}

var running = false;
var lastFrameManager = null;

var ledLookup = {
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

function frameManagerFromJSON(string) {
  var data = JSON.parse(string);
  var newFrameManager = new FrameManager(); //Recreate the frameManager
  newFrameManager.currentFrame = data.currentFrame;
  newFrameManager.frames = [];
  for (var i = 0; i <= data.currentFrame; i++) {
    var newFrame = new Frame();
    newFrame.ledStates = data.frames[i].ledStates;
    newFrame.ledModes = data.frames[i].ledModes;
    newFrame.postDelay = data.frames[i].postDelay;
    newFrameManager.frames.push(newFrame);
  }
  return newFrameManager;
}

function runCode() {
  if (running) {
    return;
  }
  running = true;
  var code = "#include \"Arduino.h\"\n" + editor.getValue() + "\n\nint main() { setup(); loop(); return 0;}\n";
  
  var gifOutput = document.getElementById("gif-output");
  gifOutput.innerHTML = "Running code . . .";
  $("#console-output")[0].innerHTML = "";
  
  var jscpp = new Worker("js/JSCPP-WebWorker.js");
  jscpp.onmessage = function(e) {
    var newFrameManager = frameManagerFromJSON(e.data);
    lastFrameManager = newFrameManager;
    if ($("#should-grade")[0].checked) {
      gradeFrameManager(newFrameManager);
    } else {
      generateGif(newFrameManager);
    }
  };
  jscpp.onerror = function(e) {
    var errorObj = JSON.parse(e.message.slice(e.message.indexOf("{")));
    if (typeof(errorObj.text) !== "undefined" || typeof(errorObj.error) !== "undefined") {
      var line = errorObj.error.line - 2;
      var column = errorObj.error.column;
      document.getElementById("console-output").innerHTML = errorObj.text;
      var aceDoc = editor.getSession().getDocument();
      var code = aceDoc.getValue();
      var endOfError = aceDoc.positionToIndex({row: line, column: column});
      var endOfErrorObj = aceDoc.indexToPosition(endOfError - 2);
      var startOfErrorObj;
      var i = endOfError - 2;
      if (i >= 0) {
	while (true) {
	  var chr = code.charAt(i);
	  if (!(/\s/.test(chr))) {
	    break;
	  }
	  if (i === 0) {
	    break;
	  }
	  i--;
	}
	startOfErrorObj = aceDoc.indexToPosition(i + 1);
      } else {
	startOfErrorObj = {row: line, column: column};
      }
      var selectionRange = new ace.require("ace/range").Range.fromPoints(startOfErrorObj.row, startOfErrorObj.column, endOfErrorObj.row, endOfErrorObj.column);
      selectionRange.start = startOfErrorObj;
      selectionRange.end = endOfErrorObj;
      editor.getSession().getSelection().setSelectionRange(selectionRange);
      editor.getSession().setAnnotations([{
	row: startOfErrorObj.row,
	column: startOfErrorObj.colum,
	text: "CRITICAL ERROR, SELF DESTRUCT INITIALIZED",
	type: "error"
      }]);
      editor.navigateTo(startOfErrorObj.row, startOfErrorObj.column);
    } else {
      document.getElementById("console-output").innerHTML = "Warning: Unusual error!\n\n" + errorObj.toString();
    }
    running = false;
    return true;
  };
  jscpp.postMessage(code);
}

function gradeFrameManager(studentFM) {
  var xmlhttp = new XMLHttpRequest();
  var exerciseNum = $("#exercise-number")[0].valueAsNumber;
  $("#gif-output").text("Getting grading file . . .");
  if (exerciseNum === NaN) {
    $("#console-output").text("Please input a valid exercise number to grade.");
    running = false;
    return;
  }
  xmlhttp.open("GET", "exercises/" + exerciseNum + "/Exercise_" + exerciseNum + ".FrameManager");
  var handleResponse = function () {
    try {
      if (this.status === 200) {
	$("#gif-output").text("Grading . . .");
	var correctFM = frameManagerFromJSON(this.responseText);
	generateGif(studentFM, compareFrameManagers(studentFM, correctFM));
      } else if (this.status === 404) {
        $("#console-output").text("The grading file for exercise " + exerciseNum + " does not exist.");
        return;
      } else {
        $("#console-output").text("An error occurred getting the grading file.");
        return;
      }
    } catch (e) {
      console.log(e);
      $("#console-output").text("An error occurred parsing the grading file.");
    }
  };
  xmlhttp.addEventListener("load", handleResponse);
  var handleError = function () {
    $("#console-output").text("An error occurred getting the grading file.");
  };
  xmlhttp.addEventListener("error", handleError);
  xmlhttp.addEventListener("abort", handleError);
  xmlhttp.send();
}

function compareFrameManagers(fm1, fm2) {
  if (fm1.frames.length !== fm2.frames.length) {
    $("#console-output")[0].innerHTML = "Gifs are different lengths";
    return false;
  }
  var onewayFrameCompare = function (f1, f2) {
    if (!Object.keys(f1.ledStates).every(function (element) {
      if (!(f1.getPinState(element) === f2.getPinState(element))) {
	$("#console-output")[0].innerHTML = "Found difference in pin states on pin " + element;
	return false;
      }
      if (!((f1.getPinState(element) === HIGH) ? (f1.getPinMode(element) === f2.getPinMode(element)) : true)) {
	$("#console-output")[0].innerHTML = "Found difference in pin modes on pin " + element;
	return false;
      }
      return true;
    })) {
      return false
    }
    if (!(f1.postDelay === f2.postDelay)) {
      $("#console-output")[0].innerHTML = "Found difference in delays";
      return false;
    }
    return true;
  };
  
  if (!fm1.frames.every(function (element, key) {
    if (onewayFrameCompare(element, fm2.frames[key]) && onewayFrameCompare(fm2.frames[key], element)) {
      return true;
    } else {
      $("#console-output")[0].innerHTML += " in frame " + key;
      return false;
    }
  })) {
    return false;
  }
  if (!fm2.frames.every(function (element, key) {
    if (onewayFrameCompare(element, fm1.frames[key]) && onewayFrameCompare(fm1.frames[key], element)) {
      return true;
    } else {
      $("#console-output")[0].innerHTML += " in frame " + key;
      return false;
    }
  })) {
    return false;
  }
  return true;
}

function generateGif(frameManager, isCorrect) {
  var gifOutput = document.getElementById("gif-output");
  gifOutput.innerHTML = "Generating gif . . .";
  var gif = new GIF({workers: 4, quality: 0, workerScript: "js/gif/gif.worker.js", width: 500, height: 195});
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
  
  var on_finished = function(gif, e) {
    gifOutput.innerHTML = "";
    var img = document.createElement("img");
    var binString = "";
    e.forEach(function (element) {
      binString += String.fromCharCode(element);
    });
    img.src = "data:image/gif;base64," + btoa(binString); //+ btoa(String.fromCharCode.apply(null, e));
    img.id = "output-image";
    gifOutput.appendChild(img);
  };
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

    ctx.fillStyle = ((typeof(isCorrect) === "undefined") || (isCorrect === false)) ? "red" : "green";
    var gradeText = (isCorrect === true) ? "Correct" : ((isCorrect === false) ? "Incorrect" : "Ungraded");
    ctx.fillText(gradeText, shieldImg.width + 10, 175);
    
    var realDelay = (frame.postDelay === 0) ? 15 : frame.postDelay;
    gif.addFrame(ctx, {copy: true, delay: realDelay});
  };
  
  frameManager.frames.forEach(draw_frame);
  gif.render();
  
  
  running = false;
}

function saveCode() {
  localStorage.code = editor.getValue();
}

function saveJSON() {
  var obj = {};
  obj.code = editor.getValue();
  obj.consoleOutput = document.getElementById("console-output").innerHTML;
  var name = document.getElementById("name").value;
  var exerciseNumber = document.getElementById("exercise-number").value;
  obj.name = name;
  obj.exercise = exerciseNumber;
  var image = document.getElementById("output-image");
  obj.img = (image !== null) ? image.src : null;
  var jsonString = JSON.stringify(obj);
  saveAs(new Blob([jsonString], {type: "application/json;charset=utf-8"}), name.replace(/ /g,'') + "_Exercise" + exerciseNumber + ".giffer");
}

function saveFrameManager() {
  if (lastFrameManager !== null && $("#exercise-number")[0].valueAsNumber !== NaN) {
    saveAs(new Blob([JSON.stringify(lastFrameManager)], {type: "application/json;charset=utf-8"}), "Exercise_" + $("#exercise-number")[0].value + ".FrameManager");
  }
}

function blobToDataURL(blob, callback) {
    var a = new FileReader();
    a.onload = function(e) {callback(e.target.result);};
    a.readAsDataURL(blob);
}
