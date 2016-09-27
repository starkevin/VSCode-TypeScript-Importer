export = function() {
    Array.prototype.clone = function () {
        var b = new Array(this.length),
            i = this.length;

        while (i--) { b[i] = this[i]; };

        return b;
    }
}