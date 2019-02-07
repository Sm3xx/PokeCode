const _THEN = 'THEN';
const _ELSE = 'ELSE';

const PokeCodeInterpreter = {

    PokeConsole: null,

    Variables: {},

    GotoPoints: {},

    activeLine: 0,

    ifOpen: false,

    lastIfResult: false,

    lastIfKeyword: '',

    classOpen: false,

    Classes: {},

    init: () => {
        // do some initiation stuff here
    },

    reset: () => {
        PokeCodeInterpreter.activeLine = 0;
        PokeCodeInterpreter.Variables = {};
        PokeCodeInterpreter.GotoPoints = {};
    },

    runCode: (_code) => {   
        if (Array.isArray(_code)) {
            try {
                PokeCodeInterpreter.reset();
                PokeCodeInterpreter.determineGotoPoints(_code);
                PokeCodeInterpreter.determineClasses(_code);
                while (PokeCodeInterpreter.activeLine < _code.length) {
                    st = _code[PokeCodeInterpreter.activeLine];
                    PokeCodeInterpreter.interpretStatement(st);
                    PokeCodeInterpreter.activeLine++;
                }
            } catch (er) {
                console.error(er);
            }
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Illegal code format!`);
        }
    },

    determineGotoPoints: (_code) => {
        var actRow = 0;
        _code.forEach(el => {
            actRow++;
            if (el.match(/CITY/i)) {
                let name = el.split(/CITY/i)[1].trim().replace(/\s/g, "");
                PokeCodeInterpreter.GotoPoints[name] = actRow;
            }
        });
    },

    determineClasses: (_code) => {
        var foundClasses = [];
        var classCode = [];
        var classOpen = false;
        _code.forEach(el => {
            if (el.match(/POKEMON.*\[/i)) {
                // start of class
                classOpen = true;
                classCode.push(el);
            } else if (el.match(/\]/)) {
                // end of class
                classCode.push(el);
                classOpen = false;
                foundClasses.push(classCode);
                classCode = [];
            } else if (classOpen) {
                classCode.push(el);
            }
        });
        PokeCodeInterpreter.interpreteClasses(foundClasses);
    },

    interpreteClasses: (_foundClasses) => {

        _foundClasses.forEach(code => {
            var methods = [];
            var names = [];
            var methodCode = [];
            var methodOpen = false;
            var name = "";
            code.forEach(el => {
                if (el.match(/POKEMON.*\[/i)) {
                    name = PokeCodeClass.determineClassName(el);
                } else if (el.match(/ATTACK.*\(/i)) {
                    methodOpen = true;
                    methodCode.push(el);
                } else if (el.match(/\)/)) {
                    methodOpen = false;
                    methodCode.push(el);
                    methods.push(methodCode);
                    methodCode = [];
                    names.push(name);
                } else if (methodOpen) {
                    methodCode.push(el);
                } 
            });

            PokeCodeInterpreter.Classes[name] = PokeCodeMethod.generateMethodsObject(methods);
        
        });
    },

    callMethod: (sClassName, sMethodName, aParameters, oResult) => {
        var oClass = PokeCodeInterpreter.Classes[sClassName];
        if (oClass !== undefined) {
            var oMethod = oClass[sMethodName];
            if (oClass !== undefined) {
                var aCode = oMethod.code;
                // append unkown variables
                for (let i=0; i < oMethod.parameters.length; i++) {
                    PokeCodeInterpreter.createVariable(oMethod.parameters[i], aParameters[i]);
                }
                aCode.forEach(el => {
                    if (el.match(/RETURN/i)) {
                        var val = el.split(/RETURN/i)[1].trim();
                        PokeCodeInterpreter.setVariableValue(oResult, PokeCodeInterpreter.interpreteData(val));
                        return;
                    } else {
                        PokeCodeInterpreter.interpretStatement(el);
                    }
                });

            } else {
                PokeCodeInterpreter.writeErrorToConsole(`Unknown method ${sMethodName} at class ${sClassName}`);
            }
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Unkown class ${sClassName}`);
        }
    },

    prepareStatement: (_statement) => {
        let statement = _statement;
        statement = statement.trim();
        return statement;
    },

    interpretStatement: (_statement) => {
        if (!PokeCodeInterpreter.classOpen) {
            if (_statement.match(/POKEMON.*\[/i) || _statement.match(/\]/)) {
                PokeCodeInterpreter.classOpen = !PokeCodeInterpreter.classOpen;
            } else {    
                // then keyword
                if (_statement.match(/THEN/i)) {
                    PokeCodeInterpreter.interpreteThen();

                // else keyword
                } else if (_statement.match(/ELSE/i)) {
                    PokeCodeInterpreter.interpreteElse();
                } else {
                    if ((!PokeCodeInterpreter.ifOpen) 
                        || (PokeCodeInterpreter.ifOpen && PokeCodeInterpreter.lastIfResult && PokeCodeInterpreter.lastIfKeyword == _THEN) 
                        || (PokeCodeInterpreter.ifOpen && !PokeCodeInterpreter.lastIfResult && PokeCodeInterpreter.lastIfKeyword == _ELSE)) {

                        if (!_statement.match(/^\/\/.*/i) && !/^ *$/.test(_statement)) {
                            // Data decleration
                            if (_statement.match(/A\s*WILD.*?APPEARED/i)) {
                                PokeCodeInterpreter.interpretDataDeclerationStatement(_statement);

                            // write to console statement
                            } else if (_statement.match(/ANNOYING\s*DIALOGUE/i)) {
                                PokeCodeInterpreter.interpreteConsoleWriteStatement(_statement);

                            // change variable value
                            } else if (_statement.match(/CHANGE\s*NICK\s*OF/i)) {
                                PokeCodeInterpreter.interpreteChangeValueStatement(_statement);

                            // end of if statement
                            } else if (_statement.match(/ENDIF/i)) {
                                PokeCodeInterpreter.interpreteEndifStatement();

                            // if statement
                            } else if (_statement.match(/IF\s*/i)) {
                                PokeCodeInterpreter.interpreteIfStatement(_statement);

                            // clear console
                            } else if (_statement.match(/RAPE\s*[AB]/i)) {
                                PokeCodeInterpreter.clearConsole();

                            // sum function
                            } else if (_statement.match(/SUM\s*/i)) {
                                PokeCodeInterpreter.interpreteSumFunction(_statement);

                            // convert functions
                            } else if (_statement.match(/CONVERT\s*/i)) {
                                PokeCodeInterpreter.interpreteConvertFunctionType(_statement);

                            } else if (_statement.match(/POKEMON.*USE/i)) {
                                PokeCodeInterpreter.interpreteCallMethodStatement(_statement);

                            // wait function
                            } else if (_statement.match(/WAIT\s*/i)) {
                                PokeCodeInterpreter.interpreteWaitFunction(_statement);

                            // get random number
                            } else if (_statement.match(/RANDOM\s*/i)) {
                                PokeCodeInterpreter.interpreteRandomFunction(_statement);

                            // goto statement
                            } else if (_statement.match(/FLY\s*TO/i)) {
                                PokeCodeInterpreter.interpreteFlyStatement(_statement);

                            // set title 
                            } else if (_statement.match(/MY\s*NAME\s*IS/i)) {
                                PokeCodeInterpreter.interpreteSetTitleStatement(_statement);
                            
                            } else if (_statement.match(/CITY/i)) {
                                // do nothing

                            // default
                            } else {
                                //PokeCodeInterpreter.writeErrorToConsole(`Unkown statement '${_statement}'`);
                            }
                        }
                    }
                }
            }
        }
    },


    interpreteCallMethodStatement: (_statement) => {
        var sClassName = _statement.split(/POKEMON/i)[1].split(/USE/i)[0].trim();
        var sMethodName = _statement.split(/USE/i)[1].trim().split(/\s/i)[0].trim();
        var aParameters = [];
        var oTarget = "";
        if (_statement.match(/RECEIVED/i)) {
            oTarget = _statement.split(/RECEIVED/i)[1].trim();
        }
        if (_statement.match(/POWER/i)) {
            aParams = _statement.split(/WITH\s*POWER/i)[1].trim().split(/YOU/i)[0].split(/,/);
            aParams.forEach(el => {
                aParameters.push(PokeCodeInterpreter.interpreteData(el.trim()));
            });
        }
        PokeCodeInterpreter.callMethod( sClassName, sMethodName, 
                                        aParameters, oTarget );
    },

    /**
     * Start of interpretation of if statements
     */
    interpreteThen: () => {
        PokeCodeInterpreter.lastIfKeyword = _THEN;
    },

    interpreteElse: () => {
        PokeCodeInterpreter.lastIfKeyword = _ELSE;
    },

    openIfStatement: () => {
        PokeCodeInterpreter.ifOpen = true;
    },

    closeIfStatement: () => {
        PokeCodeInterpreter.ifOpen = false;
        PokeCodeInterpreter.lastIfKeyword = "";
    },

    interpreteIfStatement: (_statement) => {
        PokeCodeInterpreter.openIfStatement();
        PokeCodeInterpreter.lastIfResult = PokeCodeQuery.interpreteStatement(_statement);
    },

    interpreteEndifStatement: () => {
        PokeCodeInterpreter.closeIfStatement();
    },
    /**
     * End of interpretation of if statements
     */


    interpreteSetTitleStatement: (_statement) => {
        let title = PokeCodeInterpreter.interpreteData(_statement.split(/MY\s*NAME\s*IS/i)[1].trim());
        document.title = title;
    },

    interpreteFlyStatement: (_statement) => {
        let name = _statement.split(/FLY\s*TO/i)[1].trim().replace(/\s/g, "");
        let index = PokeCodeInterpreter.GotoPoints[name];
        if (index !== undefined && typeof index == 'number') {
            PokeCodeInterpreter.activeLine = index;
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Couldn't find fly point ${name} in sourcecode`);
        }
    },

    interpreteSumFunction: (_statement) => {
        // read summable params
        var sumParas = _statement.split(/SUM/i)[1].split(/INTO/i)[0].split(/,/i);
        var result;
        var containsString = PokeCodeInterpreter.checkArrayContainsString(sumParas);
        // sum the parameters (string concatenate)
        sumParas.forEach(el=>{
            if (result == undefined) {
                let val = PokeCodeInterpreter.interpreteData(el.trim());
                if (containsString) {
                    val = val.toString();
                }
                result = val;
            } else {
                let it = el.trim();
                result += PokeCodeInterpreter.interpreteData(it);
            }
        });
        // read target variable
        var target = _statement.split(/INTO/i)[1].trim();
        // set target val
        PokeCodeInterpreter.setVariableValue(target, result);
    },

    checkArrayContainsString: (_array) => {
        // checks if the array contains a string value
        var r = false;
        _array.forEach(el=>{
            if (typeof PokeCodeInterpreter.interpreteData(el.trim()) == 'string') {
                r = true;
            }
        });
        return r;
    },

    interpreteRandomFunction: (_statement) => {
        if (_statement.match(/BETWEEN.*AND.*/i)) {
            let min = PokeCodeInterpreter.interpreteData(_statement.split(/BETWEEN\s*/i)[1].split(/AND\s*/i)[0].trim());
            let max = PokeCodeInterpreter.interpreteData(_statement.split(/BETWEEN\s*/i)[1].split(/AND\s*/i)[1].split(/INTO\s*/i)[0].trim());
            let target = _statement.split(/INTO/i)[1].trim();
            PokeCodeInterpreter.setVariableValue(target, PokeCodeInterpreter.internalRandomGenerator(min, max));
        } else {
            let target = _statement.split(/INTO/i)[1].trim();
            PokeCodeInterpreter.setVariableValue(target, PokeCodeInterpreter.internalRandomGenerator(0, 100000));
        }
    },

    internalRandomGenerator: (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    interpreteWaitFunction: (_statement) => {
        let waitTime = PokeCodeInterpreter.interpreteData(_statement.split(/WAIT\s*/i)[1].trim());
        if (typeof waitTime == 'number') {
            PokeCodeInterpreter.sleep(waitTime);
        } else {
            if (waitTime.match(/^[0-9]/i)) {
                PokeCodeInterpreter.sleep(parseInt(waitTime, 10));
            } else {
                PokeCodeInterpreter.writeErrorToConsole(`Wait function expects a number as parameter (${waitTime} is not a number) `);
            }
        }
    },

    sleep: (milliseconds) => {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds){
                break;
            }
        }
    },

    interpreteConvertFunctionType: (_statement) => {
        if (_statement.match(/TO\s*BINARY/i)) {
            PokeCodeInterpreter.interpreteConvertToBinary(_statement);
        } else if (_statement.match(/TO\s*NUMBER/i)) {
            PokeCodeInterpreter.interpreteConvertToNumber(_statement);
        } else if (_statement.match(/TO\s*STRING/i)) {
            PokeCodeInterpreter.interpreteConvertToString(_statement);
        }
    },

    interpreteConvertToBinary: (_statement) => {
        let val = _statement.split(/CONVERT/i)[1].split(/TO\s*BINARY/i)[0].trim();
        let binaryVal = PokeCodeInterpreter.internalConvertToBinary(PokeCodeInterpreter.getVariableValue(val));
        PokeCodeInterpreter.setVariableValue(val, binaryVal);
    },

    interpreteConvertToNumber: (_statement) => {
        let val = _statement.split(/CONVERT/i)[1].split(/TO\s*NUMBER/i)[0].trim();
        let numberVal = parseInt(PokeCodeInterpreter.getVariableValue(val));
        PokeCodeInterpreter.setVariableValue(val, numberVal);
    },

    interpreteConvertToString: (_statement) => {
        let val = _statement.split(/CONVERT/i)[1].split(/TO\s*STRING/i)[0].trim();
        let stringVal = PokeCodeInterpreter.getVariableValue(val).toString();
        PokeCodeInterpreter.setVariableValue(val, stringVal);
    },

    internalConvertToBinary: (input) => {
        output = "";
        if (typeof input != "number") {
            for (var i = 0; i < input.length; i++) {
                output += input[i].charCodeAt(0).toString(2) + " ";
            }
        } else {
            output = input.toString(2);
        }
        return output;
    },

    interpretDataDeclerationStatement: (_statement) => {
        // get name value from data decleration statement
        let name = _statement.split(/A\s*WILD/i)[1];
        name = name.split(/APPEARED/i)[0];
        name = name.replace(/\s/g, "");
        // get value val from data decleration statement
        var value;
        if (_statement.match(/ITS\s*NAME\s*IS/i)) {
            value = _statement.split(/ITS\s*NAME\s*IS/i)[1].trim();
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
            returningValue = parseInt(_dataString, 10);
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

    rerenderConsole: () => {

    },

    writeErrorToConsole: (_string) => {
        // writing an error message to console and start an 
        // core error to stop execution
        let string = `<SPAN style="color:red">${_string} (Line: ${(PokeCodeInterpreter.activeLine + 1)})</SPAN>`;
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

const PokeCodeQuery = {
    
    interpreteStatement: (_statement) => {
        let condition = _statement.split(/IF\s*/i)[1].trim();
        let truth = false;

        var paras;
        var a;
        var b;

        if (condition.match(/NOT\s*EQUAL/i)) {
            paras = condition.split(/NOT\s*EQUAL/i);
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkNonEqual(a,b);

        } else if (condition.match(/EQUAL/i)) {
            paras = condition.split(/EQUAL/i);
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkEqual(a,b);
 
        } else if (condition.match(/GREATER\s*THAN/i)) {
            paras = condition.split(/GREATER\s*THAN/i);
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkGreater(a,b);

        } else if (condition.match(/LESS\s*THAN/i)) {
            paras = condition.split(/LESS\s*THAN/i);
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkLess(a,b);

        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Unkown if statement '${condition}'`);
        }

        return truth;

    },

    checkEqual: (_a, _b) => {
        return _a == _b;
    },

    checkNonEqual: (_a, _b) => {
        return _a != _b;
    },

    checkGreater: (_a, _b) => {
        return _a > _b;
    },

    checkLess: (_a, _b) => {
        return _a < _b;
    }

}

const PokeCodeClass = {
    determineClassName: (_statement) => {
        var name = _statement.split(/POKEMON/i)[1].split(/\[/)[0].trim();
        return name;
    }
}

const PokeCodeMethod = {
    generateMethodsObject: (_methods) => {
        var rMethods = {};
        _methods.forEach(me => {
            var name = "";
            var methodCode = [];
            var methodParameter = [];
            me.forEach(el => {
                if (el.match(/ATTACK.*\(/i)) {
                    if (el.match(/POWER/i)) {
                        name = el.split(/ATTACK/i)[1].split(/POWER/i)[0].trim();
                        var parList = el.split(/POWER/i)[1].split(/\(/)[0].trim().split(/,/);
                        parList.forEach(p => {
                            methodParameter.push(p.trim());
                        });
                    } else {
                        name = el.split(/ATTACK/i)[1].split(/\(/)[0].trim();
                    }
                } else if (el.match(/\)/i)) {
                    // do nothing
                } else {
                    if (el != "") {
                        methodCode.push(el);
                    }                
                }
            });
            rMethods[name] = {
                code: methodCode,
                parameters: methodParameter
            }
        });
        return rMethods;
    }
}

// following classes has to be programmed
const PokeCodePopup = {
    create: (message) => {
    
    }
}

const PokeCodePopupWithInput = {
    create: (message, callback) => {

    }
}