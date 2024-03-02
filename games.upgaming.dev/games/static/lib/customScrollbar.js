"use strict";
var _createClass = function() {
    function t(t, e) {
        for (var l = 0; l < e.length; l++) {
            var s = e[l];
            s.enumerable = s.enumerable || !1, s.configurable = !0, "value" in s && (s.writable = !0), Object.defineProperty(t, s.key, s)
        }
    }
    return function(e, l, s) {
        return l && t(e.prototype, l), s && t(e, s), e
    }
}();

function _classCallCheck(t, e) {
    if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
}
var CustomScrollbar = function() {
    function t(e) {
        var l = e.el,
            s = e.contentWrapper,
            r = e.width,
            i = e.float,
            n = e.offset,
            o = e.autoDetectResize,
            a = void 0 === o || o,
            c = e.scrollbarStyle,
            h = void 0 === c ? {} : c,
            p = e.scrollbarBtnStyle,
            u = void 0 === p ? {} : p;
        _classCallCheck(this, t), this.container = l, this.contentWrapper = s || null, this.width = null != r ? r : 8, this.float = i || "right", this.offset = n || 0, this.autoDetectResize = !0 === a, this.scrollbar = null, this.scrollbarBtn = null, this.scrollbarStyle = h, this.scrollbarBtnStyle = u, this._scrollPerc = 0, this._lastScrollHeight = 0, this._lastClientHeight = 0, null != window.jQuery && (this.container instanceof jQuery && (this.container = this.container[0]), this.contentWrapper instanceof jQuery && (this.contentWrapper = this.contentWrapper[0])), this._InitContainers(), this._CreateScrollbar(), this._InitEvents(), this.ResetScrollbar()
    }
    return _createClass(t, [{
        key: "_InitContainers",
        value: function() {
            var t = window.getComputedStyle(this.container),
                e = this.container.style;
            t.position && "static" !== t.position || e.position && "static" !== e.position || (this.container.style.position = "relative");
            var l = {
                position: "relative",
                width: "100%",
                height: "100%",
                "overflow-y": "auto",
                "overflow-x": this.container.style.overflow = "hidden"
            };
            if (this.contentWrapper)
                for (var s in l) this.contentWrapper.style[s] = l[s];
            else {
                var r = this.container.innerHTML;
                for (var i in this.contentWrapper = document.createElement("div"), this.contentWrapper.className = "custom-scrollbar-container-wrapper", l) this.contentWrapper.style[i] = l[i];
                this.contentWrapper.innerHTML = r, this.container.innerHTML = "", this.container.appendChild(this.contentWrapper)
            }
        }
    }, {
        key: "_CreateScrollbar",
        value: function() {
            for (var t in this.scrollbar = document.createElement("div"), this.scrollbar.className = "custom-scrollbar", this.scrollbar.style.position = "absolute", this.scrollbar.style.top = 0, this.scrollbar.style[this.float] = -this.offset + "px", this.scrollbar.style["z-index"] = 99, this.scrollbar.style.width = this.width + "px", this.scrollbar.style.height = "100%", this.scrollbar.style["pointer-events"] = "none", this.scrollbarStyle) this.scrollbar.style[t] = this.scrollbarStyle[t];
            for (var e in this.scrollbarBtn = document.createElement("div"), this.scrollbarBtn.className = "custom-scrollbar-btn", this.scrollbarBtn.style.position = "absolute", this.scrollbarBtn.style.left = 0, this.scrollbarBtn.style.top = 0, this.scrollbarBtn.style.width = "100%", this.scrollbarBtn.style.cursor = "pointer", this.scrollbarBtn.style["background-color"] = "rgba(170, 170, 170, 0.85)", this.scrollbarBtn.style["pointer-events"] = "all", this.scrollbarBtnStyle) this.scrollbarBtn.style[e] = this.scrollbarBtnStyle[e];
            this.scrollbar.appendChild(this.scrollbarBtn), this.container.appendChild(this.scrollbar)
        }
    }, {
        key: "_InitEvents",
        value: function() {
            var t = this;
            this.contentWrapper.addEventListener("scroll", (function() {
                e || t._SetScrollPosition()
            }));
            var e = !1,
                l = null;
            this.scrollbarBtn.addEventListener("mousedown", (function(s) {
                e = !0, l = s.pageY, t.scrollbar.className = t.scrollbar.className.replace(/ active/g, ""), t.scrollbar.className += " active", document.body.style["user-select"] = "none"
            })), window.addEventListener("mousemove", (function(s) {
                if (e && l && s.pageY != l) {
                    var r = t._scrollPerc + (s.pageY - l) / t._scrollbarDistance * 100;
                    t._SetScrollPosition(r), l = s.pageY
                }
            })), window.addEventListener("mouseup", (function() {
                e = !1, l = null, t.scrollbar.className = t.scrollbar.className.replace(/ active/g, ""), document.body.style["user-select"] = ""
            })), this.autoDetectResize && this._WatchScrollHeightChange()
        }
    }, {
        key: "_WatchScrollHeightChange",
        value: function() {
            if (null != this.container.parentNode) {
                var t = this.contentWrapper.clientHeight,
                    e = this.contentWrapper.scrollHeight;
                this._lastClientHeight != t && (this.ResetScrollbar(), this._lastClientHeight = t), this._lastScrollHeight != e && (this.ResetScrollbar(), this._lastScrollHeight = e), window.requestAnimationFrame(this._WatchScrollHeightChange.bind(this))
            }
        }
    }, {
        key: "_SetScrollPosition",
        value: function() {
            var t = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : null;
            if (null == t) {
                var e = this.contentWrapper.scrollTop;
                this._scrollPerc = 100 * e / this._scrollDistance
            } else this._scrollPerc = parseFloat(t) || 0, this._scrollPerc = Math.max(Math.min(this._scrollPerc, 100), 0), this.contentWrapper.scrollTop = this._scrollPerc * this._scrollDistance / 100;
            var l = Math.ceil(this._scrollbarDistance * this._scrollPerc / 100);
            this.scrollbarBtn.style.top = l + "px"
        }
    }, {
        key: "ResetScrollbar",
        value: function() {
            var e = this.contentWrapper.clientHeight,
                l = this.contentWrapper.scrollHeight;
            if (e < l) {
                var s = Math.max(Math.pow(e, 2) / l, 20);
                this.contentWrapper.style.width = "calc(100% + " + t._GetScrollbarWidth() + "px)", this.scrollbarBtn.style.height = parseInt(s) + "px", this.scrollbar.style.visibility = "visible"
            } else this.scrollbar.style.visibility = "hidden", this.contentWrapper.style.width = "100%";
            this._SetScrollPosition()
        }
    }, {
        key: "_scrollDistance",
        get: function() {
            var t = this.contentWrapper.clientHeight;
            return this.contentWrapper.scrollHeight - t
        }
    }, {
        key: "_scrollbarDistance",
        get: function() {
            return this.scrollbar.clientHeight - this.scrollbarBtn.clientHeight
        }
    }], [{
        key: "_GetScrollbarWidth",
        value: function() {
            var t = document.createElement("p");
            t.style.width = "100%", t.style.height = "200px";
            var e = document.createElement("div");
            e.style.position = "absolute", e.style.top = "0px", e.style.left = "0px", e.style.visibility = "hidden", e.style.width = "200px", e.style.height = "150px", e.style.overflow = "hidden", e.appendChild(t), document.body.appendChild(e);
            var l = t.offsetWidth;
            e.style.overflow = "scroll";
            var s = t.offsetWidth;
            return l == s && (s = e.clientWidth), document.body.removeChild(e), l - s
        }
    }]), t
}();
window.CustomScrollbar = CustomScrollbar;