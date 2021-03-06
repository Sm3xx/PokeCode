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
        PokeCodeInterpreter.Classes = {};
        PokeCodeInterpreter.ifOpen = false;
        PokeCodeInterpreter.lastIfResult = false;
        PokeCodeInterpreter.lastIfKeyword = '';
        PokeCodeInterpreter.createVariable("effective", true);
        PokeCodeInterpreter.createVariable("noneffective", false);
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
                PokeCodeInterpreter.classOpen = false;
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
        PokeCodeInterpreter.setVariableValue('effective', true);
        PokeCodeInterpreter.setVariableValue('noneffective', false);
        
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
                    // if ((!PokeCodeInterpreter.ifOpen) 
                    //     || (PokeCodeInterpreter.ifOpen && PokeCodeInterpreter.lastIfResult && PokeCodeInterpreter.lastIfKeyword == _THEN) 
                    //     || (PokeCodeInterpreter.ifOpen && !PokeCodeInterpreter.lastIfResult && PokeCodeInterpreter.lastIfKeyword == _ELSE)) {
                    if ((!PokeCodeQuery.ifOpen)
                        || (PokeCodeQuery.ifOpen && PokeCodeQuery.getLastResult() && PokeCodeQuery.getLastScope() == _THEN)
                        || (PokeCodeQuery.ifOpen && !PokeCodeQuery.getLastResult() && PokeCodeQuery.getLastScope() == _ELSE)) {

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
                            
                            // arithmetic functions
                            } else if (_statement.match(/ARITHMETIC/i)) {
                                PokeCodeInterpreter.interpreteAritmethicFunctions(_statement);

                            } else if (_statement.match(/NOW\s*TELL\s*ME/i)) {
                                PokeCodeUserInput.requestValueFromUser(_statement);

                            // convert functions
                            } else if (_statement.match(/CONVERT\s*/i)) {
                                PokeCodeInterpreter.interpreteConvertFunctionType(_statement);
                            
                            // split statement
                            } else if (_statement.match(/SPLIT/i)) {
                                PokeCodeInterpreter.interpreteSplitFunction(_statement);

                            // read array statement
                            } else if (_statement.match(/READ/i)) {
                                PokeCodeInterpreter.interpreteReadArrayFunction(_statement);

                            } else if (_statement.match(/POKEMON.*USE/i)) {
                                PokeCodeInterpreter.interpreteCallMethodStatement(_statement);
                            
                            } else if (_statement.match(/MATCH.*REGEX/i)) {
                                PokeCodeInterpreter.interpreteMatchRegexStatement(_statement);

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
                            
                            // interpreting ui statements
                            } else if (_statement.match(/UI/i)) {
                                PokeCodeUiInterpreter.interpreteUiStatement(_statement);

                            // copy to clipboard
                            } else if (_statement.match(/COPY/i)) {
                                PokeCodeInterpreter.interpreteCopyToClipboard(_statement);

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


    interpreteAritmethicFunctions: (_statement) => {

        if (_statement.match(/SUBTRACT.*FROM/i)) {
            PokeCodeArithmetic.interpreteSubtract(_statement);

        } else if (_statement.match(/DIVIDE.*BY/i)) {
            PokeCodeArithmetic.interpreteDivide(_statement);

        } else if (_statement.match(/MULTIPLY.*BY/i)) {
            PokeCodeArithmetic.interpreteMultiply(_statement);

        } else if (_statement.match(/MODULO.*BY/i)) {
            PokeCodeArithmetic.interpreteModulo(_statement);

        } else if (_statement.match(/EXPONENT.*BY/i)) {
            PokeCodeArithmetic.interpreteExponent(_statement);

        } else {
            PokeCodeInterpreter.writeErrorToConsole(`'${_statement}' is an unknown arithmetic function`);

        }

    },

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

    interpreteWaitFunction: async (_statement) => {
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

    interpreteMatchRegexStatement: (_statement) => {
        var string = PokeCodeInterpreter.interpreteData(_statement.split(/MATCH/i)[1].split(/REGEX/i)[0].trim());
        var regex = PokeCodeInterpreter.interpreteData(_statement.split(/REGEX/i)[1].split(/INTO/i)[0].trim());
        var variable = _statement.split(/INTO/i)[1].trim();

        if (string.match(regex)) {
            PokeCodeInterpreter.setVariableValue(variable, PokeCodeInterpreter.getVariableValue('effective'));
        } else {
            PokeCodeInterpreter.setVariableValue(variable, PokeCodeInterpreter.getVariableValue('noneffective'));
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

    interpreteSplitFunction: (_statement) => {
        var value = PokeCodeInterpreter.interpreteData(_statement.split(/SPLIT/i)[1].split(/AT/i)[0].trim());
        var at = PokeCodeInterpreter.interpreteData(_statement.split(/AT/i)[1].split(/INTO/i)[0].trim());
        var variable = _statement.split(/INTO/i)[1].trim();

        var splittedValue = value.split(at);

        PokeCodeInterpreter.setVariableValue(variable, splittedValue);

    },

    interpreteReadArrayFunction: (_statement) => {

        var variableValue = PokeCodeInterpreter.getVariableValue(_statement.split(/READ/i)[1].split(/INDEX/i)[0].trim());
        var index = PokeCodeInterpreter.interpreteData(_statement.split(/INDEX/i)[1].split(/INTO/i)[0].trim());
        var targetVariable = _statement.split(/INTO/i)[1].trim();

        if (Array.isArray(variableValue)) {
            if (typeof index == 'number') {
                var string = variableValue[index];
                if (string != undefined) {
                    PokeCodeInterpreter.setVariableValue(targetVariable, string);
                } else {
                    PokeCodeInterpreter.writeErrorToConsole(`Unkown index ${index} in array`);
                }
            } else {
                PokeCodeInterpreter.writeErrorToConsole(`Index has to be a number`);
            }
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`Variable has to be an array`);
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

        if (_dataString.match(/\[.*\]/i)) {
            // data is array
            // TODO: Implement data interpration of array
            returningValue = [];

        } else if (_dataString.match(/^[0-9]/i)) {
            // data is numeric
            returningValue = parseInt(_dataString, 10);
              
        } else if (_dataString.match(/(\s*|)\/.*\//g)) {
            // data is regex
            returningValue = new RegExp(_dataString.replace(/\//g, ""));

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

    interpreteCopyToClipboard: (_statement) => {
        var value = PokeCodeInterpreter.interpreteData(_statement.split(/COPY/i)[1].split(/TO\s*CLIPBOARD/i)[0].trim());

        var el = document.createElement('textarea');
        el.value = name + ': ' + value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

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
    
    ifResults: [],

    ifScopes: [],

    ifOpen: false,

    openIfStatement: () => {

    },

    getLastResult: () => {
        return PokeCodeQuery.ifResults[PokeCodeQuery.ifResults.length];
    },
    
    getLastScope: () => {
        return PokeCodeQuery.ifScopes[PokeCodeQuery.ifScopes.length];
    },

    deleteLastIfResult: () => {
        PokeCodeQuery.ifResults.pop();
        PokeCodeQuery.ifScopes.pop();
    },

    interpreteStatement: (_statement) => {
        let condition = _statement.split(/IF\s*/i)[1].trim();
        let truth = false;

        var paras;
        var a;
        var b;
        if (condition.match(/(NOT\s*EQUAL)|(\!\=)|(\<\>)/i)) {
            paras = condition.split(/NOT\s*EQUAL/i);
            if (paras == condition) {
                paras = condition.split(/\!\=/);
            } 
            if (paras == condition) {
                paras = condition.split(/\<\>/);
            }
            if (paras == condition) {
                PokeCodeInterpreter.writeErrorToConsole("Unkown operator");
            }
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkNonEqual(a,b);

        } else if (condition.match(/(EQUAL)|(\=\=)/i)) {
            paras = condition.split(/EQUAL/i);
            if (paras == condition) {
                paras = condition.split(/\=\=/);
            } 
            if (paras == condition) {
                PokeCodeInterpreter.writeErrorToConsole("Unkown operator");
            }
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkEqual(a,b);
 
        } else if (condition.match(/\<\=/)) {
            paras = condition.split(/\<\=/);

            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());

            truth = PokeCodeQuery.checkEqualLess(a,b);

        } else if (condition.match(/\>\=/)) {
            paras = condition.split(/\>\=/);

            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());

            truth = PokeCodeQuery.checkEqualGreater(a,b);
        

        } else if (condition.match(/(GREATER\s*THAN)|(\>)/i)) {
            paras = condition.split(/GREATER\s*THAN/i);
            if (condition == paras) {
                paras = condition.split(/(\>)/);
            }
            a = PokeCodeInterpreter.interpreteData(paras[0].trim());
            b = PokeCodeInterpreter.interpreteData(paras[1].trim());
            truth = PokeCodeQuery.checkGreater(a,b);

        } else if (condition.match(/(LESS\s*THAN)|(\<)/i)) {
            paras = condition.split(/LESS\s*THAN/i);
            if (condition == paras) {
                paras = condition.split(/(\<)/);
            }
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
    },
    
    checkEqualLess: (_a, _b) => {
        return _a <= _b;
    },

    checkEqualGreater: (_a, _b) => {
        return _a >= _b;
    }

}

const PokeCodeArithmetic = {
    
    // interprete a substract statement
    interpreteSubtract: (_statement) => {

        let firstName = _statement.split(/SUBTRACT/i)[1].split(/FROM/i)[0].trim();
        let secondName = _statement.split(/FROM/i)[1].split(/INTO/i)[0].trim();
        let targetVariable = _statement.split(/INTO/i)[1].trim();

        let firstNumber = PokeCodeInterpreter.interpreteData(firstName);
        let secondNumber = PokeCodeInterpreter.interpreteData(secondName);
        
        if (typeof firstNumber == "number" && typeof secondNumber == "number") {
            let result = firstNumber - secondNumber;
            PokeCodeInterpreter.setVariableValue(targetVariable, result);
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`All parameters has to be a number in arithmetic functions!`);
        }

    },

    // interprete a divide statement
    interpreteDivide: (_statement) => {

        let firstName = _statement.split(/DIVIDE/i)[1].split(/BY/i)[0].trim();
        let secondName = _statement.split(/BY/i)[1].split(/INTO/i)[0].trim();
        let targetVariable = _statement.split(/INTO/i)[1].trim();

        let firstNumber = PokeCodeInterpreter.interpreteData(firstName);
        let secondNumber = PokeCodeInterpreter.interpreteData(secondName);
        
        if (typeof firstNumber == "number" && typeof secondNumber == "number") {
            let result = firstNumber / secondNumber;
            PokeCodeInterpreter.setVariableValue(targetVariable, result);
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`All parameters has to be a number in arithmetic functions!`);
        }

    },

    // interprete a multiply statement
    interpreteMultiply: (_statement) => {

        let firstName = _statement.split(/MULTIPLY/i)[1].split(/BY/i)[0].trim();
        let secondName = _statement.split(/BY/i)[1].split(/INTO/i)[0].trim();
        let targetVariable = _statement.split(/INTO/i)[1].trim();

        let firstNumber = PokeCodeInterpreter.interpreteData(firstName);
        let secondNumber = PokeCodeInterpreter.interpreteData(secondName);
        
        if (typeof firstNumber == "number" && typeof secondNumber == "number") {
            let result = firstNumber * secondNumber;
            PokeCodeInterpreter.setVariableValue(targetVariable, result);
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`All parameters has to be a number in arithmetic functions!`);
        }

    },

    // interprete a modulo statement
    interpreteModulo: (_statement) => {

        let firstName = _statement.split(/MODULO/i)[1].split(/BY/i)[0].trim();
        let secondName = _statement.split(/BY/i)[1].split(/INTO/i)[0].trim();
        let targetVariable = _statement.split(/INTO/i)[1].trim();

        let firstNumber = PokeCodeInterpreter.interpreteData(firstName);
        let secondNumber = PokeCodeInterpreter.interpreteData(secondName);
        
        if (typeof firstNumber == "number" && typeof secondNumber == "number") {
            let result = firstNumber % secondNumber;
            PokeCodeInterpreter.setVariableValue(targetVariable, result);
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`All parameters has to be a number in arithmetic functions!`);
        }

    },

    // interprete an exponent statement
    interpreteExponent: (_statement) => {

        let firstName = _statement.split(/EXPONENT/i)[1].split(/BY/i)[0].trim();
        let secondName = _statement.split(/BY/i)[1].split(/INTO/i)[0].trim();
        let targetVariable = _statement.split(/INTO/i)[1].trim();

        let firstNumber = PokeCodeInterpreter.interpreteData(firstName);
        let secondNumber = PokeCodeInterpreter.interpreteData(secondName);

        if (typeof firstNumber == "number" && typeof secondNumber == "number") {
            let result = firstNumber ** secondNumber;
            PokeCodeInterpreter.setVariableValue(targetVariable, result);
        } else {
            PokeCodeInterpreter.writeErrorToConsole(`All parameters has to be a number in arithmetic functions!`);
        }

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

const PokeCodeUserInput = {

    requestValueFromUser: (_statement) => {
        var msg = PokeCodeInterpreter.interpreteData(_statement.split(/NOW\s*TELL\s*ME/i)[1].split(/INTO/i)[0].trim());
        var varName = _statement.split(/INTO/i)[1].trim();
        var requestedValue = prompt(msg);
        PokeCodeInterpreter.setVariableValue(varName, requestedValue);
        // TODO: Implement a suitable handling for electron (prompt is not available in electron)
    }

};


/**
 * only works with electron
 * not available in browser version of PokeCodeInterpreter
 */
const fs = require('fs');
const app = require('electron').remote;

const PokeCodeUiInterpreter = {
     
    minimizeConsole: () => {
        document.getElementById('console').style.width = '0px';
        document.getElementById('console').style.height = '0px';
    },

    deleteBodyElements: () => {
        var bodyEls = document.getElementsByTagName("body")[0].childNodes;
        bodyEls.forEach(el => {
            if (el.getAttribute('id') != 'console') {
                el.remove();
            }
        });
    },

    showConsole: () => {
        PokeCodeUiInterpreter.deleteBodyElements();  

        document.getElementById('console').style.width = "100%";
        document.getElementById('console').style.height = "100%";
    },

    interpreteUiStatement: (_statement) => {

        if (_statement.match(/UI\s*LOAD\s*ICON/i)) {
            PokeCodeUiInterpreter.interpreteLoadIconStatement(_statement);

        } else if (_statement.match(/UI\s*LOAD/i)) {
            PokeCodeUiInterpreter.interpreteLoadUiStatement(_statement);
        
        // get/set statement
        } else if (_statement.match(/(GET|SET)/i)) {
            PokeCodeUiInterpreter.processGetSetStatement(_statement);
        
        } else if (_statement.match(/UI\s*SHOW\s*CONSOLE/i)) {
            PokeCodeUiInterpreter.showConsole();
        }
    },

    interpreteLoadIconStatement: (_statement) => {
        var srcPath = PokeCodeUiInterpreter.getCurrentLoadedPath() + PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*LOAD\s*ICON/i)[1].trim());

        var win = app.getCurrentWindow();
        win.setIcon(srcPath);

    },

    processGetSetStatement: (_statement) => {
        
        if (_statement.match(/INPUT/i)) {

            PokeCodeUiInterpreter.interpreteInputGetSet(_statement);

        } else if (_statement.match(/LABEL/i)) {

            PokeCodeUiInterpreter.interpreteLabelGetSet(_statement);

        } else if (_statement.match(/BUTTON/i)) {

            PokeCodeUiInterpreter.interpreteButtonGetSet(_statement);

        }

    },

    interpreteInputGetSet: (_statement) => {
        
        if (_statement.match(/GET/i)) {
            PokeCodeUiInterpreter.interpreteInputGet(_statement);
        } else if (_statement.match(/SET/i)) {
            PokeCodeUiInterpreter.interpreteInputSet(_statement);
        }

    },

    interpreteInputGet: (_statement) => {
        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*INPUT/i)[1].split(/GET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/GET/i)[1].split(/INTO/i)[0].trim());
        var variable = _statement.split(/INTO/i)[1].trim();

        var value = document.getElementById(id).getAttribute(property);

        PokeCodeInterpreter.setVariableValue(variable, value);

    },

    interpreteInputSet: (_statement) => {
        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*INPUT/i)[1].split(/SET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/SET/i)[1].split(/FROM/i)[0].trim());
        var variable = PokeCodeInterpreter.interpreteData(_statement.split(/FROM/i)[1].trim());

        document.getElementById(id).setAttribute(property, variable);

    },



    interpreteLabelGetSet: (_statement) => {

        if (_statement.match(/GET/i)) {
            PokeCodeUiInterpreter.interpreteLabelGet(_statement);
        } else if (_statement.match(/SET/i)) {
            PokeCodeUiInterpreter.interpreteLabelSet(_statement);
        }

    },

    interpreteLabelGet: (_statement) => {
        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*LABEL/i)[1].split(/GET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/GET/i)[1].split(/INTO/i)[0].trim());
        var variable = _statement.split(/INTO/i)[1].trim();

        var value = document.getElementById(id).getAttribute(property);

        PokeCodeInterpreter.setVariableValue(variable, value);
    },

    interpreteLabelSet: (_statement) => {
        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*LABEL/i)[1].split(/SET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/SET/i)[1].split(/FROM/i)[0].trim());
        var variable = PokeCodeInterpreter.interpreteData(_statement.split(/FROM/i)[1].trim());

        document.getElementById(id).setAttribute(property, variable);

    },



    interpreteButtonGetSet: (_statement) => {

        if (_statement.match(/GET/i)) {
            PokeCodeUiInterpreter.interpreteButtonGet(_statement);
        } else if (_statement.match(/SET/i)) {
            PokeCodeUiInterpreter.intepreteButtonSet(_statement);
        }

    },

    interpreteButtonGet: (_statement) => {

        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*BUTTON/i)[1].split(/GET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/GET/i)[1].split(/INTO/i)[0].trim());
        var variable = _statement.split(/INTO/i)[1].trim();

        var value = document.getElementById(id).getAttribute(property);

        PokeCodeInterpreter.setVariableValue(variable, value);

    },

    intepreteButtonSet: (_statement) => {

        var id = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*BUTTON/i)[1].split(/SET/i)[0].trim());
        var property = PokeCodeInterpreter.interpreteData(_statement.split(/SET/i)[1].split(/FROM/i)[0].trim());
        var variable = PokeCodeInterpreter.interpreteData(_statement.split(/FROM/i)[1].trim());

        document.getElementById(id).setAttribute(property, variable);

    },



    interpreteLoadUiStatement: (_statement) => {
        var path = PokeCodeInterpreter.interpreteData(_statement.split(/UI\s*LOAD/i)[1].trim());

        PokeCodeUiInterpreter.loadUiXmlView(path);
    },

    loadUiXmlView: (_xmlFile) => {
        PokeCodeUiInterpreter.minimizeConsole();
        var xmlFile = _xmlFile;
        fs.readFile((PokeCodeUiInterpreter.getCurrentLoadedPath() + xmlFile), "utf-8", (err, data) => {
            
            if (err) {
                throw err;
            }
            
            data = data.replace(/(\n)/g, "");
            PokeCodeUiLoader.loadUi(data);

        });
    },

    getCurrentLoadedPath: () => {
        var split = window.LoadedPokeCodePath.split(/\\/g);
        var rString = '';
        for (let i=0; i<(split.length - 1); i++) {
            rString += split[i] + "\\";
        }
        return rString;
    }

}


