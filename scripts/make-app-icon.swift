// Draws the 1024x1024 iOS app icon: the Ditdah mark (one dit, one dah) on the
// twilight gradient. Regenerate with:
//
//   swift scripts/make-app-icon.swift ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
//
// Two iOS rules drive the shape:
//   - No alpha channel. App Store validation rejects icons that have one, so
//     the context is created opaque and the background is painted edge to edge.
//   - No rounded corners of our own. iOS applies its own mask; baking in a
//     radius leaves dark slivers outside it. The favicon's rx=16 is dropped.
//
// Geometry is the favicon scaled 16x (64 -> 1024) and nudged 16pt left so the
// mark sits optically centred rather than flush to the favicon's grid.

import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Usage: make-app-icon.swift <out.png> [canvas=1024] [art=canvas]
//   icon:   canvas 1024, art fills it
//   splash: canvas 2732, art ~820 centred on the twilight field. This replaces
//           Capacitor's stock blue-X-on-white Splash.imageset, which otherwise
//           flashes a framework logo on a white field before the dark app
//           paints -- on a real device that is several seconds of looking broken.
let args = CommandLine.arguments
let out  = args.count > 1 ? args[1] : "AppIcon-512@2x.png"
let size = args.count > 2 ? Int(args[2])! : 1024
let art  = CGFloat(args.count > 3 ? Int(args[3])! : size)
let k     = art / 1024.0        // the mark's own geometry is authored at 1024
let inset = (CGFloat(size) - art) / 2

let space = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(
    data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
    space: space,
    // noneSkipLast = opaque. This is the "no alpha" requirement.
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fatalError("could not create context") }

func rgb(_ hex: UInt32) -> CGColor {
    CGColor(colorSpace: space, components: [
        CGFloat((hex >> 16) & 0xff) / 255.0,
        CGFloat((hex >> 8) & 0xff) / 255.0,
        CGFloat(hex & 0xff) / 255.0,
        1.0,
    ])!
}

// --- Background: the app's twilight gradient, corner to corner over the WHOLE
// canvas, so a splash has no bare edges --------------------------------------
let bg = CGGradient(colorsSpace: space,
                    colors: [rgb(0x14152a), rgb(0x1c1d3c), rgb(0x2a1c3f)] as CFArray,
                    locations: [0.0, 0.55, 1.0])!
ctx.drawLinearGradient(bg,
                       start: CGPoint(x: 0, y: size),
                       end: CGPoint(x: size, y: 0),
                       options: [])

// Place the mark: scale its 1024-space geometry to `art` and centre it.
ctx.translateBy(x: inset, y: inset)
ctx.scaleBy(x: k, y: k)

// --- The dit: amber circle -------------------------------------------------
let ditR: CGFloat = 112
let ditC = CGPoint(x: 288, y: 512)
ctx.setFillColor(rgb(0xffb020))
ctx.fillEllipse(in: CGRect(x: ditC.x - ditR, y: ditC.y - ditR, width: ditR * 2, height: ditR * 2))

// --- The dah: coral gradient pill ------------------------------------------
let dah = CGRect(x: 480, y: 432, width: 368, height: 160)
let pill = CGPath(roundedRect: dah, cornerWidth: 80, cornerHeight: 80, transform: nil)
ctx.saveGState()
ctx.addPath(pill)
ctx.clip()
let dahGrad = CGGradient(colorsSpace: space,
                         colors: [rgb(0xff7a59), rgb(0xff4f6d)] as CFArray,
                         locations: [0.0, 1.0])!
ctx.drawLinearGradient(dahGrad,
                       start: CGPoint(x: dah.minX, y: dah.midY),
                       end: CGPoint(x: dah.maxX, y: dah.midY),
                       options: [])
ctx.restoreGState()

guard let image = ctx.makeImage() else { fatalError("could not render") }
let url = URL(fileURLWithPath: out)
guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
else { fatalError("could not open \(out)") }
CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else { fatalError("could not write \(out)") }
print("wrote \(out) at \(size)x\(size), opaque")
