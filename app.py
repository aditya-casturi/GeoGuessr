import csv
import random
from random import randint

from flask import Flask, render_template, request
from flask_mysqldb import MySQL
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
app.config['MYSQL_HOST'] = 'mysql.2223.lakeside-cs.org'
app.config['MYSQL_USER'] = 'student2223'
app.config['MYSQL_PASSWORD'] = 'm545CS42223'
app.config['MYSQL_DB'] = '2223project'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
app.debug = True
socketio = SocketIO(app)
mysql = MySQL(app)

sockets = {}
to_delete = ""


@app.route('/')
def home():
    return render_template('dashboard.html')


@app.route('/singleplayer-lobby')
def singleplayer_lobby():
    return render_template('singleplayer-lobby.html')


@app.route('/singleplayer')
def singleplayer():
    return render_template('singleplayer.html')


@app.route('/recap')
def recap():
    return render_template('recap.html')


@app.route('/join')
def join():
    return render_template('join.html')


@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')


@app.route('/br-leaderboard')
def br_leaderboard():
    return render_template('br-leaderboard.html')


@app.route('/versus')
def versus():
    return render_template('versus.html')


@app.route('/battle-royale')
def battle_royale():
    return render_template('battle-royale.html')


@app.route('/versus-lobby')
def versus_lobby():
    return render_template('versus-lobby.html')


@app.route('/battle-royale-lobby')
def battle_royale_lobby():
    return render_template('battle-royale-lobby.html')


@app.route('/versus-waiting')
def versus_waiting():
    return render_template('versus-waiting.html')


@app.route('/teams-lobby')
def teams_lobby():
    return render_template('teams-lobby.html')


@app.route('/teams-waiting')
def teams_waiting():
    return render_template('teams-waiting.html')


@app.route('/battle-royale-waiting')
def battle_royale_waiting():
    return render_template('battle-royale-waiting.html')


@socketio.on('Create Game')
def create_singleplayer_game(data):
    session_id = data['sessionId']
    rounds = data['rounds']
    mode = data['mode']

    location = generate_location()
    lat = location['lat']
    long = location['long']
    game_code = generate_game_code()
    if mode == 'sp':
        username = "SingleplayerSession" + str(session_id)
    else:
        username = data['username']

    query = 'INSERT INTO adityacasturi_connections (sessionId, gameCode, points, host, username) ' \
            'VALUES (%s, %s, 0, \'true\', %s)'
    execute_query(query, (session_id, game_code, username))

    if mode != 't':
        query = 'INSERT INTO adityacasturi_games (gameCode, currentRoundLat, currentRoundLong, rounds, roundsLeft, ' \
                'mode) ' \
                'VALUES (%s, %s, %s, %s, %s, %s)'
    else:
        query = 'INSERT INTO adityacasturi_games (gameCode, currentRoundLat, currentRoundLong, rounds, roundsLeft, ' \
                'mode, teams) ' \
                'VALUES (%s, %s, %s, %s, %s, %s, 1)'
    execute_query(query, (game_code, lat, long, rounds, rounds, mode,))


@socketio.on('Get Game Data')
def get_game_data(data):
    session_id = data['sessionId']

    query = 'SELECT gameCode FROM adityacasturi_connections WHERE sessionId = %s'
    result = execute_query(query, (session_id,))
    game_code = result[0]['gameCode']

    query = 'SELECT * FROM adityacasturi_games WHERE gameCode = %s'
    game_data = execute_query(query, (game_code,))[0]

    emit('Send Game Data', {'lat': game_data['currentRoundLat'], 'long': game_data['currentRoundLong'],
                            'roundsLeft': game_data['roundsLeft'], 'sessionId': session_id,
                            'rounds': game_data['rounds'], 'gameCode': game_code})


@socketio.on('Get Session Data')
def get_session_data(data):
    session_id = data['sessionId']
    query = 'SELECT * FROM adityacasturi_connections WHERE sessionId = %s'
    queryVars = (session_id,)

    session_data = execute_query(query, queryVars)[0]

    emit('Send Session Data', {'sessionData': session_data})


