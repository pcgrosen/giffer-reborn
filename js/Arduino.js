LOW = 0x0;
HIGH = 0x1;

INPUT = 0x0;
OUTPUT = 0x1;
INPUT_PULLUP = 0x2;

function Frame(previousFrame) {
  if (typeof(previousFrame) === "undefined") {
    this.ledModes = {};
    this.ledStates = {};
    this.postDelay = 0;
  } else {
    this.ledModes = {};
    this.ledStates = {};
    for (var prop in previousFrame.ledModes) {
      this.ledModes[prop] = previousFrame.ledModes[prop];
    }
    for (var prop in previousFrame.ledStates) {
      this.ledStates[prop] = previousFrame.ledStates[prop];
    }
    this.postDelay = 0;
  }
}

Frame.prototype.getPinMode = function (pinNumber) {
  if (typeof(this.ledModes[pinNumber]) === "undefined") {
    return INPUT;
  } else {
    return this.ledModes[pinNumber];
  }
};

Frame.prototype.setPinMode = function (pinNumber, mode) {
  this.ledModes[pinNumber] = mode;
};

Frame.prototype.getPinState = function (pinNumber) {
  if (typeof(this.ledStates[pinNumber]) === "undefined") {
    return LOW;
  } else {
    return this.ledStates[pinNumber];
  }
};

Frame.prototype.setPinState = function (pinNumber, state) {
  this.ledStates[pinNumber] = state;
};

function FrameManager() {
  this.frames = [];
  this.frames[0] = new Frame();
  this.currentFrame = 0;
}

FrameManager.prototype.getPinMode = function (pinNumber, frame) {
  if (typeof(frame) === "undefined") {
    this.frames[this.currentFrame].getPinMode(pinNumber);
  } else {
    this.frames[frame].getPinMode(pinNumber);
  }
};

FrameManager.prototype.setPinMode = function (pinNumber, mode) {
  this.frames[this.currentFrame].setPinMode(pinNumber, mode);
};

FrameManager.prototype.getPinState = function (pinNumber, frame) {
  if (typeof(frame) === "undefined") {
    this.frames[this.currentFrame].getPinState(pinNumber);
  } else {
    this.frames[frame].getPinState(pinNumber);
  }
};

FrameManager.prototype.setPinState = function (pinNumber, state) {
  this.frames[this.currentFrame].setPinState(pinNumber, state);
};

FrameManager.prototype.nextFrame = function (delay) {
  this.frames[this.currentFrame].postDelay = delay;
  this.frames.push(new Frame(this.frames[this.currentFrame]));
  this.currentFrame++;
};

var load = function(rt) {
  console.log("hello, world!");
  
  // LED FUNCTIONS ////////////////////////////////////////////////
  
  var gen_int_obj = function (val) {
    return {t: rt.unsignedintTypeLiteral, v: val, left: true};
  };
  
  rt.scope[0]["LOW"] = gen_int_obj(LOW);
  rt.scope[0]["HIGH"] = gen_int_obj(HIGH);
  
  rt.scope[0]["INPUT"] = gen_int_obj(INPUT);
  rt.scope[0]["OUTPUT"] = gen_int_obj(OUTPUT);
  rt.scope[0]["INPUT_PULLUP"] = gen_int_obj(INPUT_PULLUP);
  
  frameManager = new FrameManager();
  
  var pinMode = function (rt, _this, pinNumber, mode) {
    if (mode > 2) {
      rt.raiseException("Unknown mode " + mode.toString());
      return;
    }
    frameManager.setPinMode(pinNumber.v, mode.v);
  };
  rt.regFunc(pinMode, "global", "pinMode", [rt.unsignedintTypeLiteral, rt.unsignedintTypeLiteral], rt.voidTypeLiteral);
  
  var digitalWrite = function (rt, _this, pinNumber, state) {
    if (state > 1) {
      rt.raiseException("Unknown state " + state.toString());
      return;
    }
    frameManager.setPinState(pinNumber.v, state.v);
  };
  rt.regFunc(digitalWrite, "global", "digitalWrite", [rt.unsignedintTypeLiteral, rt.unsignedintTypeLiteral], rt.voidTypeLiteral);
  
  // DELAY ////////////////////////////////////////////////////////
  
  var delay = function (rt, _this, ms) {
    frameManager.nextFrame(ms.v);
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
  rt.regFunc(to_char_star, string_t, "toCharStar", [], rt.normalPointerType(rt.charTypeLiteral));
  
  
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

  //Create serial object
  var serial_obj = {
    t: hs_t,
    v: {
      members: {}
    },
    left: false
  };
  rt.scope[0]["Serial"] = serial_obj;
  
}

arduino_h = {
  load: load
};
