let rounds = 5;

window.onload = function () {
    let socket = io.connect();
    const params = new URLSearchParams(window.location.search);
    const sessionId = generateSessionID();
    const mode = params.get('mode');

    const nameBox = $('#name');

    $('#mode-name').text(mode.charAt(0).toUpperCase() + mode.slice(1));

    $("#name").on({
        keydown: function(e) {
            if (e.which === 32)
                return false;
        },
        change: function() {
            this.value = this.value.replace(/\s/g, "");
        }
    });

    nameBox.click(function () {
        nameBox.removeClass('shake');
    });

    if (mode === 'classic' || mode === 'hardcore') {
        nameBox.remove();
    }

    socket.on('connect', function () {
        document.getElementById('play-button').onclick = function () {
            if (mode === 'classic' || mode === 'hardcore') {
                $('#play-button').text('Loading...');
                let sessionId = generateSessionID();

                socket.emit('Create Game', {'sessionId': sessionId, 'rounds': rounds, 'mode': mode});
                window.location.href = '/singleplayer?sessionId=' + sessionId + '&mode=' + mode;
            } else {
                const username = nameBox.val();
                if (username === '') {
                    nameBox.addClass('shake');
                } else {
                    $('#play-button').text('CREATING GAME...')

                    socket.emit('Create Game', {'username': username, 'sessionId': sessionId, 'mode': mode, 'rounds': rounds})

                    window.location.href = "/multiplayer-waiting-room?sessionId=" + sessionId + "&mode=" + mode;
                }
            }
        }
    })
}

function generateSessionID() {
    const S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

function updateRounds(action) {
    if (action === 'add') {
        document.getElementById('rounds-counter').textContent = String(rounds + 1) + ' Rounds';
        rounds++;
    } else if (rounds !== 1) {
        document.getElementById('rounds-counter').textContent = String(rounds - 1) + ' Rounds';
        rounds--;
    }
}