# NBA Stats Exploration

## Description
A simple dashboard allowing the user to communicate with a database storing players and teams statistics during the 2023/2024 NBA season.

## Project structure
```bash
project/
│
├── alertmanager/                   # Alert Manager config
│   └── config.yml
│
├── database/                       # Database files
│   └── tables-creation.sql         # Tables creation requests examples
│
├── grafana/                        # Grafana config
│   └── provisioning/
│       └── datasources/
│           └── datasources.yaml
│
├── prometheus/                     # Prometheus config
│   ├── alert.rules
│   └── prometheus.yml
│
├── src/
│   ├── api/
│   │   ├── balldontlie-api.js      # Ball Don't Lie API functions
│   │   └── postgres-api.js         # Postgres API functions
│   │
│   ├── ml/                         # Machine learning part
│   │   ├── models/                 # Models directory
│   │   ├── app.py                  # API Server exposing model
│   │   ├── data_fetching.py        # Data fetching functions
│   │   ├── model_training.ipynb    # Data processing and model training notebook
│   │   └── utils.py                # Utilities functions
│   │
│   ├── utils/
│   │   ├── data-agg.js             # Data aggregation and enhancement functions
│   │   ├── scraping.js             # Scraping functions
│   │   ├── sql-generation.js       # SQL requests generation functions
│   │   └── utilities.js            # Utilities functions
│   │
│   └── server.js                   # API script
│
├── .dockerignore
├── .env                            # Git ignored
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── Dockerfile.api                  # API server image
├── package-lock.json
├── package.json
└── README.md
```