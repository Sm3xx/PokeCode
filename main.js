const {app, BrowserWindow} = require('electron')
const {ipcMain} = require('electron')
var path = require('path')

let mainWindow

function createWindow () {
    mainWindow = new BrowserWindow({width: 800,height: 600,icon: path.join(__dirname, 'buildData/favicon.png')})

    mainWindow.loadFile('index.html')

    ipcMain.on('get-file-data', function(event) {
    var data = null
    if (process.platform == 'win32' && process.argv.length >= 2) {
        var openFilePath = process.argv[1]
        data = openFilePath
    }
    event.returnValue = data
    })

    mainWindow.on('closed', function () {
    mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
    app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
    createWindow()
    }
})