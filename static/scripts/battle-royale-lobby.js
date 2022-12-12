$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const sessionId = generateUUID();
    const nameBox = $('#name');

    $('.outer').hide().fadeIn(1250);

    $('#play-button').click(function() {
        const username = nameBox.val();
        if (username === '') {
            nameBox.addClass('shake');
        } else {
            $('#play-button').text('CREATING GAME...')
            socket.emit('Create Game', {'username': username, 'sessionId': sessionId, 'mode': 'br', 'rounds': 0})

            window.location.href = baseUrl + "/battle-royale-waiting?sessionId=" + sessionId;
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
});