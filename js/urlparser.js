/**
 * Copyright (c) 2013 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
"use strict";
function Url() {
    this._protocol = "";
    this._href = "";
    this._port = -1;

    this.auth = "";
    this.slashes = false;
    this.host = "";
    this.hostname = "";
    this.hash = "";
    this.search = "";
    this.query = null;
    this.pathname = "/";
}

Url.prototype.parse = function Url$parse(str) {
    if (typeof str !== "string") throw new TypeError("");
    var start = 0;
    var end = str.length - 1;

    while (str.charCodeAt(start) <= 32) start++;
    while (str.charCodeAt(end) <= 32) end--;

    start = this._parseProtocol(str, start, end);

    if (start < 0) {
        throw new SyntaxError("invalid protocol");
    }

    if (this._protocol !== "javascript") {
        start = this._parseHost(str, start, end);
    }


    if (start < end) {
        var ch = str.charCodeAt(start);

        if (ch === 47) {
            this._parsePath(str, start + 1, end);
        }
        else if (ch === 63) {
            this._parseQuery(str, start + 1, end);
        }
        else if (ch === 35) {
            this._parseHash(str, start + 1, end);
        }
        else {
            throw new SyntaxError("");
        }
    }
};

Url.prototype.format = function Url$format() {
    var auth = this.auth;

    if (auth !== "") {
        auth = encodeURIComponent(auth);
        auth = auth.replace(/%3A/i, ":");
        auth += "@";
    }

    var protocol = this._protocol;
    var pathname = this.pathname;
    var hash = this.hash;
    var search = this.search !== "" ? this.search : this._queryToSearch();
    var hostname = this.hostname;
    var port = this._port;
    var host = "";

    if (this.host !== "") {
        host = auth + this.host;
    }
    else if (hostname !== "") {
        host = auth + hostname + (port >= 0 ? ":" + port : "");
    }

    var slashes = this.slashes ||
        protocol === "" ||
        this._slashProtocols[protocol];

    var scheme = protocol + (slashes ? "://" : ":");

    if (pathname !== "" && pathname.charCodeAt(0) !== 47)
        pathname = "/" + pathname;
    if (search !== "" && search.charCodeAt(0) !== 63)
        search = "?" + search;
    if (hash !== "" && hash.charCodeAt(0) !== 35)
        hash = "#" + hash;

    pathname = this._escapePathName(pathname);
    search = this._escapeSearch(search);

    return scheme + host + pathname + search + hash;
};

Url.prototype._queryToSearch = function Url$_queryToSearch() {
    var query = this.query;

    if (query === null || query === "") return "";

    if (typeof query === "string") {
        return "?" + query;
    }
};

Url.prototype._escapePathName = function Url$_escapePathName(pathname) {
    return pathname;
};

Url.prototype._escapeSearch = function Url$_escapeSearch(search) {
    return search;
};

Url.prototype._parseProtocol = function Url$_parseProtocol(str, start, end) {
    var doLowerCase = false;

    for (var i = start; i <= end; ++i) {
        var ch = str.charCodeAt(i);

        if (ch === 58) {
            var protocol = str.slice(start, i);
            if (doLowerCase) protocol = protocol.toLowerCase();
            if (!this._rvalidprotocol.test(protocol)) {
                throw new SyntaxError("invalid protocol");
            }
            this._protocol = protocol;
            return i + 1;
        }
        else if (ch < 97) {
            doLowerCase = true;
        }
    }
    return -1;
};

Url.prototype._parseAuth = function Url$_parseAuth(str, start, end, decode) {
    var auth = str.slice(start, end + 1);
    if (decode) {
        auth = decodeURIComponent(auth);
    }
    this.auth = auth;
};

Url.prototype._parsePort = function Url$_parsePort(str, start, end) {
    var port = 0;
    for (var i = start; i <= end; ++i) {
        var ch = str.charCodeAt(i);

        if (48 <= ch && ch <= 57) {
            port = (10 * port) + (ch - 48);
        }
        else break;

    }

    if (port === 0) {
        throw new SyntaxError("");
    }

    this._port = port;

    return i - start;
};

Url.prototype._parseHost = function Url$_parseHost(str, start, end) {
    if (str.charCodeAt(start) === 47 &&
        str.charCodeAt(start + 1 === 47)) {
        start += 2;

        var authParsed = false;
        var doLowerCase = false;
        var idna = false;
        var hostNameStart = start;
        var hostNameEnd = end;
        var lastCh = -1;
        var portLength = 0;
        var charsAfterDot = 0;

        loop: for (var i = start; i <= end; ++i) {
            if (charsAfterDot > 63) {
                throw new SyntaxError("");
            }
            var ch = str.charCodeAt(i);

            if (ch === 64) {
                if (authParsed) throw new SyntaxError("");
                var hostEndingCharacters = this._hostEndingCharacters;
                var decode = false;
                for (var j = i + 1; j <= end; ++j) {
                    ch = str.charCodeAt(j);

                    if (ch === 64) {
                        i = j;
                    }
                    else if (ch === 37) {
                        decode = true;
                    }
                    else if (hostEndingCharacters[ch] === 1) {
                        break;
                    }
                }
                authParsed = true;
                this._parseAuth(str, start, i - 1, decode);
                hostNameStart = i + 1;
            }
            else if (ch === 58) {
                portLength = this._parsePort(str, i + 1, end);
                hostNameEnd = i - 1;
                break;
            }
            else if (ch < 97) {
                if (ch === 46) {
                    if (lastCh === 46 || lastCh === -1) {
                        throw new SyntaxError("");
                    }
                    charsAfterDot = -1;
                }
                else if (65 <= ch && ch <= 90) {
                    doLowerCase = true;
                }
                else if (!(ch === 45 || ch === 95 ||
                    (48 <= ch && ch <= 57))) {
                    hostNameEnd = i - 1;
                    break;
                }
            }
            else if (ch >= 0x7B) {
                if (ch <= 0x7E) {
                    hostNameEnd = i - 1;
                    break;
                }
                idna = true;
            }
            lastCh = ch;
            charsAfterDot++;
        }

        if (lastCh === 46) {
            throw new SyntaxError("");
        }

        if (hostNameEnd + 1 !== start) {
            if (hostNameEnd - hostNameStart > 256) {
                throw new SyntaxError("");
            }
            var hostname = str.slice(hostNameStart, hostNameEnd + 1);

            if (doLowerCase) hostname = hostname.toLowerCase();
            if (idna) hostname = this._hostIdna(hostname);
            this.hostname = hostname;
            this.host = this._port > 0 ? hostname + ":" + this._port : hostname;
        }

        return hostNameEnd + 1 + portLength;
    }
    return start;
};

Url.prototype._getComponentEscaped =
function Url$_getComponentEscaped(str, start, end) {
    var cur = start;
    var i = start;
    var ret = "";
    var autoEscapeMap = this._autoEscapeMap;
    for (; i <= end; ++i) {
        var ch = str.charCodeAt(i);
        var escaped = autoEscapeMap[ch];

        if (escaped !== "") {
            if (cur < i) ret += str.slice(cur, i);
            ret += escaped;
            cur = i + 1;
        }
    }
    if (cur < i + 1) ret += str.slice(cur, i);
    return ret;
};

Url.prototype._parsePath = function Url$_parsePath(str, start, end) {
    var pathStart = start;
    var pathEnd = end;
    var escape = false;
    var autoEscapeCharacters = this._autoEscapeCharacters;

    for (var i = start; i <= end; ++i) {
        var ch = str.charCodeAt(i);
        if (ch === 35) {
            this._parseHash(str, i + 1, end);
            pathEnd = i - 1;
            break;
        }
        else if (ch === 63) {
            this._parseQuery(str, i + 1, end);
            pathEnd = i - 1;
            break;
        }
        else if (!escape && autoEscapeCharacters[ch] === 1) {
            escape = true;
        }
    }

    if (pathStart > pathEnd) {
        this.pathname = "/";
        return;
    }

    var path;
    if (escape) {
        path = "/" + this._getComponentEscaped(str, pathStart, pathEnd);
    }
    else {
        path = "/" + str.slice(pathStart, pathEnd + 1);
    }
    this.pathname = path;
};

Url.prototype._parseQuery = function Url$_parseQuery(str, start, end) {
    var queryStart = start;
    var queryEnd = end;
    var escape = false;
    var autoEscapeCharacters = this._autoEscapeCharacters;

    for (var i = start; i <= end; ++i) {
        var ch = str.charCodeAt(i);

        if (ch === 35) {
            this._parseHash(str, i + 1, end);
            queryEnd = i - 1;
            break;
        }
        else if (!escape && autoEscapeCharacters[ch] === 1) {
            escape = true;
        }
    }

    if (queryStart > queryEnd) {
        this.search = this.query = "";
        return;
    }

    var query;
    if (escape) {
        query = this._getComponentEscaped(str, queryStart, queryEnd);
    }
    else {
        query = str.slice(queryStart, queryEnd + 1);
    }
    this.search = "?" + query;
    this.query = query;
};

Url.prototype._parseHash = function Url$_parseHash(str, start, end) {
    if (start >= end) {
        this.hash = "";
        return;
    }
    this.hash = "#" + this._getComponentEscaped(str, start, end);
};

Object.defineProperty(Url.prototype, "port", {
    get: function() {
        if (this._port >= 0) {
            return ("" + this._port);
        }
        return "";
    },
    set: function(v) {
        this._port = parseInt(v, 10);
    }
});

Object.defineProperty(Url.prototype, "path", {
    get: function() {
        return this.pathname + this.search;
    },
    set: function() {

    }
});

Object.defineProperty(Url.prototype, "protocol", {
    get: function() {
        return this._protocol + ":";
    },
    set: function(v) {
        this._protocol = v.slice(0, v.length - 1);
    }
});

Object.defineProperty(Url.prototype, "href", {
    get: function() {
        var href = this._href;
        if (href === "") {
            href = this._href = this.format();
        }
        return href;
    },
    set: function() {
    }
});

Url.parse = function Url$Parse(str) {
    var ret = new Url();
    ret.parse(str);
    return ret;
};


function makeAsciiTable(spec) {
    var ret = new Uint8Array(128);
    spec.forEach(function(item){
        if (typeof item === "number") {
            ret[item] = 1;
        }
        else {
            var start = item[0];
            var end = item[1];
            for (var j = start; j <= end; ++j) {
                ret[j] = 1;
            }
        }
    });

    return ret;
}

var autoEscape = ["<", ">", "\"", "`", " ", "\r", "\n",
    "\t", "{", "}", "|", "\\", "^", "`", "'"];

var autoEscapeMap = new Array(128);

for (var i = 0, len = autoEscapeMap.length; i < len; ++i) {
    autoEscapeMap[i] = "";
}

for (var i = 0, len = autoEscape.length; i < len; ++i) {
    var c = autoEscape[i];
    var esc = encodeURIComponent(c);
    if (esc === c) {
        esc = escape(c);
    }
    autoEscapeMap[c.charCodeAt(0)] = esc;
}


Url.prototype._slashProtocols = {
    http: true,
    https: true,
    gopher: true,
    file: true,
    ftp: true
};

Url.prototype._rvalidprotocol = /^[a-z.+-]+$/;

Url.prototype._hostEndingCharacters = makeAsciiTable([
    35, 63, 47
]);

Url.prototype._autoEscapeCharacters = makeAsciiTable(
    autoEscape.map(function(v) {
        return v.charCodeAt(0);
    })
);

Url.prototype._autoEscapeMap = autoEscapeMap;

module.exports = Url;