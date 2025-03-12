# F1 Sweepstake App

A web application for managing a Formula 1 sweepstake competition among friends.

## Features

- **Authentication**: Single shared password for all users
- **Configuration Management**: 
  - Manage users, teams, drivers, and Grand Prix events
  - Configure points mapping for race positions
  - Enter race results
- **Driver Selections**:
  - Each user selects two drivers for each race
  - One driver from a top team and one from a bottom team
  - Each driver can only be selected once per race
- **Results Tracking**:
  - View race results and user points for each Grand Prix
  - Season-long leaderboard showing cumulative points

## Setup Instructions

1. Clone the repository:
```
git clone https://github.com/pr0vitamin/f1sweepstake.git
cd f1sweepstake
```

2. Create a virtual environment and install dependencies:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables (optional):
```
export SECRET_KEY="your-secret-key"
```

4. Run the application:
```
python flask_app.py
```

5. Access the application at http://localhost:5000

## First-Time Setup

1. On first login, you'll be prompted to set a password for the application.
2. After logging in, go to the Configuration page to:
   - Add users participating in the sweepstake
   - Add the top 5 and bottom 5 F1 teams
   - Add drivers for each team
   - Add Grand Prix events with their dates
   - Configure the points mapping for race positions

## Usage

### Before Each Race:
1. Users should visit the Driver Picks page for the upcoming race
2. Each user selects one driver from a top team and one from a bottom team
3. Each driver can only be selected by one user

### After Each Race:
1. An administrator enters the race results in the Configuration page
2. The system automatically calculates points based on the configured points mapping
3. Users can view their points on the Race Results page and the overall Leaderboard

## Technologies Used

- Flask (Python web framework)
- SQLite (Database)
- Bootstrap 5 (Frontend framework)
- JavaScript (Client-side interactivity)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
