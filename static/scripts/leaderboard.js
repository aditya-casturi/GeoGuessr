window.onload = function() {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    const mode = params.get('mode');

    $('#loader').css('visibility', 'visible')

    socket.on('connect', function () {
        let host;
        let gameOver;
        let gameCode;
        const nameDisplay = $('#name-display');
        const pointsDisplay = $('#points-display');
        const continueButton = $('#continue-button');
        const info = $('#info');

        if (mode === 'teams') {
            socket.emit('Get Teams Leaderboard', {sessionId: sessionId});

            socket.on('Send Teams Leaderboard', function (data) {
                if (data['sessionId'] === sessionId) {
                    let teamsLeaderboard = data['teamsLeaderboard'];
                    let teamId = data['teamId'];
                    let place = data['place'];
                    let points = data['points']
                    host = data['host'];
                    gameOver = data['gameOver']
                    gameCode = data['gameCode'];

                    nameDisplay.text('Team ' + teamId);
                    pointsDisplay.text(points + ' points');
                    info.text('Your team is ' + place + ' place');

                    for (let i = 0; i < teamsLeaderboard.length; i++) {
                        const data = teamsLeaderboard[i];
                        console.log(data);
                        document.getElementById((i+1) + '-username').textContent = "Team " + data['teamId'];
                        document.getElementById((i+1) + '-points').textContent = data['points'];
                        document.getElementById((i+1) + '-username').style.color = 'white';
                        document.getElementById((i+1) + '-points').style.color = 'white';
                    }

                    adjustUI();

                    socket.on('Start Game', function (data) {
                        if (data['gameCode'] === gameCode) {
                            window.location.href = baseUrl + "/multiplayer?sessionId=" + sessionId + "&teamId=" + teamId + '&mode=teams';
                        }
                    })
                }
            });
        } else {
            socket.emit('Get Leaderboard', {'sessionId': sessionId, 'mode': mode})

            socket.on('Send Leaderboard', function (data) {
                if (data['sessionId'] === sessionId) {
                    let points = data['points'];
                    let place = data['place'];
                    let leaderboard = data['leaderboard'];
                    gameCode = data['gameCode'];
                    host = data['host'];
                    gameOver = data['gameOver'];
                    let username = data['username'];

                    if (mode === 'classic' || mode === 'hardcore') {
                        leaderboard[0] = {'username': 'You', 'points': points};
                        nameDisplay.text("Filler");
                        nameDisplay.css('color', 'black');
                    } else if (mode === 'versus') {
                        nameDisplay.text(username)
                    }
                    pointsDisplay.text(points + ' points');

                    if (mode !== 'classic' && mode !== 'hardcore') {
                        info.text('You are ' + place + ' place');
                    }

                    for (let i = 0; i < leaderboard.length; i++) {
                        const data = leaderboard[i];
                        document.getElementById((i+1) + '-username').textContent = data['username'];
                        document.getElementById((i+1) + '-points').textContent = data['points'];
                        document.getElementById((i+1) + '-username').style.color = 'white';
                        document.getElementById((i+1) + '-points').style.color = 'white';
                    }

                    adjustUI();

                    socket.on('Start Game', function (data) {
                        if (data['gameCode'] === gameCode) {
                            if (mode === 'classic' || mode === 'hardcore') {
                                window.location.href = baseUrl + "/singleplayer?sessionId=" + sessionId + '&mode=' + mode;
                            } else if (mode === 'versus') {
                                window.location.href = baseUrl + "/multiplayer?sessionId=" + sessionId + '&mode=' + mode;
                            }
                        }
                    })
                }
            })
        }


        function adjustUI() {
            console.log('gameOver=' + gameOver)
            if (gameOver === "true") {
                continueButton.css('background', 'transparent')
                continueButton.css('color', 'white')
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

            $('#loader').css('visibility', 'hidden');
            $('#bar').css('visibility', 'visible');
            $('.leaderboard-position').css('visibility', 'visible');
            pointsDisplay.css('visibility', 'visible');
            if (mode !== 'sp') {
                nameDisplay.css('visibility', 'visible');
            }
            info.css('visibility', 'visible');
            continueButton.css('visibility', 'visible')
            $('.earth').css('visibility', 'visible')
            $('.earth').css('animation', 'fadeInUp 1s ease-in-out');
        }
    });
}
