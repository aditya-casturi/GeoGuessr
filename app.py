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
app.config['MYSQL_DB'] = '2223project_1'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
app.debug = True
socketio = SocketIO(app)
mysql = MySQL(app)

sockets = {}
to_delete = {}


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


@app.route('/teams')
def teams():
    return render_template('teams.html')


@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')


@app.route('/br-leaderboard')
def br_leaderboard():
    return render_template('br-leaderboard.html')


@app.route('/versus')
def versus():
    return render_template('versus.html')


@app.route('/hardcore')
def hardcore():
    return render_template('hardcore.html')


@app.route('/battle-royale')
def battle_royale():
    return render_template('battle-royale.html')


@app.route('/versus-lobby')
def versus_lobby():
    return render_template('versus-lobby.html')


@app.route('/battle-royale-lobby')
def battle_royale_lobby():
    return render_template('battle-royale-lobby.html')


@app.route('/hardcore-lobby')
def hardcore_lobby():
    return render_template('hardcore-lobby.html')


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
def create_game(data):
    session_id = data['sessionId']
    rounds = data['rounds']
    mode = data['mode']

    print("here")

    location = generate_location()
    lat = location['lat']
    long = location['long']
    game_code = generate_game_code()
    if mode == 'sp':
        username = "SingleplayerSession" + str(session_id)
    elif mode == 'h':
        username = 'HardcoreSession' + str(session_id)
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

    query = 'DELETE FROM adityacasturi_guesses WHERE gameCode = %s'
    execute_query(query, (gameCode,))

    query = 'SELECT rounds, roundsLeft, mode FROM adityacasturi_games WHERE gameCode = %s'
    result = execute_query(query, (gameCode,))[0]
    mode = result['mode']

    if mode == 'br' and gameCode in to_delete != "":
        query = 'DELETE FROM adityacasturi_connections WHERE username = %s; ' \
                'UPDATE adityacasturi_connections SET points = 0 WHERE gameCode = %s'
        execute_query(query, (to_delete[gameCode], gameCode))
    elif mode == 't' and result['roundsLeft'] == result['rounds']:
        query = 'SELECT DISTINCT teamId FROM adityacasturi_connections WHERE gameCode = %s'
        trueNumberOfTeams = len(execute_query(query, (gameCode,)))

        query = 'UPDATE adityacasturi_games SET teams = %s WHERE gameCode = %s'
        execute_query(query, (trueNumberOfTeams, gameCode,))

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
    result = execute_query(query, (game_code,))
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
    rounds_left = int(execute_query(query, (gameCode,))[0]['roundsLeft'])

    query = 'SELECT username, points FROM adityacasturi_connections WHERE gameCode = %s ORDER BY points DESC LIMIT 5'
    scores = execute_query(query, (gameCode,))

    place = 0
    user_points = 0
    leaderboard = []
    for score in scores:
        leaderboard.append({'username': score['username'], 'points': score['points']})
        if score['username'] == curr_username:
            user_points = score['points']
            place = ordinal(scores.index(score) + 1)

    query = 'SELECT username FROM adityacasturi_connections WHERE gameCode = %s AND host = %s'
    query_vars = (gameCode, 'true')
    host_username = execute_query(query, query_vars)[0]['username']

    br_leaderboard = []
    if mode == 'br':
        for i in range(len(leaderboard) - 1):
            br_leaderboard.append({'username': leaderboard[i]['username'], 'status': 'SAFE'})
            if leaderboard[i]['username'] == curr_username:
                user_points = 'SAFE'
        br_leaderboard.append({'username': leaderboard[-1]['username'], 'status': 'SAFE'})
        if leaderboard[-1]['username'] == curr_username:
            user_points = 'ELIMINATED'

        global to_delete
        print(str(br_leaderboard))
        to_delete[gameCode] = br_leaderboard[-2]['username']

        if host_username == br_leaderboard[-1]['username']:
            query = 'UPDATE adityacasturi_connections SET host = %s WHERE username = %s'
            execute_query(query, ('true', br_leaderboard[0]['username'],))

        if curr_username == br_leaderboard[0]['username'] and host_username == br_leaderboard[-1]['username']:
            host = 'true'

        game_over = 'true' if len(br_leaderboard) == 2 else 'false'
    else:
        game_over = 'true' if rounds_left - 1 == 0 else 'false'

    finalLeaderboard = br_leaderboard if mode == 'br' else leaderboard
    emit('Send Leaderboard', {'leaderboard': finalLeaderboard, 'sessionId': session_id,
                              'place': place, 'points': user_points, 'gameCode': gameCode,
                              'host': host, 'gameOver': game_over, 'username': curr_username}, broadcast=True)


@socketio.on('Player Joined Team')
def player_joined_team(data):
    session_id = data['sessionId']
    team_id = data['teamId']
    game_code = data['gameCode']
    username = data['username']
    last_team = data['lastTeam']

    query = 'UPDATE adityacasturi_connections SET teamId = %s WHERE sessionId = %s'
    query_vars = (team_id, session_id,)
    execute_query(query, query_vars)

    emit('Update Teams Display', {'gameCode': game_code, 'username': username,
                                  'teamId': team_id, 'sessionId': session_id, 'lastTeam': last_team}, broadcast=True)


