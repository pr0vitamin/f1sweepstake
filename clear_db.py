from app import app, db, User, Team, Driver, GrandPrix, RaceResult, DriverSelection, Config, PointsMapping

# Function to clear all data from the database
def clear_database():
    with app.app_context():
        # Delete all data from tables with foreign key constraints first
        print("Deleting race results...")
        RaceResult.query.delete()
        
        print("Deleting driver selections...")
        DriverSelection.query.delete()
        
        print("Deleting drivers...")
        Driver.query.delete()
        
        print("Deleting teams...")
        Team.query.delete()
        
        print("Deleting grand prix races...")
        GrandPrix.query.delete()
        
        print("Deleting users...")
        User.query.delete()
        
        print("Deleting points mapping...")
        PointsMapping.query.delete()
        
        # Keep the config (password) intact
        # If you want to delete config too, uncomment the next line
        # Config.query.delete()
        
        # Commit the changes
        db.session.commit()
        print("Database cleared successfully!")

if __name__ == '__main__':
    clear_database()
