(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":3}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;


  /*
  Default comparison function to be used
   */

  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };


  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */

  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };


  /*
  Push item onto heap, maintaining the heap invariant.
   */

  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };


  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */

  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };


  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */

  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };


  /*
  Fast version of a heappush followed by a heappop.
   */

  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };


  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */

  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };


  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */

  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };


  /*
  Find the n largest elements in a dataset.
   */

  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };


  /*
  Find the n smallest elements in a dataset.
   */

  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.updateItem = updateItem;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = Heap;
  } else {
    window.Heap = Heap;
  }

}).call(this);

},{}],4:[function(require,module,exports){
module.exports = require('./src/PathFinding');

},{"./src/PathFinding":5}],5:[function(require,module,exports){
module.exports = {
    'Heap'                      : require('heap'),
    'Node'                      : require('./core/Node'),
    'Grid'                      : require('./core/Grid'),
    'Util'                      : require('./core/Util'),
    'DiagonalMovement'          : require('./core/DiagonalMovement'),
    'Heuristic'                 : require('./core/Heuristic'),
    'AStarFinder'               : require('./finders/AStarFinder'),
    'BestFirstFinder'           : require('./finders/BestFirstFinder'),
    'BreadthFirstFinder'        : require('./finders/BreadthFirstFinder'),
    'DijkstraFinder'            : require('./finders/DijkstraFinder'),
    'BiAStarFinder'             : require('./finders/BiAStarFinder'),
    'BiBestFirstFinder'         : require('./finders/BiBestFirstFinder'),
    'BiBreadthFirstFinder'      : require('./finders/BiBreadthFirstFinder'),
    'BiDijkstraFinder'          : require('./finders/BiDijkstraFinder'),
    'IDAStarFinder'             : require('./finders/IDAStarFinder'),
    'JumpPointFinder'           : require('./finders/JumpPointFinder'),
};

},{"./core/DiagonalMovement":6,"./core/Grid":7,"./core/Heuristic":8,"./core/Node":9,"./core/Util":10,"./finders/AStarFinder":11,"./finders/BestFirstFinder":12,"./finders/BiAStarFinder":13,"./finders/BiBestFirstFinder":14,"./finders/BiBreadthFirstFinder":15,"./finders/BiDijkstraFinder":16,"./finders/BreadthFirstFinder":17,"./finders/DijkstraFinder":18,"./finders/IDAStarFinder":19,"./finders/JumpPointFinder":24,"heap":2}],6:[function(require,module,exports){
var DiagonalMovement = {
    Always: 1,
    Never: 2,
    IfAtMostOneObstacle: 3,
    OnlyWhenNoObstacles: 4
};

module.exports = DiagonalMovement;
},{}],7:[function(require,module,exports){
var Node = require('./Node');
var DiagonalMovement = require('./DiagonalMovement');

/**
 * The Grid class, which serves as the encapsulation of the layout of the nodes.
 * @constructor
 * @param {number|Array<Array<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
 * @param {number} height Number of rows of the grid.
 * @param {Array<Array<(number|boolean)>>} [matrix] - A 0-1 matrix
 *     representing the walkable status of the nodes(0 or false for walkable).
 *     If the matrix is not supplied, all the nodes will be walkable.  */
function Grid(width_or_matrix, height, matrix) {
    var width;

    if (typeof width_or_matrix !== 'object') {
        width = width_or_matrix;
    } else {
        height = width_or_matrix.length;
        width = width_or_matrix[0].length;
        matrix = width_or_matrix;
    }

    /**
     * The number of columns of the grid.
     * @type number
     */
    this.width = width;
    /**
     * The number of rows of the grid.
     * @type number
     */
    this.height = height;

    /**
     * A 2D array of nodes.
     */
    this.nodes = this._buildNodes(width, height, matrix);
}

/**
 * Build and return the nodes.
 * @private
 * @param {number} width
 * @param {number} height
 * @param {Array<Array<number|boolean>>} [matrix] - A 0-1 matrix representing
 *     the walkable status of the nodes.
 * @see Grid
 */
Grid.prototype._buildNodes = function(width, height, matrix) {
    var i, j,
        nodes = new Array(height);

    for (i = 0; i < height; ++i) {
        nodes[i] = new Array(width);
        for (j = 0; j < width; ++j) {
            nodes[i][j] = new Node(j, i);
        }
    }


    if (matrix === undefined) {
        return nodes;
    }

    if (matrix.length !== height || matrix[0].length !== width) {
        throw new Error('Matrix size does not fit');
    }

    for (i = 0; i < height; ++i) {
        for (j = 0; j < width; ++j) {
            if (matrix[i][j]) {
                // 0, false, null will be walkable
                // while others will be un-walkable
                nodes[i][j].walkable = false;
            }
        }
    }

    return nodes;
};


Grid.prototype.getNodeAt = function(x, y) {
    return this.nodes[y][x];
};


/**
 * Determine whether the node at the given position is walkable.
 * (Also returns false if the position is outside the grid.)
 * @param {number} x - The x coordinate of the node.
 * @param {number} y - The y coordinate of the node.
 * @return {boolean} - The walkability of the node.
 */
Grid.prototype.isWalkableAt = function(x, y) {
    return this.isInside(x, y) && this.nodes[y][x].walkable;
};


/**
 * Determine whether the position is inside the grid.
 * XXX: `grid.isInside(x, y)` is wierd to read.
 * It should be `(x, y) is inside grid`, but I failed to find a better
 * name for this method.
 * @param {number} x
 * @param {number} y
 * @return {boolean}
 */
Grid.prototype.isInside = function(x, y) {
    return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};


/**
 * Set whether the node on the given position is walkable.
 * NOTE: throws exception if the coordinate is not inside the grid.
 * @param {number} x - The x coordinate of the node.
 * @param {number} y - The y coordinate of the node.
 * @param {boolean} walkable - Whether the position is walkable.
 */
Grid.prototype.setWalkableAt = function(x, y, walkable) {
    this.nodes[y][x].walkable = walkable;
};


/**
 * Get the neighbors of the given node.
 *
 *     offsets      diagonalOffsets:
 *  +---+---+---+    +---+---+---+
 *  |   | 0 |   |    | 0 |   | 1 |
 *  +---+---+---+    +---+---+---+
 *  | 3 |   | 1 |    |   |   |   |
 *  +---+---+---+    +---+---+---+
 *  |   | 2 |   |    | 3 |   | 2 |
 *  +---+---+---+    +---+---+---+
 *
 *  When allowDiagonal is true, if offsets[i] is valid, then
 *  diagonalOffsets[i] and
 *  diagonalOffsets[(i + 1) % 4] is valid.
 * @param {Node} node
 * @param {DiagonalMovement} diagonalMovement
 */
Grid.prototype.getNeighbors = function(node, diagonalMovement) {
    var x = node.x,
        y = node.y,
        neighbors = [],
        s0 = false, d0 = false,
        s1 = false, d1 = false,
        s2 = false, d2 = false,
        s3 = false, d3 = false,
        nodes = this.nodes;

    // ↑
    if (this.isWalkableAt(x, y - 1)) {
        neighbors.push(nodes[y - 1][x]);
        s0 = true;
    }
    // →
    if (this.isWalkableAt(x + 1, y)) {
        neighbors.push(nodes[y][x + 1]);
        s1 = true;
    }
    // ↓
    if (this.isWalkableAt(x, y + 1)) {
        neighbors.push(nodes[y + 1][x]);
        s2 = true;
    }
    // ←
    if (this.isWalkableAt(x - 1, y)) {
        neighbors.push(nodes[y][x - 1]);
        s3 = true;
    }

    if (diagonalMovement === DiagonalMovement.Never) {
        return neighbors;
    }

    if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
        d0 = s3 && s0;
        d1 = s0 && s1;
        d2 = s1 && s2;
        d3 = s2 && s3;
    } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
        d0 = s3 || s0;
        d1 = s0 || s1;
        d2 = s1 || s2;
        d3 = s2 || s3;
    } else if (diagonalMovement === DiagonalMovement.Always) {
        d0 = true;
        d1 = true;
        d2 = true;
        d3 = true;
    } else {
        throw new Error('Incorrect value of diagonalMovement');
    }

    // ↖
    if (d0 && this.isWalkableAt(x - 1, y - 1)) {
        neighbors.push(nodes[y - 1][x - 1]);
    }
    // ↗
    if (d1 && this.isWalkableAt(x + 1, y - 1)) {
        neighbors.push(nodes[y - 1][x + 1]);
    }
    // ↘
    if (d2 && this.isWalkableAt(x + 1, y + 1)) {
        neighbors.push(nodes[y + 1][x + 1]);
    }
    // ↙
    if (d3 && this.isWalkableAt(x - 1, y + 1)) {
        neighbors.push(nodes[y + 1][x - 1]);
    }

    return neighbors;
};


/**
 * Get a clone of this grid.
 * @return {Grid} Cloned grid.
 */
Grid.prototype.clone = function() {
    var i, j,

        width = this.width,
        height = this.height,
        thisNodes = this.nodes,

        newGrid = new Grid(width, height),
        newNodes = new Array(height);

    for (i = 0; i < height; ++i) {
        newNodes[i] = new Array(width);
        for (j = 0; j < width; ++j) {
            newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
        }
    }

    newGrid.nodes = newNodes;

    return newGrid;
};