const _LABEL = 'Label';
const _INPUT = 'Input';
const _BUTTON = 'Button';
const _NEWLINE = 'NewLine';
const _WINDOWSETTINGS = 'WindowSettings';

const PokeCodeUiLoader = {
    
    body: null,

    addBody: () => {
        PokeCodeUiLoader.body = document.getElementsByTagName("body")[0];
    },

    loadUi: (_xmlCode) => {
        PokeCodeUiLoader.addBody();
       
        var nodes = PokeCodeUiLoader.parseXML(_xmlCode);
        nodes.forEach(el => {
            let tag = el.tagName;

            switch (tag) {
                case _LABEL:
                    // create label
                    PokeCodeUiLoader.createLabel(el);
                    break;
            
                case _INPUT:
                    // create input
                    PokeCodeUiLoader.createInput(el);
                    break;

                case _BUTTON:
                    // create button
                    PokeCodeUiLoader.createButton(el);
                    break;

                case _NEWLINE:
                    // create new line
                    PokeCodeUiLoader.createNewLine();
                    break;

                case _WINDOWSETTINGS:
                    // settings window settings
                    PokeCodeUiLoader.setWindowSettings(el);

                default:
                    break;
            }


        });
    },
    
    parseXML: (_xmlCode) => {
        var parser, xmlDoc;

        parser = new DOMParser();

        xmlDoc = parser.parseFromString(_xmlCode,"text/xml");
        
        return xmlDoc.getElementsByTagName('PokeCodeUI')[0].childNodes;
    },

    setWindowSettings: (_xmlEl) => {
        var width = parseInt(_xmlEl.getAttribute('width'), 10);
        var height = parseInt(_xmlEl.getAttribute('height'), 10);
        var resizeable = _xmlEl.getAttribute('resizeable') == "true" ? true : false;

        var currentWindow = app.getCurrentWindow();

        currentWindow.setSize(width, height);
        currentWindow.setMinimumSize(width, height);

        currentWindow.setResizable(resizeable)
        if (!resizeable) {
            currentWindow.setMaximumSize(width, height);
            currentWindow.setMaximizable(false);
        }

    },

    createLabel: (_xmlEl) => {
        var label = document.createElement('label');
        label.innerHTML = _xmlEl.getAttribute('text');
        label.classList.add('Label');
        PokeCodeUiLoader.body.appendChild(label);
    },

    createInput: (_xmlEl) => {
        var input = document.createElement('input');

        var width = _xmlEl.getAttribute('width');
        if (width != undefined) {
            input.style.width = width;
        }

        for (var i = 0; i < _xmlEl.attributes.length; i++) {
            var attrib = _xmlEl.attributes[i];
            input.setAttribute(attrib.name, attrib.value);
        }

        input.classList.add('Input');
        PokeCodeUiLoader.body.appendChild(input);
    },

    createButton: (_xmlEl) => {
        var button = document.createElement('button');

        var width = _xmlEl.getAttribute('width');
        if (width != undefined) {
            button.style.width = width;
        }

        for (var i = 0; i < _xmlEl.attributes.length; i++) {
            var attrib = _xmlEl.attributes[i];
            button.setAttribute(attrib.name, attrib.value);
        }

        button.innerHTML = _xmlEl.getAttribute('text');
        button.classList.add('Button');
        button.classList.add(_xmlEl.getAttribute('type'));

        var clickEvent = _xmlEl.getAttribute('click');
        var clickEvAr = clickEvent.split(/\#/);
        var Class = clickEvAr[0];
        var Method = clickEvAr[1];

        button.addEventListener('click', ev => {
            PokeCodeInterpreter.callMethod(Class, Method, []);
        });

        PokeCodeUiLoader.body.appendChild(button);
    },

    createNewLine: () => {
        var br = document.createElement('br');
        PokeCodeUiLoader.body.appendChild(br);
    }

}