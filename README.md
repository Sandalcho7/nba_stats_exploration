# NBA Stats Exploration

## Description
A simple dashboard allowing the user to communicate with a database storing players and teams statistics during the 2023/2024 NBA season.

## Project structure
```bash
project/
│
├── alertmanager/               # Alert Manager config
│   └── config.yml
│
├── database/                   # Database files
│   └── tables-creation.sql     # Tables creation requests examples
│
├── grafana/                    # Grafana config
│   └── provisioning/
│       └── datasources/
│           └── datasources.yaml
│
├── prometheus/                 # Prometheus config
│   ├── alert.rules
│   └── prometheus.yml
│
├── src/
│   ├── api/                    # Services APIs
│   │   └── postgres-api.js     # Postgres API functions
│   │
│   ├── utils/                  # Utilities functions
│   │   └── sql-generation.js   # SQL requests generation functions
│   │
│   └── server.js               # API script
│
├── .dockerignore
├── .env
├── .gitignore
├── docker-compose.yml
├── Dockerfile.api              # API server image
├── package-lock.json
├── package.json
└── README.md
```