module.exports = Grid;

},{"./DiagonalMovement":6,"./Node":9}],8:[function(require,module,exports){
/**
 * @namespace PF.Heuristic
 * @description A collection of heuristic functions.
 */
module.exports = {

  /**
   * Manhattan distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} dx + dy
   */
  manhattan: function(dx, dy) {
      return dx + dy;
  },

  /**
   * Euclidean distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} sqrt(dx * dx + dy * dy)
   */
  euclidean: function(dx, dy) {
      return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Octile distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} sqrt(dx * dx + dy * dy) for grids
   */
  octile: function(dx, dy) {
      var F = Math.SQRT2 - 1;
      return (dx < dy) ? F * dx + dy : F * dy + dx;
  },

  /**
   * Chebyshev distance.
   * @param {number} dx - Difference in x.
   * @param {number} dy - Difference in y.
   * @return {number} max(dx, dy)
   */
  chebyshev: function(dx, dy) {
      return Math.max(dx, dy);
  }

};

},{}],9:[function(require,module,exports){
/**
 * A node in grid. 
 * This class holds some basic information about a node and custom 
 * attributes may be added, depending on the algorithms' needs.
 * @constructor
 * @param {number} x - The x coordinate of the node on the grid.
 * @param {number} y - The y coordinate of the node on the grid.
 * @param {boolean} [walkable] - Whether this node is walkable.
 */
function Node(x, y, walkable) {
    /**
     * The x coordinate of the node on the grid.
     * @type number
     */
    this.x = x;
    /**
     * The y coordinate of the node on the grid.
     * @type number
     */
    this.y = y;
    /**
     * Whether this node can be walked through.
     * @type boolean
     */
    this.walkable = (walkable === undefined ? true : walkable);
}

module.exports = Node;

},{}],10:[function(require,module,exports){
/**
 * Backtrace according to the parent records and return the path.
 * (including both start and end nodes)
 * @param {Node} node End node
 * @return {Array<Array<number>>} the path
 */
function backtrace(node) {
    var path = [[node.x, node.y]];
    while (node.parent) {
        node = node.parent;
        path.push([node.x, node.y]);
    }
    return path.reverse();
}
exports.backtrace = backtrace;

/**
 * Backtrace from start and end node, and return the path.
 * (including both start and end nodes)
 * @param {Node}
 * @param {Node}
 */
function biBacktrace(nodeA, nodeB) {
    var pathA = backtrace(nodeA),
        pathB = backtrace(nodeB);
    return pathA.concat(pathB.reverse());
}
exports.biBacktrace = biBacktrace;

/**
 * Compute the length of the path.
 * @param {Array<Array<number>>} path The path
 * @return {number} The length of the path
 */
function pathLength(path) {
    var i, sum = 0, a, b, dx, dy;
    for (i = 1; i < path.length; ++i) {
        a = path[i - 1];
        b = path[i];
        dx = a[0] - b[0];
        dy = a[1] - b[1];
        sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
}
exports.pathLength = pathLength;


/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array<Array<number>>} The coordinates on the line
 */
function interpolate(x0, y0, x1, y1) {
    var abs = Math.abs,
        line = [],
        sx, sy, dx, dy, err, e2;

    dx = abs(x1 - x0);
    dy = abs(y1 - y0);

    sx = (x0 < x1) ? 1 : -1;
    sy = (y0 < y1) ? 1 : -1;

    err = dx - dy;

    while (true) {
        line.push([x0, y0]);

        if (x0 === x1 && y0 === y1) {
            break;
        }
        
        e2 = 2 * err;
        if (e2 > -dy) {
            err = err - dy;
            x0 = x0 + sx;
        }
        if (e2 < dx) {
            err = err + dx;
            y0 = y0 + sy;
        }
    }

    return line;
}
exports.interpolate = interpolate;


/**
 * Given a compressed path, return a new path that has all the segments
 * in it interpolated.
 * @param {Array<Array<number>>} path The path
 * @return {Array<Array<number>>} expanded path
 */
function expandPath(path) {
    var expanded = [],
        len = path.length,
        coord0, coord1,
        interpolated,
        interpolatedLen,
        i, j;

    if (len < 2) {
        return expanded;
    }

    for (i = 0; i < len - 1; ++i) {
        coord0 = path[i];
        coord1 = path[i + 1];

        interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
        interpolatedLen = interpolated.length;
        for (j = 0; j < interpolatedLen - 1; ++j) {
            expanded.push(interpolated[j]);
        }
    }
    expanded.push(path[len - 1]);

    return expanded;
}
exports.expandPath = expandPath;


/**
 * Smoothen the give path.
 * The original path will not be modified; a new path will be returned.
 * @param {PF.Grid} grid
 * @param {Array<Array<number>>} path The path
 */
function smoothenPath(grid, path) {
    var len = path.length,
        x0 = path[0][0],        // path start x
        y0 = path[0][1],        // path start y
        x1 = path[len - 1][0],  // path end x
        y1 = path[len - 1][1],  // path end y
        sx, sy,                 // current start coordinate
        ex, ey,                 // current end coordinate
        newPath,
        i, j, coord, line, testCoord, blocked;

    sx = x0;
    sy = y0;
    newPath = [[sx, sy]];

    for (i = 2; i < len; ++i) {
        coord = path[i];
        ex = coord[0];
        ey = coord[1];
        line = interpolate(sx, sy, ex, ey);

        blocked = false;
        for (j = 1; j < line.length; ++j) {
            testCoord = line[j];

            if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
                blocked = true;
                break;
            }
        }
        if (blocked) {
            lastValidCoord = path[i - 1];
            newPath.push(lastValidCoord);
            sx = lastValidCoord[0];
            sy = lastValidCoord[1];
        }
    }
    newPath.push([x1, y1]);

    return newPath;
}
exports.smoothenPath = smoothenPath;


/**
 * Compress a path, remove redundant nodes without altering the shape
 * The original path is not modified
 * @param {Array<Array<number>>} path The path
 * @return {Array<Array<number>>} The compressed path
 */
function compressPath(path) {

    // nothing to compress
    if(path.length < 3) {
        return path;
    }

    var compressed = [],
        sx = path[0][0], // start x
        sy = path[0][1], // start y
        px = path[1][0], // second point x
        py = path[1][1], // second point y
        dx = px - sx, // direction between the two points
        dy = py - sy, // direction between the two points
        lx, ly,
        ldx, ldy,
        sq, i;

    // normalize the direction
    sq = Math.sqrt(dx*dx + dy*dy);
    dx /= sq;
    dy /= sq;

    // start the new path
    compressed.push([sx,sy]);

    for(i = 2; i < path.length; i++) {

        // store the last point
        lx = px;
        ly = py;

        // store the last direction
        ldx = dx;
        ldy = dy;

        // next point
        px = path[i][0];
        py = path[i][1];

        // next direction
        dx = px - lx;
        dy = py - ly;

        // normalize
        sq = Math.sqrt(dx*dx + dy*dy);
        dx /= sq;
        dy /= sq;

        // if the direction has changed, store the point
        if ( dx !== ldx || dy !== ldy ) {
            compressed.push([lx,ly]);
        }
    }

    // store the last point
    compressed.push([px,py]);

    return compressed;
}
exports.compressPath = compressPath;

},{}],11:[function(require,module,exports){
var Heap       = require('heap');
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * A* path-finder. Based upon https://github.com/bgrins/javascript-astar
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching 
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 * @param {number} opt.weight Weight to apply to the heuristic to allow for
 *     suboptimal paths, in order to speed up the search.
 */
function AStarFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.weight = opt.weight || 1;
    this.diagonalMovement = opt.diagonalMovement;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }

    // When diagonal movement is allowed the manhattan heuristic is not
    //admissible. It should be octile instead
    if (this.diagonalMovement === DiagonalMovement.Never) {
        this.heuristic = opt.heuristic || Heuristic.manhattan;
    } else {
        this.heuristic = opt.heuristic || Heuristic.octile;
    }
}

/**
 * Find and return the the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        heuristic = this.heuristic,
        diagonalMovement = this.diagonalMovement,
        weight = this.weight,
        abs = Math.abs, SQRT2 = Math.SQRT2,
        node, neighbors, neighbor, i, l, x, y, ng;

    // set the `g` and `f` value of the start node to be 0
    startNode.g = 0;
    startNode.f = 0;

    // push the start node into the open list
    openList.push(startNode);
    startNode.opened = true;

    // while the open list is not empty
    while (!openList.empty()) {
        // pop the position of node which has the minimum `f` value.
        node = openList.pop();
        node.closed = true;

        // if reached the end position, construct the path and return it
        if (node === endNode) {
            return Util.backtrace(endNode);
        }

        // get neigbours of the current node
        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }

            x = neighbor.x;
            y = neighbor.y;

            // get the distance between current node and the neighbor
            // and calculate the next g score
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

            // check if the neighbor has not been inspected yet, or
            // can be reached with smaller cost from the current node
            if (!neighbor.opened || ng < neighbor.g) {
                neighbor.g = ng;
                neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;

                if (!neighbor.opened) {
                    openList.push(neighbor);
                    neighbor.opened = true;
                } else {
                    // the neighbor can be reached with smaller cost.
                    // Since its f value has been updated, we have to
                    // update its position in the open list
                    openList.updateItem(neighbor);
                }
            }
        } // end for each neighbor
    } // end while not open list empty

    // fail to find the path
    return [];
};

module.exports = AStarFinder;

},{"../core/DiagonalMovement":6,"../core/Heuristic":8,"../core/Util":10,"heap":2}],12:[function(require,module,exports){
var AStarFinder = require('./AStarFinder');

/**
 * Best-First-Search path-finder.
 * @constructor
 * @extends AStarFinder
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 */
function BestFirstFinder(opt) {
    AStarFinder.call(this, opt);

    var orig = this.heuristic;
    this.heuristic = function(dx, dy) {
        return orig(dx, dy) * 1000000;
    };
}

BestFirstFinder.prototype = new AStarFinder();
BestFirstFinder.prototype.constructor = BestFirstFinder;

