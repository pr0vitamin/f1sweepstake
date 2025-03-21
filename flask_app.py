import os
from socket import gethostname
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, flash, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import random

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-key-for-f1-sweepstakes'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///f1sweepstakes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True

# Initialize database
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    points = db.Column(db.Integer, default=0)
    
    def __repr__(self):
        return f'<User {self.name}>'

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    is_top_team = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<Team {self.name}>'

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    number = db.Column(db.Integer, nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    team = db.relationship('Team', backref=db.backref('drivers', lazy=True))
    
    def __repr__(self):
        return f'<Driver {self.name}>'

class GrandPrix(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    
    def __repr__(self):
        return f'<GrandPrix {self.name}>'

class RaceResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    grand_prix_id = db.Column(db.Integer, db.ForeignKey('grand_prix.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    
    grand_prix = db.relationship('GrandPrix', backref=db.backref('results', lazy=True))
    driver = db.relationship('Driver', backref=db.backref('results', lazy=True))
    
    def __repr__(self):
        return f'<RaceResult {self.grand_prix.name} - {self.driver.name}: {self.position}>'

class PointsMapping(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position = db.Column(db.Integer, nullable=False, unique=True)
    points = db.Column(db.Integer, nullable=False)
    
    def __repr__(self):
        return f'<PointsMapping {self.position}: {self.points}>'

class DriverSelection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    grand_prix_id = db.Column(db.Integer, db.ForeignKey('grand_prix.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('selections', lazy=True))
    driver = db.relationship('Driver', backref=db.backref('selections', lazy=True))
    grand_prix = db.relationship('GrandPrix', backref=db.backref('selections', lazy=True))
    
    def __repr__(self):
        return f'<DriverSelection {self.user.name} - {self.driver.name} - {self.grand_prix.name}>'

class PickOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    grand_prix_id = db.Column(db.Integer, db.ForeignKey('grand_prix.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    grand_prix = db.relationship('GrandPrix', backref=db.backref('pick_orders', lazy=True))
    user = db.relationship('User', backref=db.backref('pick_orders', lazy=True))
    
    def __repr__(self):
        return f'<PickOrder {self.grand_prix.name} - {self.user.name} - Position {self.position}>'

class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    password_hash = db.Column(db.String(128), nullable=False)
    
    @staticmethod
    def set_password(password):
        config = Config.query.first()
        if not config:
            config = Config(password_hash=generate_password_hash(password, method='pbkdf2:sha256'))
            db.session.add(config)
        else:
            config.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        db.session.commit()
    
    @staticmethod
    def check_password(password):
        config = Config.query.first()
        if not config:
            return False
        return check_password_hash(config.password_hash, password)

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'authenticated' not in session or not session['authenticated']:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
@login_required
def index():
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        
        # Check if this is the first time setup
        if not Config.query.first():
            Config.set_password(password)
            session['authenticated'] = True
            flash('Initial password set successfully!', 'success')
            return redirect(url_for('dashboard'))
        
        if Config.check_password(password):
            session['authenticated'] = True
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid password', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get all users ordered by points
    users = User.query.order_by(User.points.desc()).all()
    
    # Get all races
    grand_prix_list = GrandPrix.query.order_by(GrandPrix.date).all()
    
    # Find the next race
    next_race = None
    current_date = datetime.now()
    for gp in grand_prix_list:
        if gp.date > current_date:
            next_race = gp
            break
    
    # Check which races have results
    races_with_results = {}
    for gp in grand_prix_list:
        has_results = RaceResult.query.filter_by(grand_prix_id=gp.id).first() is not None
        races_with_results[gp.id] = has_results
    
    # Get user picks for the next race
    user_picks = {}
    if next_race:
        # Get pick order for the next race
        pick_order = get_pick_order(next_race.id)
        
        selections = DriverSelection.query.filter_by(grand_prix_id=next_race.id).options(
            db.joinedload(DriverSelection.driver).joinedload(Driver.team)
        ).all()
        
        for user in users:
            user_picks[user.id] = {
                'top_driver': None,
                'bottom_driver': None
            }
        
        for selection in selections:
            if selection.driver.team.is_top_team:
                if selection.user_id in user_picks:
                    user_picks[selection.user_id]['top_driver'] = selection.driver.name
            else:
                if selection.user_id in user_picks:
                    user_picks[selection.user_id]['bottom_driver'] = selection.driver.name
    
    return render_template('dashboard.html', 
                          next_race=next_race, 
                          users=users, 
                          grand_prix_list=grand_prix_list,
                          races_with_results=races_with_results,
                          user_picks=user_picks,
                          pick_order=pick_order if next_race else [])

@app.route('/config', methods=['GET', 'POST'])
@login_required
def config():
    # Default active tab
    active_tab = 'users'
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'change_password':
            new_password = request.form.get('new_password')
            Config.set_password(new_password)
            flash('Password updated successfully!', 'success')
        
        # User management
        elif action == 'add_user':
            name = request.form.get('name')
            if name:
                user = User(name=name)
                db.session.add(user)
                db.session.commit()
                flash(f'User {name} added successfully!', 'success')
                reset_future_pick_orders()
        
        elif action == 'edit_user':
            user_id = request.form.get('user_id')
            name = request.form.get('name')
            if user_id and name:
                user = User.query.get(int(user_id))
                if user:
                    user.name = name
                    db.session.commit()
                    flash(f'User updated successfully!', 'success')
        
        elif action == 'delete_user':
            user_id = request.form.get('user_id')
            if user_id:
                user = User.query.get(int(user_id))
                if user:
                    # Delete related driver selections
                    DriverSelection.query.filter_by(user_id=int(user_id)).delete()
                    db.session.delete(user)
                    db.session.commit()
                    flash(f'User deleted successfully!', 'success')
                    reset_future_pick_orders()
                active_tab = 'users'
        
        # Team management
        elif action == 'add_team':
            name = request.form.get('team_name')
            is_top_team = 'is_top_team' in request.form
            if name:
                team = Team(name=name, is_top_team=is_top_team)
                db.session.add(team)
                db.session.commit()
                flash(f'Team {name} added successfully!', 'success')
                active_tab = 'teams'
        
        elif action == 'edit_team':
            team_id = request.form.get('team_id')
            name = request.form.get('team_name')
            is_top_team = 'is_top_team' in request.form
            if team_id and name:
                team = Team.query.get(int(team_id))
                if team:
                    team.name = name
                    team.is_top_team = is_top_team
                    db.session.commit()
                    flash(f'Team updated successfully!', 'success')
                active_tab = 'teams'
        
        elif action == 'delete_team':
            team_id = request.form.get('team_id')
            if team_id:
                # Check if team has drivers
                drivers = Driver.query.filter_by(team_id=int(team_id)).all()
                if drivers:
                    flash('Cannot delete team with associated drivers. Remove drivers first.', 'danger')
                else:
                    team = Team.query.get(int(team_id))
                    if team:
                        db.session.delete(team)
                        db.session.commit()
                        flash(f'Team deleted successfully!', 'success')
                active_tab = 'teams'
        
        # Driver management
        elif action == 'add_driver':
            name = request.form.get('driver_name')
            number = request.form.get('driver_number')
            team_id = request.form.get('team_id')
            if name and number and team_id:
                driver = Driver(name=name, number=int(number), team_id=int(team_id))
                db.session.add(driver)
                db.session.commit()
                flash(f'Driver {name} added successfully!', 'success')
                active_tab = 'drivers'
        
        elif action == 'edit_driver':
            driver_id = request.form.get('driver_id')
            name = request.form.get('driver_name')
            number = request.form.get('driver_number')
            team_id = request.form.get('team_id')
            if driver_id and name and number and team_id:
                driver = Driver.query.get(int(driver_id))
                if driver:
                    driver.name = name
                    driver.number = int(number)
                    driver.team_id = int(team_id)
                    db.session.commit()
                    flash(f'Driver updated successfully!', 'success')
                active_tab = 'drivers'
        
        elif action == 'delete_driver':
            driver_id = request.form.get('driver_id')
            if driver_id:
                # Check if driver has selections
                selections = DriverSelection.query.filter_by(driver_id=int(driver_id)).all()
                if selections:
                    flash('Cannot delete driver with associated selections.', 'danger')
                else:
                    # Check if driver has race results
                    results = RaceResult.query.filter_by(driver_id=int(driver_id)).all()
                    if results:
                        flash('Cannot delete driver with associated race results.', 'danger')
                    else:
                        driver = Driver.query.get(int(driver_id))
                        if driver:
                            db.session.delete(driver)
                            db.session.commit()
                            flash(f'Driver deleted successfully!', 'success')
                active_tab = 'drivers'
        
        # Grand Prix management
        elif action == 'add_grand_prix':
            name = request.form.get('gp_name')
            date_str = request.form.get('gp_date')
            if name and date_str:
                date = datetime.strptime(date_str, '%Y-%m-%d')
                gp = GrandPrix(name=name, date=date)
                db.session.add(gp)
                db.session.commit()
                flash(f'Grand Prix {name} added successfully!', 'success')
                active_tab = 'races'
        
        elif action == 'edit_grand_prix':
            gp_id = request.form.get('gp_id')
            name = request.form.get('gp_name')
            date_str = request.form.get('gp_date')
            if gp_id and name and date_str:
                gp = GrandPrix.query.get(int(gp_id))
                if gp:
                    gp.name = name
                    gp.date = datetime.strptime(date_str, '%Y-%m-%d')
                    db.session.commit()
                    flash(f'Grand Prix updated successfully!', 'success')
        
        elif action == 'delete_grand_prix':
            gp_id = request.form.get('gp_id')
            if gp_id:
                # Check if GP has selections
                selections = DriverSelection.query.filter_by(grand_prix_id=int(gp_id)).all()
                # Check if GP has results
                results = RaceResult.query.filter_by(grand_prix_id=int(gp_id)).all()
                
                # Delete all associated data
                if selections:
                    DriverSelection.query.filter_by(grand_prix_id=int(gp_id)).delete()
                if results:
                    RaceResult.query.filter_by(grand_prix_id=int(gp_id)).delete()
                
                gp = GrandPrix.query.get(int(gp_id))
                if gp:
                    db.session.delete(gp)
                    db.session.commit()
                    # Update user points after deleting race
                    update_user_points()
                    flash(f'Grand Prix deleted successfully!', 'success')
        
        elif action == 'update_points_mapping':
            for i in range(1, 21):
                points = request.form.get(f'points_{i}')
                if points:
                    mapping = PointsMapping.query.filter_by(position=i).first()
                    if mapping:
                        mapping.points = int(points)
                    else:
                        mapping = PointsMapping(position=i, points=int(points))
                        db.session.add(mapping)
            db.session.commit()
            flash('Points mapping updated successfully!', 'success')
        
        elif action == 'add_race_result':
            gp_id = request.form.get('gp_id')
            if gp_id:
                # Delete existing results for this GP
                RaceResult.query.filter_by(grand_prix_id=int(gp_id)).delete()
                
                # Add new results
                for driver_id, position in request.form.items():
                    if driver_id.startswith('driver_') and position:
                        driver_id = int(driver_id.replace('driver_', ''))
                        result = RaceResult(
                            grand_prix_id=int(gp_id),
                            driver_id=driver_id,
                            position=int(position)
                        )
                        db.session.add(result)
                
                db.session.commit()
                
                # Update user points based on results
                update_user_points()
                reset_future_pick_orders()
                
                flash('Race results added successfully!', 'success')
                active_tab = 'results'
    
    # Get data for the configuration page
    users = User.query.all()
    teams = Team.query.all()
    drivers = Driver.query.all()
    races = GrandPrix.query.order_by(GrandPrix.date).all()
    points_mapping = {pm.position: pm.points for pm in PointsMapping.query.all()}
    
    # Create a dictionary to track which races have results
    races_with_results = {}
    for race in races:
        races_with_results[race.id] = RaceResult.query.filter_by(grand_prix_id=race.id).first() is not None
    
    return render_template(
        'config.html',
        users=users,
        teams=teams,
        drivers=drivers,
        races=races,
        points_mapping=points_mapping,
        races_with_results=races_with_results,
        active_tab=active_tab
    )

# Helper functions
def get_pick_order(gp_id):
    """
    Determine the order in which users will make their driver picks.
    The pick order is based on the points users scored in the last race (ascending).
    If multiple users scored the same points, they are ordered randomly.
    If there are no previous race results, the entire user pick order is random.
    
    Returns a list of user objects in the order they should pick.
    """
    # Check if pick order already exists for this GP
    existing_pick_orders = PickOrder.query.filter_by(grand_prix_id=gp_id).order_by(PickOrder.position).all()
    
    if existing_pick_orders:
        # Return users in the stored order
        return [order.user for order in existing_pick_orders]
    
    # If no pick order exists, calculate it
    users = User.query.all()
    
    # Find the previous race (if any)
    current_gp = GrandPrix.query.get(gp_id)
    if not current_gp:
        # If GP not found, create random order
        random.shuffle(users)
        # Store the random order
        save_pick_order(gp_id, users)
        return users
    
    # Find the most recent completed race before the current one
    previous_race = GrandPrix.query.filter(
        GrandPrix.date < current_gp.date,
        GrandPrix.id != gp_id
    ).order_by(GrandPrix.date.desc()).first()
    
    if not previous_race or not RaceResult.query.filter_by(grand_prix_id=previous_race.id).first():
        # If no previous race or no results for the previous race, create random order
        random.shuffle(users)
        # Store the random order
        save_pick_order(gp_id, users)
        return users
    
    # Calculate points for each user in the previous race
    user_points = calculate_user_points_for_race(previous_race.id)
    
    # Group users by points
    points_to_users = {}
    for user in users:
        points = user_points.get(user.id, 0)
        if points not in points_to_users:
            points_to_users[points] = []
        points_to_users[points].append(user)
    
    # Randomize users with the same points
    for points, user_list in points_to_users.items():
        random.shuffle(user_list)
    
    # Create the final pick order (ascending by points)
    pick_order = []
    for points in sorted(points_to_users.keys()):
        pick_order.extend(points_to_users[points])
    
    # Store the calculated order
    save_pick_order(gp_id, pick_order)
    
    return pick_order

def save_pick_order(gp_id, users):
    """
    Save the pick order to the database
    """
    # Delete any existing pick orders for this GP
    PickOrder.query.filter_by(grand_prix_id=gp_id).delete()
    
    # Create new pick orders
    for position, user in enumerate(users, 1):
        pick_order = PickOrder(
            grand_prix_id=gp_id,
            user_id=user.id,
            position=position
        )
        db.session.add(pick_order)
    
    db.session.commit()

def update_user_points():
    # Reset all user points
    for user in User.query.all():
        user.points = 0
    
    # Calculate points for each race and update users
    for race in GrandPrix.query.all():
        user_points = calculate_user_points_for_race(race.id)
        for user_id, points in user_points.items():
            user = User.query.get(user_id)
            if user:
                user.points += points
    
    db.session.commit()
    
    # Reset pick orders for all future races since standings have changed
    reset_future_pick_orders()

def reset_future_pick_orders():
    """
    Reset pick orders for all future races
    This should be called when race results are updated or when users are added/deleted
    """
    current_date = datetime.now()
    future_races = GrandPrix.query.filter(GrandPrix.date > current_date).all()
    
    for race in future_races:
        # Delete existing pick orders for this race
        PickOrder.query.filter_by(grand_prix_id=race.id).delete()
    
    db.session.commit()

def calculate_user_points_for_race(gp_id):
    user_points = {}
    
    # Get all user selections for this race
    selections = DriverSelection.query.filter_by(grand_prix_id=gp_id).all()
    
    # Get race results
    results = RaceResult.query.filter_by(grand_prix_id=gp_id).all()
    if not results:
        return user_points
    
    # Create a mapping of driver_id to position
    driver_positions = {r.driver_id: r.position for r in results}
    
    # Get points mapping
    points_mapping = {pm.position: pm.points for pm in PointsMapping.query.all()}
    
    # Calculate points for each user
    for selection in selections:
        if selection.user_id not in user_points:
            user_points[selection.user_id] = 0
        
        if selection.driver_id in driver_positions:
            position = driver_positions[selection.driver_id]
            points = points_mapping.get(position, 0)
            user_points[selection.user_id] += points
    
    return user_points

@app.route('/driver-picks/<int:gp_id>', methods=['GET', 'POST'])
@login_required
def driver_picks(gp_id):
    grand_prix = GrandPrix.query.get_or_404(gp_id)
    
    # Check if race results exist for this GP
    results_exist = RaceResult.query.filter_by(grand_prix_id=gp_id).first() is not None
    
    # If results exist, don't allow changes
    if results_exist and request.method == 'POST':
        flash('Driver picks cannot be changed after race results are available.', 'danger')
        return redirect(url_for('driver_picks', gp_id=gp_id))
    
    if request.method == 'POST':
        user_id = request.form.get('user_id')
        top_driver_id = request.form.get('top_driver_id')
        bottom_driver_id = request.form.get('bottom_driver_id')
        selection_type = request.form.get('selection_type')
        
        if user_id:
            if selection_type == 'top':
                # Delete existing top team selection for this user and GP
                # First find the selections to delete
                top_selections = DriverSelection.query.join(Driver).join(Team).filter(
                    DriverSelection.user_id == int(user_id),
                    DriverSelection.grand_prix_id == gp_id,
                    Team.is_top_team == True
                ).all()
                
                # Then delete them individually
                for selection in top_selections:
                    db.session.delete(selection)
                
                # Add new top team selection only if a valid driver was selected
                if top_driver_id and top_driver_id != 'none':
                    top_selection = DriverSelection(
                        user_id=int(user_id),
                        driver_id=int(top_driver_id),
                        grand_prix_id=gp_id
                    )
                    db.session.add(top_selection)
                    db.session.commit()
                    flash('Top team driver selection saved successfully!', 'success')
                else:
                    db.session.commit()
                    flash('Top team driver selection removed.', 'success')
                
                return redirect(url_for('driver_picks', gp_id=gp_id))
                
            elif selection_type == 'bottom':
                # Delete existing bottom team selection for this user and GP
                # First find the selections to delete
                bottom_selections = DriverSelection.query.join(Driver).join(Team).filter(
                    DriverSelection.user_id == int(user_id),
                    DriverSelection.grand_prix_id == gp_id,
                    Team.is_top_team == False
                ).all()
                
                # Then delete them individually
                for selection in bottom_selections:
                    db.session.delete(selection)
                
                # Add new bottom team selection only if a valid driver was selected
                if bottom_driver_id and bottom_driver_id != 'none':
                    bottom_selection = DriverSelection(
                        user_id=int(user_id),
                        driver_id=int(bottom_driver_id),
                        grand_prix_id=gp_id
                    )
                    db.session.add(bottom_selection)
                    db.session.commit()
                    flash('Bottom team driver selection saved successfully!', 'success')
                else:
                    db.session.commit()
                    flash('Bottom team driver selection removed.', 'success')
                
                return redirect(url_for('driver_picks', gp_id=gp_id))
    
    # Get data for the driver picks page
    users = User.query.all()
    
    # Get top and bottom teams
    top_teams = Team.query.filter_by(is_top_team=True).all()
    bottom_teams = Team.query.filter_by(is_top_team=False).all()
    
    # Get drivers from top and bottom teams
    top_drivers = Driver.query.join(Team).filter(Team.is_top_team == True).all()
    bottom_drivers = Driver.query.join(Team).filter(Team.is_top_team == False).all()
    
    # Get existing selections for this GP with driver and team information
    selections = DriverSelection.query.filter_by(grand_prix_id=gp_id).options(
        db.joinedload(DriverSelection.driver).joinedload(Driver.team)
    ).all()
    selected_drivers = [s.driver_id for s in selections]
    
    # Organize selections by user and driver type (top/bottom)
    user_selections = {}
    user_top_drivers = {}
    user_bottom_drivers = {}
    
    for selection in selections:
        # For JavaScript
        if selection.user_id not in user_selections:
            user_selections[selection.user_id] = []
        user_selections[selection.user_id].append(selection.driver_id)
        
        # For template display
        if selection.driver.team.is_top_team:
            user_top_drivers[selection.user_id] = selection.driver
        else:
            user_bottom_drivers[selection.user_id] = selection.driver
    
    # Check if race results exist for this GP
    results_exist = RaceResult.query.filter_by(grand_prix_id=gp_id).first() is not None
    
    # Get pick order
    pick_order = get_pick_order(gp_id)
    
    return render_template(
        'driver_picks.html',
        grand_prix=grand_prix,
        users=users,
        top_teams=top_teams,
        bottom_teams=bottom_teams,
        top_drivers=top_drivers,
        bottom_drivers=bottom_drivers,
        selected_drivers=selected_drivers,
        user_selections=user_selections,
        user_top_drivers=user_top_drivers,
        user_bottom_drivers=user_bottom_drivers,
        selections=selections,
        results_exist=results_exist,
        pick_order=pick_order
    )

@app.route('/results/<int:gp_id>')
@login_required
def race_results(gp_id):
    grand_prix = GrandPrix.query.get_or_404(gp_id)
    
    # Get race results
    results = RaceResult.query.filter_by(grand_prix_id=gp_id).order_by(RaceResult.position).all()
    
    # Get points mapping for display
    points_mappings = PointsMapping.query.order_by(PointsMapping.position).all()
    
    # Get all users for display
    users = User.query.all()
    
    if not results:
        return render_template('race_results.html', 
                             grand_prix=grand_prix, 
                             results=None, 
                             points_mappings=points_mappings,
                             users=users)
    
    # Calculate user points for this race
    user_points = calculate_user_points_for_race(gp_id)
    
    # Sort users by points for this race
    sorted_users = sorted(user_points.items(), key=lambda x: x[1], reverse=True)
    
    # Get all users for display
    users = User.query.all()
    
    # Get driver selections for this race
    selections = DriverSelection.query.filter_by(grand_prix_id=gp_id).options(
        db.joinedload(DriverSelection.driver).joinedload(Driver.team)
    ).all()
    
    # Create a dictionary mapping user_id to their driver selections
    user_selections = {}
    for user in users:
        user_selections[user.id] = []
    
    for selection in selections:
        if selection.user_id in user_selections:
            user_selections[selection.user_id].append(selection.driver)
    
    return render_template(
        'race_results.html',
        grand_prix=grand_prix,
        results=results,
        user_points=sorted_users,
        points_mappings=points_mappings,
        users=users,
        selections=selections,
        user_selections=user_selections
    )

@app.route('/leaderboard')
@login_required
def leaderboard():
    users = User.query.order_by(User.points.desc()).all()
    races = GrandPrix.query.order_by(GrandPrix.date).all()
    
    # Get detailed points breakdown by race
    points_by_race = {}
    for user in users:
        points_by_race[user.id] = {}
        for race in races:
            points = calculate_user_points_for_race(race.id).get(user.id, 0)
            points_by_race[user.id][race.id] = points
    
    return render_template(
        'leaderboard.html',
        users=users,
        races=races,
        points_by_race=points_by_race
    )

# Initialize database with default data if needed
def initialize_database():
    db.create_all()
    
    # Add default points mapping if none exists
    if not PointsMapping.query.first():
        default_points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        for i, points in enumerate(default_points, 1):
            mapping = PointsMapping(position=i, points=points)
            db.session.add(mapping)
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        initialize_database()
    if 'liveconsole' not in gethostname(): # check if running on PythonAnywhere
        app.run()
