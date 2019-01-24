const PokeCodeInterpreter = {

    PokeConsole: null,

    Variables: {},

    init: () => {
        // do some initiation stuff here
    },

    runCode: (_code) => {   
        if (Array.isArray(_code)) {
            PokeCodeInterpreter.clearConsole();
            _code.forEach(st => {
                PokeCodeInterpreter.interpretStatement(st);
            });
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Illegal code format!`);
        }
    },

    prepareStatement: (_statement) => {
        let statement = _statement;
        statement = statement.replace(/\s/g, "");
        return statement;
    },

    interpretStatement: (_statement) => {
        if (_statement.match(/A WILD.*?APPEARED/i)) {
            let name = _statement.split(/A WILD/i)[1];
            name = name.split(/APPEARED/i)[0];
            name = name.replace(/\s/g, "");
            var value;
            if (_statement.match(/ITS NAME IS/i)) {
                value = _statement.split(/ITS NAME IS/i)[1];
            }
            PokeCodeInterpreter.createVariable(name, value);
        } else if (_statement.match(/ANNOYING DIALOGUE/i)) {
            let variable = _statement.split(/ANNOYING DIALOGUE/i)[1].replace(/\s/g, "");
            PokeCodeInterpreter.writeStringToConsole(PokeCodeInterpreter.getVariableValue(variable));
        } else if (_statement.match(/RAPE B/i) || _statement.match(/RAPE A/i)) {
            PokeCodeInterpreter.clearConsole();
        }
    },

    addConsole: (_htmlId) => {
        this.PokeConsole = document.getElementById(_htmlId);
    },

    createVariable: (_name, _value) => {
        if (!PokeCodeInterpreter.checkVariableExist()) {
            PokeCodeInterpreter.Variables[_name] = _value;
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Variable ${_name} has allready been declared!`);
        }
    },

    checkVariableExist: (_name) => {
        let val = PokeCodeInterpreter.Variables[_name];
        let r;
        val==undefined ? r=false : r=true;
        return r;
    },

    getVariableValue: (_name) => {
        if (PokeCodeInterpreter.checkVariableExist(_name)) {
            return PokeCodeInterpreter.Variables[_name];
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
        let string = `<span style="color:red">${_string}</span>`;
        PokeCodeInterpreter.writeStringToConsole(string);
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