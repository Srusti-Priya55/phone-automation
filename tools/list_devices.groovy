#!/usr/bin/env groovy
def getConnectedDevices() {
    def proc = "adb devices".execute()
    proc.waitFor()
    def output = proc.in.text.readLines()
    def devices = []
    output.each { line ->
        if (line.contains("device") && !line.contains("List")) {
            def serial = line.tokenize()[0]
            devices << serial
        }
    }
    return devices
}

return getConnectedDevices().join(',')
