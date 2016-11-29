importScripts("FrameManager.js");

var load = function(rt) {

  // PIN FUNCTIONS ////////////////////////////////////////////////

  var gen_int_obj = function (val) {
    return {t: rt.unsignedintTypeLiteral, v: val, left: true};
  };

  rt.scope[0]["LOW"] = gen_int_obj(LOW);
  rt.scope[0]["HIGH"] = gen_int_obj(HIGH);

  rt.scope[0]["INPUT"] = gen_int_obj(INPUT);
  rt.scope[0]["OUTPUT"] = gen_int_obj(OUTPUT);
  // rt.scope[0]["INPUT_PULLUP"] = gen_int_obj(INPUT_PULLUP);

  frameManager = new FrameManager();

  for (var i = 0; i < analogPins.length; i++) {
    var pin = analogPins[i];
    frameManager.setPinMode(pin.pin_number, INPUT);
    frameManager.setPinState(pin.pin_number, pin.pin_value);
  }

  var pinMode = function (rt, _this, pinNumber, mode) {
    if (mode > 2) {
      rt.raiseException("Unknown mode " + mode.toString());
      return;
    }
    frameManager.setPinMode(pinNumber.v, mode.v);
  };
  rt.regFunc(pinMode, "global", "pinMode", [rt.unsignedintTypeLiteral, rt.unsignedintTypeLiteral], rt.voidTypeLiteral);

  var digitalWrite = function (rt, _this, pinNumber, state) {
    if (frameManager.getPinMode(pinNumber.v) !== OUTPUT) {
      rt.raiseException("Attempted to write to an input pin in digitalWrite.");
      return;
    }
    if (state.v > 1) {
      rt.raiseException("Unknown state " + state.v.toString() + " passed to digitalWrite.");
      return;
    }
    var val;
    if (state.v == HIGH) {
      val = ANALOG_MAX;
    } else {
      val = 0;
    }
    frameManager.setPinState(pinNumber.v, val);
  };
  rt.regFunc(digitalWrite, "global", "digitalWrite", [rt.unsignedintTypeLiteral, rt.unsignedintTypeLiteral], rt.voidTypeLiteral);

  var analogRead = function (rt, _this, pinNumber) {
    return {t: rt.intTypeLiteral, v: frameManager.getPinState(pinNumber.v, frameManager.currentFrame), left: true};
  };
  rt.regFunc(analogRead, "global", "analogRead", [rt.unsignedintTypeLiteral], rt.intTypeLiteral);

  var analogWrite = function (rt, _this, pinNumber, value) {
    if (frameManager.getPinMode(pinNumber.v) !== OUTPUT) {
      rt.raiseException("Attempted to write to an input pin in analogWrite.");
      return;
    }
    frameManager.setPinState(pinNumber.v, value.v);
  };
  rt.regFunc(analogWrite, "global", "analogWrite", [rt.unsignedintTypeLiteral, rt.unsignedintTypeLiteral], rt.voidTypeLiteral);

  // DELAY ////////////////////////////////////////////////////////

  var delay = function (rt, _this, ms) {
    frameManager.nextFrame(ms.v);
    var message = {delay: ms.v, newFrameNumber: frameManager.currentFrame, type: "newFrame"};
    this.postMessage(JSON.stringify(message));
  };
  rt.regFunc(delay, "global", "delay", [rt.primitiveType("unsigned long")], rt.voidTypeLiteral);

  // STRING ///////////////////////////////////////////////////////
  //Define type
  var string_t = rt.newClass("String", [
    {
      type: rt.normalPointerType(rt.charTypeLiteral),
      name: "buffer"
    }, {
      type: rt.unsignedintTypeLiteral,
      name: "capacity"
    }, {
      type: rt.unsignedintTypeLiteral,
      name: "len"
    }
  ]);
  rt.types[rt.getTypeSignature(string_t)] = {
    "#father": "object"
  };
  var to_char_star = function(rt, _this) {
    return _this.v.members.buffer;
  };
  rt.regFunc(to_char_star, string_t, "c_str", [], rt.normalPointerType(rt.charTypeLiteral));


  // SERIAL ///////////////////////////////////////////////////////
  //Define types
  var print_t = rt.newClass("Print", []);
  rt.types[rt.getTypeSignature(print_t)] = {
    "#father": "object"
  };
  var stream_t = rt.newClass("Stream", []);
  rt.types[rt.getTypeSignature(stream_t)] = {
    "#father": "Print"
  };
  var hs_t = rt.newClass("HardwareSerial", []);
  rt.types[rt.getTypeSignature(hs_t)] = {
    "#father": "Stream"
  };

  var begin = function (rt, _this, rate) {
    if (_this.v.initialized) {
      rt.raiseException("Serial initialized twice.");
    }
    _this.v.initialized = true;
    _this.v.rate = rate.v;
  };
  rt.regFunc(begin, hs_t, "begin", [rt.unsignedintTypeLiteral], rt.voidTypeLiteral);

  var do_output = function(text) {
    frameManager.addOutputText(text);
    var message = {text: text, type: "output"};
    this.postMessage(JSON.stringify(message));
  };

  function get_string_for(rt, _this, thing) {
    if (rt.isStringType(thing.t)) {
      return rt.getStringFromCharArray(thing);
    } else {
      return "" + thing.v;
    }
  }

  var print = function (rt, _this, thing) {
    if (!_this.v.initialized) {
      rt.raiseException("Serial used before initialization.");
    }
    do_output("" + get_string_for(rt, _this, thing));
  };
  rt.regFunc(print, hs_t, "print", ["#default"], rt.voidTypeLiteral);

  var println = function(rt, _this, thing) {
    if (!_this.v.initialized) {
      rt.raiseException("Serial used before initialization.");
    }
    do_output("" + get_string_for(rt, _this, thing) + "\n");
  };
  rt.regFunc(println, hs_t, "println", ["#default"], rt.voidTypeLiteral);

  //Create serial object
  var serial_obj = {
    t: hs_t,
    v: {
      rate: 0,
      initialized: false,
      members: {}
    },
    left: false
  };
  rt.scope[0]["Serial"] = serial_obj;

};

arduino_h = {
  load: load
};


function messageHandler(event) {
  var code = event.data.code;
  analogPins = event.data.analogPins;
  var config = {
    includes: {
      "Arduino.h": arduino_h //defined in Arduino.js
    }
  };
  JSCPP.run(code, "", config);
  var out = {frameManager: JSON.stringify(frameManager), type: "frameManager"};
  this.postMessage(JSON.stringify(out));
}

this.addEventListener("message", messageHandler, false);

importScripts("JSCPP.js");
