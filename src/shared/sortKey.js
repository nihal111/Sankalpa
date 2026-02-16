"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcSortKeyBetween = calcSortKeyBetween;
function calcSortKeyBetween(before, after) {
    if (before === null && after === null)
        return 1;
    if (before === null)
        return after / 2;
    if (after === null)
        return before + 1;
    return (before + after) / 2;
}
