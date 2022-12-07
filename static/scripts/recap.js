function initialize() {
    let baseUrl = window.location.origin;
    let socket = io.connect(baseUrl);
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    let mode = params.get('mode');

    $('#loader').css('visibility', 'visible')
    socket.on('connect', function () {
        if (mode !== 't') {
            socket.emit('Get Guess', {'sessionId': sessionId})

            socket.on('Send Guess', function (data) {
                if (data['sessionId'] === sessionId) {
                    let guessData = data['guessData'];

                    console.log(guessData);

                    let answerLat = parseFloat(guessData['answerLat']);
                    let answerLong = parseFloat(guessData['answerLong']);

                    let guessLat = parseFloat(guessData['guessLat']);
                    let guessLong = parseFloat(guessData['guessLong']);

                    let answer = new google.maps.LatLng(answerLat, answerLong);
                    let guess = new google.maps.LatLng(guessLat, guessLong);
                    let points;
                    let validGuess = true;

                    let distance;
                    if (guessLat === 0 && guessLong === 0) {
                        distance = 0;
                        points = 0;
                        validGuess = false;
                    } else {
                        distance = google.maps.geometry.spherical.computeDistanceBetween(answer, guess);
                        distance = Math.round(distance * 0.000621371);
                        points = Math.round(5000 / Math.pow(Math.E, (distance / 926)));
                    }

                    socket.emit('Update Score', {'sessionId': sessionId, 'points': points});

                    const map = new google.maps.Map(document.getElementById("map"), {
                        draggableCursor: 'crosshair', draggingCursor: 'crosshair',
                        disableDefaultUI: true, center: {lat: 38.087463014457136, lng: -41.98349121041763},
                        zoom: 1, minZoom: 1,
                        restriction: {latLngBounds: {north: 85, south: -85, west: -180, east: 180}}
                    });

                    const icon = {
                        url: 'https://www.geoguessr.com/_next/static/images/correct-location-4da7df904fc6b08ce841e4ce63cd8bfb.png',
                        scaledSize: new google.maps.Size(30, 30)
                    };

                    const answerMarker = new google.maps.Marker({
                        position: answer, map: map, cursor: 'crosshair', icon: icon
                    });

                    let center;
                    let bounds;
                    let line;
                    if (validGuess) {
                        new google.maps.Marker({
                            icon: 'https://www.geoguessr.com/_next/static/images/favicon-aae84a1ec836612840470a029b5c29d6.png',
                            position: guess, map: map, cursor: 'crosshair'
                        });

                        let coords;
                        if (guess.lng() < answer.lng()) {
                            coords = [answer, guess]
                        } else {
                            coords = [guess, answer]
                        }

                        const lineSymbol = {path: 'M 0, 2, 0, 1', strokeOpacity: 1, scale: 3, strokeColor: '#808080'};
                        line = new google.maps.Polyline({
                            path: coords, strokeOpacity: 0, geodesic: false,
                            icons: [{icon: lineSymbol, offset: '0', repeat: '10px'}]
                        })

                        bounds = new google.maps.LatLngBounds();
                        line.getPath().forEach(function (e) {
                            bounds.extend(e);
                        })
                        center = bounds.getCenter();
                    }

                    if (validGuess) {
                        line.setMap(map);
                        map.fitBounds(bounds);
                        map.setCenter(center);
                        map.setZoom(5);
                    } else {
                        map.setZoom(5);
                        map.panTo(answerMarker.getPosition());
                    }

                    const distanceDisplay = $('#distance-display');
                    const pointsDisplay = $('#points-display')
                    const pointsBar = $('#points-bar')

                    if (validGuess) {
                        distanceDisplay.html("Your guess was <i><b style='color: #F9CA19'>" + distance + "</b></i> miles from the correct location.")
                    } else {
                        distanceDisplay.text("You didn't guess in time.")
                    }
                    pointsDisplay.html(points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " points")
                    pointsBar.val(points)

                    $('#loader').css('visibility', 'hidden')
                    document.body.style.visibility = 'visible';
                }
            });

            $('#continue-button').click(function () {
                if (mode === "br") {
                    window.location.href = "/br-leaderboard?sessionId=" + sessionId+ "&mode=" + mode;
                } else {
                    window.location.href = "/leaderboard?sessionId=" + sessionId + "&mode=" + mode;
                }
            })
        } else {
            socket.emit('Get Team Guesses', {'sessionId': sessionId})

            socket.on('Send Team Guesses', function (data) {
                if (data['sessionId'] === sessionId) {
                    let guesses = data['guesses'];
                    let answerLat = parseFloat(data['guesses'][0]['answerLat']);
                    let answerLong = parseFloat(data['guesses'][0]['answerLong']);
                    let highestPoints = 0;
                    let bestBounds;
                    let bestCenter;

                    let validGuess = true;
                    let answer = new google.maps.LatLng(answerLat, answerLong);

                    const icon = {
                        url: 'https://www.geoguessr.com/_next/static/images/correct-location-4da7df904fc6b08ce841e4ce63cd8bfb.png',
                        scaledSize: new google.maps.Size(30, 30)
                    };

                    const map = new google.maps.Map(document.getElementById("map"), {
                        draggableCursor: 'crosshair', draggingCursor: 'crosshair',
                        disableDefaultUI: true, center: {lat: 38.087463014457136, lng: -41.98349121041763},
                        zoom: 1, minZoom: 1,
                        restriction: {latLngBounds: {north: 85, south: -85, west: -180, east: 180}}
                    });

                    new google.maps.Marker({
                        position: answer, map: map, cursor: 'crosshair', icon: icon
                    });

                    for (const guess of guesses) {
                        let guessLat = parseFloat(guess['guessLat']);
                        let guessLong = parseFloat(guess['guessLong']);
                        let userGuess = new google.maps.LatLng(guessLat, guessLong);

                        let points;
                        let distance;
                        if (guessLat === 0 && guessLong === 0) {
                            distance = 0;
                            points = 0;
                            validGuess = false;
                        } else {
                            distance = google.maps.geometry.spherical.computeDistanceBetween(answer, userGuess);
                            distance = Math.round(distance * 0.000621371);
                            points = Math.round(5000 / Math.pow(Math.E, (distance / 926)));
                        }

                        if (validGuess) {
                            new google.maps.Marker({
                                icon: 'https://www.geoguessr.com/_next/static/images/favicon-aae84a1ec836612840470a029b5c29d6.png',
                                position: userGuess, map: map, cursor: 'crosshair'
                            });

                            let coords;
                            if (userGuess.lng() < answer.lng()) {
                                coords = [answer, userGuess]
                            } else {
                                coords = [userGuess, answer]
                            }

                            const lineSymbol = {
                                path: 'M 0, 2, 0, 1',
                                strokeOpacity: 1,
                                scale: 3,
                                strokeColor: '#808080'
                            };
                            let line = new google.maps.Polyline({
                                path: coords, strokeOpacity: 0, geodesic: false,
                                icons: [{icon: lineSymbol, offset: '0', repeat: '10px'}]
                            })

                            let bounds = new google.maps.LatLngBounds();
                            line.getPath().forEach(function (e) {
                                bounds.extend(e);
                            })
                            let center = bounds.getCenter();

                            line.setMap(map);

                            if (points > highestPoints) {
                                highestPoints = points;
                                bestBounds = bounds;
                                bestCenter = center;
                            }
                        }
                    }

                    map.fitBounds(bestBounds);
                    map.setCenter(bestCenter);
                    map.setZoom(5);

                    $('#loader').css('visibility', 'hidden')
                    document.body.style.visibility = 'visible';
                }
            });
        }
    });
}

window.onload = function () {
    initialize();
}
