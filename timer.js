var BlueNestTimer = function(
	timerDurationMilli,
	onTimerStart,
	onTimerStop,
	onTimerFinish,
	onTimerTick
) {
	this.self = this;

	this.id = BlueNestTimer.timerCounter++;

	this.registerCallbacks(
		onTimerStart,
		onTimerStop,
		onTimerFinish,
		onTimerTick
	);

	this.timerDurationMilli = timerDurationMilli;
	this.timerIsRunning = false;
	this.action = "ACTION_RUNNING";
	this.totalElapsedMilli = 0;
	this.label = null;

	this.initInternals();

	this.log("Initialized");
};

BlueNestTimer.prototype.registerCallbacks = function(
	onTimerStart,
	onTimerStop,
	onTimerFinish,
	onTimerTick
) {
	if (onTimerStart != null)
		this.onTimerStart = onTimerStart;
	if (onTimerStop != null)
		this.onTimerStop = onTimerStop;
	if (onTimerFinish != null)
		this.onTimerFinish = onTimerFinish;
	if (onTimerTick != null)
		this.onTimerTick = onTimerTick;
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
}

//FIXME: callbacks
BlueNestTimer.prototype.noCallbacks = function() {
	this.log("Setting empty callbacks");
	this.onTimerStart = function() {};
	this.onTimerStop = function() {};
	this.onTimerFinish = function() {};
	this.onTimerTick = function() {};
};

BlueNestTimer.prototype.debug = function() {
	this.log("Setting debug callbacks");
	this.loggingEnabled = true;

	function debugString(self) {
		return "Timer[" + self.id + "] ";
	}
	this.onTimerStart = function() {
		this.log(debugString(this) + " start")
	};
	this.onTimerStop = function() {
		this.log("Debug: stop")
	};
	this.onTimerFinish = function() {
		this.log("Debug: finish: " + this.totalElapsedMilli)
	};
	this.onTimerTick = function(elapsed) {
		this.log(debugString(this) + this.totalElapsedMilli)
	};
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
		if (this.onTimerStart != null)
			this.onTimerStart.bind(this.self)();
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
	if (this.onTimerStop != null)
			this.onTimerStop.bind(this.self)();
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

		if (this.onTimerFinish != null)
			this.onTimerFinish.bind(this.self)();
	} else {
		if (this.onTimerTick != null)
			this.onTimerTick.bind(this.self)(this.totalElapsedMilli);
		if (this.settings.adjustIntervalNearFinish) {
			if (timeLeft < this.interval && this.interval != this.settings.minimumInterval) {
				console.log("Adjust to lower interval");
				this.adjustInterval(this.settings.minimumInterval);
			}
		}
	}
};

module.exports = BlueNestTimer;