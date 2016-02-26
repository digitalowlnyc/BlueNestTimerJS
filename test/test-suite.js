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
    var toleranceInMilli = 150;

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
});