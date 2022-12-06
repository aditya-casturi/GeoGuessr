$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);

    const params = new URLSearchParams(window.location.search);
    let sessionId = params.get('sessionId');
    const playerBox = $('#players');
    const subtitle = $('#subtitle');

    let gameCode;
    let username;
    let host;

    document.body.style.visibility = 'hidden';
    $('#loader').css('visibility', 'visible')
    socket.on('connect', function () {
        socket.emit('Get Session Data', {'sessionId': sessionId})

        socket.on('Send Session Data', function (data) {
            let sessionData = data['sessionData']

            if (sessionId === sessionData['sessionId']) {
                username = sessionData['username']
                gameCode = sessionData['gameCode']
                host = sessionData['host']

                socket.emit('User Connected', {'username': username, 'gameCode': gameCode, 'sessionId': sessionId})
                socket.emit('Get Players', {'gameCode': gameCode, 'sessionId': sessionId})

                $('#name-display').text(username)
                $('#code-display').text(gameCode)

                if (host === "true") {
                    $('#title').text("You're the host!");
                    subtitle.text("Start Game");

                    subtitle.mouseenter(function () {
                        subtitle.css("text-decoration", "underline")
                    })

                    subtitle.mouseleave(function () {
                        subtitle.css("text-decoration", "none")
                    })

                    subtitle.click(function () {
                        socket.emit('Generate Location', {'gameCode': gameCode})
                        subtitle.text("Loading...");
                    })
                } else {
                    $('#title').text("You're in!");
                    subtitle.text("Wait for the host to start the game.");
                }
            }
        })

        socket.on('Start Game', function (data) {
            if (data['gameCode'] === gameCode) {
                window.location.href = baseUrl + "/battle-royale?sessionId=" + sessionId;
            }
        })

        socket.on('Send Players', function (data) {
            if (data['sessionId'] === sessionId) {
                playerBox.text(data['players'])
            }

            document.body.style.visibility = 'visible';
            $('#loader').css('visibility', 'hidden');
        })

        socket.on('Player Joined', function (data) {
            if (data['gameCode'] === gameCode) {
                socket.emit('Get Players', {'gameCode': gameCode, 'sessionId': sessionId})
            }
        })

        socket.on('Player Left', function (data) {
            if (data['gameCode'] === gameCode) {
                socket.emit('Get Players', {'gameCode': gameCode, 'sessionId': sessionId})
            }
        })
    })
})