module.exports = BestFirstFinder;

},{"./AStarFinder":11}],13:[function(require,module,exports){
var Heap       = require('heap');
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * A* path-finder.
 * based upon https://github.com/bgrins/javascript-astar
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 * @param {number} opt.weight Weight to apply to the heuristic to allow for
 *     suboptimal paths, in order to speed up the search.
 */
function BiAStarFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.diagonalMovement = opt.diagonalMovement;
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.weight = opt.weight || 1;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }

    //When diagonal movement is allowed the manhattan heuristic is not admissible
    //It should be octile instead
    if (this.diagonalMovement === DiagonalMovement.Never) {
        this.heuristic = opt.heuristic || Heuristic.manhattan;
    } else {
        this.heuristic = opt.heuristic || Heuristic.octile;
    }
}

/**
 * Find and return the the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
BiAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var cmp = function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        },
        startOpenList = new Heap(cmp),
        endOpenList = new Heap(cmp),
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        heuristic = this.heuristic,
        diagonalMovement = this.diagonalMovement,
        weight = this.weight,
        abs = Math.abs, SQRT2 = Math.SQRT2,
        node, neighbors, neighbor, i, l, x, y, ng,
        BY_START = 1, BY_END = 2;

    // set the `g` and `f` value of the start node to be 0
    // and push it into the start open list
    startNode.g = 0;
    startNode.f = 0;
    startOpenList.push(startNode);
    startNode.opened = BY_START;

    // set the `g` and `f` value of the end node to be 0
    // and push it into the open open list
    endNode.g = 0;
    endNode.f = 0;
    endOpenList.push(endNode);
    endNode.opened = BY_END;

    // while both the open lists are not empty
    while (!startOpenList.empty() && !endOpenList.empty()) {

        // pop the position of start node which has the minimum `f` value.
        node = startOpenList.pop();
        node.closed = true;

        // get neigbours of the current node
        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }
            if (neighbor.opened === BY_END) {
                return Util.biBacktrace(node, neighbor);
            }

            x = neighbor.x;
            y = neighbor.y;

            // get the distance between current node and the neighbor
            // and calculate the next g score
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

            // check if the neighbor has not been inspected yet, or
            // can be reached with smaller cost from the current node
            if (!neighbor.opened || ng < neighbor.g) {
                neighbor.g = ng;
                neighbor.h = neighbor.h ||
                    weight * heuristic(abs(x - endX), abs(y - endY));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;

                if (!neighbor.opened) {
                    startOpenList.push(neighbor);
                    neighbor.opened = BY_START;
                } else {
                    // the neighbor can be reached with smaller cost.
                    // Since its f value has been updated, we have to
                    // update its position in the open list
                    startOpenList.updateItem(neighbor);
                }
            }
        } // end for each neighbor


        // pop the position of end node which has the minimum `f` value.
        node = endOpenList.pop();
        node.closed = true;

        // get neigbours of the current node
        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }
            if (neighbor.opened === BY_START) {
                return Util.biBacktrace(neighbor, node);
            }

            x = neighbor.x;
            y = neighbor.y;

            // get the distance between current node and the neighbor
            // and calculate the next g score
            ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);

            // check if the neighbor has not been inspected yet, or
            // can be reached with smaller cost from the current node
            if (!neighbor.opened || ng < neighbor.g) {
                neighbor.g = ng;
                neighbor.h = neighbor.h ||
                    weight * heuristic(abs(x - startX), abs(y - startY));
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = node;

                if (!neighbor.opened) {
                    endOpenList.push(neighbor);
                    neighbor.opened = BY_END;
                } else {
                    // the neighbor can be reached with smaller cost.
                    // Since its f value has been updated, we have to
                    // update its position in the open list
                    endOpenList.updateItem(neighbor);
                }
            }
        } // end for each neighbor
    } // end while not open list empty

    // fail to find the path
    return [];
};

module.exports = BiAStarFinder;

},{"../core/DiagonalMovement":6,"../core/Heuristic":8,"../core/Util":10,"heap":2}],14:[function(require,module,exports){
var BiAStarFinder = require('./BiAStarFinder');

/**
 * Bi-direcitional Best-First-Search path-finder.
 * @constructor
 * @extends BiAStarFinder
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 */
function BiBestFirstFinder(opt) {
    BiAStarFinder.call(this, opt);

    var orig = this.heuristic;
    this.heuristic = function(dx, dy) {
        return orig(dx, dy) * 1000000;
    };
}

BiBestFirstFinder.prototype = new BiAStarFinder();
BiBestFirstFinder.prototype.constructor = BiBestFirstFinder;

module.exports = BiBestFirstFinder;

},{"./BiAStarFinder":13}],15:[function(require,module,exports){
var Util = require('../core/Util');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Bi-directional Breadth-First-Search path finder.
 * @constructor
 * @param {object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 */
function BiBreadthFirstFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.diagonalMovement = opt.diagonalMovement;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }
}


/**
 * Find and return the the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
BiBreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        startOpenList = [], endOpenList = [],
        neighbors, neighbor, node,
        diagonalMovement = this.diagonalMovement,
        BY_START = 0, BY_END = 1,
        i, l;

    // push the start and end nodes into the queues
    startOpenList.push(startNode);
    startNode.opened = true;
    startNode.by = BY_START;

    endOpenList.push(endNode);
    endNode.opened = true;
    endNode.by = BY_END;

    // while both the queues are not empty
    while (startOpenList.length && endOpenList.length) {

        // expand start open list

        node = startOpenList.shift();
        node.closed = true;

        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }
            if (neighbor.opened) {
                // if this node has been inspected by the reversed search,
                // then a path is found.
                if (neighbor.by === BY_END) {
                    return Util.biBacktrace(node, neighbor);
                }
                continue;
            }
            startOpenList.push(neighbor);
            neighbor.parent = node;
            neighbor.opened = true;
            neighbor.by = BY_START;
        }

        // expand end open list

        node = endOpenList.shift();
        node.closed = true;

        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            if (neighbor.closed) {
                continue;
            }
            if (neighbor.opened) {
                if (neighbor.by === BY_START) {
                    return Util.biBacktrace(neighbor, node);
                }
                continue;
            }
            endOpenList.push(neighbor);
            neighbor.parent = node;
            neighbor.opened = true;
            neighbor.by = BY_END;
        }
    }

    // fail to find the path
    return [];
};

module.exports = BiBreadthFirstFinder;

},{"../core/DiagonalMovement":6,"../core/Util":10}],16:[function(require,module,exports){
var BiAStarFinder = require('./BiAStarFinder');

/**
 * Bi-directional Dijkstra path-finder.
 * @constructor
 * @extends BiAStarFinder
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 */
function BiDijkstraFinder(opt) {
    BiAStarFinder.call(this, opt);
    this.heuristic = function(dx, dy) {
        return 0;
    };
}

BiDijkstraFinder.prototype = new BiAStarFinder();
BiDijkstraFinder.prototype.constructor = BiDijkstraFinder;

module.exports = BiDijkstraFinder;

},{"./BiAStarFinder":13}],17:[function(require,module,exports){
var Util = require('../core/Util');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Breadth-First-Search path finder.
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 */
function BreadthFirstFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.diagonalMovement = opt.diagonalMovement;

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }
}

/**
 * Find and return the the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
BreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = [],
        diagonalMovement = this.diagonalMovement,
        startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        neighbors, neighbor, node, i, l;

    // push the start pos into the queue
    openList.push(startNode);
    startNode.opened = true;

    // while the queue is not empty
    while (openList.length) {
        // take the front node from the queue
        node = openList.shift();
        node.closed = true;

        // reached the end position
        if (node === endNode) {
            return Util.backtrace(endNode);
        }

        neighbors = grid.getNeighbors(node, diagonalMovement);
        for (i = 0, l = neighbors.length; i < l; ++i) {
            neighbor = neighbors[i];

            // skip this neighbor if it has been inspected before
            if (neighbor.closed || neighbor.opened) {
                continue;
            }

            openList.push(neighbor);
            neighbor.opened = true;
            neighbor.parent = node;
        }
    }
    
    // fail to find the path
    return [];
};

module.exports = BreadthFirstFinder;

},{"../core/DiagonalMovement":6,"../core/Util":10}],18:[function(require,module,exports){
var AStarFinder = require('./AStarFinder');

/**
 * Dijkstra path-finder.
 * @constructor
 * @extends AStarFinder
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 */
function DijkstraFinder(opt) {
    AStarFinder.call(this, opt);
    this.heuristic = function(dx, dy) {
        return 0;
    };
}

DijkstraFinder.prototype = new AStarFinder();
DijkstraFinder.prototype.constructor = DijkstraFinder;

