var editor = ace.edit("editor");
editor.getSession().setMode("ace/mode/c_cpp");

var code = `#include <iostream>
#include "Arduino.h"
using namespace std;
int main() {
    int x;
    cin >> x;
    cout << x << endl;
    return 0;
}`;

editor.setValue(code);

editor.commands.addCommand({
   name: "run",
   bindKey: {win: "Ctrl-Enter", mac: "Ctrl-Enter"},
   exec: runCode
});

console.log(arduino_h);

function runCode() {
  var code = editor.getValue();
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
  var exitCode = JSCPP.run(code, input, config);
  document.getElementById("console-output").innerHTML = output;
}
