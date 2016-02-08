var editor = ace.edit("editor")  
editor.getSession().setMode("ace/mode/c_cpp")  

var code
if (typeof(localStorage.code) === "undefined") {
  code = `
void setup() {
    
}

void loop() {
    
}`
} else {
  code = localStorage.code
}

editor.setValue(code)
editor.focus()

editor.commands.addCommand({
   name: "run",
   bindKey: {win: "Ctrl-Enter", mac: "Ctrl-Enter"},
   exec: runCode
})  

console.log(arduino_h)  

running = false

function runCode() {
  if (running) {
    return
  }
  running = true
  var code = "#include \"Arduino.h\"\n" + editor.getValue() + "\n\nint main() { setup(); loop(); return 0;}\n"
  //var code = editor.getValue()
  var input = "4321"  
  var output = ""  
  var config = {
    stdio: {
      write: function(s) {
        output += s  
      }
    },
    includes: {
      "Arduino.h": arduino_h //defined in Arduino.js
    }
  }  
  var exitCode = JSCPP.run(code, input, config)  
  document.getElementById("console-output").innerHTML = JSON.stringify(frameManager)
  console.log(frameManager)
  running = false
}

function saveCode() {
  localStorage.code = editor.getValue()
}