module.exports = DijkstraFinder;

},{"./AStarFinder":11}],19:[function(require,module,exports){
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');
var Node       = require('../core/Node');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Iterative Deeping A Star (IDA*) path-finder.
 *
 * Recursion based on:
 *   http://www.apl.jhu.edu/~hall/AI-Programming/IDA-Star.html
 *
 * Path retracing based on:
 *  V. Nageshwara Rao, Vipin Kumar and K. Ramesh
 *  "A Parallel Implementation of Iterative-Deeping-A*", January 1987.
 *  ftp://ftp.cs.utexas.edu/.snapshot/hourly.1/pub/AI-Lab/tech-reports/UT-AI-TR-87-46.pdf
 *
 * @author Gerard Meier (www.gerardmeier.com)
 *
 * @constructor
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 * @param {number} opt.weight Weight to apply to the heuristic to allow for
 *     suboptimal paths, in order to speed up the search.
 * @param {boolean} opt.trackRecursion Whether to track recursion for
 *     statistical purposes.
 * @param {number} opt.timeLimit Maximum execution time. Use <= 0 for infinite.
 */
function IDAStarFinder(opt) {
    opt = opt || {};
    this.allowDiagonal = opt.allowDiagonal;
    this.dontCrossCorners = opt.dontCrossCorners;
    this.diagonalMovement = opt.diagonalMovement;
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.weight = opt.weight || 1;
    this.trackRecursion = opt.trackRecursion || false;
    this.timeLimit = opt.timeLimit || Infinity; // Default: no time limit.

    if (!this.diagonalMovement) {
        if (!this.allowDiagonal) {
            this.diagonalMovement = DiagonalMovement.Never;
        } else {
            if (this.dontCrossCorners) {
                this.diagonalMovement = DiagonalMovement.OnlyWhenNoObstacles;
            } else {
                this.diagonalMovement = DiagonalMovement.IfAtMostOneObstacle;
            }
        }
    }

    // When diagonal movement is allowed the manhattan heuristic is not
    // admissible, it should be octile instead
    if (this.diagonalMovement === DiagonalMovement.Never) {
        this.heuristic = opt.heuristic || Heuristic.manhattan;
    } else {
        this.heuristic = opt.heuristic || Heuristic.octile;
    }
}

/**
 * Find and return the the path. When an empty array is returned, either
 * no path is possible, or the maximum execution time is reached.
 *
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
IDAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    // Used for statistics:
    var nodesVisited = 0;

    // Execution time limitation:
    var startTime = new Date().getTime();

    // Heuristic helper:
    var h = function(a, b) {
        return this.heuristic(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }.bind(this);

    // Step cost from a to b:
    var cost = function(a, b) {
        return (a.x === b.x || a.y === b.y) ? 1 : Math.SQRT2;
    };

    /**
     * IDA* search implementation.
     *
     * @param {Node} The node currently expanding from.
     * @param {number} Cost to reach the given node.
     * @param {number} Maximum search depth (cut-off value).
     * @param {Array<Array<number>>} The found route.
     * @param {number} Recursion depth.
     *
     * @return {Object} either a number with the new optimal cut-off depth,
     * or a valid node instance, in which case a path was found.
     */
    var search = function(node, g, cutoff, route, depth) {
        nodesVisited++;

        // Enforce timelimit:
        if (this.timeLimit > 0 &&
            new Date().getTime() - startTime > this.timeLimit * 1000) {
            // Enforced as "path-not-found".
            return Infinity;
        }

        var f = g + h(node, end) * this.weight;

        // We've searched too deep for this iteration.
        if (f > cutoff) {
            return f;
        }

        if (node == end) {
            route[depth] = [node.x, node.y];
            return node;
        }

        var min, t, k, neighbour;

        var neighbours = grid.getNeighbors(node, this.diagonalMovement);

        // Sort the neighbours, gives nicer paths. But, this deviates
        // from the original algorithm - so I left it out.
        //neighbours.sort(function(a, b){
        //    return h(a, end) - h(b, end);
        //});

        
        /*jshint -W084 *///Disable warning: Expected a conditional expression and instead saw an assignment
        for (k = 0, min = Infinity; neighbour = neighbours[k]; ++k) {
        /*jshint +W084 *///Enable warning: Expected a conditional expression and instead saw an assignment
            if (this.trackRecursion) {
                // Retain a copy for visualisation. Due to recursion, this
                // node may be part of other paths too.
                neighbour.retainCount = neighbour.retainCount + 1 || 1;

                if(neighbour.tested !== true) {
                    neighbour.tested = true;
                }
            }

            t = search(neighbour, g + cost(node, neighbour), cutoff, route, depth + 1);

            if (t instanceof Node) {
                route[depth] = [node.x, node.y];

                // For a typical A* linked list, this would work:
                // neighbour.parent = node;
                return t;
            }

            // Decrement count, then determine whether it's actually closed.
            if (this.trackRecursion && (--neighbour.retainCount) === 0) {
                neighbour.tested = false;
            }

            if (t < min) {
                min = t;
            }
        }

        return min;

    }.bind(this);

    // Node instance lookups:
    var start = grid.getNodeAt(startX, startY);
    var end   = grid.getNodeAt(endX, endY);

    // Initial search depth, given the typical heuristic contraints,
    // there should be no cheaper route possible.
    var cutOff = h(start, end);

    var j, route, t;

    // With an overflow protection.
    for (j = 0; true; ++j) {

        route = [];

        // Search till cut-off depth:
        t = search(start, 0, cutOff, route, 0);

        // Route not possible, or not found in time limit.
        if (t === Infinity) {
            return [];
        }

        // If t is a node, it's also the end node. Route is now
        // populated with a valid path to the end node.
        if (t instanceof Node) {
            return route;
        }

        // Try again, this time with a deeper cut-off. The t score
        // is the closest we got to the end node.
        cutOff = t;
    }

    // This _should_ never to be reached.
    return [];
};

module.exports = IDAStarFinder;

},{"../core/DiagonalMovement":6,"../core/Heuristic":8,"../core/Node":9,"../core/Util":10}],20:[function(require,module,exports){
/**
 * @author imor / https://github.com/imor
 */
var JumpPointFinderBase = require('./JumpPointFinderBase');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Path finder using the Jump Point Search algorithm which always moves
 * diagonally irrespective of the number of obstacles.
 */
function JPFAlwaysMoveDiagonally(opt) {
    JumpPointFinderBase.call(this, opt);
}

JPFAlwaysMoveDiagonally.prototype = new JumpPointFinderBase();
JPFAlwaysMoveDiagonally.prototype.constructor = JPFAlwaysMoveDiagonally;

/**
 * Search recursively in the direction (parent -> child), stopping only when a
 * jump point is found.
 * @protected
 * @return {Array<Array<number>>} The x, y coordinate of the jump point
 *     found, or null if not found
 */
JPFAlwaysMoveDiagonally.prototype._jump = function(x, y, px, py) {
    var grid = this.grid,
        dx = x - px, dy = y - py;

    if (!grid.isWalkableAt(x, y)) {
        return null;
    }

    if(this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y).tested = true;
    }

    if (grid.getNodeAt(x, y) === this.endNode) {
        return [x, y];
    }

    // check for forced neighbors
    // along the diagonal
    if (dx !== 0 && dy !== 0) {
        if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
            (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
            return [x, y];
        }
        // when moving diagonally, must check for vertical/horizontal jump points
        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
            return [x, y];
        }
    }
    // horizontally/vertically
    else {
        if( dx !== 0 ) { // moving along x
            if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
               (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
                return [x, y];
            }
        }
        else {
            if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
               (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
                return [x, y];
            }
        }
    }

    return this._jump(x + dx, y + dy, x, y);
};

/**
 * Find the neighbors for the given node. If the node has a parent,
 * prune the neighbors based on the jump point search algorithm, otherwise
 * return all available neighbors.
 * @return {Array<Array<number>>} The neighbors found.
 */
JPFAlwaysMoveDiagonally.prototype._findNeighbors = function(node) {
    var parent = node.parent,
        x = node.x, y = node.y,
        grid = this.grid,
        px, py, nx, ny, dx, dy,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // directed pruning: can ignore most neighbors, unless forced.
    if (parent) {
        px = parent.x;
        py = parent.y;
        // get the normalized direction of travel
        dx = (x - px) / Math.max(Math.abs(x - px), 1);
        dy = (y - py) / Math.max(Math.abs(y - py), 1);

        // search diagonally
        if (dx !== 0 && dy !== 0) {
            if (grid.isWalkableAt(x, y + dy)) {
                neighbors.push([x, y + dy]);
            }
            if (grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y]);
            }
            if (grid.isWalkableAt(x + dx, y + dy)) {
                neighbors.push([x + dx, y + dy]);
            }
            if (!grid.isWalkableAt(x - dx, y)) {
                neighbors.push([x - dx, y + dy]);
            }
            if (!grid.isWalkableAt(x, y - dy)) {
                neighbors.push([x + dx, y - dy]);
            }
        }
        // search horizontally/vertically
        else {
            if(dx === 0) {
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                }
                if (!grid.isWalkableAt(x + 1, y)) {
                    neighbors.push([x + 1, y + dy]);
                }
                if (!grid.isWalkableAt(x - 1, y)) {
                    neighbors.push([x - 1, y + dy]);
                }
            }
            else {
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                }
                if (!grid.isWalkableAt(x, y + 1)) {
                    neighbors.push([x + dx, y + 1]);
                }
                if (!grid.isWalkableAt(x, y - 1)) {
                    neighbors.push([x + dx, y - 1]);
                }
            }
        }
    }
    // return all neighbors
    else {
        neighborNodes = grid.getNeighbors(node, DiagonalMovement.Always);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y]);
        }
    }

    return neighbors;
};

module.exports = JPFAlwaysMoveDiagonally;

},{"../core/DiagonalMovement":6,"./JumpPointFinderBase":25}],21:[function(require,module,exports){
/**
 * @author imor / https://github.com/imor
 */
var JumpPointFinderBase = require('./JumpPointFinderBase');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Path finder using the Jump Point Search algorithm which moves
 * diagonally only when there is at most one obstacle.
 */
function JPFMoveDiagonallyIfAtMostOneObstacle(opt) {
    JumpPointFinderBase.call(this, opt);
}

JPFMoveDiagonallyIfAtMostOneObstacle.prototype = new JumpPointFinderBase();
JPFMoveDiagonallyIfAtMostOneObstacle.prototype.constructor = JPFMoveDiagonallyIfAtMostOneObstacle;

/**
 * Search recursively in the direction (parent -> child), stopping only when a
 * jump point is found.
 * @protected
 * @return {Array<Array<number>>} The x, y coordinate of the jump point
 *     found, or null if not found
 */
JPFMoveDiagonallyIfAtMostOneObstacle.prototype._jump = function(x, y, px, py) {
    var grid = this.grid,
        dx = x - px, dy = y - py;

    if (!grid.isWalkableAt(x, y)) {
        return null;
    }

    if(this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y).tested = true;
    }

    if (grid.getNodeAt(x, y) === this.endNode) {
        return [x, y];
    }

    // check for forced neighbors
    // along the diagonal
    if (dx !== 0 && dy !== 0) {
        if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
            (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
            return [x, y];
        }
        // when moving diagonally, must check for vertical/horizontal jump points
        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
            return [x, y];
        }
    }
    // horizontally/vertically
    else {
        if( dx !== 0 ) { // moving along x
            if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
               (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
                return [x, y];
            }
        }
        else {
            if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
               (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
                return [x, y];
            }
        }
    }

    // moving diagonally, must make sure one of the vertical/horizontal
    // neighbors is open to allow the path
    if (grid.isWalkableAt(x + dx, y) || grid.isWalkableAt(x, y + dy)) {
        return this._jump(x + dx, y + dy, x, y);
    } else {
        return null;
    }
};

