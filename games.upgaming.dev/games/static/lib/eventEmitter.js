"use strict";
var _createClass = function() {
    function e(e, t) {
        for (var r = 0; r < t.length; r++) {
            var n = t[r];
            n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n)
        }
    }
    return function(t, r, n) {
        return r && e(t.prototype, r), n && e(t, n), t
    }
}();

function _toConsumableArray(e) {
    if (Array.isArray(e)) {
        for (var t = 0, r = Array(e.length); t < e.length; t++) r[t] = e[t];
        return r
    }
    return Array.from(e)
}

function _classCallCheck(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
}
var EventEmitter = function() {
        function e() {
            _classCallCheck(this, e), this.listeners = {}, this._retainedEvents = {}
        }
        return _createClass(e, [{
            key: "on",
            value: function(e, t) {
                for (var r = 2 < arguments.length && void 0 !== arguments[2] && arguments[2], n = e.trim().split(/ *, *| +/), i = 0; i < n.length; i++) {
                    var a = n[i].toLowerCase();
                    this.listeners[a] || (this.listeners[a] = []), this.listeners[a].push(t);
                    e: if (!0 === r) {
                        var l = this._retainedEvents[a];
                        if (!l) break e;
                        t.apply(void 0, _toConsumableArray(l.args))
                    }
                }
            }
        }, {
            key: "emit",
            value: function(e) {
                for (var t = arguments.length, r = Array(1 < t ? t - 1 : 0), n = 1; n < t; n++) r[n - 1] = arguments[n];
                for (var i = e.trim().split(/ *, *| +/), a = 0; a < i.length; a++) {
                    var l = i[a].toLowerCase();
                    this._retainedEvents[l] = {
                        name: l,
                        args: r
                    };
                    var o = this.listeners[l];
                    if (!o) return;
                    for (var s = 0; s < o.length; s++) try {
                        o[s].apply(o, r)
                    } catch (e) {
                        console.error("emit error (" + l + "): " + e)
                    }
                }
            }
        }, {
            key: "unbind",
            value: function() {
                var e, t;
                if ("string" == typeof(arguments.length <= 0 ? void 0 : arguments[0])) e = arguments.length <= 0 ? void 0 : arguments[0], t = arguments.length <= 1 ? void 0 : arguments[1];
                else {
                    if ("function" != typeof(arguments.length <= 0 ? void 0 : arguments[0])) return;
                    t = arguments.length <= 0 ? void 0 : arguments[0]
                }
                if (e)
                    for (var r = e.trim().split(/ *, *| +/), n = 0; n < r.length; n++) {
                        var i = e.toLowerCase(),
                            a = this.listeners[i];
                        if (a)
                            if (null != t)
                                for (; - 1 != a.indexOf(t);) a.splice(a.indexOf(t), 1);
                            else this.listeners[i] = []
                    } else
                        for (var l in this.listeners)
                            for (var o = this.listeners[l]; - 1 != o.indexOf(t);) o.splice(o.indexOf(t), 1)
            }
        }], [{
            key: "emit",
            value: function(e) {
                for (var t = arguments.length, r = Array(1 < t ? t - 1 : 0), n = 1; n < t; n++) r[n - 1] = arguments[n];
                GlobalEmitter.emit.apply(GlobalEmitter, [e].concat(r))
            }
        }, {
            key: "on",
            value: function(e, t, r) {
                return GlobalEmitter.on(e, t, r)
            }
        }, {
            key: "unbind",
            value: function(e) {
                var t = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null;
                return GlobalEmitter.unbind(e, t)
            }
        }]), e
    }(),
    GlobalEmitter = new(window.EventEmitter = EventEmitter);