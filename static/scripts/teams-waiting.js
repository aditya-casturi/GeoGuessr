$(document).ready(function () {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);

    const params = new URLSearchParams(window.location.search);
    let sessionId = params.get('sessionId');
    const subtitle = $('#subtitle');

    let gameCode;
    let username;
    let host;
    let teams = 0;
    let currentTeam = 1;

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

                if (host !== "true") {
                    $('#add').remove();
                }

                socket.emit('User Connected', {'username': username, 'gameCode': gameCode, 'sessionId': sessionId})

                document.getElementById('name-display').innerHTML =
                    "<i class=\"fa fa-home\" onclick='window.location.href=\"/\"'></i>" + username;
                $('#code-display').text("Teams - " + gameCode)

                if (host === "true") {
                    $('#title').text("You're the host!");
                    subtitle.text("START GAME");

                    subtitle.css('margin-left', '600px')
                    subtitle.css('margin-right', '600px')
                    subtitle.css('border', '3px solid black')

                    subtitle.click(function () {
                        socket.emit('Generate Location', {'gameCode': gameCode})
                        subtitle.text("Loading...");
                    })
                } else {
                    $('#title').text("You're in!");
                    subtitle.text("Wait for the host to start the game.");
                }

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
                        }
                    }

                    document.body.style.visibility = 'visible';
                    $('#loader').css('visibility', 'hidden');
                });
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
            if (teams % 4 === 0) {
                $('.teams-container').append("<div class=\"team\" id=\'" + teams + "\'>Team " + teams + "<br></div><br>")

            } else {
                $('.teams-container').append("<div class=\"team\" id=\'" + teams + "\'>Team " + teams + "<br></rb></div>")
            }
        }


        socket.on('Start Game', function (data) {
            if (data['gameCode'] === gameCode) {
                window.location.href = baseUrl + "/teams?sessionId=" + sessionId + "&teamId=" + currentTeam;
            }
        })
    })
})