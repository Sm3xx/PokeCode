const PokeCodeInterpreter = {

    PokeConsole: null,

    Variables: {},

    activeLine: 0,

    init: () => {
        // do some initiation stuff here
    },

    runCode: (_code) => {   
        if (Array.isArray(_code)) {
            try {
                PokeCodeInterpreter.activeLine = 0;
                PokeCodeInterpreter.clearConsole();
                _code.forEach(st => {
                    PokeCodeInterpreter.activeLine++;
                    PokeCodeInterpreter.interpretStatement(st);
                });
            } catch (er) {
                console.error(er);
            }
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Illegal code format!`);
        }
    },

    prepareStatement: (_statement) => {
        let statement = _statement;
      //  statement = statement.replace(/\s/g, "");
        statement = statement.trim();
        return statement;
    },

    interpretStatement: (_statement) => {
        // Data decleration
        if (_statement.match(/A\s*WILD.*?APPEARED/i)) {
            PokeCodeInterpreter.interpretDataDeclerationStatement(_statement);
        // write to console statement
        } else if (_statement.match(/ANNOYING\s*DIALOGUE/i)) {
            PokeCodeInterpreter.interpreteConsoleWriteStatement(_statement);
        // change variable value
        } else if (_statement.match(/CHANGE\s*NICK\s*OF/i)) {
            PokeCodeInterpreter.interpreteChangeValueStatement(_statement);
        // clear console
        } else if (_statement.match(/RAPE\s*[AB]/i)) {
            PokeCodeInterpreter.clearConsole();
        }
    },

    interpretDataDeclerationStatement: (_statement) => {
        // get name value from data decleration statement
        let name = _statement.split(/A\s*WILD/i)[1];
        name = name.split(/APPEARED/i)[0];
        name = name.replace(/\s/g, "");
        // get value val from data decleration statement
        var value;
        if (_statement.match(/ITS\s*NAME\s*IS/i)) {
            value = _statement.split(/ITS\s*NAME\s*IS/i)[1];
            value = PokeCodeInterpreter.interpreteData(value);
        }
        // call internal core function
        PokeCodeInterpreter.createVariable(name, value);
    },

    interpreteConsoleWriteStatement: (_statement) => {
        // get message value from statement
        let variable = _statement.split(/ANNOYING\s*DIALOGUE/i)[1].trim();
        variable = PokeCodeInterpreter.interpreteData(variable);
        // call internal core function
        PokeCodeInterpreter.writeStringToConsole(variable);
    },

    interpreteChangeValueStatement: (_statement) => {
        // get name value from statement
        let name = _statement.split(/CHANGE\s*NICK\s*OF/i)[1];
        name = name.split(/TO/i)[0];
        name = name.replace(/\s/g, "");
        // get value val from statement
        let value = _statement.split(/TO/i)[1];
        value = value.trim();
        value = PokeCodeInterpreter.interpreteData(value);
        // call internal core function
        PokeCodeInterpreter.setVariableValue(name, value);
    },

    interpreteData: (_dataString) => {
        var returningValue = '';

        if (_dataString.match(/^[0-9]/i)) {
            // data is numeric
            returningValue = _dataString;
        } else if (_dataString.match(/["'].*["']/i)) {
            // data is string
            returningValue = _dataString.replace(/["']/ig, "");
        } else {
            // data is a var
            returningValue = PokeCodeInterpreter.getVariableValue(_dataString);
        }

        return returningValue;
    },

    addConsole: (_htmlId) => {
        // adding a console (has to be a div-container)
        this.PokeConsole = document.getElementById(_htmlId);
    },

    createVariable: (_name, _value) => {
        // creating an variable
        if (!PokeCodeInterpreter.checkVariableExist()) {
            PokeCodeInterpreter.Variables[_name] = _value;
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Variable ${_name} has allready been declared!`);
        }
    },

    checkVariableExist: (_name) => {
        // check if the variable is allready created
        let val = PokeCodeInterpreter.Variables[_name];
        let r;
        val==undefined ? r=false : r=true;
        return r;
    },

    getVariableValue: (_name) => {
        // returns the value of an created variable
        if (PokeCodeInterpreter.checkVariableExist(_name)) {
            return PokeCodeInterpreter.Variables[_name];
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Variable ${_name} hasn't been created yet!`);
        }
    },

    setVariableValue: (_name, _value) => {
        // set the value of an variable
        if (PokeCodeInterpreter.checkVariableExist(_name)) {
            PokeCodeInterpreter.Variables[_name] = _value;
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Variable ${_name} hasn't been created yet!`);
        }
    },

    writeStringToConsole: (_string) => {
        // check if console is supplied
        if (this.PokeConsole != null) {
            // adding message to console
            this.PokeConsole.innerHTML += (_string + '<BR>');
            PokeCodeInterpreter.scrollConsoleToBottom();
        }
    },

    writeErrorToConsole: (_string) => {
        // writing an error message to console and start an 
        // core error to stop execution
        let string = `<SPAN style="color:red">${_string} (Line: ${PokeCodeInterpreter.activeLine})</SPAN>`;
        PokeCodeInterpreter.writeStringToConsole(string);
        throw new Error("An error occured, see PokeCode console");
    },

    clearConsole: _ => {
        // clearing the console
        this.PokeConsole.innerHTML = null;
    },

    scrollConsoleToBottom: _ => {
        // scroll to the bottom of the console
        this.PokeConsole.scrollTop = 9999;
    }

}