// Constants
const nSTACKS = 5;
const nSECTORS = 18;
const nLAYERS = 6;
const nLINEARSTACKS = nSTACKS * nSECTORS;

// Conventions
// LinearStackIndex = Sector * nSTACKS + Stack
// Detector = LinearStackIndex * nLAYERS + Layer

// Common functions
function DetectorToStack(detector) { return Math.floor((detector % (nSTACKS * nLAYERS)) / nLAYERS); } // convert detector (=chamber) number 0-539 to local stack index 0-4
function DetectorToLayer(detector) { return detector % nLAYERS; } // convert detector (=chamber) number 0-539 to local layer 0-5
function DetectorToLinearStackIndex(detector) { return Math.floor(detector / nLAYERS); } // convert TRD detector/chamber 0-539 index to linear stack index 0-89
function DetectorToSector(detector) { return Math.floor(detector / nLAYERS / nSTACKS); } // convert linear stack index 0-89 to TRD sector 0-17
function StackSectorToLinearStackIndex(stack, sector) { return sector * nSTACKS + stack; } // convert sector 0-17 and stack 0-5 to linear stack index 0-89

// Rotate x,y by angle about cx,cy
export function rotateC(cx, cy, x, y, angle) {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = cx + (cos * (x - cx)) + (sin * (y - cy));
    const ny = cy + (cos * (y - cy)) - (sin * (x - cx));

    return [nx, ny];
}

// Rotate x,y by angle about the origin (0,0)
export function rotate(x, y, angle) {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = (cos * (x)) + (sin * (y));
    const ny = (cos * (y)) - (sin * (x));

    return [nx, ny];
}

// Create SVG path for a closed Rect, given opposite corners
function closedRect(p0, p1, x, y) {
  return `M ${x(p0)} ${y(p0)} L ${x(p1)} ${y(p0)} L ${x(p1)} ${y(p1)} L ${x(p0)} ${y(p1)} Z`;
}

// Convert stack,layer,row to a unique rowid
export function rid(stk, lyr, row) {
  return (stk * 6 + lyr) * 16 + row;
}