/**
 * Find the neighbors for the given node. If the node has a parent,
 * prune the neighbors based on the jump point search algorithm, otherwise
 * return all available neighbors.
 * @return {Array<Array<number>>} The neighbors found.
 */
JPFMoveDiagonallyIfAtMostOneObstacle.prototype._findNeighbors = function(node) {
    var parent = node.parent,
        x = node.x, y = node.y,
        grid = this.grid,
        px, py, nx, ny, dx, dy,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // directed pruning: can ignore most neighbors, unless forced.
    if (parent) {
        px = parent.x;
        py = parent.y;
        // get the normalized direction of travel
        dx = (x - px) / Math.max(Math.abs(x - px), 1);
        dy = (y - py) / Math.max(Math.abs(y - py), 1);

        // search diagonally
        if (dx !== 0 && dy !== 0) {
            if (grid.isWalkableAt(x, y + dy)) {
                neighbors.push([x, y + dy]);
            }
            if (grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y]);
            }
            if (grid.isWalkableAt(x, y + dy) || grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y + dy]);
            }
            if (!grid.isWalkableAt(x - dx, y) && grid.isWalkableAt(x, y + dy)) {
                neighbors.push([x - dx, y + dy]);
            }
            if (!grid.isWalkableAt(x, y - dy) && grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y - dy]);
            }
        }
        // search horizontally/vertically
        else {
            if(dx === 0) {
                if (grid.isWalkableAt(x, y + dy)) {
                    neighbors.push([x, y + dy]);
                    if (!grid.isWalkableAt(x + 1, y)) {
                        neighbors.push([x + 1, y + dy]);
                    }
                    if (!grid.isWalkableAt(x - 1, y)) {
                        neighbors.push([x - 1, y + dy]);
                    }
                }
            }
            else {
                if (grid.isWalkableAt(x + dx, y)) {
                    neighbors.push([x + dx, y]);
                    if (!grid.isWalkableAt(x, y + 1)) {
                        neighbors.push([x + dx, y + 1]);
                    }
                    if (!grid.isWalkableAt(x, y - 1)) {
                        neighbors.push([x + dx, y - 1]);
                    }
                }
            }
        }
    }
    // return all neighbors
    else {
        neighborNodes = grid.getNeighbors(node, DiagonalMovement.IfAtMostOneObstacle);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y]);
        }
    }

    return neighbors;
};

module.exports = JPFMoveDiagonallyIfAtMostOneObstacle;

},{"../core/DiagonalMovement":6,"./JumpPointFinderBase":25}],22:[function(require,module,exports){
/**
 * @author imor / https://github.com/imor
 */
var JumpPointFinderBase = require('./JumpPointFinderBase');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Path finder using the Jump Point Search algorithm which moves
 * diagonally only when there are no obstacles.
 */
function JPFMoveDiagonallyIfNoObstacles(opt) {
    JumpPointFinderBase.call(this, opt);
}

JPFMoveDiagonallyIfNoObstacles.prototype = new JumpPointFinderBase();
JPFMoveDiagonallyIfNoObstacles.prototype.constructor = JPFMoveDiagonallyIfNoObstacles;

/**
 * Search recursively in the direction (parent -> child), stopping only when a
 * jump point is found.
 * @protected
 * @return {Array<Array<number>>} The x, y coordinate of the jump point
 *     found, or null if not found
 */
JPFMoveDiagonallyIfNoObstacles.prototype._jump = function(x, y, px, py) {
    var grid = this.grid,
        dx = x - px, dy = y - py;

    if (!grid.isWalkableAt(x, y)) {
        return null;
    }

    if(this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y).tested = true;
    }

    if (grid.getNodeAt(x, y) === this.endNode) {
        return [x, y];
    }

    // check for forced neighbors
    // along the diagonal
    if (dx !== 0 && dy !== 0) {
        // if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
            // (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
            // return [x, y];
        // }
        // when moving diagonally, must check for vertical/horizontal jump points
        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
            return [x, y];
        }
    }
    // horizontally/vertically
    else {
        if (dx !== 0) {
            if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
                (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
                return [x, y];
            }
        }
        else if (dy !== 0) {
            if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
                (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
                return [x, y];
            }
            // When moving vertically, must check for horizontal jump points
            // if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
                // return [x, y];
            // }
        }
    }

    // moving diagonally, must make sure one of the vertical/horizontal
    // neighbors is open to allow the path
    if (grid.isWalkableAt(x + dx, y) && grid.isWalkableAt(x, y + dy)) {
        return this._jump(x + dx, y + dy, x, y);
    } else {
        return null;
    }
};

/**
 * Find the neighbors for the given node. If the node has a parent,
 * prune the neighbors based on the jump point search algorithm, otherwise
 * return all available neighbors.
 * @return {Array<Array<number>>} The neighbors found.
 */
JPFMoveDiagonallyIfNoObstacles.prototype._findNeighbors = function(node) {
    var parent = node.parent,
        x = node.x, y = node.y,
        grid = this.grid,
        px, py, nx, ny, dx, dy,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // directed pruning: can ignore most neighbors, unless forced.
    if (parent) {
        px = parent.x;
        py = parent.y;
        // get the normalized direction of travel
        dx = (x - px) / Math.max(Math.abs(x - px), 1);
        dy = (y - py) / Math.max(Math.abs(y - py), 1);

        // search diagonally
        if (dx !== 0 && dy !== 0) {
            if (grid.isWalkableAt(x, y + dy)) {
                neighbors.push([x, y + dy]);
            }
            if (grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y]);
            }
            if (grid.isWalkableAt(x, y + dy) && grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y + dy]);
            }
        }
        // search horizontally/vertically
        else {
            var isNextWalkable;
            if (dx !== 0) {
                isNextWalkable = grid.isWalkableAt(x + dx, y);
                var isTopWalkable = grid.isWalkableAt(x, y + 1);
                var isBottomWalkable = grid.isWalkableAt(x, y - 1);

                if (isNextWalkable) {
                    neighbors.push([x + dx, y]);
                    if (isTopWalkable) {
                        neighbors.push([x + dx, y + 1]);
                    }
                    if (isBottomWalkable) {
                        neighbors.push([x + dx, y - 1]);
                    }
                }
                if (isTopWalkable) {
                    neighbors.push([x, y + 1]);
                }
                if (isBottomWalkable) {
                    neighbors.push([x, y - 1]);
                }
            }
            else if (dy !== 0) {
                isNextWalkable = grid.isWalkableAt(x, y + dy);
                var isRightWalkable = grid.isWalkableAt(x + 1, y);
                var isLeftWalkable = grid.isWalkableAt(x - 1, y);

                if (isNextWalkable) {
                    neighbors.push([x, y + dy]);
                    if (isRightWalkable) {
                        neighbors.push([x + 1, y + dy]);
                    }
                    if (isLeftWalkable) {
                        neighbors.push([x - 1, y + dy]);
                    }
                }
                if (isRightWalkable) {
                    neighbors.push([x + 1, y]);
                }
                if (isLeftWalkable) {
                    neighbors.push([x - 1, y]);
                }
            }
        }
    }
    // return all neighbors
    else {
        neighborNodes = grid.getNeighbors(node, DiagonalMovement.OnlyWhenNoObstacles);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y]);
        }
    }

    return neighbors;
};

module.exports = JPFMoveDiagonallyIfNoObstacles;

},{"../core/DiagonalMovement":6,"./JumpPointFinderBase":25}],23:[function(require,module,exports){
/**
 * @author imor / https://github.com/imor
 */
var JumpPointFinderBase = require('./JumpPointFinderBase');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Path finder using the Jump Point Search algorithm allowing only horizontal
 * or vertical movements.
 */
function JPFNeverMoveDiagonally(opt) {
    JumpPointFinderBase.call(this, opt);
}

JPFNeverMoveDiagonally.prototype = new JumpPointFinderBase();
JPFNeverMoveDiagonally.prototype.constructor = JPFNeverMoveDiagonally;

/**
 * Search recursively in the direction (parent -> child), stopping only when a
 * jump point is found.
 * @protected
 * @return {Array<Array<number>>} The x, y coordinate of the jump point
 *     found, or null if not found
 */
JPFNeverMoveDiagonally.prototype._jump = function(x, y, px, py) {
    var grid = this.grid,
        dx = x - px, dy = y - py;

    if (!grid.isWalkableAt(x, y)) {
        return null;
    }

    if(this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y).tested = true;
    }

    if (grid.getNodeAt(x, y) === this.endNode) {
        return [x, y];
    }

    if (dx !== 0) {
        if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
            (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
            return [x, y];
        }
    }
    else if (dy !== 0) {
        if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
            (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
            return [x, y];
        }
        //When moving vertically, must check for horizontal jump points
        if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
            return [x, y];
        }
    }
    else {
        throw new Error("Only horizontal and vertical movements are allowed");
    }

    return this._jump(x + dx, y + dy, x, y);
};

