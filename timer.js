var BlueNestTimer = function(
	timerDurationMilli,
	onTimerStart,
	onTimerStop,
	onTimerFinish,
	onTimerTick,
	onTimerReset
) {
	this.validCallbackTypes = {
	"start": true,
	"stop": true,
	"finish": true,
	"tick": true,
	"reset": true,
	};

	this.self = this;

	this.id = BlueNestTimer.timerCounter++;

	this.callbacks = {};
	this.registerManyCallbacks(
		onTimerStart,
		onTimerStop,
		onTimerFinish,
		onTimerTick,
		onTimerReset
	);

	this.timerDurationMilli = timerDurationMilli;
	this.timerIsRunning = false;
	this.action = "ACTION_RUNNING";
	this.totalElapsedMilli = 0;
	this.label = null;

	this.initInternals();

	this.log("Initialized");
};

BlueNestTimer.prototype.registerManyCallbacks = function(
	onTimerStart,
	onTimerStop,
	onTimerFinish,
	onTimerTick,
	onTimerReset
) {
	if (onTimerStart != null)
		this.registerCallback("start", onTimerStart);
	if (onTimerStop != null)
		this.registerCallback("stop", onTimerStop);
	if (onTimerFinish != null)
		this.registerCallback("finish", onTimerFinish);
	if (onTimerTick != null)
		this.registerCallback("tick", onTimerTick);
	if (onTimerReset != null)
		this.registerCallback("reset", onTimerReset);
}

BlueNestTimer.prototype.fireCallback = function(key, arg) {
	if(!(key in this.validCallbackTypes)) {
		throw "Bad callback fired: " + key;
	}
	if(!(key in this.callbacks)) {
		return;
	}
	this.log("Firing callbacks of type: " + key);

	var callbacks = this.callbacks[key];
	for(var x=0;x<callbacks.length;x++) {
		var thisCallback = callbacks[x];
		thisCallback(arg);
	}
}

BlueNestTimer.prototype.registerCallback = function(key, callback) {
	if(!(key in this.validCallbackTypes)) {
		throw "Bad callback register attempt: " + key;
	}
	// Initialize
	if(!(key in this.callbacks)) {
		this.callbacks[key] = [];
	}

	this.callbacks[key].push(callback.bind(this));
}

BlueNestTimer.prototype.initInternals = function() {
	this.internalIntervalId = -1;
	this.settings = {};
	this.settings.interval = 200;

	// If true, adjust interval when timer has less than
	// a full interval left on the clock. For example, if the timer
	// interval is 500ms and we have 350ms until the timer finishes,
	// adjust to "minimumInterval" so the stopping of the timer is more
	// accurate. Otherwise we may go over the stop time.
	this.settings.adjustIntervalNearFinish = false;
	this.settings.minimumInterval = 20;

	this.loggingEnabled = true;
	this.intervalStartTime = null;
}

/**
	Static no-arg constructor 
**/
BlueNestTimer.create = function(parent) {
	var F = function() {};
	F.prototype = BlueNestTimer.prototype;
	return new F();
}

BlueNestTimer.prototype.log = function(msg) {
	if(this.loggingEnabled)
		console.log("BlueNestTimer.js:" + msg);
}

BlueNestTimer.prototype.setLabel = function(label) {
	this.label = label;
}

BlueNestTimer.prototype.getLabel = function() {
	return this.label;
}

BlueNestTimer.prototype.reset = function() {
	this.clearInternalInterval(true); // should be stopped if we completed
	this.timerIsRunning = false;
	this.action = "ACTION_RUNNING";
	this.totalElapsedMilli = 0;
	this.fireCallback("reset");
}

BlueNestTimer.prototype.noCallbacks = function() {
	this.log("Setting empty callbacks");
	this.callbacks = {};
};

BlueNestTimer.prototype.debug = function() {
	this.log("Setting debug callbacks");
	this.loggingEnabled = true;

	function debugString(self) {
		return "Timer[" + self.id + "] ";
	}
	this.registerCallback("start", function() {
		this.log("Debug: " + debugString(this) + " start");
	});
	this.registerCallback("stop", function() {
		this.log("Debug: stop");
	});
	this.registerCallback("finish", function() {
		this.log("Debug: finish: " + this.totalElapsedMilli);
	});
	this.registerCallback("tick", function(elapsed) {
		this.log(debugString(this) + this.totalElapsedMilli);
	});
	this.registerCallback("reset", function() {
		this.log("Debug: reset");
	});
};

// For unique counter identifiers
BlueNestTimer.timerCounter = 1000;

