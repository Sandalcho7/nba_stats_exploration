# NBA Stats Exploration

## Description
A simple dashboard allowing the user to communicate with a database storing players and teams statistics during the 2023/2024 NBA season.

## Project structure
```bash
project/
│
├── .git
│
├── data/               # Data files, later imported in the database (git ignored)
│
├── grafana/            # Grafana image and settings
│   ├── .dockerignore
│   └── Dockerfile.grafana
│
├── prometheus/         # Prometheus image and settings
│   ├── .dockerignore
│   └── Dockerfile.prometheus
│
├── src/
│   ├── utils/          # Utilities functions
│   └── server.js       # API script
│
├── .dockerignore
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile.api      # API server image
├── package-lock.json
├── package.json
└── README.md
```