/**
 * Find the neighbors for the given node. If the node has a parent,
 * prune the neighbors based on the jump point search algorithm, otherwise
 * return all available neighbors.
 * @return {Array<Array<number>>} The neighbors found.
 */
JPFNeverMoveDiagonally.prototype._findNeighbors = function(node) {
    var parent = node.parent,
        x = node.x, y = node.y,
        grid = this.grid,
        px, py, nx, ny, dx, dy,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // directed pruning: can ignore most neighbors, unless forced.
    if (parent) {
        px = parent.x;
        py = parent.y;
        // get the normalized direction of travel
        dx = (x - px) / Math.max(Math.abs(x - px), 1);
        dy = (y - py) / Math.max(Math.abs(y - py), 1);

        if (dx !== 0) {
            if (grid.isWalkableAt(x, y - 1)) {
                neighbors.push([x, y - 1]);
            }
            if (grid.isWalkableAt(x, y + 1)) {
                neighbors.push([x, y + 1]);
            }
            if (grid.isWalkableAt(x + dx, y)) {
                neighbors.push([x + dx, y]);
            }
        }
        else if (dy !== 0) {
            if (grid.isWalkableAt(x - 1, y)) {
                neighbors.push([x - 1, y]);
            }
            if (grid.isWalkableAt(x + 1, y)) {
                neighbors.push([x + 1, y]);
            }
            if (grid.isWalkableAt(x, y + dy)) {
                neighbors.push([x, y + dy]);
            }
        }
    }
    // return all neighbors
    else {
        neighborNodes = grid.getNeighbors(node, DiagonalMovement.Never);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y]);
        }
    }

    return neighbors;
};

module.exports = JPFNeverMoveDiagonally;

},{"../core/DiagonalMovement":6,"./JumpPointFinderBase":25}],24:[function(require,module,exports){
/**
 * @author aniero / https://github.com/aniero
 */
var DiagonalMovement = require('../core/DiagonalMovement');
var JPFNeverMoveDiagonally = require('./JPFNeverMoveDiagonally');
var JPFAlwaysMoveDiagonally = require('./JPFAlwaysMoveDiagonally');
var JPFMoveDiagonallyIfNoObstacles = require('./JPFMoveDiagonallyIfNoObstacles');
var JPFMoveDiagonallyIfAtMostOneObstacle = require('./JPFMoveDiagonallyIfAtMostOneObstacle');

/**
 * Path finder using the Jump Point Search algorithm
 * @param {Object} opt
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 * @param {DiagonalMovement} opt.diagonalMovement Condition under which diagonal
 *      movement will be allowed.
 */
function JumpPointFinder(opt) {
    opt = opt || {};
    if (opt.diagonalMovement === DiagonalMovement.Never) {
        return new JPFNeverMoveDiagonally(opt);
    } else if (opt.diagonalMovement === DiagonalMovement.Always) {
        return new JPFAlwaysMoveDiagonally(opt);
    } else if (opt.diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
        return new JPFMoveDiagonallyIfNoObstacles(opt);
    } else {
        return new JPFMoveDiagonallyIfAtMostOneObstacle(opt);
    }
}

module.exports = JumpPointFinder;

},{"../core/DiagonalMovement":6,"./JPFAlwaysMoveDiagonally":20,"./JPFMoveDiagonallyIfAtMostOneObstacle":21,"./JPFMoveDiagonallyIfNoObstacles":22,"./JPFNeverMoveDiagonally":23}],25:[function(require,module,exports){
/**
 * @author imor / https://github.com/imor
 */
var Heap       = require('heap');
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Base class for the Jump Point Search algorithm
 * @param {object} opt
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 */
function JumpPointFinderBase(opt) {
    opt = opt || {};
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.trackJumpRecursion = opt.trackJumpRecursion || false;
}

/**
 * Find and return the path.
 * @return {Array<Array<number>>} The path, including both start and
 *     end positions.
 */
JumpPointFinderBase.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = this.openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = this.startNode = grid.getNodeAt(startX, startY),
        endNode = this.endNode = grid.getNodeAt(endX, endY), node;

    this.grid = grid;


    // set the `g` and `f` value of the start node to be 0
    startNode.g = 0;
    startNode.f = 0;

    // push the start node into the open list
    openList.push(startNode);
    startNode.opened = true;

    // while the open list is not empty
    while (!openList.empty()) {
        // pop the position of node which has the minimum `f` value.
        node = openList.pop();
        node.closed = true;

        if (node === endNode) {
            return Util.expandPath(Util.backtrace(endNode));
        }

        this._identifySuccessors(node);
    }

    // fail to find the path
    return [];
};

/**
 * Identify successors for the given node. Runs a jump point search in the
 * direction of each available neighbor, adding any points found to the open
 * list.
 * @protected
 */
JumpPointFinderBase.prototype._identifySuccessors = function(node) {
    var grid = this.grid,
        heuristic = this.heuristic,
        openList = this.openList,
        endX = this.endNode.x,
        endY = this.endNode.y,
        neighbors, neighbor,
        jumpPoint, i, l,
        x = node.x, y = node.y,
        jx, jy, dx, dy, d, ng, jumpNode,
        abs = Math.abs, max = Math.max;

    neighbors = this._findNeighbors(node);
    for(i = 0, l = neighbors.length; i < l; ++i) {
        neighbor = neighbors[i];
        jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
        if (jumpPoint) {

            jx = jumpPoint[0];
            jy = jumpPoint[1];
            jumpNode = grid.getNodeAt(jx, jy);

            if (jumpNode.closed) {
                continue;
            }

            // include distance, as parent may not be immediately adjacent:
            d = Heuristic.octile(abs(jx - x), abs(jy - y));
            ng = node.g + d; // next `g` value

            if (!jumpNode.opened || ng < jumpNode.g) {
                jumpNode.g = ng;
                jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
                jumpNode.f = jumpNode.g + jumpNode.h;
                jumpNode.parent = node;

                if (!jumpNode.opened) {
                    openList.push(jumpNode);
                    jumpNode.opened = true;
                } else {
                    openList.updateItem(jumpNode);
                }
            }
        }
    }
};

module.exports = JumpPointFinderBase;

},{"../core/DiagonalMovement":6,"../core/Heuristic":8,"../core/Util":10,"heap":2}],26:[function(require,module,exports){
// https://alligator.io/js/class-composition/
const { UNIT_TYPE, CROSSABLE_TYPE, UNIT_RELATION } = require('./const')
const { PathFinder } = require('./utils/PathFinder')
const { getTilesByRange } = require('./utils/math')
const Tile = require('./elements/Tile')
const Tower = require('./elements/Tower')
const Catapult = require('./elements/Catapult')
const Horse = require('./elements/Horse')
const Spearman = require('./elements/Spearman')
const Axeman = require('./elements/Axeman')
const Archer = require('./elements/Archer')
const Slinger = require('./elements/Slinger')
const HorseArcher = require('./elements/HorseArcher')

function Board({ columns, rows }) {
    const board = {}
    const path_finder = PathFinder({
        columns,
        rows,
        isWalkableAt: (from_x, from_y, to_x, to_y) =>
            board.isWalkableNeighbor({
                tile_id_from: getTileId(from_x, from_y),
                tile_id_to: getTileId(to_x, to_y)
            })
    })

    board.players = {}
    board.units = {}
    board.tiles = {}

    for (let x = 0; x < columns; ++x) {
        for (let y = 0; y < rows; ++y) {
            board.tiles[getTileId(x, y)] = Tile({ x, y })
        }
    }

    board.setTileCrossable = ({ tile_id, crossable }) => {
        board.tiles[tile_id].crossable = crossable
    }

    board.addPlayer = ({ player_id, team_id }) => {
        board.players[player_id] = { team_id }
    }

    board.addUnit = ({ unit_id, unit_type }) => {
        let unit
        switch (unit_type) {
            case UNIT_TYPE.TOWER:
                unit = Tower()
                break
            case UNIT_TYPE.CATAPULT:
                unit = Catapult()
                break
            case UNIT_TYPE.HORSE:
                unit = Horse()
                break
            case UNIT_TYPE.SPEARMAN:
                unit = Spearman()
                break
            case UNIT_TYPE.AXEMAN:
                unit = Axeman()
                break
            case UNIT_TYPE.ARCHER:
                unit = Archer()
                break
            case UNIT_TYPE.SLINGER:
                unit = Slinger()
                break
            case UNIT_TYPE.HORSEARCHER:
                unit = HorseArcher()
                break
        }

        unit.unit_id = unit_id
        board.units[unit_id] = unit
    }

    board.deleteUnit = ({ unit_id }) => {
        delete board.units[unit_id]
    }

    board.setUnitPlayer = ({ unit_id, player_id }) => {
        board.units[unit_id].player_id = player_id
    }

    board.setUnitTile = ({ unit_id, tile_id }) => {
        board.units[unit_id].tile_id = tile_id
    }

    board.setUnitLife = ({ unit_id, life }) => {
        board.units[unit_id].life = life
    }

    board.getUnit = ({ unit_id }) => {
        return board.units[unit_id]
    }

    board.getCrossableTypesFromTile = ({ tile_id }) => {
        const crossables = [board.tiles[tile_id].crossable]
        for (const unit_id in board.units) {
            if (board.units[unit_id].tile_id === tile_id)
                crossables.push(board.units[unit_id].crossable)
        }
        return crossables
    }

    board.isWalkableTile = ({ tile_id }) => {
        return !board
            .getCrossableTypesFromTile({ tile_id })
            .some(
                crossable =>
                    crossable === CROSSABLE_TYPE.DIAGONABLE ||
                    crossable === CROSSABLE_TYPE.OBSTACLE
            )
    }

    board.isWalkableNeighbor = ({ tile_id_from, tile_id_to }) => {
        const tile_from = board.tiles[tile_id_from]
        const tile_to = board.tiles[tile_id_to]

        if (!board.isWalkableTile({ tile_id: tile_id_to })) {
            return false
        }

        // ↑ → ↓ ←
        if (tile_from.x === tile_to.x || tile_from.y === tile_to.y) {
            return true
        }

        // ↖ ↗ ↘ ↙
        const OBSTACLE = CROSSABLE_TYPE.OBSTACLE
        const tile_id_adjacent1 = getTileId(tile_from.x, tile_to.y)
        const tile_id_adjacent2 = getTileId(tile_to.x, tile_from.y)

        const crossables_adjacent1 = board.getCrossableTypesFromTile({
            tile_id: tile_id_adjacent1
        })
        if (crossables_adjacent1.includes(OBSTACLE)) {
            return false
        }

        const crossables_adjacent2 = board.getCrossableTypesFromTile({
            tile_id: tile_id_adjacent2
        })
        if (crossables_adjacent2.includes(OBSTACLE)) {
            return false
        }

        return true
    }

    board.getWalkablePath = ({ tile_id_from, tile_id_to }) => {
        const tile_from = board.tiles[tile_id_from]
        const tile_to = board.tiles[tile_id_to]
        return path_finder
            .find(tile_from.x, tile_from.y, tile_to.x, tile_to.y)
            .map(([x, y]) => getTileId(x, y))
    }

    board.getTilesByRange = ({ tile_id, range }) => {
        const { x, y } = board.tiles[tile_id]
        return getTilesByRange({ x, y, range })
            .map(({ x, y }) => getTileId(x, y))
            .filter(tile_id => board.tiles.hasOwnProperty(tile_id))
    }

    board.getUnitsRelation = ({ unit_id1, unit_id2 }) => {
        const unit1 = board.units[unit_id1]
        const unit2 = board.units[unit_id2]
        if (unit1.player_id === unit2.player_id) return UNIT_RELATION.OWNED
        const player1 = board.players[unit1.player_id]
        const player2 = board.players[unit2.player_id]
        if (player1.team_id === player2.team_id) return UNIT_RELATION.ALLY
        return UNIT_RELATION.ENEMY
    }

    board.getWalkableTilesByMovement = ({ tile_id, movement }) => {
        const tiles = board
            .getTilesByRange({ tile_id, range: [1, movement] })
            .filter(tile_id_to => {
                const path = board.getWalkablePath({
                    tile_id_from: tile_id,
                    tile_id_to
                })
                return path.length > 0 && path.length <= movement
            })
        return tiles
    }

    board.getUnitsByRange = ({ tile_id, range }) => {
        const tiles = board.getTilesByRange({ tile_id, range })
        const units = []
        for (const unit_id in board.units) {
            const { tile_id } = board.units[unit_id]
            if (tiles.includes(tile_id)) {
                units.push(unit_id)
            }
        }
        return units
    }

    board.getActions = ({ unit_id }) => {
        const unit = board.units[unit_id]
        return unit.getActions({ board })
    }

    board.getDamage = ({ unit_id, unit_id_enemy }) => {
        const unit = board.units[unit_id]
        return unit.getDamage({ board, unit_id: unit_id_enemy })
    }

    return board
}

module.exports = Board

// Private

function getTileId(x, y) {
    return `${x}.${y}`
}

// function Tower() {
//     return {
//         type: UNIT_TYPE.TOWER,
//         crossable: CROSSABLE_TYPE.OBSTACLE,
//         life: 5,
//         movement: 0,
//         range: [1, 5],
//         damage: () => 1
//     }
// }

// function Flag() {
//     const that = new Element({
//         type = UNIT_TYPE.FLAG,
//         tile_type = ELEMENT_TILE_TYPE.TERRAIN,
//         crossable = CROSSABLE_TYPE.WALKABLE
//     })
//     return that
// }

// function Card() {}

},{"./const":28,"./elements/Archer":29,"./elements/Axeman":30,"./elements/Catapult":31,"./elements/Horse":32,"./elements/HorseArcher":33,"./elements/Slinger":34,"./elements/Spearman":35,"./elements/Tile":36,"./elements/Tower":37,"./utils/PathFinder":41,"./utils/math":42}],27:[function(require,module,exports){
const EVENT = {
    SET_TILE_CROSSABLE: 'SET_TILE_CROSSABLE',
    ADD_UNIT: 'ADD_UNIT',
    MOVE: 'MOVE',
    WALK: 'WALK',
    ATTACK: 'ATTACK',
    DIE: 'DIE'
}

module.exports = EVENT

},{}],28:[function(require,module,exports){
const EVENT = require('./event')

const CROSSABLE_TYPE = {
    WALKABLE: 0,
    DIAGONABLE: 1,
    OBSTACLE: 2
}

const UNIT_TYPE = {
    TOWER: 'TOWER',
    CATAPULT: 'CATAPULT',
    HORSE: 'HORSE',
    SPEARMAN: 'SPEARMAN',
    AXEMAN: 'AXEMAN',
    ARCHER: 'ARCHER',
    SLINGER: 'SLINGER',
    HORSEARCHER: 'HORSEARCHER'
}

const UNIT_RELATION = {
    OWNED: 0,
    ALLY: 1,
    ENEMY: 2
}

module.exports = {
    CROSSABLE_TYPE,
    UNIT_TYPE,
    UNIT_RELATION,
    EVENT
}

},{"./event":27}],29:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Archer() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.ARCHER,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 2,
        range: [5, 5],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.AXEMAN) return 2
    return 1
}

