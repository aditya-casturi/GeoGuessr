$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const sessionId = generateUUID();
    const nameBox = $('#name');

    $('#play-button').click(function() {
        const username = nameBox.val();
        if (username === '') {
            nameBox.addClass('shake');
        } else {
            $('#play-button').text('CREATING GAME...')
            let rounds = document.getElementById('rounds-selector').value

            socket.emit('Create Game', {'username': username, 'sessionId': sessionId, 'mode': 'v', 'rounds': rounds})

            window.location.href = baseUrl + "/versus-waiting?sessionId=" + sessionId;
        }
    });

    nameBox.click(function () {
        nameBox.removeClass('shake');
    });

    function generateUUID() {
        const S4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }
})

function updateSlider(slideAmount) {
    document.getElementById("description").innerText = slideAmount + " Rounds | " + slideAmount*2 + "-" + slideAmount*3 + " min";
}