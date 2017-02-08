export function PrototypeAdditions() {
    /**
     * Clones the array into a new one
     */
    Array.prototype.clone = function () {
        let b = new Array(this.length),
            i = this.length;

        while (i--) { b[i] = this[i]; };

        return b;
    }
};