@socketio.on('Get Teams')
def get_teams(data):
    game_code = data['gameCode']
    session_id = data['sessionId']

    query = 'SELECT username, teamId, teams FROM adityacasturi_connections INNER JOIN adityacasturi_games ' \
            'ON adityacasturi_connections.gameCode = %s WHERE adityacasturi_games.gameCode = %s;'
    query_vars = (game_code, game_code,)
    result = execute_query(query, query_vars)

    usernames = []
    team_ids = []

    for row in result:
        usernames.append(row['username'])
        team_ids.append(row['teamId'])

    emit('Send Teams', {'usernames': usernames, 'teamIds': team_ids,
                        'sessionId': session_id, 'teams': result[0]['teams']}, broadcast=True)


@socketio.on('Team Created')
def team_created(data):
    game_code = data['gameCode']
    session_id = data['sessionId']
    emit('Add Team To Display', {'gameCode': game_code, 'sessionId': session_id}, broadcast=True)

    query = 'UPDATE adityacasturi_games SET teams = teams + 1 WHERE gameCode = %s'
    query_vars = (game_code,)
    execute_query(query, query_vars)


@socketio.on('Teammate Marker Placed')
def teammate_marker_placed(data):
    session_id = data['sessionId']
    game_code = data['gameCode']
    lat = data['lat']
    long = data['long']

    query = 'SELECT teamId FROM adityacasturi_connections WHERE sessionId = %s'
    team_id = execute_query(query, (session_id,))[0]['teamId']

    emit('Update Teammate Marker', {'sessionId': session_id, 'gameCode': game_code,
                                    'lat': lat, 'long': long, 'teamId': team_id}, broadcast=True)


@socketio.on('Get Team Guesses')
def get_team_guesses(data):
    session_id = data['sessionId']

    query = 'SELECT gameCode, teamId FROM adityacasturi_connections WHERE sessionId = %s'
    result = execute_query(query, (session_id,))[0]
    game_code = result['gameCode']
    team_id = result['teamId']

    query = 'SELECT * FROM adityacasturi_guesses WHERE gameCode = %s AND teamId = %s'
    query_vars = (game_code, team_id,)
    result = execute_query(query, query_vars)

    emit('Send Team Guesses', {'sessionId': session_id, 'guesses': result}, broadcast=True)


@socketio.on('Submit Team Guess')
def submit_team_guess(data):
    session_id = data['sessionId']
    guess_lat = data['guessLat']
    guess_long = data['guessLong']
    answer_lat = data['answerLat']
    answer_long = data['answerLong']
    game_code = data['gameCode']
    team_id = data['teamId']

    query = 'INSERT INTO adityacasturi_guesses (sessionId, guessLat, guessLong, answerLat, ' \
            'answerLong, gameCode, teamId) VALUES (%s, %s, %s, %s, %s, %s, %s)'
    query_vars = (session_id, guess_lat, guess_long, answer_lat, answer_long, game_code, team_id,)
    execute_query(query, query_vars)


@socketio.on('Get Players Left')
def get_players_left(data):
    session_id = data['sessionId']

    query = 'SELECT COUNT(*) FROM adityacasturi_connections WHERE gameCode = ' \
            '(SELECT gameCode FROM adityacasturi_connections WHERE sessionId = %s)'
    query_vars = (session_id,)
    players_left = execute_query(query, query_vars)[0]['COUNT(*)']

    emit('Send Players Left', {'sessionId': session_id, 'playersLeft': players_left}, broadcast=True)


@socketio.on('Get Teams Leaderboard')
def get_teams_leaderboard(data):
    session_id = data['sessionId']

    query = 'SELECT host, gameCode, teamId, points FROM adityacasturi_connections WHERE sessionId = %s'
    user_info = execute_query(query, (session_id,))[0]

    query = 'SELECT roundsLeft FROM adityacasturi_games WHERE gameCode = %s'
    rounds_left = execute_query(query, (user_info['gameCode'],))[0]['roundsLeft']
    game_over = 'true' if rounds_left - 1 == 0 else 'false'

    teams_leaderboard = []
    place = 0

    query = 'SELECT DISTINCT points, teamId FROM adityacasturi_connections WHERE gameCode = %s ' \
            'ORDER BY points DESC LIMIT 5'
    result = execute_query(query, (user_info['gameCode'],))

    for row in result:
        print(row)
        if row['teamId'] == user_info['teamId']:
            place = ordinal(result.index(row) + 1)
        teams_leaderboard.append({'teamId': row['teamId'], 'points': row['points']})

    emit('Send Teams Leaderboard', {'sessionId': session_id, 'teamsLeaderboard': teams_leaderboard,
                                    'gameOver': game_over, 'teamId': user_info['teamId'], 'place': place,
                                    'points': user_info['points'], 'host': user_info['host'],
                                    'gameCode': user_info['gameCode']}, broadcast=True)


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
    with open("static/data/temp.csv", "r") as cities:
        csv_reader = csv.reader(cities)
        next(csv_reader)
        chosen_row = random.choice(list(csv_reader))
        lat = float(chosen_row[0])
        long = float(chosen_row[1])
        return {'lat': lat, 'long': long}


if __name__ == '__main__':
    socketio.run(app, host='10.83.29.137')
