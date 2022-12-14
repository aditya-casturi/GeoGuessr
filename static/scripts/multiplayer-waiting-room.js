$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);

    const params = new URLSearchParams(window.location.search);
    let sessionId = params.get('sessionId');
    let mode = params.get('mode');
    const playerBox = $('#players');
    const modeName = $('#mode-name');

    let gameCode;
    let username;
    let host;
    let teams = 0;
    let currentTeam = 1;

    if (mode !== 'teams') {
        $('#add').remove();
    } else if (mode === 'teams') {
        $('#players').remove();
    }

    document.body.style.visibility = 'hidden';
    $('#loader').css('visibility', 'visible')
    socket.on('connect', function () {
        if (mode === 'teams') {
            $('.outer').css('top', '35%');
        }
        socket.emit('Get Session Data', {'sessionId': sessionId})

        socket.on('Send Session Data', function (data) {
            let sessionData = data['sessionData']

            if (sessionId === sessionData['sessionId']) {
                username = sessionData['username']
                gameCode = sessionData['gameCode']
                host = sessionData['host']

                if (host !== "true" && mode === 'teams') {
                    $('#add').remove();
                }

                socket.emit('User Connected', {'username': username, 'gameCode': gameCode, 'sessionId': sessionId})
                if (mode !== 'teams') {
                    socket.emit('Get Players', {'gameCode': gameCode, 'sessionId': sessionId})
                }

                document.getElementById('name-display').innerHTML =
                    "<i class=\"fa fa-home\" onclick='window.location.href=\"/\"'></i>" + username;
                $('#code-display').text(mode.charAt(0).toUpperCase() + mode.slice(1) + ' - ' + gameCode);

                if (host === "true") {
                    $('#title').text("You're the host!");
                    modeName.text("START GAME");

                    modeName.css('margin-left', '600px')
                    modeName.css('margin-right', '600px')
                    modeName.css('border', '3px solid white')

                    modeName.click(function () {
                        socket.emit('Generate Location', {'gameCode': gameCode})
                        modeName.text("Loading...");
                    })
                } else {
                    $('#title').text("You're in!");
                    modeName.text("Wait for the host to start the game.");
                }

                if (mode === 'teams') {
                    socket.emit('Player Joined Team', {'teamId': 1, 'gameCode': gameCode, 'sessionId': sessionId, 'username': username, 'lastTeam': currentTeam})
                    socket.emit('Get Teams', {'gameCode': gameCode, 'sessionId': sessionId})
                    socket.on('Send Teams', function (data) {
                        if (data['sessionId'] === sessionId) {
                            let teamIds = data['teamIds']
                            let usernames = data['usernames']
                            let numTeams = data['teams']
                            for (let i = 1; i <= numTeams; i++) {
                                addTeam();
                                addListener();
                            }
                            for (let i = 0; i < teamIds.length; i++) {
                                document.getElementById(teamIds[i]).innerHTML = document.getElementById(teamIds[i]).innerHTML + usernames[i] + "<br>";
                                $(String(teamIds[i])).hide();
                            }
                        }
                        document.body.style.visibility = 'visible';
                        $('#loader').css('visibility', 'hidden');
                    });
                }
            }
        })

        $('#add').click(function () {
            addTeam();
            addListener()
            socket.emit('Team Created', {'gameCode': gameCode, 'sessionId': sessionId})
        });

        socket.on('Add Team To Display', function (data) {
            if (sessionId !== data['sessionId']) {
                addTeam();
                addListener();
            }
        });

        socket.on('Update Teams Display', function (data) {
            if (data['gameCode'] === gameCode && data['sessionId'] !== sessionId) {
                let teamId = data['teamId'];
                let username = data['username'];
                let lastTeam = data['lastTeam'];
                document.getElementById(lastTeam).innerHTML = document.getElementById(lastTeam).innerHTML.replace(username + "<br>", "");
                document.getElementById(teamId).innerHTML = document.getElementById(teamId).innerHTML + username + "<br>";
            }
        });

        function addListener() {
            document.getElementById(teams).addEventListener('click', function () {
                document.getElementById(currentTeam).innerHTML = document.getElementById(currentTeam).innerHTML.replace(username + "<br>", "");
                socket.emit('Player Joined Team', {'teamId': this.id, 'gameCode': gameCode, 'sessionId': sessionId, 'username': username, 'lastTeam': currentTeam})
                document.getElementById(this.id).innerHTML = document.getElementById(this.id).innerHTML + username + "<br>";
                currentTeam = this.id;
            });
        }

        function addTeam() {
            teams = teams + 1;
            $('.teams-container').append("<div class=\"team\" id=\'" + teams + "\'><b><u>Team " +
                teams + "</u></b><br></div>")

            $('#' + teams).hide().fadeIn(1000);

            if (teams % 5 === 0) {
                $('.teams-container').append("<br>")
            }
        }

        socket.on('Start Game', function (data) {
            if (data['gameCode'] === gameCode) {
                if (mode !== 'teams') {
                    window.location.href = '/multiplayer?sessionId=' + sessionId + '&mode=' + mode;
                } else {
                    window.location.href = '/multiplayer?sessionId=' + sessionId + '&mode=' + mode + '&teamId=' + currentTeam;
                }
            }
        })

        socket.on('Send Players', function (data) {
            if (data['sessionId'] === sessionId) {
                playerBox.text(data['players'])
            }

            document.body.style.visibility = 'visible';
            $('#loader').css('visibility', 'hidden');

            $('.earth').css('animation', 'fadeInUp 1s ease-in-out');
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