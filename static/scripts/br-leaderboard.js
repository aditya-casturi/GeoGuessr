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
                let leaderboard = data['leaderboard'];
                let gameCode = data['gameCode'];
                let host = data['host'];
                let gameOver = data['gameOver'];
                let username = data['username'];
                let status = data['points'];
                let eliminated;

                let brInfo = $("#br-info");
                let info = $("#info");
                const nameDisplay = $('#name-display');
                const pointsDisplay = $('#points-display');
                const continueButton = $('#continue-button');

                nameDisplay.text(username);
                nameDisplay.css('visibility', 'visible');

                if (status === 'ELIMINATED') {
                    eliminated = true;
                    showBackButtons();
                    brInfo.text('ELIMINATED.');
                    brInfo.css('color', '#C21806');
                } else {
                    eliminated = false;
                    brInfo.text('SURVIVOR.');
                    brInfo.css('color', 'black');
                }

                let plural = leaderboard.length > 1 ? 's' : '';
                info.text(leaderboard.length - 1 + ' player' + plural + ' remaining.');
                info.css('visibility', 'visible');
                pointsDisplay.text(gameCode);
                pointsDisplay.css('visibility', 'visible');
                nameDisplay.css('visibility', 'visible');

                $('#loader').css('visibility', 'hidden');
                $('#bar').css('visibility', 'visible');

                if (gameOver === "true") {
                    if (!eliminated) {
                        brInfo.text('BR VICTORY.');
                        brInfo.css('color', 'black');
                        info.text('You are the last player standing!');
                    }
                    showBackButtons();
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
                    if (data['gameCode'] === gameCode && !eliminated) {
                        window.location.href = baseUrl + "/battle-royale?sessionId=" + sessionId;
                    }
                })

                function showBackButtons() {
                    continueButton.css('background', 'transparent')
                    continueButton.css('color', 'black')
                    continueButton.css('pointer-events', 'none')
                    continueButton.text('Game Over')
                    $('#lobby-button').css('visibility', 'visible');
                }
            }
        })
    });
}
