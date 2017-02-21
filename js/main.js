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

if (typeof(localStorage.analogPins) !== "undefined") {
  var analogPins = JSON.parse(localStorage.analogPins);
  for (var i = 0; i < analogPins.length; i++) {
    var pin = analogPins[i];
    addPin(pin.pin_number, pin.pin_value);
  }
}

editor.setValue(code);
editor.focus();

editor.commands.addCommand({
   name: "run",
   bindKey: {win: "Ctrl-Enter", mac: "Ctrl-Enter"},
   exec: runCode
});

document.getElementById("name").value = (typeof(localStorage.name) === "undefined") ? "" : localStorage.name;
document.getElementById("exercise-number").value = (typeof(localStorage.exerciseNumber) === "undefined") ? "" : localStorage.exerciseNumber;

new Clipboard("#copy-page", {
  text: function() {
    var outputGif = $("#confirmation-gif").clone()[0];
    if (typeof(outputGif) === "undefined") {
      $("#console-output").text("Please generate a graded gif first.");
      return undefined;
    }
    var preDom = document.createElement("pre");
    var dom = $(preDom.appendChild(document.createElement("code")));
    dom[0].class = "cpp";
    dom.text(editor.getValue());
    hljs.highlightBlock(dom[0]);
    var highlightStorage = $("#highlight-storage");
    highlightStorage.empty();
    highlightStorage.append(preDom);
    dom.find("*").each(function (index) {
      $(this).css("color", window.getComputedStyle(this).getPropertyValue("color"));
    });
    function makeHeading(heading) {
      var obj = document.createElement("h1");
      $(obj).text(heading);
      return obj;
    }
    var divWrapper = document.createElement("div");
    divWrapper.appendChild(makeHeading("Confirmation Gif"));
    divWrapper.appendChild(outputGif);
    divWrapper.appendChild(document.createElement("br"));
    divWrapper.appendChild(makeHeading("Code"));
    divWrapper.appendChild(preDom);
    divWrapper.appendChild(document.createElement("br"));
    divWrapper.appendChild(makeHeading("Serial Output"));
    var output = document.createElement("div");
    $(output).css("font-family", "monospace");
    output.innerHTML = lastContent.output.split("\n").slice(0, 30).join("\n");
    divWrapper.appendChild(output);
    $("#console-output").text("Copied! Go to \"Prepare an answer\" on Neo, then click the \"<>\" button and paste by pressing Control + V ");
    return divWrapper.innerHTML;
  }
});

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
      $("#analog-table-tbody").empty();
      if (typeof(obj.analogPins) !== "undefined") {
        var analogPins = obj.analogPins;
        for (var i = 0; i < analogPins.length; i++) {
          var pin = analogPins[i];
          addPin(pin.pin_number, pin.pin_value);
        }
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
var lastContent = {frameManager: null, output: null};

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
    newFrame.outputText = data.frames[i].outputText;
    newFrameManager.frames.push(newFrame);
  }
  return newFrameManager;
}

function t(text) {
  return document.createTextNode(text);
}

function output(text) {
  $("#console-output").append(t(text));
}

function newline() {
  $("#console-output").append(document.createElement("br"));
}

function runCode() {
  if (running) {
    return;
  }
  $("#copy-page").css("visibility", "hidden");
  running = true;
  var prefix = "#include \"Arduino.h\"\ntypedef unsigned char byte;\n";
  var code = prefix + editor.getValue() + "\n\nint main() { setup(); loop(); return 0;}\n";

  var gifOutput = document.getElementById("gif-output");
  gifOutput.innerHTML = "Running code . . .";
  $("#console-output")[0].innerHTML = "";

  var jscpp = new Worker("js/JSCPP-WebWorker.js");
  output("(Starting execution)");
  newline();
  jscpp.onmessage = function(e) {
    var message = JSON.parse(e.data);
    if (message.type === "frameManager") {
      var newFrameManager = frameManagerFromJSON(message.frameManager);
      lastContent.frameManager = newFrameManager;
      lastContent.output = $("#console-output")[0].innerHTML;
      newline(); newline();
      if ($("#should-grade")[0].checked) {
        gradeFrameManager(newFrameManager);
      } else {
        generateGif(newFrameManager);
      }
    } else if (message.type === "output") {
      var parts = message.text.split("\n");
      for (var i = 0; i < parts.length; i++) {
        output(parts[i]);
        if (i !== parts.length - 1) {
          newline();
        }
      }
    } else if (message.type === "newFrame") {
      //output("(Switching to frame " + message.newFrameNumber + " with a delay of " + message.delay + ")");
      //newline();
    }
  };
  jscpp.onerror = function(e) {
    console.log(e);
    var errorObj = e.message;
    var matches = /([0-9]+):([0-9]+)/.exec(errorObj); //Match the line:column in the error message
    if (matches != null && matches.length >= 2) {
      var line = Number(matches[1]) - (prefix.split("\n").length - 1) - 1;
      var column = Number(matches[2]) - 1;
      var aceDoc = editor.getSession().getDocument();
      var code = aceDoc.getValue();
      var startOfErrorObj = {row: line, column: column};
      var selectionRange = new ace.require("ace/range").Range.fromPoints(startOfErrorObj.row, startOfErrorObj.column, line, 0);
      selectionRange.start = startOfErrorObj;
      selectionRange.end = {row: line, column: 0};
      editor.getSession().getSelection().setSelectionRange(selectionRange);
      editor.getSession().setAnnotations([{
	row: startOfErrorObj.row,
	column: startOfErrorObj.colum,
	text: "CRITICAL ERROR, SELF DESTRUCT INITIALIZED",
	type: "error"
      }]);
      editor.navigateTo(startOfErrorObj.row, startOfErrorObj.column);
      output("Error: " + errorObj.slice(errorObj.indexOf(matches[0]) + matches[0].length + 1));
    } else {
      output("Warning: Unusual error!\n\n" + errorObj);
    }
    running = false;
    return true;
  };
  jscpp.postMessage({code: code, analogPins: getAnalogPins()});
}