@socketio.on('Timer')
def start_timer(data):
    emit('Start Timer', {'gameCode': data['gameCode']}, broadcast=True)


@socketio.on('User Connected')
def user_connected(data):
    global sockets
    socket_id = request.sid
    username = data['username']
    gameCode = data['gameCode']
    sessionId = data['sessionId']
    sockets[socket_id] = {'username': username, 'gameCode': gameCode, 'sessionId': sessionId}


@socketio.on('Get Players')
def get_players(data):
    session_id = data['sessionId']
    game_code = data['gameCode']

    query = 'SELECT * FROM adityacasturi_connections WHERE gameCode = %s'
    query_vars = (game_code,)
    result = execute_query(query, query_vars)
    players = ""
    for player in result:
        players += str((player['username'])) + " "

    socketio.emit('Send Players', {'sessionId': session_id, 'players': players})


@socketio.on('Get Guess')
def get_guess(data):
    session_id = data['sessionId']

    query = 'SELECT * FROM adityacasturi_guesses WHERE sessionId = %s'
    query_vars = (session_id,)
    guess_data = execute_query(query, query_vars)[-1]

    emit('Send Guess', {'sessionId': session_id, 'guessData': guess_data})


@socketio.on('Submit Guess')
def submit_guess(data):
    session_id = data['sessionId']
    guess_lat = data['guessLat']
    guess_long = data['guessLong']
    answer_lat = data['answerLat']
    answer_long = data['answerLong']

    query = 'INSERT INTO adityacasturi_guesses (sessionId, guessLat, guessLong, answerLat, answerLong)' \
            ' VALUES (%s, %s, %s, %s, %s)'
    query_vars = (session_id, guess_lat, guess_long, answer_lat, answer_long,)
    execute_query(query, query_vars)


@socketio.on('Generate Location')
def generate_next_location(data):
    global to_delete

    gameCode = data['gameCode']

    location = generate_location()
    lat = location['lat']
    long = location['long']

    query = 'UPDATE adityacasturi_games SET currentRoundLat = %s, currentRoundLong = %s' \
            ' WHERE gameCode = %s'
    query_vars = (lat, long, gameCode,)
    execute_query(query, query_vars)

    query = 'SELECT mode FROM adityacasturi_games WHERE gameCode = %s'
    mode = execute_query(query, (gameCode,))[0]['mode']

    if mode == 'br' and to_delete != "":
        query = 'DELETE FROM adityacasturi_connections WHERE username = %s'
        execute_query(query, (to_delete,))
        query = 'UPDATE adityacasturi_connections SET points = 0 WHERE gameCode = %s'
        execute_query(query, (gameCode,))

    emit('Start Game', {'gameCode': gameCode}, broadcast=True)


@socketio.on('Update Score')
def update_score(data):
    session_id = data['sessionId']
    points = int(data['points'])

    query = 'UPDATE adityacasturi_connections SET points = points + %s WHERE sessionId = %s'
    query_vars = (points, session_id,)
    execute_query(query, query_vars)


@socketio.on('Validate Code')
def validate_code(data):
    game_code = data['gameCode']
    session_id = data['sessionId']
    username = data['username']

    query = 'SELECT * FROM adityacasturi_games WHERE gameCode = %s'
    query_vars = (game_code,)
    result = execute_query(query, query_vars)
    if len(result) != 0:
        query = 'INSERT INTO adityacasturi_connections (sessionId, username, gameCode, points, host) ' \
                'VALUES (%s, %s, %s, %s, %s)'
        query_vars = (session_id, username, game_code, 0, 'false')
        execute_query(query, query_vars)

        mode = result[0]['mode']

        emit('Code Valid', {'sessionId': session_id, 'mode': mode}, broadcast=True)
        emit('Player Joined', {'gameCode': game_code}, broadcast=True)
    else:
        emit('Code Invalid', {'sessionId': session_id}, broadcast=True)


@socketio.on('Update Round')
def update_round(data):
    gameCode = data['gameCode']

    query = 'UPDATE adityacasturi_games SET roundsLeft = roundsLeft - 1 WHERE gameCode = %s'
    query_vars = (gameCode,)
    execute_query(query, query_vars)


