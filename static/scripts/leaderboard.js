window.onload = function() {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const mode = params.get('mode');

    $('#loader').css('visibility', 'visible')
    socket.on('connect', function () {
        socket.emit('Get Leaderboard', {'sessionId': sessionId, 'mode': mode})

        socket.on('Send Leaderboard', function (data) {
            if (data['sessionId'] === sessionId) {
                let points = data['points'];
                let place = data['place'];
                let scoreboard = data['scoreboard'];
                let gameCode = data['gameCode'];
                let host = data['host'];
                let gameOver = data['gameOver'];
                let username = data['username'];

                const nameDisplay = $('#name-display');
                const pointsDisplay = $('#points-display');
                const info = $('#info');
                const continueButton = $('#continue-button');

                if (mode === 'sp') {
                    const currPoints = scoreboard[0].split(" ")[1];
                    scoreboard[0] = "You " + currPoints;
                } else if (mode === 'v') {
                    nameDisplay.text(username)
                }
                pointsDisplay.text(points + ' points');

                if (mode !== 'sp') {
                    info.text('You are ' + place + ' place');
                }

                for (let i = 0; i < scoreboard.length; i++) {
                    if (i === 6) {
                        break;
                    } else {
                        const u = scoreboard[i].split(" ")[0]
                        const p = scoreboard[i].split(" ")[1]
                        document.getElementById((i+1) + '-username').textContent = u;
                        document.getElementById((i+1) + '-points').textContent = p;
                        if (i > 0) {
                            document.getElementById((i+1) + '-username').style.color = 'black';
                            document.getElementById((i+1) + '-points').style.color = 'black';
                        }
                    }
                }

                $('#loader').css('visibility', 'hidden');
                $('#bar').css('visibility', 'visible');
                $('.leaderboard-position').css('visibility', 'visible');
                pointsDisplay.css('visibility', 'visible');
                if (mode !== 'sp') {
                    nameDisplay.css('visibility', 'visible');
                }
                info.css('visibility', 'visible');

                console.log(gameOver)

                if (gameOver === "true") {
                    continueButton.css('background', 'transparent')
                    continueButton.css('color', 'black')
                    continueButton.css('pointer-events', 'none')
                    continueButton.text('Game over')
                    $('#lobby-button').css('visibility', 'visible');
                } else {
                    if (host === "true") {
                        continueButton.click(function () {
                            socket.emit('Generate Location', {'gameCode': gameCode})
                            socket.emit('Update Round', {'gameCode': gameCode})
                            continueButton.text("Loading...");
                        })
                    } else {
                        continueButton.css('background', 'transparent')
                        continueButton.css('color', 'black')
                        continueButton.text('Wait for the host to start the next round.')
                    }
                }

                continueButton.css('visibility', 'visible')

                socket.on('Start Game', function (data) {
                    if (data['gameCode'] === gameCode) {
                        if (mode === 'sp') {
                            window.location.href = baseUrl + "/singleplayer?sessionId=" + sessionId;
                        } else if (mode === 'v') {
                            window.location.href = baseUrl + "/versus?sessionId=" + sessionId;
                        }
                    }
                })
            }
        })
    });
}