/**
	intervalStarteTime: can be null
**/
BlueNestTimer.prototype.start = function(intervalStartTime) {
	var force = (typeof intervalStartTime !== "undefined");

	if(!force) {
		if(this.timerIsRunning) {
			console.log("Timer is already running");
			return;
		}
		if(this.isFinished()) {
			console.log("Timer is already finished");
			return;
		}
	}

	this.interval = this.settings.interval;

	this.timerIsRunning = true;
	this.action = "ACTION_RUNNING";

	this.intervalStartTime = intervalStartTime || Date.now();

	if (this.internalIntervalId === -1) {
		this.fireCallback("start");
		this.log("Starting timer: " + this.getDescription());
		this.startInterval();
	}
};

BlueNestTimer.prototype.getDescription = function() {
	return this.totalElapsedMilli + "/" + this.timerDurationMilli + " [last=" + this.intervalStartTime + "][running=" + this.timerIsRunning + "]";
}

BlueNestTimer.prototype.getTime = function() {
	return this.totalElapsedMilli;
}

BlueNestTimer.prototype.getDuration = function() {
	return this.timerDurationMilli;
}

BlueNestTimer.prototype.startInterval = function() {
	console.log("Interval: " + this.interval);
	this.internalIntervalId = setInterval(this.updateTimer.bind(this), this.interval);
}

BlueNestTimer.prototype.settingInterval = function(newInterval) {
	console.log("setting interval to: " + newInterval);
	this.settings.interval = newInterval;
}

BlueNestTimer.prototype.adjustInterval = function(newInterval) {
	this.stopInterval();
	this.interval = newInterval;
	this.startInterval();
}

BlueNestTimer.prototype.clearInternalInterval = function(bypassCheck) {
	if(typeof bypassCheck === "undefined") {
		bypassCheck = false;
	}

	if(!bypassCheck) {
		if (this.internalIntervalId === -1) {
			throw "Interval was not set up correctly";
		}
	}

	clearInterval(this.internalIntervalId);
	this.internalIntervalId = -1;
}

BlueNestTimer.prototype.restoreState = function(timerState) {

	this.id = timerState["id"];
	this.label = timerState["label"];

	this.timerDurationMilli = timerState["timerDurationMilli"];
	this.action = timerState["action"];
	this.totalElapsedMilli = timerState["totalElapsedMilli"];

	var timerIsRunning = timerState["timerIsRunning"];

	if (timerIsRunning) {
		this.start(timerState["intervalStartTime"]);
	}

	this.log("Build timer");
}

BlueNestTimer.prototype.timerSynchronize = function(data) {
	this.log("BlueNestTimer.prototype.timerSynchronize: " + data);
	this.clearInternalInterval(true);

	this.restoreState(data);
}

BlueNestTimer.prototype.getState = function() {
	return {
		"id": this.id,
		"timerDurationMilli": this.timerDurationMilli,
		"timerIsRunning": this.timerIsRunning,
		"action": this.action,
		"totalElapsedMilli": this.totalElapsedMilli,

		"intervalStartTime": this.intervalStartTime,

		// kind of a hack
		"label": this.label
	};
}

BlueNestTimer.prototype.destroy = function() {
	this.timerIsRunning = false;
	this.clearInternalInterval(true);
}

BlueNestTimer.prototype.stop = function() {
	if(!this.timerIsRunning) {
		console.log("Timer is already stopped");
		return;
	}
	this.clearInternalInterval();
	this.log("Stopping.....");
	this.action = "ACTION_STOP";
	this.timerIsRunning = false;
	this.fireCallback("stop");
};

BlueNestTimer.prototype.isFinished = function() {
	return !this.timerIsRunning && (this.totalElapsedMilli == this.timerDurationMilli);
}

BlueNestTimer.prototype.finished = function() {
	console.log("Finished");
	this.clearInternalInterval();
	this.timerIsRunning = false;

	// hack:
	// timer can go over if we are in the middle of an interval
	// perhaps make intervals smaller as end approaches
	this.totalElapsedMilli = this.timerDurationMilli;
}

BlueNestTimer.prototype.updateTimer = function() {
	var now = Date.now();
	lastIntervalStartTime = this.intervalStartTime;
	this.intervalStartTime = now;

	//TODO See if this timerIsRunning logic can be removed
	if (this.timerIsRunning) {
		if(this.action === "ACTION_STOP") {
			this.timerIsRunning = false;
			return;
		}
	} else {
		return;
	}

	var elapsedMilli = now - lastIntervalStartTime;
	this.totalElapsedMilli += elapsedMilli;

	var timeLeft = this.timerDurationMilli - this.totalElapsedMilli;

	if (timeLeft <= 0) {
		this.finished();
		this.fireCallback("finish");
	} else {
		this.fireCallback("tick", this.totalElapsedMilli);
		if (this.settings.adjustIntervalNearFinish) {
			if (timeLeft < this.interval && this.interval != this.settings.minimumInterval) {
				console.log("Adjust to lower interval");
				this.adjustInterval(this.settings.minimumInterval);
			}
		}
	}
};

module.exports = BlueNestTimer;