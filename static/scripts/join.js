$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const sessionId = generateUUID();
    const inputBox = $('#code');
    const nameBox = $('#name');
    const joinButton = $('#join')


    joinButton.click(function () {
        redirect();
    });

    //on enter key press
    document.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
            // Cancel the default action, if needed
            event.preventDefault();
            redirect();
        }
    });

    function redirect() {
        joinButton.html('<i id="icon" class="fa fa-globe"></i>');
        removeErrorAnimations()

        const gameCode = inputBox.val();
        const username = nameBox.val();
        if (gameCode.length === 5 && username !== '') {
            socket.emit('Validate Code', {'gameCode': gameCode, 'sessionId': sessionId, 'username': username})
        } else {
            if (gameCode.length !== 5) {
                inputBox.addClass('shake');
            }
            if (username === '') {
                nameBox.addClass('shake');
            }
            joinButton.html('<i id="icon" class="fa fa-check"></i>');
        }
    }

    socket.on('Code Valid', function (data) {
        if (sessionId === data['sessionId']) {
            let mode = data['mode'];
            if (mode === 'br') {
                window.location.href = '/battle-royale-waiting?sessionId=' + sessionId + '&mode=' + mode;
            } else if (mode === 'v') {
                window.location.href = baseUrl + "/versus-waiting?sessionId=" + sessionId + '&mode=' + mode;
            } else if (mode === 't') {
                window.location.href = baseUrl + "/teams-waiting?sessionId=" + sessionId + '&mode=' + mode;
            }
        }
    })

    socket.on('Code Invalid', function (data) {
        if (data['sessionId'] === sessionId) {
            inputBox.addClass('shake');
            nameBox.addClass('shake');
            joinButton.html('<i id="icon" class="fa fa-check"></i>');
        }
    })

    inputBox.click(function () {
        removeErrorAnimations()
    })

    nameBox.click(function () {
        removeErrorAnimations()
    })

    function generateUUID() {
        const S4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

    function removeErrorAnimations() {
        inputBox.removeClass('shake');
        nameBox.removeClass('shake');
    }
})