function gradeFrameManager(studentFM) {
  var xmlhttp = new XMLHttpRequest();
  var exerciseNum = $("#exercise-number")[0].valueAsNumber;
  $("#gif-output").text("Getting grading file . . .");
  if (isNaN(exerciseNum)) {
    output("Please input a valid exercise number to grade.");
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
        output("The grading file for exercise " + exerciseNum + " does not exist.");
        running = false;
        return;
      } else {
        output("An error occurred getting the grading file.");
        running = false;
        return;
      }
    } catch (e) {
      console.log(e);
      output("An error occurred parsing the grading file.");
      running = false;
    }
  };
  xmlhttp.addEventListener("load", handleResponse);
  var handleError = function () {
    output("An error occurred getting the grading file.");
    running = false;
  };
  xmlhttp.addEventListener("error", handleError);
  xmlhttp.addEventListener("abort", handleError);
  xmlhttp.send();
}

function compareFrameManagers(fm1, fm2) {
  if (fm1.frames.length !== fm2.frames.length) {
    output("Gifs are different lengths");
    return false;
  }
  var onewayFrameCompare = function (f1, f2) {
    if (!Object.keys(f1.ledStates).every(function (element) {
      if (!(f1.getPinState(element) === f2.getPinState(element))) {
	output("Found difference in pin states on pin " + element);
	return false;
      }
      if (!((f1.getPinState(element) === HIGH) ? (f1.getPinMode(element) === f2.getPinMode(element)) : true)) {
	output("Found difference in pin modes on pin " + element);
	return false;
      }
      return true;
    })) {
      return false;
    }
    if (!(f1.postDelay === f2.postDelay)) {
      output("Found difference in delays");
      return false;
    }
    if (f1.outputText.length !== f2.outputText.length) {
      output("Found difference in number of Serial prints");
      return false;
    }
    for (var i in f1.outputText) {
      if (f1.outputText[i].trim() !== f2.outputText[i].trim()) {
        output("Found difference in output text (\"" + f1.outputText[i].trim() + "\" vs \"" + f2.outputText[i].trim() + "\")");
        return false;
      }
    }
    return true;
  };

  if (!fm1.frames.every(function (element, key) {
    if (onewayFrameCompare(element, fm2.frames[key]) && onewayFrameCompare(fm2.frames[key], element)) {
      return true;
    } else {
      output(" in frame " + key);
      return false;
    }
  })) {
    return false;
  }
  if (!fm2.frames.every(function (element, key) {
    if (onewayFrameCompare(element, fm1.frames[key]) && onewayFrameCompare(fm1.frames[key], element)) {
      return true;
    } else {
      output(" in frame " + key);
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

  var canvas = document.createElement("canvas");
  canvas.height = 195;
  canvas.width = 300;

  var gif = new GIF({workers: 4, quality: 10, workerScript: "js/gif/gif.worker.js", transparent: 0xFFFFFF, width: canvas.width, height: canvas.height});
  var ctx = canvas.getContext("2d");

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
      if (frame.getPinState(i) >= 1) { //if it's on
        var alpha = (frame.getPinMode(i) === OUTPUT) ? 1 : 0.2; //Make sure it's an output, otherwise dim it
        alpha *= frame.getPinState(i) / ANALOG_MAX;
        alpha = Math.max(alpha, 0.3); //Clamp it for usability purposes
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

    ctx.font = "bold 15px monospace";
    ctx.fillStyle = ((typeof(isCorrect) === "undefined") || (isCorrect === false)) ? "red" : "green";
    var gradeText = (isCorrect === true) ? "Correct" : ((isCorrect === false) ? "Incorrect" : "Ungraded");
    ctx.fillText(gradeText, shieldImg.width + 10, 175);

    var realDelay = (frame.postDelay === 0) ? 15 : frame.postDelay;
    gif.addFrame(ctx, {copy: true, delay: realDelay});
  };

  frameManager.frames.forEach(draw_frame);
  gif.render();

  if ((isCorrect === true) || (isCorrect === false)) {
    generateConfirmationGif(isCorrect);
  }

  $("#copy-page").css("visibility", "visible");
  //$("#download-page").css("visibility", "visible");

  running = false;
}

function generateConfirmationGif(isCorrect) {
  var name = document.getElementById("name").value;
  var exercise = document.getElementById("exercise-number").value;

  var canvas = document.createElement("canvas");
  canvas.height = 110;
  canvas.width = 300;

  var gif = new GIF({workers: 4, quality: 10, workerScript: "js/gif/gif.worker.js", transparent: 0xFFFFFF, width: canvas.width, height: canvas.height});
  var ctx = canvas.getContext("2d");

  ctx.globalAlpha = 1;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 1;
  ctx.fillStyle = "black";
  ctx.font = "15px monospace";
  ctx.fillText("Student: " + name, 5, 25);
  ctx.fillText("Exercise: " + exercise, 5, 45);
  ctx.fillText("Confirmation Hash: " + (name + exercise).hashCode(), 5, 65);

  gif.addFrame(ctx, {copy: true, delay: 500});

  ctx.font = "bold 15px monospace";
  ctx.fillStyle = ((typeof(isCorrect) === "undefined") || (isCorrect === false)) ? "red" : "green";
  var gradeText = (isCorrect === true) ? "Correct" : "Incorrect";
  ctx.fillText(gradeText, 5, 85);

  gif.addFrame(ctx, {copy: true, delay: 500});

  gif.on("finished", function(gif, e) {
    var container = $("#confirmation-gif-container")[0];
    container.innerHTML = "";
    var img = document.createElement("img");
    var binString = "";
    e.forEach(function (element) {
      binString += String.fromCharCode(element);
    });
    img.src = "data:image/gif;base64," + btoa(binString); //+ btoa(String.fromCharCode.apply(null, e));
    img.id = "confirmation-gif";
    container.appendChild(img);
  });

  gif.render();
}

function saveCode() {
  localStorage.code = editor.getValue();
  localStorage.analogPins = JSON.stringify(getAnalogPins());
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
  obj.analogPins = getAnalogPins();
  var jsonString = JSON.stringify(obj);
  saveAs(new Blob([jsonString], {type: "application/json;charset=utf-8"}), name.replace(/ /g,'') + "_Exercise" + exerciseNumber + ".giffer");
}

function saveFrameManager() {
  if (lastContent !== null && $("#exercise-number")[0].valueAsNumber !== NaN) {
    saveAs(new Blob([JSON.stringify(lastContent.frameManager)], {type: "application/json;charset=utf-8"}), "Exercise_" + $("#exercise-number")[0].value + ".FrameManager");
  }
}

function blobToDataURL(blob, callback) {
  var a = new FileReader();
  a.onload = function(e) {callback(e.target.result);};
  a.readAsDataURL(blob);
}

function addPin(number, value) {
  var newContent = $(`<tr class="input-pin">
<td><input type="number" class="form-control pin-number" value="2" min="0" max="255"/></td>
<td><input type="number" class="form-control pin-value" value="0" min="0" max="1023"/></td>
<td><button class="btn btn-danger" style="width: 100%;" onclick="$(this).parent().parent().remove()">Remove</button></td>
</tr>`);
  $("#analog-table-tbody").append(newContent);
  if (number) {
    newContent.find(".pin-number")[0].valueAsNumber = Number(number);
  }
  if (value) {
    newContent.find(".pin-value")[0].valueAsNumber = Number(value);
  }
}

function getAnalogPins() {
  var pins = $("#analog-table-tbody").children();
  var out = [];
  for (var i = 0; i < pins.length; i++) {
    var pin = $(pins[i]);
    var pin_number = pin.find(".pin-number")[0].valueAsNumber;
    var pin_value = pin.find(".pin-value")[0].valueAsNumber;
    out.push({pin_number: pin_number, pin_value: pin_value});
  }
  return out;
}

//Simple hash function, thanks to http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function(){
	var hash = 0;
	if (this.length == 0) return hash;
	for (var i = 0; i < this.length; i++) {
		var char = this.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
};
