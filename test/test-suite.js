var assert = require('assert');
var BlueNestTimer = require("../timer.js");
var chai = require("chai");

describe('Test Suite: BlueNestTimer', function() {
  this.timeout(15000);

  // Adds a before to setTimeout calls. For example, we might run the BlueNestTimer for 5 seconds,
  // so we will set the test timeout to wait 5 + timeoutBuffer so we are sure it ran to completion.
  var timeoutBuffer = 600;

  it('should run for X seconds between start and stop', function(done) {
    var runTimerFor = 3000;
    var toleranceInMilli = 250;

    // Add a few seconds because we want to use stop() and not have the timer actually complete
    var timer = new BlueNestTimer(runTimerFor + 5000);
    timer.start();

    // Run it for X seconds
    setTimeout(function() {
      // Stop the timer
      timer.stop();
      var elapsed = timer.getTime();
      chai.expect(elapsed).to.be.within(runTimerFor - toleranceInMilli, runTimerFor + toleranceInMilli);

      // Wait another 100 ms and make sure elapsed time is the same(i.e the timer was stopped successfully)
      setTimeout(function() {
        chai.expect(timer.getTime()).to.equal(elapsed);
        console.log("Done");
        done();
      }, 100);
    }, runTimerFor);

  });

  it('should execute callback every X seconds', function(done) {
    var interval = 1000;

    var runTimerFor = 3500;
    var tickCounter = 0;

    var expectedCallbacks = Math.floor(runTimerFor / interval);


    var countTickFunc = function() {
      tickCounter += 1;
      console.log("Tick #" + tickCounter);
    };
    // Tick counter is result of start callback + tick callbacks
    // Add a few seconds because we want to use stop() and not have the timer actually complete
    var timer = new BlueNestTimer(runTimerFor + 5000, null, null, countTickFunc, countTickFunc);
    timer.settingInterval(interval);
    timer.start();

    // Run it for X seconds
    setTimeout(function() {
      // Stop the timer
      timer.stop();

      var elapsed = timer.getTime();
      chai.expect(tickCounter).to.equal(expectedCallbacks);
      done();
    }, runTimerFor);

  });

  it('should call finish callback when completed', function(done) {

    var runTimerFor = 1000;

    var finishCallbackCalled = false;
    var finishCallback = function() {
      console.log("hit finishCallback");
      finishCallbackCalled = true;
    };
    // Tick counter is result of start callback + tick callbacks
    // Add a few seconds because we want to use stop() and not have the timer actually complete
    var timer = new BlueNestTimer(runTimerFor, null, null, finishCallback, null);
    timer.start();

    // Run it for X seconds
    setTimeout(function() {
      chai.expect(finishCallbackCalled).to.be.true;
      chai.expect(timer.isFinished()).to.be.true;
      done();
    }, runTimerFor + timeoutBuffer);

  });

  it('should count only elapsed time when starting/stopping', function(done) {
    var toleranceInMilli = 10;
    this.timeout(30000);
    var runTimerFor = 30000; // long enough where we don't ever hit

    // Tick counter is result of start callback + tick callbacks
    // Add a few seconds because we want to use stop() and not have the timer actually complete
    var timer = new BlueNestTimer(runTimerFor, null, null, null, null);
    timer.settingInterval(1);

    var state = "running";
    var startTime = cycleStart = null;
    var cycleCount = 0;
    var totalCycles = 3;
    var cycleDuration = 2000;
    var timeoutHelper = function() {
      var elapsed = Date.now() - cycleStart;
      if (elapsed < cycleDuration) {
        setTimeout(timeoutHelper, 1);
        return;
      }
      console.log("Elapsed: " + elapsed);
      if (state === "running") {
        cycleCount += 1;
        timer.stop();
        state = "stopped";
      } else {
        timer.start();
        state = "running";
      };
      if (cycleCount > totalCycles) {
        totalTime = cycleDuration * cycleCount;
        chai.expect(timer.getTime()).to.be.within(totalTime - toleranceInMilli, totalTime + toleranceInMilli);
        done();
      } else {
        cycleStart = Date.now();
        setTimeout(timeoutHelper, 1);
      }
    }
    startTime = cycleStart = Date.now();
    timer.start();
    setTimeout(timeoutHelper, 1);
  });

  it('should be able to reset and reuse a timer', function(done) {
    var toleranceInMilli = 10;
    this.timeout(30000);
    var runTimerFor = 30000; // long enough where we don't ever hit

    // Tick counter is result of start callback + tick callbacks
    // Add a few seconds because we want to use stop() and not have the timer actually complete
    var timer = new BlueNestTimer(runTimerFor, null, null, null, null);
    timer.settingInterval(1);
    timer.start();

    var firstRunTime = 1000;
    var secondRunTime = 3000;
    setTimeout(function() {
      timer.reset();
      timer.start();
      setTimeout(function() {
        timer.stop();
        chai.expect(timer.getTime()).to.be.within(secondRunTime - toleranceInMilli, secondRunTime + toleranceInMilli);
        done();
      }, secondRunTime);
    }, firstRunTime);
  });

  it('should be clonable via getState and timerSynchronize', function(done) {
    this.timeout(10000);


    var startWasCalled = false;
    var startTimerCallback = function() {
      startWasCalled = true;
    }

    var timer = new BlueNestTimer(5000);
    timer.start();
    timer.getState();
    setTimeout(function() {
      var state = timer.getState();
      var newTimer = new BlueNestTimer(1, startTimerCallback);
      newTimer.timerSynchronize(state);

      var newState = newTimer.getState();

      // expected to be different, so null them out
      state.intervalStartTime = null;
      newState.intervalStartTime = null;

      chai.expect(newState.timerIsRunning).to.be.true;
      chai.expect(startWasCalled).to.be.true;
      chai.expect(newState).to.eql(state);
      done();
    }, 1000);
  });

  it('calling [start/stop/reset] twice in a row should be ok', function() {

    var timer = new BlueNestTimer(1000, null, null, null, null);
    timer.start();
    timer.start();
    console.log("Start called twice");
    chai.expect(true).to.equal(true); //TODO find a more semantic way to do this

    timer.stop();
    timer.stop();
    console.log("Stop called twice");

    chai.expect(true).to.equal(true);
    timer.reset();
    timer.reset();
    console.log("Reset called twice");

    chai.expect(true).to.equal(true); 
  });

  it('calling start/stop should call appropriate callbacks', function() {
    var startCallbackWasCalled = false;
    var startCallback = function() {
      startCallbackWasCalled = true;
    }

    var stopCallbackWasCalled = false;
    var stopCallback = function() {
      stopCallbackWasCalled = true;
    }
    var timer = new BlueNestTimer(1000, startCallback, stopCallback, null, null);
    timer.settingInterval(1);
    chai.expect(startCallbackWasCalled).to.be.false;
    chai.expect(stopCallbackWasCalled).to.be.false; 

    timer.start();

    chai.expect(startCallbackWasCalled).to.be.true;
    chai.expect(stopCallbackWasCalled).to.be.false; 

    timer.stop();
    chai.expect(startCallbackWasCalled).to.be.true;
    chai.expect(stopCallbackWasCalled).to.be.true;
  });
});