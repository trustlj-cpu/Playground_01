// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "capacitor-swift-pm", products: [.library(name:"Capacitor", targets:["Capacitor"]), .library(name:"Cordova", targets:["Cordova"])], targets: [.binaryTarget(name:"Capacitor", path:"Capacitor.xcframework"), .binaryTarget(name:"Cordova", path:"Cordova.xcframework")])
