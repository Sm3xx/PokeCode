const _LABEL = 'Label';
const _INPUT = 'Input';
const _BUTTON = 'Button';
const _NEWLINE = 'NewLine';

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

    createLabel: (_xmlEl) => {
        var label = document.createElement('label');
        label.innerHTML = _xmlEl.getAttribute('text');
        label.classList.add('Label');
        PokeCodeUiLoader.body.appendChild(label);
    },

    createInput: (_xmlEl) => {
        var input = document.createElement('input');
        input.classList.add('Input');
        PokeCodeUiLoader.body.appendChild(input);
    },

    createButton: (_xmlEl) => {
        var button = document.createElement('button');
        button.innerHTML = _xmlEl.getAttribute('text');
        button.classList.add('Button');
        button.classList.add(_xmlEl.getAttribute('type'));
        PokeCodeUiLoader.body.appendChild(button);
    },

    createNewLine: () => {
        var br = document.createElement('br');
        PokeCodeUiLoader.body.appendChild(br);
    }

}