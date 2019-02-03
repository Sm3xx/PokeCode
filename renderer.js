const {ipcRenderer} = require('electron');
const fs = require('fs');
const app = require('electron').remote;
const dialog = app.dialog;

var dataPath = ipcRenderer.sendSync('get-file-data');

PokeCodeInterpreter.init();

PokeCodeInterpreter.addConsole('console');

if (dataPath === null || dataPath == '.') {
    dialog.showOpenDialog({"filters": [
        {
            "name": "PokeCode file",
            "extensions": ["pokecode"]
        }
    ]},(fileNames) => { 
       dataPath = fileNames[0]; 
       loadDataPath(dataPath);
    });
} else {
    loadDataPath(dataPath);
}

function loadDataPath (dataPath) {

    if (dataPath ===  null) {
        PokeCodeInterpreter.writeErrorToConsole(`No file is selected`);
    } else {
    
        fs.readFile(dataPath, 'utf-8', (err, data) => {
            if (err) {
                PokeCodeInterpreter.writeErrorToConsole(`File ${dataPath} could not be loaded`);
                return;
            } 
    
            data = data.split(/\n/);
    
            PokeCodeInterpreter.runCode(data);
    
        });
    }

}