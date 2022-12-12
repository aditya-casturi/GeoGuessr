window.onload = function () {
    let socket = io.connect();
    $('.outer').hide().fadeIn(1250);

    socket.on('connect', function () {
        document.getElementById('play-button').onclick = function () {
            let sessionId = generateSessionID();
            let rounds = document.getElementById('rounds-selector').value

            socket.emit('Create Game', {'sessionId': sessionId, 'rounds': rounds, 'mode': 'h'});

            window.location.href = '/hardcore?sessionId=' + sessionId;
        }
    })
}

function generateSessionID() {
    const S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function updateSlider(slideAmount) {
    document.getElementById("description").innerText = slideAmount + " Rounds | " + slideAmount*2 + "-" + slideAmount*3 + " min";
}