@socketio.on('Get Leaderboard')
def get_leaderboard(data):
    session_id = data['sessionId']
    mode = data['mode']

    query = 'SELECT gameCode, username, host FROM adityacasturi_connections WHERE sessionId = %s'
    result = execute_query(query, (session_id,))[0]
    gameCode = result['gameCode']
    curr_username = result['username']
    host = result['host']

    query = 'SELECT roundsLeft FROM adityacasturi_games WHERE gameCode = %s'
    query_vars = (gameCode,)
    rounds_left = int(execute_query(query, query_vars)[0]['roundsLeft'])

    query = 'SELECT username, points FROM adityacasturi_connections WHERE gameCode = %s'
    query_vars = (gameCode,)
    scores = execute_query(query, query_vars)

    query = 'SELECT username FROM adityacasturi_connections WHERE gameCode = %s AND host = %s'
    query_vars = (gameCode, 'true')
    host_username = execute_query(query, query_vars)[0]['username']

    usernames = []
    points = []

    for score in scores:
        usernames.append(score['username'])
        points.append(score['points'])

    for i in range(0, len(points)):
        for j in range(i + 1, len(points)):
            if points[i] < points[j]:
                temp = points[i]
                temp2 = usernames[i]
                points[i] = points[j]
                usernames[i] = usernames[j]
                points[j] = temp
                usernames[j] = temp2

    if mode == 'br':
        scoreboard = []

        for i in range(0, len(points) - 1):
            scoreboard.append(usernames[i] + " SAFE")
        scoreboard.append(usernames[len(points) - 1] + " ELIMINATED")

        global to_delete
        to_delete = usernames[len(points) - 1]

        if host_username == usernames[len(points) - 1]:
            query = 'UPDATE adityacasturi_connections SET host = %s WHERE username = %s'
            execute_query(query, ('true', usernames[0],))

        if curr_username == usernames[0] and host_username == usernames[len(points) - 1]:
            host = 'true'

        if len(usernames) == 2:
            emit('Send Leaderboard', {'scoreboard': scoreboard, 'sessionId': session_id,
                                      'gameCode': gameCode, 'host': host, 'gameOver': 'true',
                                      'username': curr_username}, broadcast=True)
        else:
            emit('Send Leaderboard', {'scoreboard': scoreboard, 'sessionId': session_id,
                                      'gameCode': gameCode, 'host': host, 'gameOver': 'false',
                                      'username': curr_username}, broadcast=True)
    else:
        scoreboard = []
        for i in range(len(usernames)):
            scoreboard.append(str(usernames[i]) + " " + str(points[i]))

        place = ordinal(int(usernames.index(curr_username) + 1))
        user_points = points[usernames.index(curr_username)]

        if rounds_left - 1 == 0:
            emit('Send Leaderboard', {'scoreboard': scoreboard, 'sessionId': session_id,
                                      'place': place, 'points': user_points, 'gameCode': gameCode,
                                      'host': host, 'gameOver': 'true', 'username': curr_username}, broadcast=True)
        else:
            emit('Send Leaderboard', {'scoreboard': scoreboard, 'sessionId': session_id,
                                      'place': place, 'points': user_points, 'gameCode': gameCode,
                                      'host': host, 'gameOver': 'false', 'username': curr_username}, broadcast=True)


def ordinal(n):
    return str(n) + {1: 'st', 2: 'nd', 3: 'rd'}.get(4 if 10 <= n % 100 < 20 else n % 10, "th")


def execute_query(query, query_vars):
    cursor = mysql.connection.cursor()
    cursor.execute(query, query_vars)
    mysql.connection.commit()
    return cursor.fetchall()


def generate_game_code():
    range_start = 10 ** 4
    range_end = (10 ** 5) - 1
    return randint(range_start, range_end)


def generate_location():
    with open("static/data/worldcities.csv", "r") as cities:
        csv_reader = csv.reader(cities)
        next(csv_reader)
        chosen_row = random.choice(list(csv_reader))
        lat = float(chosen_row[0])
        long = float(chosen_row[1])
        return {'lat': lat, 'long': long}


if __name__ == '__main__':
    socketio.run(app, host='10.83.29.137')
