function initialize() {
    // Initialize a socket connection
    let socket = io.connect();

    // Get the 'sessionId' parameter from the URL query string
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');

    // Define the center of the map
    const centerOfTheWorld = { lat: 38.087463014457136, lng: -41.98349121041763};

    // Keep track of whether the user has submitted a guess
    let guessSubmitted = false;

    // Keep track of whether the user has placed a marker on the map
    let markerPlaced = false;
    let teammateMarkers = {};
    let teamId = params.get('teamId');

    // Hide the page until the game data is loaded
    document.body.style.visibility = 'hidden';

    // Show a loading spinner on the page
    $('#loader').css('visibility', 'visible')

    // When the socket connection is established,
    // send a 'Get Game Data' message to the server
    socket.on('connect', function () {
        socket.emit('Get Game Data', {'sessionId': sessionId})

        // When the server responds with a 'Send Game Data' message,
        // update the map and panorama with the game data
        socket.on('Send Game Data', function (data) {
            // Make sure the message is for the correct session
            if (data['sessionId'] === sessionId) {
                let gameCode = data['gameCode']

                // Get the number of rounds and the rounds remaining from the message
                let roundsLeft = data['roundsLeft']
                let rounds = data['rounds']

                // Update the round display
                $('#round-info').text("Round " + (rounds - roundsLeft + 1) + "/" + rounds)
                $('#team-info').text("Team " + teamId);

                // Get the correct location from the message
                let lat = parseFloat(data['lat']);
                let long = parseFloat(data['long']);
                let answerLatLong = new google.maps.LatLng(lat, long);
                let guessLatLong;

                // Get the "guess" button
                const guess = $('#guess');

                // Keep track of the markers placed on the map
                const markers = [];

                // Keep track of the current heading of the panorama
                let currentHeading;

                // Initialize the map
                const staticMap = new google.maps.Map(
                    document.getElementById("map"), {
                        draggableCursor: 'crosshair', draggingCursor: 'crosshair',
                        disableDefaultUI: true, center: centerOfTheWorld, zoom: 1, minZoom: 1,
                        restriction: {latLngBounds: {north: 85, south: -85, west: -180, east: 180}}
                    }
                );

                // Initialize the panorama
                const streetView = new google.maps.StreetViewPanorama(
                    document.getElementById("street-view"), {
                        disableDefaultUI: true, addressControl: false,
                        showRoadLabels: false, position: answerLatLong,
                        pov: {heading: 34, pitch: 10}
                    }
                );

                // Set the map
                staticMap.setStreetView(streetView);

                currentHeading = streetView.getPov().heading;

                // Listen for when the user clicks on the map
                google.maps.event.addListener(staticMap, 'click', function (event) {
                    // Don't do anything if the user has already submitted their guess
                    if (!guessSubmitted) {
                        // Check if there are any existing markers on the map
                        const empty = markers.length === 0
                        // Clear the map of any existing markers
                        clearMap();
                        // Place a marker on the map at the location of the user's click
                        placeMarker(event.latLng);

                        socket.emit('Teammate Marker Placed', {'sessionId': sessionId, 'gameCode': gameCode, 'lat': event.latLng.lat(), 'long': event.latLng.lng()})

                        // If there were no markers on the map before this click,
                        // change the color of the "guess" button to indicate that it can be clicked
                        if (empty) {
                            guess.css('background', '#C21806');
                        }

                        // Make the "guess" button clickable and change the cursor to a pointer
                        guess.css('pointer-events', 'all');
                        guess.css('cursor', 'pointer');
                    }

                    // Set a flag to indicate that a marker has been placed on the map
                    markerPlaced = true;

                    $('#guess').text('GUESS');
                });

                // Listen for when the user changes the viewpoint in the street view
                streetView.addListener('pov_changed', function () {
                    // Adjust the compass heading to match the new viewpoint
                    adjustCompassHeading()
                });

                // Listen for when the user changes the panorama in the street view
                streetView.addListener('pano_changed', function () {
                    // Adjust the compass heading to match the new panorama
                    adjustCompassHeading()
                });

                // Make the page visible and hide the loading spinner
                document.body.style.visibility = 'visible';
                $('#loader').css('visibility', 'hidden')

                let timerStarted = false
                guess.click(function () {
                    guess.css('pointer-events', 'none');
                    guess.css('background', '#808080')

                    guessSubmitted = true;

                    if (!timerStarted) {
                        socket.emit('Timer', {'gameCode': gameCode})
                    }
                })

                socket.on('Start Timer', function (data) {
                    if (data['gameCode'] === gameCode && !timerStarted) {
                        timerStarted = true;
                        startTimer();
                    }
                })

                let countdown = $('#countdown');
                function startTimer() {
                    document.getElementById("countdown").innerHTML = "0:15";
                    countdown.css('visibility', 'visible');
                    countdown.css('background', 'green');

                    let timeleft = 14;
                    setInterval(function () {
                        if (timeleft <= 0) {
                            guess.css('pointer-events', 'none');
                            guess.css('background', '#808080');

                            if (!guessSubmitted && !markerPlaced) {
                                guessLatLong = new google.maps.LatLng(0, 0);
                            }

                            socket.emit('Submit Team Guess', {'sessionId': sessionId,
                                                        'guessLat': guessLatLong.lat(), 'guessLong': guessLatLong.lng(),
                                                        'answerLat': answerLatLong.lat(), 'answerLong': answerLatLong.lng(),
                                                        'teamId': teamId, 'gameCode': gameCode})

                            window.location.href = "/recap?sessionId=" + sessionId + "&mode=t";
                        } else {
                            if (timeleft >= 10) {
                                countdown.text("0:" + timeleft);
                            } else {
                                countdown.text("00:0" + timeleft);
                            }

                            if (timeleft === 10) {
                                countdown.css('background', '#FCA512');
                            } else if (timeleft === 6) {
                                countdown.css('background', 'orange');
                            } else if (timeleft === 3) {
                                countdown.css('background', 'red');
                            }
                        }
                        timeleft -= 1;
                    }, 1000);
                }


                // Place a marker on the map at the specified location
                function placeMarker(location) {
                    // Create a new marker with a custom icon, at the specified location,
                    // and add it to the map
                    const marker = new google.maps.Marker({
                        icon: 'https://www.geoguessr.com/_next/static/images/favicon-aae84a1ec836612840470a029b5c29d6.png',
                        position: location, map: staticMap, cursor: 'crosshair'
                    });

                    guessLatLong = new google.maps.LatLng(location.lat(), location.lng())

                    markers.push(marker);
                }

                // This function removes all markers from the map.
                function clearMap() {
                    for (let i = 0; i < markers.length; i++) {
                        markers[i].setMap(null);
                    }
                }

                // This function adjusts the heading of the compass based on the current
                // panoramic view's heading.
                function adjustCompassHeading() {
                    let newHeading = streetView.getPov().heading;

                    // Use the animateRotate function to smoothly rotate the compass to match the new heading.
                    $('#compass').animateRotate(newHeading, currentHeading);
                    currentHeading = newHeading;
                }

                // Define the animateRotate function. This is used to animate the rotation of an element
                // to a given angle.
                $.fn.animateRotate = function (startAngle, endAngle, duration, easing, complete) {
                    return this.each(function () {
                        const elem = $(this);

                        // Animate the rotation of the element.
                        $({deg: startAngle}).animate({deg: endAngle}, {
                            duration: duration,
                            easing: easing,
                            step: function (now) {
                                elem.css({
                                    'transform': 'rotate(' + now + 'deg)'
                                });
                            },
                            complete: complete || $.noop
                        });
                    });
                };

                socket.on('Update Teammate Marker', function (data) {
                    if (data['gameCode'] === gameCode && data['sessionId'] !== sessionId
                        && parseInt(data['teamId']) === parseInt(teamId)) {
                        let lat = parseFloat(data['lat']);
                        let long = parseFloat(data['long']);
                        let teammate = data['sessionId']

                        let pos = new google.maps.LatLng(lat, long);

                        if (teammateMarkers[teammate] !== undefined) {
                            teammateMarkers[teammate].setMap(null);
                        }

                        teammateMarkers[teammate] = new google.maps.Marker({
                            icon: 'https://www.geoguessr.com/_next/static/images/favicon-aae84a1ec836612840470a029b5c29d6.png',
                            position: pos, map: staticMap, cursor: 'crosshair'
                        });
                    }
                });
            }
        });
    })
}

window.onload = function () {
    initialize();
}

