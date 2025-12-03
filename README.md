# Sprint Time Predictor

A web-based calculator that predicts sprint times across different distances based on your personal best performance. The predictions are derived from athletic performance data in **Sprints and Relays by Dick, Frank W (1987)**.

## Features

- **Distance-based predictions**: Enter your time for one distance and get predicted times for all other distances
- **Multiple effort levels**: See predicted times at 100%, 95%, 90%, 85%, 80%, and 75% effort
- **Data-driven interpolation**: Uses real athletic performance data with linear interpolation for accuracy
- **Supported distances**: 30m Fly, 30m Blocks, 60m, 100m, 120m, 150m, 180m, 200m, 250m, 300m, 350m, 400m, 500m, 600m
- **Input validation**: Ensures times are within valid ranges based on the performance tables
- **Responsive design**: Works on desktop, tablet, and mobile devices

## How It Works

1. **Select a distance** from the dropdown (must be a distance in the reference tables)
2. **Enter your time** in seconds for that distance
3. **Click Calculate** to see predicted times for all distances at different effort levels

### Prediction Method

The calculator uses two reference tables from Dick (1987):
- **Table 20**: Controls for 100m/200m athletes (30m Blocks, 30m Fly, 60m, 100m, 150m, 200m, 250m)
- **Table 21**: Endurance controls for 200m/400m athletes (150m, 200m, 300m, 400m, 600m)

**Cross-table predictions** are made by:
1. Using the input distance to find your performance level in one table
2. Calculating your predicted 200m time (the bridge between tables)
3. Using that 200m time to predict performance in the other table

**Interpolation** for distances not in the tables (120m, 180m, 350m, 500m) uses linear interpolation between adjacent distances.

**Effort percentages** are calculated using: `time_at_effort = time_100% / (effort / 100)`

## Data Source

The performance data is based on training control tables from:
**Dick, Frank W. (1987). Sprints and Relays.**

These tables provide scientifically-validated performance ranges for sprint athletes at different competitive levels.

## Contact

For issues, feedback, or questions, please email: trainingtimespred@icloud.com

## License

This project uses publicly available athletic training data for educational purposes.