module.exports = Archer

},{"../const":28,"./":38}],30:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Axeman() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.AXEMAN,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 4,
        movement: 2,
        range: [1, 1],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.SPEARMAN) return 2
    return 1
}

module.exports = Axeman

},{"../const":28,"./":38}],31:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Catapult() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.CATAPULT,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 1,
        range: [7, 7],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (
        unit.unit_type === UNIT_TYPE.TOWER ||
        unit.unit_type === UNIT_TYPE.CATAPULT
    )
        return 2
    return 1
}

module.exports = Catapult

},{"../const":28,"./":38}],32:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Horse() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.HORSE,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 4,
        range: [1, 1],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.HORSEARCHER) return 2
    return 1
}

module.exports = Horse

},{"../const":28,"./":38}],33:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function HorseArcher() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.HORSEARCHER,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 3,
        range: [3, 3],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.ARCHER) return 2
    return 1
}

module.exports = HorseArcher

},{"../const":28,"./":38}],34:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Slinger() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.SLINGER,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 2,
        range: [4, 4],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.ARCHER) return 2
    return 1
}

module.exports = Slinger

},{"../const":28,"./":38}],35:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Spearman() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.SPEARMAN,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 3,
        movement: 2,
        range: [1, 2],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    const unit = board.getUnit({ unit_id })
    if (unit.unit_type === UNIT_TYPE.HORSE) return 2
    return 1
}

module.exports = Spearman

},{"../const":28,"./":38}],36:[function(require,module,exports){
const { CROSSABLE_TYPE } = require('../const')

function Tile({ x, y, crossable = CROSSABLE_TYPE.WALKABLE }) {
    return {
        x,
        y,
        crossable
    }
}
module.exports = Tile

},{"../const":28}],37:[function(require,module,exports){
const { UNIT_TYPE, CROSSABLE_TYPE } = require('../const')
const { getActions } = require('./')

function Tower() {
    return {
        player_id: undefined,
        tile_id: undefined,
        unit_id: undefined,
        unit_type: UNIT_TYPE.TOWER,
        crossable: CROSSABLE_TYPE.DIAGONABLE,
        life: 5,
        movement: 0,
        range: [1, 5],
        getActions,
        getDamage
    }
}

function getDamage({ board, unit_id }) {
    return 1
}

module.exports = Tower

},{"../const":28,"./":38}],38:[function(require,module,exports){
const { UNIT_RELATION } = require('../const')

function getActions({ board }) {
    const { movement, range, tile_id, unit_id } = this
    const walkables = board.getWalkableTilesByMovement({ tile_id, movement })
    const attackables = board
        .getUnitsByRange({ tile_id, range })
        .filter(
            unit_id2 =>
                board.getUnitsRelation({ unit_id1: unit_id, unit_id2 }) ===
                UNIT_RELATION.ENEMY
        )
        .map(unit_id => ({
            tile_id: board.getUnit({ unit_id }).tile_id,
            unit_id
        }))

    return { movement, range, walkables, attackables }
}

module.exports = { getActions }

},{"../const":28}],39:[function(require,module,exports){
const EventEmitter = require('events')
const { UNIT_TYPE, CROSSABLE_TYPE, EVENT } = require('./const')
const Board = require('./board')
const {
    isValidNumber,
    isValidString,
    isValidUnique,
    isValidKey,
    isValidType
} = require('./utils/validators')

function Game({ columns, rows }) {
    isValidNumber(columns, 'columns')
    isValidNumber(rows, 'rows')
    const game = new EventEmitter()
    const board = Board({ columns, rows })
    game.board = board

    // MUTATOR
    game.setTileCrossable = ({ tile_id, crossable }) => {
        isValidKey(tile_id, board.tiles, 'tile_id')
        isValidType(crossable, CROSSABLE_TYPE, 'CROSSABLE_TYPE')
        board.setTileCrossable({ tile_id, crossable })
        game.emit(EVENT.SET_TILE_CROSSABLE, { tile_id, crossable })
    }

    // MUTATOR
    game.addPlayer = ({ player_id, team_id }) => {
        isValidString(player_id, 'player_id')
        isValidUnique(player_id, board.players, 'player_id')
        isValidString(team_id, 'team_id')
        board.addPlayer({ player_id, team_id })
    }

    // MUTATOR
    game.addUnit = ({ player_id, unit_id, unit_type, tile_id }) => {
        isValidKey(player_id, board.players, 'player_id')
        isValidString(unit_id, 'unit_id')
        isValidUnique(unit_id, board.units, 'unit_id')
        isValidType(unit_type, UNIT_TYPE, 'UNIT_TYPE')
        isValidKey(tile_id, board.tiles, 'tile_id')
        board.addUnit({ unit_id, unit_type })
        board.setUnitPlayer({ unit_id, player_id })
        game.move({ unit_id, tile_id })
        const { life } = board.getUnit({ unit_id })
        game.emit(EVENT.ADD_UNIT, {
            player_id,
            unit_id,
            unit_type,
            tile_id,
            life
        })
    }

    // MUTATOR
    game.move = ({ unit_id, tile_id }) => {
        isValidKey(unit_id, board.units, 'unit_id')
        isValidKey(tile_id, board.tiles, 'tile_id')
        if (board.isWalkableTile({ tile_id })) {
            board.setUnitTile({ unit_id, tile_id })
            game.emit(EVENT.MOVE, { unit_id, tile_id })
        } else {
            throw `unit_id:${unit_id} can not be moved to tile_id:${tile_id}`
        }
    }

    // MUTATOR
    game.walk = ({ unit_id, tile_id }) => {
        isValidKey(unit_id, board.units, 'unit_id')
        isValidKey(tile_id, board.tiles, 'tile_id')
        const { walkables } = board.getActions({ unit_id })
        const unit = board.getUnit({ unit_id })
        if (!walkables.includes(tile_id)) {
            throw `unit_id:${unit_id} can't walk to tile_id:${tile_id}`
        }
        const path = board.getWalkablePath({
            tile_id_from: unit.tile_id,
            tile_id_to: tile_id
        })
        board.setUnitTile({ unit_id, tile_id })
        game.emit(EVENT.WALK, { unit_id, path })
    }

    // MUTATOR
    game.attack = ({ unit_id, tile_id }) => {
        isValidKey(unit_id, board.units, 'unit_id')
        isValidKey(tile_id, board.tiles, 'tile_id')
        const { attackables } = board.getActions({ unit_id })
        const attackable = attackables.find(att => att.tile_id === tile_id)
        if (attackable === undefined) {
            throw `unit_id:${unit_id} can't attack to tile_id:${tile_id}`
        }
        const unit_id_enemy = attackable.unit_id
        const unit_enemy = board.getUnit({ unit_id: unit_id_enemy })
        const damage = board.getDamage({ unit_id, unit_id_enemy })
        const life = unit_enemy.life - damage
        board.setUnitLife({ unit_id: unit_id_enemy, life })
        game.emit(EVENT.ATTACK, { unit_id, unit_id_enemy, life, damage })
        if (life < 1) {
            board.deleteUnit({ unit_id: unit_id_enemy })
            game.emit(EVENT.DIE, { unit_id: unit_id_enemy })
        }
    }

    // GETTER
    game.getActions = ({ unit_id }) => {
        isValidKey(unit_id, board.units, 'unit_id')
        return board.getActions({ unit_id })
    }

    return game
}

module.exports = Game

},{"./board":26,"./const":28,"./utils/validators":43,"events":1}],40:[function(require,module,exports){
const Game = require('./game')
const Board = require('./board')
const { CROSSABLE_TYPE, UNIT_TYPE, UNIT_RELATION, EVENT } = require('./const')

module.exports = {
    Game,
    Board,
    CROSSABLE_TYPE,
    UNIT_TYPE,
    UNIT_RELATION,
    EVENT
}

},{"./board":26,"./const":28,"./game":39}],41:[function(require,module,exports){
// This library is not performant. We should use another library in the future.
// The reason is because we have to make a grid.clone() every time we want to findPath()
// https://github.com/qiao/PathFinding.js/issues/33
// https://github.com/qiao/PathFinding.js/issues/171
// https://github.com/qiao/PathFinding.js/issues/116
// https://github.com/qiao/PathFinding.js/issues/99

// We can use this one: https://github.com/prettymuchbryce/easystarjs
const PF = require('pathfinding')

function PathFinder({ columns, rows, isWalkableAt }) {
    const finder = new PF.AStarFinder({ allowDiagonal: true })
    const grid = new PF.Grid(columns, rows)

    function getNeighbors(node) {
        const { x, y } = node
        const nodes = this.nodes
        const neighbors = []
        // ↑
        if (this.isInside(x, y - 1) && isWalkableAt(x, y, x, y - 1)) {
            neighbors.push(nodes[y - 1][x])
        }
        // →
        if (this.isInside(x + 1, y) && isWalkableAt(x, y, x + 1, y)) {
            neighbors.push(nodes[y][x + 1])
        }
        // ↓
        if (this.isInside(x, y + 1) && isWalkableAt(x, y, x, y + 1)) {
            neighbors.push(nodes[y + 1][x])
        }
        // ←
        if (this.isInside(x - 1, y) && isWalkableAt(x, y, x - 1, y)) {
            neighbors.push(nodes[y][x - 1])
        }
        // ↖
        if (this.isInside(x - 1, y - 1) && isWalkableAt(x, y, x - 1, y - 1)) {
            neighbors.push(nodes[y - 1][x - 1])
        }
        // ↗
        if (this.isInside(x + 1, y - 1) && isWalkableAt(x, y, x + 1, y - 1)) {
            neighbors.push(nodes[y - 1][x + 1])
        }
        // ↘
        if (this.isInside(x + 1, y + 1) && isWalkableAt(x, y, x + 1, y + 1)) {
            neighbors.push(nodes[y + 1][x + 1])
        }
        // ↙
        if (this.isInside(x - 1, y + 1) && isWalkableAt(x, y, x - 1, y + 1)) {
            neighbors.push(nodes[y + 1][x - 1])
        }

        return neighbors
    }

    return {
        find: (from_x, from_y, to_x, to_y) => {
            const g = grid.clone()
            g.getNeighbors = getNeighbors
            return finder.findPath(from_x, from_y, to_x, to_y, g).slice(1)
        }
    }
}

module.exports = { PathFinder }

// PF.Grid.prototype.getNeighbors = function(node, diagonalMovement) {
//     const { x, y } = node;
//     const nodes = this.nodes;
//     const neighbors = [];
//     // ↑
//     if (this.isWalkableAt(x, y - 1)) neighbors.push(nodes[y - 1][x]);
//     // →
//     if (this.isWalkableAt(x + 1, y)) neighbors.push(nodes[y][x + 1]);
//     // ↓
//     if (this.isWalkableAt(x, y + 1)) neighbors.push(nodes[y + 1][x]);
//     // ←
//     if (this.isWalkableAt(x - 1, y)) neighbors.push(nodes[y][x - 1]);
//     // ↖
//     if (this.isWalkableAt(x - 1, y - 1)) neighbors.push(nodes[y - 1][x - 1]);
//     // ↗
//     if (this.isWalkableAt(x + 1, y - 1)) neighbors.push(nodes[y - 1][x + 1]);
//     // ↘
//     if (this.isWalkableAt(x + 1, y + 1)) neighbors.push(nodes[y + 1][x + 1]);
//     // ↙
//     if (this.isWalkableAt(x - 1, y + 1)) neighbors.push(nodes[y + 1][x - 1]);
//     return neighbors;
//   };

},{"pathfinding":4}],42:[function(require,module,exports){
function getTilesByRange({ x, y, range }) {
    const origin_x = x
    const origin_y = y
    const tiles = []
    const [from, to] = range
    for (x = origin_x - to; x <= origin_x + to; ++x) {
        for (y = origin_y - to; y <= origin_y + to; ++y) {
            // if (!(x === origin_x && y === origin_y)) {
            const distance = getDistanceFromPoints({
                x1: x,
                y1: y,
                x2: origin_x,
                y2: origin_y
            })
            if (distance <= to && distance >= from) {
                tiles.push({ x, y })
            }
        }
    }
    return tiles
}

function getDistanceFromPoints({ x1, y1, x2, y2 }) {
    const x = x1 > x2 ? x1 - x2 : x2 - x1
    const y = y1 > y2 ? y1 - y2 : y2 - y1
    return Math.max(x, y)
}

module.exports = { getTilesByRange, getDistanceFromPoints }

},{}],43:[function(require,module,exports){
function isValidNumber(number, name) {
    if (typeof number !== 'number') {
        throw `'${name}' must be a number`
    }
}

function isValidString(string, name) {
    if (
        typeof string !== 'string' ||
        (typeof string === 'string' && string.length === 0)
    ) {
        throw `'${name}' must be a string`
    }
}

function isValidUnique(key, list, name) {
    if (list !== null && typeof list == 'object' && list.hasOwnProperty(key)) {
        throw `${key} is already added as ${name}`
    }
}

function isValidKey(tile_id, object, name) {
    if (!object.hasOwnProperty(tile_id)) {
        throw `'${name}' not found`
    }
}

function isValidType(value, diccionary, name) {
    const list = Object.keys(diccionary).map(key => diccionary[key])
    if (!list.some(item => item === value)) {
        throw `Invalid '${name}' type`
    }
}

module.exports = {
    isValidNumber,
    isValidString,
    isValidUnique,
    isValidKey,
    isValidType
}

},{}],44:[function(require,module,exports){
const {
    Game,
    CROSSABLE_TYPE,
    UNIT_TYPE,
    UNIT_RELATION,
    EVENT
} = require('../src')
window.Game = Game
window.CROSSABLE_TYPE = CROSSABLE_TYPE
window.UNIT_TYPE = UNIT_TYPE
window.UNIT_RELATION = UNIT_RELATION
window.EVENT = EVENT

},{"../src":40}]},{},[44]);
